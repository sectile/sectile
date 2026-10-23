import assert from 'node:assert/strict';
import test from 'node:test';
import { createTestWindow } from './happy-dom.mjs';

const browserWindow = createTestWindow({ url: 'http://localhost/' });
Object.assign(globalThis, {
  window: browserWindow,
  document: browserWindow.document,
  Node: browserWindow.Node,
  Element: browserWindow.Element,
  HTMLElement: browserWindow.HTMLElement,
  HTMLButtonElement: browserWindow.HTMLButtonElement,
  SVGElement: browserWindow.SVGElement,
  Event: browserWindow.Event,
  MutationObserver: browserWindow.MutationObserver,
});

const { KeepAlive, createApp, defineComponent, h, nextTick, ref, shallowRef } = await import('vue');
const { ToastClose, ToastDescription, ToastProvider, ToastRoot, ToastTitle, ToastViewport, useToast } = await import('../.verification-dist/toast.js');

async function settle() {
  await nextTick();
  await nextTick();
}

test('toast viewport label updates cannot reattach an inactive cached host', async t => {
  const intervals = new Map(), shown = shallowRef(true), label = shallowRef('Current');
  t.mock.method(globalThis, 'setInterval', callback => { const handle = {}; intervals.set(handle, callback); return handle; });
  t.mock.method(globalThis, 'clearInterval', handle => intervals.delete(handle));
  const Cached = defineComponent({ setup() { return () => h(ToastViewport, { label: label.value }); } });
  const { app, host } = mount(() => h(ToastProvider, { initialToasts: [{ id: 'a', title: 'Saved' }], defaultDurationMs: 10000 }, {
    default: () => h(KeepAlive, null, { default: () => shown.value ? h(Cached) : h('div', 'Inactive') }),
  }));
  try {
    await settle(); assert.equal(intervals.size, 1);
    shown.value = false; await settle(); assert.equal(intervals.size, 0);
    label.value = 'Updated while inactive'; await settle(); assert.equal(intervals.size, 0);
    shown.value = true; await settle(); assert.equal(intervals.size, 1);
    assert.equal(host.querySelector('[data-part="viewport"]').getAttribute('aria-label'), 'Updated while inactive');
  } finally { unmount(app, host); }
  assert.equal(intervals.size, 0);
});

test('useToast exposes user-rendered toast state and commands to setup descendants', async (t) => {
  let toast;
  const Consumer = defineComponent({
    setup() { toast = useToast(); return () => null; },
  });
  const { app, host } = mount(() => h(ToastProvider, { defaultDurationMs: null }, {
    default: ({ toasts }) => [
      h(Consumer),
      h(ToastViewport, { class: 'user-viewport' }, {
        default: () => toasts.map((item) => h(ToastRoot, { value: item.id, class: 'user-toast' }, {
          default: () => [h(ToastTitle), h(ToastDescription)],
        })),
      }),
    ],
  }));
  t.after(() => unmount(app, host));
  await settle();

  toast.toast({ id: 'manual', title: 'Request pending', description: 'Waiting', durationMs: null });
  await settle();
  assert.equal(toast.toasts.value[0].title, 'Request pending');
  assert.match(host.textContent, /Request pending/);
  assert.equal(host.querySelector('.user-toast').dataset.kind, 'info');

  toast.update('manual', { title: 'Manually updated', kind: 'product-specific' });
  await settle();
  assert.equal(toast.toasts.value[0].title, 'Manually updated');
  assert.equal(toast.toasts.value[0].kind, 'product-specific');
  assert.equal(host.querySelector('.user-toast').dataset.kind, 'product-specific');
  toast.dismiss('manual');

  const result = await completeRequest(toast, 'request', async () => ({ version: '1.0.0' }));
  await settle();
  assert.deepEqual(result, { version: '1.0.0' });
  assert.equal(toast.toasts.value.find((item) => item.id === 'request').title, 'Request complete');
  assert.equal(host.querySelector('[data-sectile-toast-item="request"]').dataset.kind, 'success');

  const failure = new Error('Deployment failed');
  await assert.rejects(completeRequest(toast, 'failure', async () => { throw failure; }), (error) => error === failure);
  await settle();
  assert.equal(toast.toasts.value.find((item) => item.id === 'failure').kind, 'error');

  toast.dismissAll();
  await new Promise((resolve) => setTimeout(resolve, 0));
  await settle();
  assert.equal(toast.toasts.value.length, 0);
});

