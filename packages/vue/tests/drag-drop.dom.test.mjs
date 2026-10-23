import assert from 'node:assert/strict';
import test from 'node:test';
import { createTestWindow } from './happy-dom.mjs';

const window = createTestWindow({ url: 'https://sectile.test/' });
Object.assign(globalThis, { window, document: window.document, Node: window.Node, Element: window.Element, HTMLElement: window.HTMLElement, SVGElement: window.SVGElement });
const { createApp, createSSRApp, effectScope, h, isReactive, isReadonly, isShallow, KeepAlive, nextTick, shallowRef, useTemplateRef, watchSyncEffect } = await import('vue');
const { renderToString } = await import('vue/server-renderer');
const { createDataTransferFormat, useDragSource, useDropTarget } = await import('@sectile/vue/drag-drop');
const { provideHostActive } = await import('@sectile/vue/host-provider');
const types = new Set(['dragstart', 'dragend', 'copy', 'dragenter', 'dragover', 'dragleave', 'drop', 'paste', 'visibilitychange', 'blur']);
const records = new WeakMap(), live = new Set(), saved = [];
let adds = 0, peak = 0, failAdmission = false;
function track(target) {
  const add = target.addEventListener, remove = target.removeEventListener;
  target.addEventListener = function(type, handler, options) {
    if (types.has(type)) {
      let list = records.get(this); if (!list) records.set(this, list = new Map());
      let callbacks = list.get(type); if (!callbacks) list.set(type, callbacks = new Map());
      if (!callbacks.has(handler)) { const resource = {}; callbacks.set(handler, resource); live.add(resource); adds++; }
      saved.push([type, handler]); peak = Math.max(peak, live.size);
    }
    add.call(this, type, handler, options);
    if (failAdmission && type === 'dragover') throw Error('Native admission');
  };
  target.removeEventListener = function(type, handler, options) {
    if (types.has(type)) { const callbacks = records.get(this)?.get(type); live.delete(callbacks?.get(handler)); callbacks?.delete(handler); }
    remove.call(this, type, handler, options);
  };
}
track(window.HTMLElement.prototype); track(document); track(window);
const settle = async () => { await nextTick(); await nextTick(); await Promise.resolve(); };
function dataTransfer(type, value) {
  const values = new Map(type ? [[type, value]] : []);
  return { effectAllowed: 'copyMove', dropEffect: 'copy', mode: 'readwrite', reads: 0,
    get types() { return [...values.keys()]; },
    getData(type) { this.reads++; assert.notEqual(this.mode, 'protected'); return values.get(type) ?? ''; },
    setData(type, value) { assert.equal(this.mode, 'readwrite'); values.set(type, value); }, clearData(type) { values.delete(type); } };
}
function fire(element, type, store) {
  const event = new window.Event(type, { bubbles: true, cancelable: type !== 'dragend' }); event.dataTransfer = store;
  element.dispatchEvent(event); return event;
}
function fixture({ cached = false, scoped = false, pauseOnConnect = false, duringDrop } = {}) {
  const active = shallowRef(true), hostActive = shallowRef(true), shown = shallowRef(true), key = shallowRef(0), unrelated = shallowRef(0);
  const choices = shallowRef(['copy', 'move']), maxTypes = shallowRef(8), value = shallowRef({ id: 'parcel' });
  const requests = [], commits = [], errors = [], rejected = []; let source, target, sourceRef, targetRef, scope, valueReads = 0, decodes = 0;
  const format = shallowRef(createDataTransferFormat({ type: 'application/vnd.sectile.parcel+json', maxBytes: 32,
    decode: () => { decodes++; return { ok: true, value: value.value }; }, encode: item => item.id }));
  const Child = { setup() {
    sourceRef = useTemplateRef('source'); targetRef = useTemplateRef('target');
    const connect = () => {
      source = useDragSource({ element: sourceRef, active, format, operations: () => { void unrelated.value; return choices.value.slice(); }, getValue: () => { valueReads++; return value.value; } });
      target = useDropTarget({ element: targetRef, active, format: () => format.value, operations: choices, maxTypes, onDrop: request => {
        requests.push(request); request.accept(item => { commits.push(item); return { ok: true, value: undefined }; });
        duringDrop?.({ active, format, maxTypes, scope });
      }, onReject: error => rejected.push(error.code) });
    };
    if (scoped) { scope = effectScope(); scope.run(connect); } else connect();
    if (pauseOnConnect) watchSyncEffect(() => { if (source.snapshot.value?.connected) active.value = false; });
    return () => h('div', [h('button', { ref: 'source', key: 'source-' + key.value }, 'Export parcel'),
      h('section', { ref: 'target', key: 'target-' + key.value }, 'Import parcel'), h('output', source.snapshot.value?.active ? 'dragging' : 'idle')]);
  } };
  const app = createApp({ setup() { provideHostActive(hostActive); return () => cached ? h(KeepAlive, null, { default: () => shown.value ? h(Child) : null }) : h(Child); } });
  app.config.errorHandler = error => errors.push(error);
  const host = document.createElement('div'); document.body.append(host); app.mount(host);
  return { app, host, active, hostActive, shown, key, unrelated, choices, maxTypes, value, format, requests, commits, errors, rejected,
    get source() { return source; }, get target() { return target; }, get sourceRef() { return sourceRef; }, get targetRef() { return targetRef; },
    get scope() { return scope; }, get valueReads() { return valueReads; }, get decodes() { return decodes; },
    get sourceElement() { return host.querySelector('button'); }, get targetElement() { return host.querySelector('section'); },
    close() { app.unmount(); host.remove(); } };
}

