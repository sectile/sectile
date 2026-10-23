import assert from 'node:assert/strict';
import test from 'node:test';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createFileUploadGroup, tryCreateFileUploadGroup } from '../.verification-dist/form/file-upload.js';
const turn = () => new Promise(resolve => setTimeout(resolve, 5));
const settle = async () => { for (let n = 0; n < 5; n++) await Promise.resolve(); };
const file = name => ({ name, size: 1, type: 'text/plain' });
const items = names => names.map(id => ({ id, file: file(id + '.txt') }));
function fixture(source = items(['a', 'b', 'c', 'd']), options = {}) {
  const requests = [], tasks = [], updates = [], cleanupErrors = [], waiters = []; let summaries = 0, live = 0, peak = 0;
  const owner = createFileUploadGroup({ items: source, concurrency: 2, adapter(request) {
    requests.push(request); const pending = Promise.withResolvers(); live++; peak = Math.max(peak, live);
    const task = { ...pending, result: pending.promise, disposed: 0, dispose() { this.disposed++; live--; } }; tasks.push(task);
    for (const waiter of waiters) if (requests.length >= waiter.count) waiter.resolve();
    return task;
  }, onItemUpdate: (id, snapshot) => updates.push({ id, snapshot }), onUpdate() { summaries++; }, onCleanupError: error => cleanupErrors.push(error), ...options });
  return { owner, requests, tasks, updates, cleanupErrors,
    wait(count) { if (requests.length >= count) return Promise.resolve(); const pending = Promise.withResolvers(); waiters.push({ count, resolve: pending.resolve }); return pending.promise; },
    get summaries() { return summaries; }, get live() { return live; }, get peak() { return peak; } };
}
test('upload group is lazy, bounded and FIFO while completed native owners release their slots before the next turn', async () => {
  const f = fixture();
  try {
    assert.equal(f.requests.length, 0); assert.equal(f.owner.state.counts.queued, 4); f.owner.start();
    assert.deepEqual(f.requests.map(request => request.file.name), ['a.txt', 'b.txt']); assert.equal(f.owner.state.active, 2); assert.equal(f.owner.state.pending, 2);
    f.tasks[0].resolve({ stored: 'a' }); await settle(); assert.equal(f.live, 1); assert.equal(f.owner.getItemSnapshot('a').state.status, 'succeeded');
    assert.equal(f.requests.length, 2, 'completion must yield before starting another adapter'); await f.wait(3); assert.equal(f.requests[2].file.name, 'c.txt');
    f.tasks[1].resolve({ stored: 'b' }); await f.wait(4); assert.equal(f.requests[3].file.name, 'd.txt'); assert.ok(f.peak <= 2);
    f.tasks[2].resolve('c'); f.tasks[3].resolve('d'); await settle(); assert.equal(f.live, 0); assert.equal(f.owner.state.counts.succeeded, 4); assert.equal(f.owner.state.active, 0);
  } finally { f.owner.destroy(); }
});
test('progress is item-local with stable summary/other-row identity and no unrelated metadata reads', () => {
  let reads = 0;
  const source = Array.from({ length: 1024 }, (_, id) => ({ id, file: { get name() { reads++; return 'f' + id; }, get type() { reads++; return ''; }, get size() { reads++; return 1; } } }));
  const f = fixture(source, { concurrency: 1 });
  try {
    assert.ok(reads <= source.length * 6); f.owner.start([0]); reads = 0; f.updates.length = 0;
    const summary = f.owner.getSnapshot(), other = f.owner.getItemSnapshot(1023), summaries = f.summaries;
    for (let loaded = 1; loaded <= 32; loaded++) f.requests[0].reportProgress({ loaded, total: 32 });
    assert.equal(reads, 0); assert.equal(f.owner.getSnapshot(), summary); assert.equal(f.owner.getItemSnapshot(1023), other); assert.equal(f.summaries, summaries);
    assert.equal(f.updates.length, 32); assert.ok(f.updates.every(update => update.id === 0));
    const current = f.owner.getItemSnapshot(0); f.requests[0].reportProgress({ loaded: 32 }); assert.equal(f.owner.getItemSnapshot(0), current); assert.equal(f.updates.length, 32);
  } finally { f.owner.destroy(); }
});
test('pending middle/tail cancellation preserves FIFO links and retry/reset invalidate old task callbacks', async () => {
  const f = fixture(items(['a', 'b', 'c', 'd', 'e']), { concurrency: 1 });
  try {
    f.owner.start(); f.owner.cancel(['c', 'e']); assert.equal(f.owner.state.pending, 2);
    f.tasks[0].resolve('a'); await f.wait(2); assert.equal(f.requests[1].file.name, 'b.txt');
    f.owner.cancel(['b']); assert.equal(f.requests[1].signal.aborted, true); await f.wait(3); assert.equal(f.requests[2].file.name, 'd.txt');
    f.owner.start(['c']); assert.equal(f.owner.getItemSnapshot('c').state.status, 'queued');
    f.owner.reset(['d']); assert.equal(f.requests[2].signal.aborted, true); await f.wait(4); assert.equal(f.requests[3].file.name, 'c.txt');
    f.tasks[1].resolve('late b'); f.tasks[2].reject(Error('late d')); await settle(); assert.equal(f.owner.getItemSnapshot('d').state.status, 'queued');
    f.owner.reset(); assert.equal(f.owner.state.pending, 0); assert.equal(f.owner.state.active, 0); assert.equal(f.owner.state.counts.queued, 5); assert.equal(f.live, 0);
  } finally { f.owner.destroy(); }
});
test('membership admission is atomic, retains same ID/file jobs and receipts, and removes/replaces only affected native owners', async () => {
  const source = items(['a', 'b', 'c']), f = fixture(source);
  try {
    f.owner.start(); const a = f.owner.getItemSnapshot('a'), before = f.owner.getSnapshot();
    assert.equal(f.owner.syncItems([source[0], source[0]]).ok, false); assert.equal(f.owner.getSnapshot(), before); assert.equal(f.live, 2);
    f.tasks[0].resolve('receipt a'); await f.wait(3); const done = f.owner.getItemSnapshot('a');
    const replacement = { id: 'b', file: file('new-b.txt') };
    assert.equal(f.owner.syncItems([source[2], source[0], replacement, { id: 'd', file: file('d.txt') }]).ok, true);
    assert.equal(f.owner.getItemSnapshot('a'), done); assert.equal(f.owner.getItemSnapshot('a').state.receipt, 'receipt a'); assert.equal(f.owner.getItemSnapshot('c').state.status, 'uploading');
    assert.equal(f.requests[1].signal.aborted, true); assert.equal(f.owner.getItemSnapshot('b').state.status, 'queued'); assert.equal(f.owner.state.pending, 0);
    const current = f.owner.getSnapshot(); f.owner.syncItems([source[2], source[0], replacement, { id: 'd', file: f.owner.getItemSnapshot('d').state.file }]); assert.equal(f.owner.getSnapshot(), current);
    f.owner.syncItems([source[0]]); assert.equal(f.owner.getItemSnapshot('c'), undefined); assert.equal(f.requests[2].signal.aborted, true);
    assert.ok(f.updates.some(update => update.id === 'c' && update.snapshot === undefined)); assert.notEqual(a, done);
  } finally { f.owner.destroy(); }
});
test('concurrency changes preserve the admitted slot bound and reject an invalid subset before changing any item', () => {
  const f = fixture();
  try {
    f.owner.start(); const before = f.owner.getSnapshot();
    assert.equal(f.owner.setConcurrency(1).error.code, 'dom.file-upload-concurrency-active'); assert.equal(f.owner.getSnapshot(), before);
    assert.equal(f.owner.start(['c', 'missing']).error.code, 'dom.file-upload-item-missing'); assert.equal(f.owner.getSnapshot(), before);
    f.owner.setConcurrency(3); assert.equal(f.requests.length, 3); assert.equal(f.live, 3); f.owner.cancel(['b', 'c']); f.owner.setConcurrency(1); assert.equal(f.owner.state.concurrency, 1); assert.equal(f.live, 1);
    const current = f.owner.getSnapshot(); f.owner.setConcurrency(1); assert.equal(f.owner.getSnapshot(), current);
    assert.equal(f.owner.setConcurrency(0).ok, false); assert.equal(f.owner.getSnapshot(), current);
  } finally { f.owner.destroy(); }
});
test('count ceilings reject before indexing and one synchronous-failure drain launches at most its available slots', async () => {
  const source = items(['a', 'b']); let touched = 0;
  Object.defineProperty(source, 0, { get() { touched++; throw Error('count must reject first'); } });
  assert.equal(tryCreateFileUploadGroup({ items: source, maxFiles: 1, adapter() {} }).error.code, 'form-file-count-exceeded'); assert.equal(touched, 0);
  let calls = 0;
  const owner = createFileUploadGroup({ items: items(Array.from({ length: 64 }, (_, n) => String(n))), concurrency: 2, adapter() { calls++; throw Error('synchronous failure'); } });
  try {
    owner.start(); assert.equal(calls, 2); assert.equal(owner.state.active, 0); assert.equal(owner.state.pending, 62);
    owner.cancel(); await turn(); assert.equal(calls, 2); assert.equal(owner.state.pending, 0);
  } finally { owner.destroy(); }
});
test('callback transactions reject mutating reentry; callback failure stops queued/live work and explicit recovery remains possible', () => {
  let owner, fail = false, reentry; const error = Error('observer failed'), tasks = [];
  owner = createFileUploadGroup({ items: items(['a', 'b', 'c']), concurrency: 2, adapter() { const pending = Promise.withResolvers(); const task = { result: pending.promise, disposed: 0, dispose() { this.disposed++; } }; tasks.push(task); return task; },
    onItemUpdate() { reentry = owner.reset(); if (fail) throw error; } });
  try {
    owner.start(); assert.equal(reentry.error.code, 'dom.file-upload-group-busy'); fail = true;
    assert.throws(() => owner.reset(['a']), error); assert.equal(owner.state.active, 0); assert.equal(owner.state.pending, 0); assert.ok(tasks.every(task => task.disposed === 1));
    fail = false; owner.start(['b']); assert.equal(owner.getItemSnapshot('b').state.status, 'uploading'); assert.equal(owner.state.active, 1);
  } finally { owner.destroy(); }
});
test('destroy during adapter publication cannot revive an owner or run an adapter after the lifetime ends', () => {
  let owner, calls = 0;
  owner = createFileUploadGroup({ items: items(['a', 'b']), adapter() { calls++; return { result: new Promise(() => {}) }; }, onItemUpdate() { owner.destroy(); } });
  owner.start(); assert.equal(calls, 0); assert.equal(owner.state.connected, false); assert.deepEqual(owner.state.ids, []); assert.equal(owner.state.active, 0);
  const other = fixture(items(['a']));
  const destructive = { get name() { other.owner.destroy(); return 'replacement'; }, size: 1, type: '' };
  other.owner.syncItems([{ id: 'a', file: destructive }]); assert.equal(other.owner.state.connected, false); assert.deepEqual(other.owner.state.ids, []); assert.equal(other.owner.getItemSnapshot('a'), undefined);
});
test('one pump timer and occupied task resources are cleared on reset/destroy', async () => {
  const originalSet = globalThis.setTimeout, originalClear = globalThis.clearTimeout, timers = new Set(); let peak = 0;
  globalThis.setTimeout = (callback, delay, ...args) => { const handle = originalSet(() => { timers.delete(handle); callback(...args); }, delay); timers.add(handle); peak = Math.max(peak, timers.size); return handle; };
  globalThis.clearTimeout = handle => { timers.delete(handle); return originalClear(handle); };
  const f = fixture(items(['a', 'b', 'c']), { concurrency: 1 });
  try {
    f.owner.start(); f.tasks[0].resolve('a'); await settle(); assert.equal(timers.size, 1);
    f.owner.reset(); assert.equal(timers.size, 0); await new Promise(resolve => originalSet(resolve, 5)); assert.equal(f.requests.length, 1);
    f.owner.start(); f.owner.cancel(['a']); assert.ok(timers.size <= 1); f.owner.destroy(); assert.equal(timers.size, 0); assert.ok(peak <= 1); assert.equal(f.live, 0);
  } finally { f.owner.destroy(); globalThis.setTimeout = originalSet; globalThis.clearTimeout = originalClear; }
});
test('saved group methods, pending promises and retired reporters release batch payloads', () => {
  const result = spawnSync(process.execPath, ['--expose-gc', fileURLToPath(new URL('./file-upload-group-gc.worker.mjs', import.meta.url))], { encoding: 'utf8', timeout: 20000 });
  assert.equal(result.status, 0, result.stderr); assert.match(result.stdout, /released/);
});
