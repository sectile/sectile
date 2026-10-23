import assert from 'node:assert/strict';
import { setImmediate } from 'node:timers/promises';
import { createFileUploadGroup } from '../.verification-dist/form/file-upload.js';
const pending = [];
function retire() {
  const files = Array.from({ length: 32 }, (_, n) => ({ name: 'retired-' + n, size: 1, type: '' })), callbackData = { id: 'observer' }, reports = [];
  const owner = createFileUploadGroup({ items: files.map((file, id) => ({ id, file })), concurrency: 2,
    adapter(request) { reports.push(request.reportProgress); const task = Promise.withResolvers(); pending.push(task); return { result: task.promise, dispose() { void callbackData.id; } }; },
    onItemUpdate() { void callbackData.id; }, onUpdate() { void callbackData.id; } });
  const unsubscribe = owner.subscribe(() => { void callbackData.id; }); owner.start();
  const held = { owner, start: owner.start, sync: owner.syncItems, get: owner.getItemSnapshot, unsubscribe, reports, references: [...files.map(file => new WeakRef(file)), new WeakRef(callbackData)] };
  owner.destroy(); return held;
}
const held = retire();
for (let n = 0; n < 20; n++) { await setImmediate(); global.gc(); }
for (const reference of held.references) assert.equal(reference.deref(), undefined, 'retired upload group retained batch data');
assert.equal(held.owner.state.connected, false); assert.deepEqual(held.owner.state.ids, []); assert.equal(held.start(), undefined); held.unsubscribe(); assert.equal(held.get(0), undefined);
for (const report of held.reports) assert.equal(report({ loaded: 1 }).error.code, 'dom.file-upload-inactive');
for (const task of pending) task.resolve('late'); await setImmediate(); assert.equal(held.owner.state.active, 0);
console.log('released');