test('Vue native transfer publishes shallow facts and preserves opaque application values through the DOM owner', async () => {
  const f = fixture();
  try {
    assert.equal(live.size, 11); assert.equal(f.valueReads, 0); assert.equal(f.decodes, 0);
    assert.equal(isShallow(f.source.snapshot), true); assert.equal(isReadonly(f.target.snapshot), true);
    assert.equal(isReactive(f.source.snapshot.value), false); assert.equal(Object.isFrozen(f.target.snapshot.value), true);
    const store = dataTransfer(); fire(f.sourceElement, 'dragstart', store); assert.equal(f.valueReads, 1);
    store.mode = 'protected'; fire(f.targetElement, 'dragover', store); assert.equal(store.reads, 0); assert.equal(f.decodes, 0);
    assert.equal(f.target.snapshot.value.active, true); store.mode = 'readonly'; fire(f.targetElement, 'drop', store);
    assert.equal(f.commits[0], f.value.value); assert.equal(isReactive(f.commits[0]), false); assert.equal(f.decodes, 1);
    assert.equal(f.requests[0].signal.aborted, true); assert.equal(f.target.snapshot.value.active, false);
    fire(f.sourceElement, 'dragend', store); assert.equal(f.source.snapshot.value.active, false);
  } finally { f.close(); }
  assert.equal(live.size, 0); assert.equal(f.source.snapshot.value, undefined); assert.equal(f.target.snapshot.value, undefined); assert.deepEqual(f.errors, []);
});

test('Equivalent operation values preserve native connection identity; policy, target and ABA activity replace it safely', async () => {
  const f = fixture(), cancel = f.source.cancel;
  try {
    const before = adds, snapshot = f.source.snapshot.value;
    f.unrelated.value++; f.value.value = { id: 'updated' }; await settle();
    assert.equal(adds, before); assert.equal(f.source.snapshot.value, snapshot); assert.equal(f.valueReads, 0);
    f.choices.value = ['move']; assert.equal(live.size, 0); assert.equal(f.target.snapshot.value, undefined);
    await settle(); assert.equal(live.size, 11); assert.equal(f.source.cancel, cancel);
    const old = f.sourceElement; f.key.value++; await settle(); assert.notEqual(f.sourceElement, old); assert.equal(live.size, 11);
    assert.equal(old.hasAttribute('draggable'), false);
    f.active.value = false; f.active.value = true; assert.equal(live.size, 0); await settle(); assert.equal(live.size, 11);
  } finally { f.close(); }
  cancel(); assert.equal(live.size, 0); assert.deepEqual(f.errors, []);
});

test('Synchronous participation/configuration/scope retirement during staging prevents native ownership commit', async () => {
  for (const change of ['active', 'policy', 'scope']) {
    const f = fixture({ scoped: change === 'scope', duringDrop: state => {
      if (change === 'active') state.active.value = false;
      if (change === 'policy') state.maxTypes.value = 4;
      if (change === 'scope') state.scope.stop();
    } });
    try {
      const store = dataTransfer(f.format.value.type, 'parcel'); fire(f.targetElement, 'drop', store);
      assert.deepEqual(f.commits, []); assert.equal(store.dropEffect, 'none'); assert.equal(f.requests[0].signal.aborted, true);
      assert.equal(f.requests[0].accept(() => ({ ok: true, value: undefined })), false);
      await settle(); assert.deepEqual(f.errors, []);
    } finally { f.close(); }
    assert.equal(live.size, 0);
  }
});

