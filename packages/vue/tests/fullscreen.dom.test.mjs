import assert from 'node:assert/strict';
import test from 'node:test';
import { createTestWindow } from './happy-dom.mjs';

const window = createTestWindow({ url: 'https://sectile.test/' });
Object.assign(globalThis, { window, document: window.document, Node: window.Node, Element: window.Element, HTMLElement: window.HTMLElement, SVGElement: window.SVGElement });
const { createApp, createSSRApp, effectScope, h, isReactive, isReadonly, isShallow, KeepAlive, nextTick, shallowRef, toRef, useTemplateRef, watchSyncEffect } = await import('vue');
const { renderToString } = await import('vue/server-renderer');
const { useFullscreen } = await import('../.verification-dist/fullscreen.js');
const { provideHostActive } = await import('../.verification-dist/host-provider.js');
const records = new WeakMap(), listeners = new Map(), saved = [];
let current = null, enabled = true, requests = 0, exits = 0, peak = 0, failAdmission = false;
const nativeAdd = document.addEventListener, nativeRemove = document.removeEventListener;
Object.defineProperties(document, {
  fullscreenEnabled: { configurable: true, get() { return enabled; } },
  fullscreenElement: { configurable: true, get() { return current; } },
  exitFullscreen: { configurable: true, value() { exits++; current = null; document.dispatchEvent(new window.Event('fullscreenchange')); return Promise.resolve(); } },
  addEventListener: { configurable: true, value(type, callback, options) {
    if (type === 'fullscreenchange' || type === 'fullscreenerror') {
      if (failAdmission) throw Error('native listener admission');
      const callbacks = listeners.get(type) ?? new Set(); callbacks.add(callback); listeners.set(type, callbacks); saved.push(callback);
      peak = Math.max(peak, count());
    }
    return nativeAdd.call(this, type, callback, options);
  } },
  removeEventListener: { configurable: true, value(type, callback, options) {
    const callbacks = listeners.get(type); callbacks?.delete(callback); if (callbacks?.size === 0) listeners.delete(type);
    return nativeRemove.call(this, type, callback, options);
  } },
});
Object.defineProperty(window.HTMLElement.prototype, 'requestFullscreen', { configurable: true, value() {
  requests++; const pending = Promise.withResolvers();
  const entries = records.get(this) ?? []; entries.push(pending); records.set(this, entries); return pending.promise;
} });
const count = () => [...listeners.values()].reduce((total, entries) => total + entries.size, 0);
const settle = async () => { await nextTick(); await nextTick(); await Promise.resolve(); };
const code = result => result.ok ? undefined : result.error.code;
function fixture({ scoped = false, pauseOnConnect = false, cached = false, inherited = false } = {}) {
  const active = shallowRef(true), hostActive = shallowRef(true), shown = shallowRef(true), key = shallowRef(0);
  let observation, scope;
  const Child = { setup() {
    const element = useTemplateRef('viewer');
    const start = () => useFullscreen({ element, active });
    if (scoped) { scope = effectScope(); observation = scope.run(start); } else observation = start();
    if (pauseOnConnect) watchSyncEffect(() => { if (observation.snapshot.value?.connected) active.value = false; });
    return () => h('section', { ref: 'viewer', key: key.value }, 'Viewer');
  } };
  const app = createApp({ setup() {
    if (inherited) provideHostActive(hostActive);
    return () => cached ? h(KeepAlive, null, { default: () => shown.value ? h(Child) : null }) : h(Child);
  } });
  const host = document.createElement('div'); document.body.append(host); const errors = [];
  app.config.errorHandler = error => errors.push(error); app.mount(host);
  return { app, host, active, hostActive, shown, key, errors, get observation() { return observation; }, get scope() { return scope; },
    get element() { return host.querySelector('section'); }, close() { current = null; app.unmount(); host.remove(); } };
}

