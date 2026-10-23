import assert from 'node:assert/strict';
import test from 'node:test';
import { createTimer, getTimerRootAttributes, tryCreateTimer, tryResolveTimerInterval } from '../.verification-dist/timer.js';
import { scheduler } from './support/clock.mjs';

test('DOM Timer owns one running schedule and no paused or completed schedule', t => {
  const clock = scheduler(t), timer = createTimer({ root: new FakeElement(), targetMs: 1000 });
  try {
    assert.equal(clock.intervals.size, 0);
    timer.start(); assert.equal(clock.intervals.size, 1); const original = clock.callback();
    clock.advance(25); timer.start(); timer.resume(); assert.equal(clock.callback(), original);
    clock.advance(25); original(); assert.equal(timer.getSnapshot().state.valueMs, 50);
    timer.pause(); assert.equal(clock.intervals.size, 0); clock.advance(500);
    timer.resume(); assert.equal(clock.intervals.size, 1); const resumed = clock.callback();
    original(); assert.equal(timer.getSnapshot().state.valueMs, 50);
    clock.advance(50); resumed(); assert.equal(timer.getSnapshot().state.valueMs, 100);
    timer.restart(); assert.equal(timer.getSnapshot().state.valueMs, 0); assert.equal(clock.intervals.size, 1);
    clock.advance(1000); clock.callback()(); assert.equal(timer.getSnapshot().state.completed, true); assert.equal(clock.intervals.size, 0);
    timer.reset(); assert.equal(clock.intervals.size, 0);
  } finally { timer.disconnect(); }
  assert.equal(clock.intervals.size, 0);
});

test('DOM Timer ignores queued callbacks after disconnect and releases native actions', t => {
  const clock = scheduler(t), calls = [], button = new FakeElement();
  const timer = createTimer({ root: new FakeElement(), autoStart: true, onTick: value => calls.push(value) });
  timer.setActionAttributes(button, 'pause'); const queued = clock.callback();
  timer.disconnect(); timer.disconnect(); clock.advance(100); queued();
  assert.equal(clock.intervals.size, 0); assert.equal(button.listeners.get('click').size, 0);
  assert.deepEqual(calls, []); assert.equal(timer.getSnapshot().state.valueMs, 0); assert.equal(timer.handleEvent('restart'), false);
});

test('DOM Timer synchronizes completion resources before throwing or disposing callbacks', t => {
  const clock = scheduler(t);
  const throwing = createTimer({ root: new FakeElement(), targetMs: 10, autoStart: true, onTick: () => { throw Error('application callback'); } });
  clock.advance(10); assert.throws(() => clock.callback()(), /application callback/u);
  assert.equal(clock.intervals.size, 0); assert.equal(throwing.getSnapshot().state.completed, true); throwing.disconnect();
  let completion = 0, updates = 0, disposed;
  disposed = createTimer({ root: new FakeElement(), targetMs: 10, autoStart: true,
    onTick: () => disposed.disconnect(), onComplete: () => completion++, onUpdate: () => updates++,
  });
  clock.advance(10); clock.callback()();
  assert.equal(clock.intervals.size, 0); assert.equal(completion, 0); assert.equal(updates, 0);
});

test('DOM Timer rejects native delay overflow instead of scheduling unintended immediate work', t => {
  const clock = scheduler(t);
  for (const intervalMs of [0, -1, NaN, Infinity, 2147483648]) {
    assert.equal(tryResolveTimerInterval(intervalMs).error.code, 'dom.timer-interval-invalid');
    const result = tryCreateTimer({ root: new FakeElement(), autoStart: true, intervalMs });
    assert.equal(result.ok, false); assert.equal(result.error.code, 'dom.timer-interval-invalid');
  }
  assert.equal(clock.intervals.size, 0);
  const accepted = createTimer({ root: new FakeElement(), autoStart: true, intervalMs: 1.5 });
  assert.equal([...clock.intervals.values()][0].delay, 1.5); accepted.disconnect();
});