test('Host and KeepAlive activity suspend both native connections without rebuilding the stable public views', async () => {
  const f = fixture({ cached: true }), source = f.source, target = f.target;
  try {
    f.hostActive.value = false; assert.equal(live.size, 0); assert.equal(source.snapshot.value, undefined);
    f.hostActive.value = true; await settle(); assert.equal(live.size, 11);
    f.shown.value = false; await settle(); assert.equal(live.size, 0); assert.equal(target.snapshot.value, undefined);
    f.shown.value = true; await settle(); assert.equal(live.size, 11); assert.equal(f.source, source); assert.equal(f.target, target);
  } finally { f.close(); }
  assert.equal(live.size, 0); assert.deepEqual(f.errors, []);
});

test('Initial publication may retire synchronously; native admission failure is separate and recovers after reactivation', async () => {
  const paused = fixture({ pauseOnConnect: true }); await settle();
  assert.equal(paused.active.value, false); assert.equal(live.size, 0); assert.equal(paused.source.snapshot.value, undefined); paused.close();
  failAdmission = true; const f = fixture(); failAdmission = false;
  try {
    assert.equal(live.size, 3); assert.equal(f.target.error.value, 'dom.data-transfer-unavailable');
    f.active.value = false; assert.equal(live.size, 0); assert.equal(f.target.error.value, undefined);
    f.active.value = true; await settle(); assert.equal(live.size, 11); assert.equal(f.target.error.value, undefined);
  } finally { f.close(); }
  assert.equal(live.size, 0); assert.deepEqual(f.errors, []);
});

test('SSR and setup-scope validation never invoke native admission or source payload capabilities', async () => {
  let reads = 0, source, target;
  const html = await renderToString(createSSRApp({ setup() {
    const sourceRef = useTemplateRef('source'), targetRef = useTemplateRef('target');
    const format = createDataTransferFormat({ type: 'text/plain', maxBytes: 16, decode: value => ({ ok: true, value }), encode: value => value });
    source = useDragSource({ element: sourceRef, format, operations: ['copy'], getValue: () => { reads++; return 'a'; } });
    target = useDropTarget({ element: targetRef, format, operations: ['copy'], maxTypes: 8, onDrop: () => { reads++; } });
    return () => h('section', { ref: 'target', 'data-state': target.snapshot.value?.active ?? 'unobserved' }, [h('button', { ref: 'source' }, 'Copy')]);
  } }));
  assert.match(html, /data-state="unobserved"/u); assert.equal(reads, 0); assert.equal(live.size, 0);
  assert.equal(source.snapshot.value, undefined); assert.equal(target.snapshot.value, undefined); source.cancel(); target.cancel();
  assert.throws(() => useDragSource({}), { code: 'vue.data-transfer-scope-required' });
});

async function retired() {
  const f = fixture(); fire(f.targetElement, 'drop', dataTransfer(f.format.value.type, 'parcel'));
  const result = { source: f.source, target: f.target, cancel: f.source.cancel, request: f.requests[0], callbacks: saved.slice(),
    refs: [f.sourceElement, f.targetElement, f.value.value, f.value, f.active, f.format, f.sourceRef, f.targetRef].map(value => new WeakRef(value)) };
  f.close(); return result;
}
test('Saved Vue methods/publication/request views and native callbacks release retired caller refs and elements', { skip: typeof globalThis.gc !== 'function' }, async () => {
  const held = await retired();
  for (let index = 0; index < 20; index++) { await new Promise(resolve => setImmediate(resolve)); globalThis.gc(); }
  assert.deepEqual(held.refs.map(reference => reference.deref() === undefined), Array(8).fill(true));
  held.cancel(); for (const [type, callback] of held.callbacks) callback(new window.Event(type));
  assert.equal(held.source.snapshot.value, undefined); assert.equal(held.target.snapshot.value, undefined);
  assert.equal(held.request.getValue().error.code, 'dom.data-transfer-inactive'); assert.equal(live.size, 0); assert.equal(peak, 11);
});
