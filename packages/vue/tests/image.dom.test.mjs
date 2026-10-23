import assert from 'node:assert/strict';
import test from 'node:test';
import { createTestWindow } from './happy-dom.mjs';

const window = createTestWindow({ url: 'https://sectile.test/' });
Object.assign(globalThis, { window, document: window.document, Node: window.Node, Element: window.Element, HTMLElement: window.HTMLElement, SVGElement: window.SVGElement });
const { createApp, createSSRApp, effectScope, h, isReactive, isReadonly, isShallow, nextTick, shallowRef, useTemplateRef, watchSyncEffect } = await import('vue');
const { renderToString } = await import('vue/server-renderer');
const { useImage } = await import('../.verification-dist/image.js');
const records = new WeakMap();
let totalDecodes = 0;
function facts(image) {
  let value = records.get(image);
  if (!value) { value = { pending: [], listeners: new Map(), saved: [], peak: 0, adds: 0 }; records.set(image, value); }
  return value;
}
const prototype = window.HTMLImageElement.prototype, add = prototype.addEventListener, remove = prototype.removeEventListener;
// Native fetch/decode is controlled; Vue ref assignment and attribute patching are real.
Object.defineProperties(prototype, {
  complete: { configurable: true, get() { return true; } },
  currentSrc: { configurable: true, get() { return this.src; } },
  decode: { configurable: true, value() { const pending = { ...Promise.withResolvers(), src: this.src }; facts(this).pending.push(pending); totalDecodes++; return pending.promise; } },
  addEventListener: { configurable: true, value(type, callback, options) {
    const value = facts(this), callbacks = value.listeners.get(type) ?? new Set(); callbacks.add(callback); value.listeners.set(type, callbacks);
    value.saved.push(callback); value.adds++; value.peak = Math.max(value.peak, [...value.listeners.values()].reduce((total, entries) => total + entries.size, 0));
    return add.call(this, type, callback, options);
  } },
  removeEventListener: { configurable: true, value(type, callback, options) {
    const value = facts(this), callbacks = value.listeners.get(type); callbacks?.delete(callback); if (callbacks?.size === 0) value.listeners.delete(type);
    return remove.call(this, type, callback, options);
  } },
});
const settle = async () => { await nextTick(); await nextTick(); await Promise.resolve(); };
function fixture({ scoped = false, failingSource, pauseOnLoading = false } = {}) {
  const source = shallowRef({ src: '/a.svg' }), active = shallowRef(true), key = shallowRef(0), shown = shallowRef(true), unrelated = shallowRef('a');
  const host = document.createElement('div'); let observation, scope, sourceReads = 0;
  const app = createApp({ setup() {
    const element = useTemplateRef('portrait');
    const start = () => useImage({ element, active, source: () => { sourceReads++; if (failingSource?.value) throw failingSource.failure; return source.value; } });
    if (scoped) { scope = effectScope(); observation = scope.run(start); } else observation = start();
    if (pauseOnLoading) watchSyncEffect(() => { if (observation.snapshot.value?.status === 'loading') active.value = false; });
    return () => h('div', [shown.value ? h('img', { ref: 'portrait', key: key.value, src: source.value.src, alt: '프로필' }) : null,
      h('span', unrelated.value), h('output', observation.snapshot.value?.status ?? 'unobserved')]);
  } });
  const errors = []; app.config.errorHandler = error => errors.push(error); app.mount(host);
  return { app, host, source, active, key, shown, unrelated, observation, errors, get sourceReads() { return sourceReads; }, get scope() { return scope; }, get image() { return host.querySelector('img'); } };
}

