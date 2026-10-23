import assert from 'node:assert/strict';
import { setImmediate } from 'node:timers/promises';
import { Window } from 'happy-dom';
globalThis.__VUE_DEVTOOLS_GLOBAL_HOOK__ = { emit() {} };
const window = new Window(); Object.assign(globalThis, { window, document: window.document, Node: window.Node, Element: window.Element, HTMLElement: window.HTMLElement, SVGElement: window.SVGElement });
const { createApp, h, nextTick, shallowRef } = await import('vue');
const { useFileUpload } = await import('../.verification-dist/form/file-upload.js');
const pending = Promise.withResolvers();
async function retire() {
  const file = new window.File(['payload'], 'retired.txt'), data = { marker: 'adapter' }, source = shallowRef(file); let api, report, disposed = 0;
  const adapter = shallowRef(request => { report = request.reportProgress; return { result: pending.promise, dispose() { disposed++; void data.marker; } }; });
  const host = document.createElement('div'); document.body.append(host);
  const app = createApp({ setup() {
    api = useFileUpload({ file: source, adapter, onCleanupError() { void data.marker; } }); return () => h('div');
  } });
  app.mount(host); for (let n = 0; n < 6; n++) await nextTick(); api.start();
  const held = { api, report, references: [new WeakRef(file), new WeakRef(data)] };
  app.unmount(); host.remove(); await nextTick(); assert.equal(disposed, 1); return held;
}
const held = await retire();
for (let n = 0; n < 20; n++) { await setImmediate(); global.gc(); }
for (const reference of held.references) assert.equal(reference.deref(), undefined, 'held Vue upload API retained retired inputs');
assert.equal(held.api.snapshot.value, undefined); assert.equal(held.api.error.value, undefined); assert.equal(held.api.ready.value, false);
assert.equal(held.api.start().error.code, 'dom.file-upload-inactive'); assert.equal(held.report({ loaded: 1 }).error.code, 'dom.file-upload-inactive');
pending.resolve('late'); await nextTick(); assert.equal(held.api.snapshot.value, undefined);
await window.happyDOM.close(); console.log('released');
