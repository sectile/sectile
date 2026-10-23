import assert from 'node:assert/strict';
import { setImmediate } from 'node:timers/promises';
import { createFileUpload } from '../.verification-dist/form/file-upload.js';
const pending = Promise.withResolvers();
function retire() {
  const file = { name: 'retired.txt', size: 3, type: 'text/plain' }, subscriberData = { key: 'subscriber' }, adapterData = { key: 'adapter' };
  let report, disposed = 0;
  const owner = createFileUpload({ file, adapter(request) {
    void adapterData.key; report = request.reportProgress;
    return { result: pending.promise, dispose() { disposed++; void adapterData.key; } };
  }, onUpdate() { void file.name; }, onCleanupError() { void file.name; } });
  const unsubscribe = owner.subscribe(() => { void subscriberData.key; }); owner.start();
  const held = { owner, start: owner.start, reset: owner.reset, get: owner.getSnapshot, unsubscribe, report,
    references: [new WeakRef(file), new WeakRef(subscriberData), new WeakRef(adapterData)] };
  owner.destroy(); assert.equal(disposed, 1); return held;
}
const held = retire();
for (let n = 0; n < 20; n++) { await setImmediate(); global.gc(); }
for (const reference of held.references) assert.equal(reference.deref(), undefined, 'retired uploader retained caller data while promise stayed pending');
assert.equal(held.get().state, null); assert.equal(held.start(), undefined); assert.equal(held.reset(), undefined); held.unsubscribe();
assert.equal(held.report({ loaded: 1 }).error.code, 'dom.file-upload-inactive');
pending.resolve('late receipt'); await setImmediate(); assert.equal(held.owner.state, null);
console.log('released');
