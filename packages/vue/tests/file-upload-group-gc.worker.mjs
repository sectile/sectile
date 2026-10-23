import assert from 'node:assert/strict';
import { setImmediate } from 'node:timers/promises';
import { Window } from 'happy-dom';
globalThis.__VUE_DEVTOOLS_GLOBAL_HOOK__ = { emit() {} };
const window = new Window(); Object.assign(globalThis, { window, document: window.document, Node: window.Node, Element: window.Element, HTMLElement: window.HTMLElement, SVGElement: window.SVGElement });
const { createApp, h, nextTick, shallowRef } = await import('vue');
const { useFileUploadGroup } = await import('../.verification-dist/form/file-upload.js');
const pending = [];
async function retire() {
  const files = Array.from({ length: 32 }, (_, id) => new window.File(['payload'], id + '.txt')), data = { marker: 'adapter' }, source = shallowRef(files.map((file, id) => ({ id, file })));
  const keyData = { id: 0 }, reports = []; let api, row, disposed = 0;
  const adapter = shallowRef(request => { reports.push(request.reportProgress); const task = Promise.withResolvers(); pending.push(task); return { result: task.promise, dispose() { disposed++; void data.marker; } }; });
  const host = document.createElement('div'); document.body.append(host);
  const app = createApp({ setup() { api = useFileUploadGroup({ items: source, adapter, onCleanupError() { void data.marker; } }); row = api.useItem(() => keyData.id); return () => h('div'); } });
  app.mount(host); for (let n = 0; n < 6; n++) await nextTick(); api.start();
  const held = { api, row, useItem: api.useItem, reports, references: [...files.map(file => new WeakRef(file)), new WeakRef(data), new WeakRef(keyData)] };
  app.unmount(); host.remove(); await nextTick(); assert.equal(disposed, 3); return held;
}
const held = await retire();
for (let n = 0; n < 20; n++) { await setImmediate(); global.gc(); }
for (const reference of held.references) assert.equal(reference.deref() === undefined, true, 'held Vue group API/row retained retired inputs');
assert.equal(held.api.snapshot.value, undefined); assert.equal(held.row.value, undefined); assert.equal(held.api.ready.value, false);
assert.equal(held.api.start().error.code, 'dom.file-upload-group-inactive');
assert.equal(held.api.getItem(0), undefined);
for (const report of held.reports) assert.equal(report({ loaded: 1 }).error.code, 'dom.file-upload-inactive');
for (const task of pending) task.resolve('late'); await nextTick(); assert.equal(held.row.value, undefined);
await window.happyDOM.close(); console.log('released');