test('DOM Timer preserves author naming and exposes its measurement as text, not range ARIA', () => {
  const root = new FakeElement(); root.setAttribute('aria-label', 'Collection time');
  const item = new FakeElement(), timer = createTimer({ root, countdown: true, startMs: 60000 });
  timer.registerItem(item, 'minutes'); timer.handleEvent({ type: 'tick', elapsedMs: 1000 });
  assert.equal(root.attributes.get('aria-label'), 'Collection time');
  assert.equal(root.attributes.get('aria-live'), 'off'); assert.equal(root.attributes.has('aria-valuenow'), false);
  assert.equal(item.textContent, '01'); timer.disconnect();
  assert.deepEqual(getTimerRootAttributes({ valueMs: 0, running: false, completed: true }, {}, { label: 'Named', labelledBy: 'caption', describedBy: 'help' }), {
    role: 'timer', 'aria-live': 'off', 'aria-valuenow': undefined, 'aria-label': 'Named', 'aria-labelledby': 'caption', 'aria-describedby': 'help',
    'data-scope': 'timer', 'data-part': 'root', 'data-state': 'complete', 'data-countdown': 'false',
  });
});

test('DOM Timer unregisters conditional parts and ignores old disposers after replacement', t => {
  scheduler(t);
  const timer = createTimer({ root: new FakeElement() }), oldItem = new FakeElement(), newItem = new FakeElement(), oldButton = new FakeElement(), newButton = new FakeElement();
  const removeOldItem = timer.registerItem(oldItem, 'seconds'), removeOldButton = timer.registerAction(oldButton, 'start');
  const queuedClick = [...oldButton.listeners.get('click')][0];
  const removeNewItem = timer.registerItem(newItem, 'seconds'), removeNewButton = timer.registerAction(newButton, 'start');
  removeOldItem(); removeOldButton(); queuedClick(); assert.equal(timer.getSnapshot().state.running, false);
  newButton.dispatch('click'); timer.handleEvent({ type: 'tick', elapsedMs: 1000 });
  assert.equal(oldItem.textContent, '00'); assert.equal(newItem.textContent, '01');
  removeNewItem(); removeNewItem(); removeNewButton(); removeNewButton();
  timer.pause(); newButton.dispatch('click'); assert.equal(timer.getSnapshot().state.running, false);
  assert.equal(newButton.listeners.get('click').size, 0);
  timer.start(); timer.handleEvent({ type: 'tick', elapsedMs: 1000 }); assert.equal(newItem.textContent, '01'); timer.disconnect();
});

test('Timer disposers release retired native elements while the connection and callbacks remain held', { skip: typeof global.gc !== 'function' }, async () => {
  const timer = createTimer({ root: new FakeElement() }); let refs, disposers;
  await new Promise(resolve => setImmediate(() => {
    const item = new FakeElement(), button = new FakeElement(); refs = [new WeakRef(item), new WeakRef(button)];
    disposers = [timer.registerItem(item, 'seconds'), timer.registerAction(button, 'start')]; timer.disconnect(); resolve();
  }));
  for (let index = 0; index < 24; index++) { await new Promise(resolve => setImmediate(resolve)); global.gc(); }
  assert.equal(refs[0].deref(), undefined); assert.equal(refs[1].deref(), undefined);
  disposers.forEach(dispose => dispose()); assert.equal(timer.getSnapshot().state.running, false);
});

test('DOM timer projects parts and owns native action buttons', () => {
  const root = new FakeElement(); const minutes = new FakeElement(); const start = new FakeElement(); const pause = new FakeElement();
  const timer = createTimer({ root, countdown: true, startMs: 60_000, intervalMs: 60_000 });
  timer.setItemAttributes(minutes, 'minutes'); timer.setActionAttributes(start, 'start'); timer.setActionAttributes(pause, 'pause');
  assert.equal(root.attributes.get('role'), 'timer'); assert.equal(minutes.textContent, '01'); assert.equal(pause.disabled, true);
  start.dispatch('click'); assert.equal(timer.getSnapshot().state.running, true); assert.equal(pause.disabled, false);
  timer.handleEvent({ type: 'tick', elapsedMs: 60_000 }); assert.deepEqual(timer.getSnapshot().state, { valueMs: 0, running: false, completed: true }); timer.disconnect();
});

class FakeElement { attributes = new Map(); listeners = new Map(); dataset = {}; disabled = false; type = ''; textContent = ''; setAttribute(name, value) { this.attributes.set(name, value); } removeAttribute(name) { this.attributes.delete(name); } addEventListener(type, listener) { const set = this.listeners.get(type) ?? new Set(); set.add(listener); this.listeners.set(type, set); } removeEventListener(type, listener) { this.listeners.get(type)?.delete(listener); } dispatch(type) { for (const listener of this.listeners.get(type) ?? []) listener({}); } }