test('Vue image revokes stale completion synchronously, reconnects after native patches and preserves equivalent input identity', async () => {
  const f = fixture(), image = f.image, first = facts(image).pending[0];
  assert.equal(f.observation.snapshot.value.status, 'loading'); assert.equal(facts(image).listeners.size, 2);
  assert.equal(isReadonly(f.observation.snapshot), true); assert.equal(isShallow(f.observation.snapshot), true);
  f.source.value = { src: '/b.svg' };
  assert.equal(f.observation.snapshot.value, undefined); assert.equal(facts(image).listeners.size, 0);
  first.resolve(); await settle();
  assert.equal(f.image, image); assert.equal(f.observation.snapshot.value.status, 'loading'); assert.equal(facts(image).pending.length, 2);
  assert.equal(facts(image).pending[1].src, 'https://sectile.test/b.svg');
  facts(image).pending[1].resolve(); await settle(); const ready = f.observation.snapshot.value;
  assert.equal(ready.status, 'ready'); assert.equal(isReactive(ready), false); assert.equal(Object.isFrozen(ready), true);
  const adds = facts(image).adds;
  f.source.value = { src: '/b.svg', label: 'unrelated data' }; f.unrelated.value = 'b'; await settle();
  assert.equal(f.observation.snapshot.value, ready); assert.equal(facts(image).pending.length, 2); assert.equal(facts(image).adds, adds);
  f.source.value = { src: '/c.svg' }; f.source.value = { src: '/b.svg' }; await settle();
  assert.equal(f.observation.snapshot.value.status, 'loading'); assert.equal(facts(image).pending.length, 3);
  assert.equal(facts(image).pending[2].src, 'https://sectile.test/b.svg'); facts(image).pending[2].resolve(); await settle();
  f.app.unmount(); assert.equal(facts(image).listeners.size, 0); assert.equal(f.observation.snapshot.value, undefined); assert.deepEqual(f.errors, []);
});

test('Vue image pause, resume, native replacement and unmount retire every pending port without overlapping listener owners', async () => {
  const f = fixture(), firstImage = f.image, first = facts(firstImage).pending[0];
  f.active.value = false; assert.equal(facts(firstImage).listeners.size, 0); assert.equal(f.observation.snapshot.value, undefined);
  first.reject(Error('old')); await settle(); assert.equal(f.observation.snapshot.value, undefined);
  const sleepingReads = f.sourceReads; f.source.value = { src: '/paused.svg' }; await settle(); assert.equal(f.sourceReads, sleepingReads);
  f.active.value = true; await settle(); assert.equal(facts(firstImage).listeners.size, 2); assert.equal(facts(firstImage).peak, 2);
  const resumed = facts(firstImage).pending[1]; f.key.value++; await settle(); const replacement = f.image;
  assert.notEqual(replacement, firstImage); assert.equal(facts(firstImage).listeners.size, 0); assert.equal(facts(replacement).listeners.size, 2);
  resumed.reject(Error('replaced')); await settle(); assert.equal(f.observation.snapshot.value.status, 'loading');
  f.shown.value = false; await settle(); assert.equal(facts(replacement).listeners.size, 0); assert.equal(f.observation.snapshot.value, undefined);
  f.shown.value = true; await settle(); const last = f.image, saved = facts(last).saved.slice(), pending = facts(last).pending[0];
  f.app.unmount(); for (const callback of saved) callback(); pending.resolve(); await settle();
  assert.equal(facts(last).listeners.size, 0); assert.equal(f.observation.snapshot.value, undefined); assert.equal(f.observation.error.value, undefined); assert.deepEqual(f.errors, []);
});

test('Vue image SSR has no native resources and nested scope retirement remains terminal while the component is mounted', async () => {
  let observation, reads = 0; const before = totalDecodes;
  const html = await renderToString(createSSRApp({ setup() {
    const element = useTemplateRef('portrait'); observation = useImage({ element, source: () => { reads++; return { src: '/ssr.svg' }; } });
    return () => h('img', { ref: 'portrait', src: '/ssr.svg', alt: '프로필', 'data-state': observation.snapshot.value?.status ?? 'unobserved' });
  } }));
  assert.match(html, /data-state="unobserved"/u); assert.equal(totalDecodes, before); assert.equal(reads, 0); assert.equal(observation.snapshot.value, undefined); assert.equal(observation.error.value, undefined);
  const f = fixture({ scoped: true }), image = f.image, pending = facts(image).pending[0];
  f.scope.stop(); assert.equal(facts(image).listeners.size, 0); assert.equal(f.observation.snapshot.value, undefined);
  f.source.value = { src: '/retired.svg' }; pending.resolve(); await settle();
  assert.equal(facts(image).pending.length, 1); assert.equal(f.observation.snapshot.value, undefined); f.app.unmount();
});

