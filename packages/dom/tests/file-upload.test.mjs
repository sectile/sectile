import assert from 'node:assert/strict';
import test from 'node:test';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createFileUpload, tryCreateFileUpload } from '../.verification-dist/form/file-upload.js';
const file = Object.freeze({ name: 'invoice.txt', size: 3, type: 'text/plain', itemID: 'invoice' });
const settle = async () => { for (let n = 0; n < 5; n++) await Promise.resolve(); };
function fixture(options = {}) {
  const requests = [], tasks = [], cleanupErrors = []; let updates = 0, live = 0;
  const owner = createFileUpload({ file, adapter(request) {
    requests.push(request); const pending = Promise.withResolvers(); live++;
    const task = { ...pending, result: pending.promise, disposed: 0, dispose() { this.disposed++; live--; } };
    tasks.push(task); return task;
  }, onUpdate() { updates++; }, onCleanupError: error => cleanupErrors.push(error), ...options });
  return { owner, requests, tasks, cleanupErrors, get updates() { return updates; }, get live() { return live; } };
}
test('upload host construction is lazy, preserves the file subtype and does not need browser globals or AbortController until start', () => {
  const Controller = globalThis.AbortController; let calls = 0, owner;
  try {
    globalThis.AbortController = undefined;
    owner = createFileUpload({ file, adapter() { calls++; return { result: Promise.resolve('receipt') }; } });
    assert.equal(calls, 0); assert.equal(owner.state.status, 'queued'); assert.equal(owner.state.file, file);
    assert.equal(owner.start().error.code, 'dom.file-upload-unavailable'); assert.equal(owner.state.status, 'queued');
    assert.equal(tryCreateFileUpload({ file, adapter: null }).error.code, 'dom.file-upload-invalid');
    assert.equal(tryCreateFileUpload({ file: { ...file, size: -1 }, adapter() {} }).error.code, 'form-file-selection-invalid');
  } finally { globalThis.AbortController = Controller; owner?.destroy(); }
});
test('adapter progress/receipt flows through Form, no-op progress does not publish, and normal completion disposes once', async () => {
  const f = fixture();
  try {
    assert.equal(f.owner.start().ok, true); const request = f.requests[0], task = f.tasks[0];
    assert.equal(request.file, file); assert.equal(request.signal.aborted, false); assert.equal(f.live, 1);
    assert.equal(request.reportProgress({ loaded: 3, total: 3 }).ok, true); assert.equal(f.owner.state.status, 'uploading');
    const snapshot = f.owner.getSnapshot(), updates = f.updates;
    request.reportProgress({ loaded: 3 }); assert.equal(f.owner.getSnapshot(), snapshot); assert.equal(f.updates, updates);
    const receipt = { remoteID: 'saved' }; task.resolve(receipt); await settle();
    assert.equal(f.owner.state.status, 'succeeded'); assert.equal(f.owner.state.receipt, receipt);
    assert.equal(task.disposed, 1); assert.equal(f.live, 0); assert.equal(request.signal.aborted, false);
    assert.equal(request.reportProgress({ loaded: 4 }).error.code, 'dom.file-upload-inactive');
    f.owner.destroy(); assert.equal(task.disposed, 1); assert.equal(f.owner.state, null);
  } finally { f.owner.destroy(); }
});
test('cancel/reset abort and dispose before retry while retired promise/progress cannot overwrite a newer attempt', async () => {
  const f = fixture();
  try {
    f.owner.start(); const first = f.requests[0];
    f.owner.cancel(); assert.equal(first.signal.aborted, true); assert.equal(f.tasks[0].disposed, 1); assert.equal(f.live, 0);
    f.owner.start(); assert.notEqual(first.attempt, f.requests[1].attempt); assert.equal(f.live, 1);
    f.tasks[0].resolve({ remoteID: 'late first' }); await settle(); assert.equal(f.owner.state.status, 'uploading');
    assert.equal(first.reportProgress({ loaded: 1 }).error.code, 'dom.file-upload-inactive');
    f.owner.reset(); assert.equal(f.owner.state.status, 'queued'); assert.equal(f.requests[1].signal.aborted, true); assert.equal(f.tasks[1].disposed, 1);
    f.owner.start(); f.tasks[1].reject(Error('late rejection')); await settle(); assert.equal(f.owner.state.status, 'uploading');
    f.tasks[2].resolve('latest'); await settle(); assert.equal(f.owner.state.receipt, 'latest'); assert.equal(f.live, 0);
  } finally { f.owner.destroy(); }
});
test('adapter setup/task failures become failed attempts and still drain results and release returned task resources', async () => {
  for (const kind of ['throw', 'invalid-result', 'result-getter', 'dispose-getter', 'reject']) {
    const failure = Error(kind); let disposed = 0;
    const owner = createFileUpload({ file, adapter() {
      if (kind === 'throw') throw failure;
      if (kind === 'result-getter') return { get result() { throw failure; }, dispose() { disposed++; } };
      if (kind === 'dispose-getter') return { result: Promise.reject(failure), get dispose() { throw failure; } };
      return { result: kind === 'invalid-result' ? 1 : Promise.reject(failure), dispose() { disposed++; } };
    } });
    try {
      owner.start(); await settle(); assert.equal(owner.state.status, 'failed', kind);
      assert.equal(disposed, kind === 'throw' || kind === 'dispose-getter' ? 0 : 1, kind);
      if (kind !== 'invalid-result') assert.equal(owner.state.error, failure, kind);
    } finally { owner.destroy(); }
  }
});
test('synchronous adapter progress can cancel before task return and the late disposer still runs exactly once', async () => {
  const pending = Promise.withResolvers(); let owner, request, disposed = 0, busy;
  owner = createFileUpload({ file, adapter(value) {
    request = value; value.reportProgress({ loaded: 1 }); owner.cancel(); busy = owner.start();
    return { result: pending.promise, dispose() { disposed++; } };
  } });
  try {
    owner.start(); assert.equal(owner.state.status, 'canceled'); assert.equal(request.signal.aborted, true);
    assert.equal(busy.error.code, 'dom.file-upload-busy'); assert.equal(disposed, 1);
    pending.resolve('late'); await settle(); assert.equal(owner.state.status, 'canceled');
    owner.destroy(); assert.equal(disposed, 1);
  } finally { owner.destroy(); }
});
test('publication can retire a start before invoking the adapter and cleanup reentry cannot start a second owned task', () => {
  let calls = 0, owner, busy;
  owner = createFileUpload({ file, adapter() { calls++; return { result: new Promise(() => {}), dispose() { busy = owner.start(); } }; } });
  const stop = owner.subscribe(() => { if (owner.state?.status === 'uploading') owner.cancel(); });
  try {
    owner.start(); assert.equal(calls, 0); assert.equal(owner.state.status, 'canceled'); stop();
    owner.start(); assert.equal(calls, 1); owner.cancel(); assert.equal(busy.error.code, 'dom.file-upload-busy');
  } finally { owner.destroy(); }
});
test('cleanup errors are surfaced once without replacing an acknowledged receipt or reviving the attempt', async () => {
  const cleanupError = Error('release failed'), errors = [], pending = Promise.withResolvers(); let disposed = 0;
  const owner = createFileUpload({ file, adapter() { return { result: pending.promise, dispose() { disposed++; throw cleanupError; } }; }, onCleanupError: error => errors.push(error) });
  try {
    owner.start(); pending.resolve('acknowledged'); await settle();
    assert.equal(owner.state.status, 'succeeded'); assert.equal(owner.state.receipt, 'acknowledged'); assert.deepEqual(errors, [cleanupError]);
    owner.destroy(); assert.equal(disposed, 1); assert.deepEqual(errors, [cleanupError]);
  } finally { owner.destroy(); }
});
test('progress reads each adapter field once and a retired reporter does not inspect further caller payload', () => {
  const f = fixture();
  try {
    f.owner.start(); let totals = 0; const report = f.requests[0].reportProgress;
    assert.equal(report({ loaded: 1, get total() { totals++; return 3; } }).ok, true); assert.equal(totals, 1);
    assert.equal(report(null).error.code, 'form-upload-event-invalid'); f.owner.cancel();
    assert.equal(report({ get loaded() { throw Error('must not read retired payload'); } }).error.code, 'dom.file-upload-inactive');
  } finally { f.owner.destroy(); }
});
test('a throwing update callback retires its attempt and leaves the logical owner recoverable without orphan tasks', () => {
  const error = Error('subscriber failed'); let fail = true, calls = 0;
  const owner = createFileUpload({ file, adapter() { calls++; return { result: new Promise(() => {}) }; }, onUpdate() { if (fail) throw error; } });
  try {
    assert.throws(() => owner.start(), error); assert.equal(owner.state.status, 'failed'); assert.equal(calls, 0);
    fail = false; assert.equal(owner.start().ok, true); assert.equal(calls, 1); assert.equal(owner.state.status, 'uploading');
  } finally { owner.destroy(); }
});
test('owned task resources stay bounded under cancel/retry churn', async () => {
  const f = fixture();
  try {
    for (let n = 0; n < 32; n++) {
      f.owner.start(); assert.equal(f.live, 1); assert.equal(f.owner.start().ok, false);
      f.owner.cancel(); assert.equal(f.live, 0); f.tasks[n].resolve('retired');
    }
    await settle(); assert.equal(f.owner.state.status, 'canceled'); assert.ok(f.tasks.every(task => task.disposed === 1));
    f.owner.destroy(); assert.equal(f.live, 0);
  } finally { f.owner.destroy(); }
});
test('saved methods, reporters and unresolved promises release retired file, adapter and subscriber references', () => {
  const result = spawnSync(process.execPath, ['--expose-gc', fileURLToPath(new URL('./file-upload-gc.worker.mjs', import.meta.url))], { encoding: 'utf8', timeout: 20000 });
  assert.equal(result.status, 0, result.stderr); assert.match(result.stdout, /released/);
});