test('controlled Vue toast accepts timeout removal after its internal countdown', async (t) => {
  const toasts = ref([{ id: 'test', title: 'Test', durationMs: 1 }]);
  const { app, host } = mount(() => h(ToastProvider, {
    toasts: toasts.value,
    'onUpdate:toasts': (items) => { toasts.value = [...items]; },
  }, {
    default: ({ toasts: items }) => h(ToastViewport, null, {
      default: () => items.map((item) => h(ToastRoot, { value: item.id }, { default: () => h(ToastTitle) })),
    }),
  }));
  t.after(() => unmount(app, host));
  await settle();
  await new Promise((resolve) => setTimeout(resolve, 150));
  await settle();
  assert.deepEqual(toasts.value, []);
});

test('controlled Vue toast handles reorder, concurrent exits, and same-ID reactivation without stale removal', async (t) => {
  const a = { id: 'a', title: 'A', durationMs: null };
  const b = { id: 'b', title: 'B', durationMs: null };
  const toasts = ref([a, b]);
  const { app, host } = mount(() => h(ToastProvider, { toasts: toasts.value }, {
    default: ({ toasts: items }) => h(ToastViewport, null, {
      default: () => items.map((item) => h(ToastRoot, { key: item.id, value: item.id, style: { transitionProperty: 'opacity', transitionDuration: '5ms' } }, {
        default: () => [h(ToastTitle), h(ToastClose)],
      })),
    }),
  }));
  t.after(() => unmount(app, host));
  await settle();

  const firstA = host.querySelector('[data-sectile-toast-item="a"]');
  const firstB = host.querySelector('[data-sectile-toast-item="b"]');
  assert.ok(firstA instanceof HTMLElement); assert.ok(firstB instanceof HTMLElement);
  toasts.value = [b, a];
  await settle();
  assert.deepEqual([...host.querySelectorAll('[data-sectile-toast-item]')].map((item) => item.dataset.sectileToastItem), ['b', 'a']);
  assert.equal(host.querySelector('[data-sectile-toast-item="a"]'), firstA);
  assert.equal(host.querySelector('[data-sectile-toast-item="b"]'), firstB);

  toasts.value = [];
  await settle();
  assert.equal(firstA.dataset.state, 'closed'); assert.equal(firstB.dataset.state, 'closed');
  assert.equal(firstA.hidden, false); assert.equal(firstB.hidden, false);
  assert.equal(firstA.inert, true); assert.equal(firstB.inert, true);
  assert.equal(firstA.getAttribute('aria-hidden'), 'true'); assert.equal(firstB.getAttribute('aria-hidden'), 'true');

  toasts.value = [{ ...a, title: 'A again' }];
  await settle();
  assert.equal(host.querySelector('[data-sectile-toast-item="a"]'), firstA);
  assert.equal(firstA.dataset.state, 'open'); assert.equal(firstA.inert, false); assert.equal(firstA.getAttribute('aria-hidden'), null);

  await new Promise((resolve) => setTimeout(resolve, 10));
  firstB.dispatchEvent(new Event('transitionend', { bubbles: true }));
  firstA.dispatchEvent(new Event('transitionend', { bubbles: true }));
  await settle();
  assert.equal(host.querySelector('[data-sectile-toast-item="b"]'), null);
  assert.equal(host.querySelector('[data-sectile-toast-item="a"]'), firstA);
  assert.equal(firstA.dataset.state, 'open');
});

