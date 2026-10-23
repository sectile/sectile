import assert from 'node:assert/strict';
import test from 'node:test';
import { createTestWindow } from './happy-dom.mjs';
import { getTimerParts, getTimerProgress } from '@sectile/core/timer';
import { unwrap } from '@sectile/core/result';

const window = createTestWindow({ url: 'https://sectile.test/timer' });
Object.assign(globalThis, { window, document: window.document, Node: window.Node, Element: window.Element,
  HTMLElement: window.HTMLElement, HTMLButtonElement: window.HTMLButtonElement, SVGElement: window.SVGElement });
const { createApp, createSSRApp, h, nextTick, shallowRef } = await import('vue');
const { renderToString } = await import('@vue/server-renderer');
const { TimerRoot, TimerItem, TimerActionTrigger } = await import('../.verification-dist/timer.js');

test('Vue Timer lends canonical parts/progress and stable actions to one DOM scheduling owner', async t => {
  let now = 0, latest;
  const schedules = new Map(), ticks = [];
  t.mock.method(globalThis, 'setInterval', callback => { const handle = {}; schedules.set(handle, callback); return handle; });
  t.mock.method(globalThis, 'clearInterval', handle => schedules.delete(handle));
  t.mock.method(Date, 'now', () => now);
  const props = shallowRef({ countdown: true, startMs: 90000, targetMs: 0 }), key = shallowRef(0);
  const host = document.createElement('div');
  const app = createApp({ render: () => h(TimerRoot, { ...props.value, key: key.value, onTick: value => ticks.push(value) }, {
    default: state => { latest = state; return [h(TimerItem, { type: 'seconds' }), h(TimerItem, { type: 'minutes' }, { default: value => h('strong', null, `Minutes: ${value.parts.minutes}`) }),
      h(TimerActionTrigger, { action: 'start' }, { default: () => 'Start' })]; },
  }) });
  app.mount(host);
  let mounted = true;
  try {
    assert.equal(host.querySelector('strong')?.textContent, 'Minutes: 1');
    const button = host.querySelector('button'), addListener = button.addEventListener; let addedClicks = 0;
    t.mock.method(button, 'addEventListener', function (event, ...args) { if (event === 'click') addedClicks++; return addListener.call(this, event, ...args); });
    assert.equal(schedules.size, 0); button.click(); await nextTick();
    assert.equal(schedules.size, 1); assert.equal(latest.running, true);
    const start = latest.start, pause = latest.pause, callback = [...schedules.values()][0];
    now = 1000; callback(); await nextTick();
    assert.equal(latest.valueMs, 89000); assert.deepEqual(latest.parts, unwrap(getTimerParts(89000)));
    assert.equal(latest.progress, unwrap(getTimerProgress({ valueMs: 89000, running: true, completed: false }, props.value)));
    assert.equal(latest.start, start); assert.equal(latest.pause, pause); assert.equal(host.querySelector('[data-type="seconds"]').textContent, '29');
    assert.equal(addedClicks, 0, 'state publication does not reinstall the native click listener');
    assert.equal(host.querySelector('strong')?.textContent, 'Minutes: 1');
    props.value = { countdown: false, startMs: 0, targetMs: 2000 }; await nextTick();
    assert.equal(latest.valueMs, 89000); assert.equal(host.querySelector('[role="timer"]').getAttribute('data-countdown'), 'true');
    assert.equal(latest.progress, 1000 / 90000 * 100); assert.equal([...schedules.values()][0], callback);
    key.value++; await nextTick();
    assert.equal(latest.valueMs, 0); assert.equal(latest.progress, 0); assert.equal(latest.running, false); assert.equal(schedules.size, 0);
    now = 2000; callback(); await nextTick(); assert.deepEqual(ticks, [89000]);
    latest.start(); await nextTick(); assert.equal(schedules.size, 1);
    const stale = latest, queued = [...schedules.values()][0]; app.unmount(); mounted = false;
    stale.start(); stale.restart(); now = 3000; queued();
    assert.equal(schedules.size, 0); assert.deepEqual(ticks, [89000]);
  } finally { if (mounted) app.unmount(); host.remove(); }
});

test('Vue Timer hydrates canonical complete initialization without starting a schedule', async t => {
  let schedules = 0;
  t.mock.method(globalThis, 'setInterval', () => { schedules++; throw Error('Unexpected completed schedule'); });
  const component = { render: () => h(TimerRoot, { startMs: 0, targetMs: 0, autoStart: true }, { default: () => h(TimerItem, { type: 'seconds' }) }) };
  const host = document.createElement('div'); host.innerHTML = await renderToString(createSSRApp(component));
  const warnings = [], app = createSSRApp(component); app.config.warnHandler = message => warnings.push(message);
  app.mount(host); await nextTick();
  assert.equal(host.querySelector('[role="timer"]').getAttribute('data-state'), 'complete');
  assert.equal(schedules, 0); assert.deepEqual(warnings, []); app.unmount(); host.remove();
});

test('Vue Timer removes conditional native registrations while preserving reactive naming', async t => {
  const schedules = new Set();
  t.mock.method(globalThis, 'setInterval', callback => { schedules.add(callback); return callback; });
  t.mock.method(globalThis, 'clearInterval', handle => schedules.delete(handle));
  const visible = shallowRef(true), action = shallowRef('start'), type = shallowRef('seconds'), label = shallowRef('Collection time');
  let latest;
  const host = document.createElement('div'), app = createApp({ render: () => h(TimerRoot, { label: label.value }, {
    default: state => { latest = state; return visible.value ? [h(TimerItem, { type: type.value }), h(TimerActionTrigger, { action: action.value }, { default: () => action.value })] : []; },
  }) });
  app.mount(host);
  try {
    const button = host.querySelector('button'), item = host.querySelector('[data-part="item"]');
    button.click(); await nextTick(); assert.equal(latest.running, true); assert.equal(schedules.size, 1);
    label.value = 'Elapsed delivery time'; action.value = 'pause'; type.value = 'minutes'; await nextTick();
    assert.equal(host.querySelector('[role="timer"]').getAttribute('aria-label'), 'Elapsed delivery time');
    assert.equal(host.querySelector('[role="timer"]').hasAttribute('aria-valuenow'), false);
    button.click(); await nextTick(); assert.equal(latest.running, false); assert.equal(schedules.size, 0);
    visible.value = false; await nextTick(); latest.start(); await nextTick();
    button.click(); await nextTick(); assert.equal(latest.running, true); assert.equal(schedules.size, 1);
    assert.equal(item.isConnected, false); latest.pause(); assert.equal(schedules.size, 0);
  } finally { app.unmount(); host.remove(); }
  assert.equal(schedules.size, 0);
});

test('disposed Vue Timer releases its slot cache while a public root instance remains held', { skip: typeof global.gc !== 'function' }, async () => {
  let retained, weak;
  await new Promise(resolve => setImmediate(() => {
    const host = document.createElement('div');
    const app = createApp({ render: () => h(TimerRoot, { ref: value => { if (value) retained = value; } }, {
      default: state => { weak = new WeakRef(state); return String(state.valueMs); },
    }) });
    app.mount(host); app.unmount(); host.remove(); resolve();
  }));
  for (let index = 0; index < 24; index++) { await new Promise(resolve => setImmediate(resolve)); global.gc(); }
  assert.equal(retained.$props.startMs, 0); assert.equal(weak.deref(), undefined);
});