test('Vue fullscreen publishes shallow native facts and calls effects synchronously through stable methods', async () => {
  const f = fixture(), observation = f.observation, target = f.element, before = requests;
  try {
    assert.equal(count(), 2); assert.equal(observation.snapshot.value.available, true);
    assert.equal(isReadonly(observation.snapshot), true); assert.equal(isShallow(observation.snapshot), true);
    assert.equal(isReactive(observation.snapshot.value), false); assert.equal(Object.isFrozen(observation.snapshot.value), true);
    const snapshot = observation.snapshot.value, enter = observation.enter;
    assert.equal(observation.refresh().ok, true); assert.equal(observation.snapshot.value, snapshot);
    const pending = enter(); assert.equal(requests, before + 1); assert.equal(observation.snapshot.value.pending, 'enter');
    assert.equal(code(await observation.enter()), 'dom.fullscreen-pending');
    current = target; document.dispatchEvent(new window.Event('fullscreenchange'));
    assert.equal(observation.snapshot.value.active, true); records.get(target)[0].resolve();
    assert.equal((await pending).ok, true); assert.equal(observation.snapshot.value.pending, null);
    const previousExits = exits, leaving = observation.exit(); assert.equal(exits, previousExits + 1);
    assert.equal((await leaving).ok, true); assert.equal(observation.snapshot.value.active, false);
    assert.equal(observation.error.value, undefined); assert.equal(observation.enter, enter);
  } finally { f.close(); }
  assert.equal(count(), 0); assert.equal(observation.snapshot.value, undefined);
  assert.equal(code(observation.refresh()), 'dom.fullscreen-disposed'); assert.equal(code(await observation.enter()), 'dom.fullscreen-disposed');
});

test('Vue fullscreen retires pending native work synchronously and reconnects after target patches and ABA participation', async () => {
  const f = fixture(), target = f.element, enter = f.observation.enter, before = requests;
  try {
    const pending = enter(), native = records.get(target)[0];
    f.active.value = false; assert.equal(count(), 0); assert.equal(f.observation.snapshot.value, undefined);
    assert.equal(code(await pending), 'dom.fullscreen-disposed'); assert.equal(code(await enter()), 'dom.fullscreen-disposed');
    f.active.value = true; await settle(); assert.equal(count(), 2); assert.equal(f.observation.enter, enter);
    native.resolve(); await settle(); assert.equal(f.observation.snapshot.value.pending, null); assert.equal(requests, before + 1);
    f.active.value = false; f.active.value = true; await settle(); assert.equal(count(), 2);
    f.key.value++; await settle(); assert.notEqual(f.element, target); assert.equal(count(), 2);
    const next = enter(); assert.equal(records.get(f.element).length, 1); f.active.value = false;
    assert.equal(code(await next), 'dom.fullscreen-disposed'); assert.equal(count(), 0);
  } finally { f.close(); }
  assert.equal(peak, 2); assert.deepEqual(f.errors, []);
});

test('Vue fullscreen respects inherited host activity and KeepAlive lifetime without losing the public port', async () => {
  const f = fixture({ cached: true, inherited: true }), observation = f.observation;
  try {
    f.hostActive.value = false; assert.equal(count(), 0); assert.equal(observation.snapshot.value, undefined);
    f.hostActive.value = true; await settle(); assert.equal(count(), 2);
    f.shown.value = false; await settle(); assert.equal(count(), 0); assert.equal(observation.snapshot.value, undefined);
    f.shown.value = true; await settle(); assert.equal(count(), 2); assert.equal(f.observation, observation);
    assert.equal(observation.snapshot.value.available, true);
  } finally { f.close(); }
  assert.equal(count(), 0); assert.deepEqual(f.errors, []);
});

test('Vue fullscreen creates no native observation in SSR and terminal scope disposal cannot reconnect', async () => {
  const before = requests; let observation;
  const html = await renderToString(createSSRApp({ setup() {
    const element = useTemplateRef('viewer'); observation = useFullscreen({ element });
    return () => h('section', { ref: 'viewer', 'data-state': observation.snapshot.value?.active ?? 'unobserved' });
  } }));
  assert.match(html, /data-state="unobserved"/u); assert.equal(requests, before); assert.equal(count(), 0);
  assert.equal(observation.snapshot.value, undefined); assert.equal(code(await observation.enter()), 'dom.fullscreen-disposed');
  const f = fixture({ scoped: true });
  try {
    f.scope.stop(); assert.equal(count(), 0); assert.equal(f.observation.snapshot.value, undefined);
    f.active.value = false; f.active.value = true; f.key.value++; await settle();
    assert.equal(count(), 0); assert.equal(code(f.observation.refresh()), 'dom.fullscreen-disposed');
  } finally { f.close(); }
});