test('uncontrolled Vue toast survives viewport replacement without resurrecting exited items', async (t) => {
  let toast;
  const showViewport = ref(true);
  const viewportKey = ref(0);
  const Consumer = defineComponent({ setup() { toast = useToast(); return () => null; } });
  const { app, host } = mount(() => h(ToastProvider, { defaultDurationMs: null }, {
    default: ({ toasts }) => [
      h(Consumer),
      showViewport.value
        ? h(ToastViewport, { key: viewportKey.value }, {
            default: () => toasts.map((item) => h(ToastRoot, { key: item.id, value: item.id }, { default: () => [h(ToastTitle), h(ToastClose)] })),
          })
        : null,
    ],
  }));
  t.after(() => unmount(app, host));
  await settle();
  toast.toast({ id: 'kept', title: 'Kept', durationMs: null });
  await settle();
  assert.ok(host.querySelector('[data-sectile-toast-item="kept"]') instanceof HTMLElement);

  showViewport.value = false;
  await settle();
  assert.equal(host.querySelector('[data-part="viewport"]'), null);
  assert.equal(toast.toasts.value.map((item) => item.id).includes('kept'), true);

  viewportKey.value += 1;
  showViewport.value = true;
  await settle();
  assert.ok(host.querySelector('[data-sectile-toast-item="kept"]') instanceof HTMLElement);
  assert.deepEqual(toast.toasts.value.map((item) => item.id), ['kept']);

  toast.dismiss('kept');
  await settle();
  assert.equal(host.querySelector('[data-sectile-toast-item="kept"]'), null);
  assert.deepEqual(toast.toasts.value, []);
});

test('useToast rejects setup outside ToastProvider', () => {
  const host = document.createElement('div');
  document.body.append(host);
  const app = createApp(defineComponent({ setup() { useToast(); return () => null; } }));
  const warnings = [];
  app.config.warnHandler = (message) => { warnings.push(message); };
  assert.throws(() => app.mount(host), /useToast must be used inside ToastProvider/);
  assert.ok(warnings.some((message) => message.includes('injection')));
  host.remove();
});

test('Vue Toast preserves remaining time across labels, configuration and viewport replacement', async t => {
  let toast, now = 0; const schedules = new Map();
  t.mock.method(globalThis, 'setInterval', callback => { const id = {}; schedules.set(id, callback); return id; });
  t.mock.method(globalThis, 'clearInterval', id => schedules.delete(id)); t.mock.method(Date, 'now', () => now);
  const closeLabel = shallowRef('Close'), label = shallowRef('Notifications'), viewport = shallowRef(0), shown = shallowRef(true);
  const Consumer = defineComponent({ setup() { toast = useToast(); return () => null; } });
  const { app, host } = mount(() => h(ToastProvider, { closeLabel: closeLabel.value, initialToasts: [{ id: 'a', title: 'A', durationMs: 1000 }] }, {
    default: ({ toasts }) => [h(Consumer), shown.value ? h(ToastViewport, { key: viewport.value, label: label.value }, {
      default: () => toasts.map(item => h(ToastRoot, { key: item.id, value: item.id }, { default: () => [h(ToastTitle), h(ToastClose)] })),
    }) : null],
  }));
  try {
    await settle(); const tick = [...schedules.values()][0]; now = 100; tick(); await settle();
    assert.equal(toast.toasts.value[0].remainingMs, 900);
    const published = toast.toasts.value;
    closeLabel.value = 'Localized'; await settle(); assert.equal(toast.toasts.value[0].remainingMs, 900);
    assert.equal(toast.toasts.value, published);
    assert.equal([...schedules.values()][0], tick); assert.equal(host.querySelector('button').getAttribute('aria-label'), 'Localized');
    label.value = 'Localized viewport'; await settle(); assert.equal(toast.toasts.value[0].remainingMs, 900);
    viewport.value++; await settle(); assert.equal(toast.toasts.value[0].remainingMs, 900); assert.equal(schedules.size, 1);
    shown.value = false; await settle(); assert.equal(schedules.size, 0);
    now = 10000; tick(); assert.equal(toast.toasts.value[0].remainingMs, 900);
    shown.value = true; await settle(); now += 900; [...schedules.values()][0](); await settle();
    assert.equal(toast.toasts.value.length, 0); assert.equal(schedules.size, 0);
  } finally { unmount(app, host); }
});