test('Vue image reports native admission failure, clears it while inactive, and rejects setup without an owner', async () => {
  assert.throws(() => useImage({}), error => error.code === 'vue.image-scope-required');
  let observation; const element = shallowRef(null), active = shallowRef(true), host = document.createElement('div'), unavailable = new WeakSet();
  const app = createApp({ setup() {
    observation = useImage({ element, source: () => ({ src: '/a.svg' }), active });
    return () => h('img', { src: '/a.svg', ref: node => { if (node && !unavailable.has(node)) { unavailable.add(node); Object.defineProperty(node, 'decode', { configurable: true, value: undefined }); } element.value = node; } });
  } });
  app.mount(host); const image = element.value;
  assert.equal(observation.error.value, 'dom.image-unavailable'); assert.equal(observation.snapshot.value, undefined); assert.equal(facts(image).listeners.size, 0);
  active.value = false; assert.equal(observation.error.value, undefined);
  delete image.decode; active.value = true; await settle(); assert.equal(observation.error.value, undefined); assert.equal(facts(image).listeners.size, 2);
  app.unmount(); assert.equal(facts(image).listeners.size, 0);
});

test('Vue image source getter failures revoke native capability before the Vue error boundary and recover explicitly', async () => {
  const failed = shallowRef(false); failed.failure = Error('source getter');
  const f = fixture({ failingSource: failed }), image = f.image, pending = facts(image).pending[0];
  failed.value = true; assert.equal(facts(image).listeners.size, 0); pending.resolve(); await settle();
  assert.equal(f.observation.snapshot.value, undefined); assert.ok(f.errors.length > 0); assert.ok(f.errors.every(error => error === failed.failure));
  failed.value = false; await settle(); assert.equal(facts(image).listeners.size, 2); assert.equal(facts(image).pending.length, 2); f.app.unmount();
});

test('Vue image retires an owner canceled during its initial native publication before installing a handle', async () => {
  const f = fixture({ pauseOnLoading: true }), image = f.image;
  for (let turn = 0; turn < 3; turn++) {
    await settle(); assert.equal(f.active.value, false); assert.equal(f.observation.snapshot.value, undefined);
    assert.equal(facts(image).listeners.size, 0); assert.equal(facts(image).peak, 2);
    facts(image).pending.at(-1)?.resolve(); await settle();
    f.active.value = true;
  }
  f.app.unmount(); assert.equal(facts(image).listeners.size, 0); assert.deepEqual(f.errors, []);
});

test('Vue image retained readonly results and native callbacks release the retired source getter', { skip: typeof global.gc !== 'function' }, async () => {
  const held = await retired();
  for (let turn = 0; turn < 20; turn++) { await new Promise(resolve => setImmediate(resolve)); global.gc(); }
  assert.equal(held.getter.deref(), undefined); assert.equal(held.observation.snapshot.value, undefined);
  for (const callback of held.callbacks) callback(); held.pending.resolve(); await settle(); assert.equal(held.observation.snapshot.value, undefined);
});
async function retired() {
  let observation; const element = shallowRef(null), source = shallowRef({ src: '/retired.svg' }), getter = () => source.value;
  const app = createApp({ setup() { observation = useImage({ element, source: getter }); return () => h('img', { src: source.value.src, ref: element }); } });
  const host = document.createElement('div'); app.mount(host); const image = element.value;
  const held = { observation, getter: new WeakRef(getter), callbacks: facts(image).saved.slice(), pending: facts(image).pending[0] };
  app.unmount(); return held;
}