test('Vue fullscreen survives synchronous initial-publication retirement and exposes admission separately from native availability', async () => {
  const f = fixture({ pauseOnConnect: true });
  try {
    await settle(); assert.equal(f.active.value, false); assert.equal(count(), 0); assert.equal(f.observation.snapshot.value, undefined);
    assert.equal(code(await f.observation.enter()), 'dom.fullscreen-disposed');
  } finally { f.close(); }
  failAdmission = true; const rejected = fixture(); failAdmission = false;
  try {
    assert.equal(rejected.observation.error.value, 'dom.fullscreen-unavailable'); assert.equal(count(), 0);
    rejected.active.value = false; assert.equal(rejected.observation.error.value, undefined);
    enabled = false; rejected.active.value = true; await settle();
    assert.equal(count(), 2); assert.equal(rejected.observation.snapshot.value.available, false);
    assert.equal(code(await rejected.observation.enter()), 'dom.fullscreen-unavailable'); assert.equal(rejected.observation.error.value, undefined);
    enabled = true; assert.equal(rejected.observation.refresh().ok, true); assert.equal(rejected.observation.snapshot.value.available, true);
  } finally { enabled = true; rejected.close(); }
  assert.throws(() => useFullscreen({}), error => error.code === 'vue.fullscreen-scope-required');
});

test('Vue fullscreen saved results, methods, native callbacks and pending promises release the retired target and caller refs', { skip: typeof global.gc !== 'function' }, async () => {
  const held = await retired();
  for (let turn = 0; turn < 20; turn++) { await new Promise(resolve => setImmediate(resolve)); global.gc(); }
  assert.equal(held.target.deref(), undefined); assert.equal(held.ref.deref(), undefined); assert.equal(held.active.deref(), undefined);
  assert.equal(code(await held.pending), 'dom.fullscreen-disposed'); assert.equal(code(await held.enter()), 'dom.fullscreen-disposed');
  for (const callback of held.callbacks) callback(); held.native.resolve(); await settle();
  assert.equal(held.observation.snapshot.value, undefined); assert.equal(count(), 0);
});

test('Vue fullscreen retires observation when its target read fails and recovers explicitly', async () => {
  const failed = shallowRef(false), failure = Error('target getter'), errors = []; let observation;
  const app = createApp({ setup() {
    const target = useTemplateRef('viewer');
    const element = toRef(() => { if (failed.value) throw failure; return target.value; });
    observation = useFullscreen({ element }); return () => h('section', { ref: 'viewer' });
  } });
  const host = document.createElement('div'); document.body.append(host); app.config.errorHandler = error => errors.push(error); app.mount(host);
  try {
    const pending = observation.enter(); failed.value = true;
    assert.equal(count(), 0); assert.equal(observation.snapshot.value, undefined); assert.equal(code(await pending), 'dom.fullscreen-disposed');
    await settle(); assert.ok(errors.length > 0); assert.ok(errors.every(error => error === failure));
    failed.value = false; await settle(); assert.equal(count(), 2); assert.equal(observation.snapshot.value.available, true);
  } finally { app.unmount(); host.remove(); }
  assert.equal(count(), 0);
});
async function retired() {
  const element = shallowRef(null), active = shallowRef(true); let observation;
  const app = createApp({ setup() { observation = useFullscreen({ element, active }); return () => h('section', { ref: element }); } });
  const host = document.createElement('div'); document.body.append(host); app.mount(host);
  const pending = observation.enter(), target = element.value;
  const held = { observation, enter: observation.enter, pending, target: new WeakRef(target), ref: new WeakRef(element), active: new WeakRef(active),
    callbacks: saved.slice(), native: records.get(target)[0] };
  app.unmount(); host.remove(); return held;
}