test('Vue Toast has a bounded active queue before a viewport and while it is absent', async t => {
  let toast; const shown = shallowRef(false);
  t.mock.method(globalThis, 'setInterval', () => { throw Error('Persistent detached notifications must not schedule'); });
  const Consumer = defineComponent({ setup() { toast = useToast(); return () => null; } });
  const { app, host } = mount(() => h(ToastProvider, { defaultDurationMs: null }, {
    default: ({ toasts }) => [h(Consumer), shown.value ? h(ToastViewport, null, { default: () => toasts.map(item => h(ToastRoot, { key: item.id, value: item.id }, { default: () => h(ToastTitle) })) }) : null],
  }));
  try {
    for (let index = 0; index < 10; index++) toast.toast({ id: String(index), title: String(index) });
    await settle(); assert.deepEqual(toast.toasts.value.map(item => item.id), ['7', '8', '9']);
    shown.value = true; await settle(); assert.equal(host.querySelectorAll('[data-sectile-toast-item]').length, 3);
    shown.value = false; await settle();
    for (let index = 10; index < 20; index++) toast.toast({ id: String(index), title: String(index) });
    await settle(); assert.deepEqual(toast.toasts.value.map(item => item.id), ['17', '18', '19']);
    shown.value = true; await settle(); assert.equal(host.querySelectorAll('[data-sectile-toast-item]').length, 3);
  } finally { unmount(app, host); }
});

test('retained useToast commands release late inputs and detached viewport after provider disposal', { skip: typeof global.gc !== 'function' }, async () => {
  let toast, input, root;
  await new Promise((resolve, reject) => setImmediate(() => {
    try {
      const Consumer = defineComponent({ setup() { toast = useToast(); return () => null; } });
      const { app, host } = mount(() => h(ToastProvider, null, { default: () => [h(Consumer), h(ToastViewport)] }));
      root = new WeakRef(host.querySelector('ol')); unmount(app, host);
      const late = { id: 'late', title: 'Late' }; input = new WeakRef(late); toast.toast(late); resolve();
    } catch (error) { reject(error); }
  }));
  for (let turn = 0; turn < 20; turn++) { global.gc(); await new Promise(resolve => setImmediate(resolve)); }
  assert.equal(input.deref(), undefined); assert.equal(root.deref(), undefined);
  assert.equal(toast.toasts.value.length, 0); toast.dismissAll();
});

test('Vue Toast row projection reads one published ID view without per-row array search', async t => {
  let now = 0, toast; const schedules = new Map();
  t.mock.method(globalThis, 'setInterval', callback => { const id = {}; schedules.set(id, callback); return id; });
  t.mock.method(globalThis, 'clearInterval', id => schedules.delete(id)); t.mock.method(Date, 'now', () => now);
  const Consumer = defineComponent({ setup() { toast = useToast(); return () => null; } });
  for (const size of [32, 128]) {
    const { app, host } = mount(() => h(ToastProvider, { maxVisible: size, initialToasts: Array.from({ length: size }, (_, index) => ({ id: String(index), title: String(index), durationMs: 1000 })) }, {
      default: ({ toasts }) => [h(Consumer), h(ToastViewport, null, { default: () => toasts.map(item => h(ToastRoot, { key: item.id, value: item.id }, { default: () => h(ToastTitle) })) })],
    }));
    let visits = 0; const find = Array.prototype.find;
    try {
      await settle();
      Array.prototype.find = function (callback, receiver) {
        if (this !== toast.toasts.value) return find.call(this, callback, receiver);
        return find.call(this, (...args) => { visits++; return callback.call(receiver, ...args); });
      };
      now++; [...schedules.values()][0](); await settle();
      assert.equal(host.querySelectorAll('[data-sectile-toast-item]').length, size);
      assert.equal(toast.toasts.value[0].remainingMs, 999);
    } finally { Array.prototype.find = find; unmount(app, host); }
    assert.equal(visits, 0, `${size} row projection uses the published ID view`);
  }
});

async function completeRequest(toast, id, request) {
  toast.toast({ id, title: 'Request pending', durationMs: null });
  try {
    const result = await request();
    toast.update(id, { title: 'Request complete', kind: 'success', durationMs: null });
    return result;
  } catch (error) {
    toast.update(id, { title: 'Request failed', description: String(error), kind: 'error', durationMs: null });
    throw error;
  }
}

function mount(render) {
  const host = document.createElement('div');
  document.body.append(host);
  const app = createApp({ render });
  app.mount(host);
  return { app, host };
}

function unmount(app, host) {
  if (host.isConnected) app.unmount();
  host.remove();
}
