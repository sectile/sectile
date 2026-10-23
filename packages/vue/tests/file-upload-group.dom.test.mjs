import assert from 'node:assert/strict';
import test from 'node:test';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createTestWindow } from './happy-dom.mjs';
const window = createTestWindow();
Object.assign(globalThis, { window, document: window.document, Node: window.Node, Element: window.Element, HTMLElement: window.HTMLElement, SVGElement: window.SVGElement });
const { createApp, h, KeepAlive, nextTick, shallowRef, effectScope, watch, isReactive } = await import('vue');
const { useFileUploadGroup } = await import('../.verification-dist/form/file-upload.js');
const { provideHostActive } = await import('../.verification-dist/host-provider.js');
const settle = async () => { for (let n = 0; n < 6; n++) await nextTick(); };
const items = count => Array.from({ length: count }, (_, id) => ({ id, file: new window.File(['data'], id + '.txt') }));
function fixture({ count = 3, cached = false } = {}) {
  const source = shallowRef(items(count)), concurrency = shallowRef(2), active = shallowRef(true), enabled = shallowRef(true), shown = shallowRef(true), failed = shallowRef(false);
  const requests = [], tasks = [], errors = [], host = document.createElement('div'); document.body.append(host);
  const adapter = shallowRef(request => { requests.push(request); const pending = Promise.withResolvers();
    const task = { ...pending, result: pending.promise, disposed: 0, dispose() { this.disposed++; } }; tasks.push(task); return task; });
  let api, first, other, key, before;
  const Child = { setup() {
    key = shallowRef(0);
    api = useFileUploadGroup({ items: () => { if (failed.value) throw Error('items unavailable'); return source.value; }, adapter, concurrency, active: enabled });
    first = api.useItem(key); other = api.useItem(count - 1);
    before = { summary: api.snapshot.value, first: first.value, ready: api.ready.value };
    return () => h('output', api.snapshot.value?.state.active ?? 'pending');
  } };
  const app = createApp({ setup() { provideHostActive(active); return () => cached ? h(KeepAlive, null, { default: () => shown.value ? h(Child) : null }) : shown.value ? h(Child) : null; } });
  app.config.errorHandler = error => errors.push(error); app.mount(host);
  return { source, concurrency, active, enabled, shown, failed, adapter, requests, tasks, errors,
    get api() { return api; }, get first() { return first; }, get other() { return other; }, get key() { return key; }, get before() { return before; }, close() { app.unmount(); host.remove(); } };
}
test('Vue group publishes only observed keys without proxying file/receipt or changing unrelated summary/row refs', async () => {
  const f = fixture({ count: 1024 });
  try {
    await settle(); assert.deepEqual(f.before, { summary: undefined, first: undefined, ready: false }); assert.equal(f.requests.length, 0);
    assert.equal(f.api.getItem(0), f.first.value); assert.equal(f.api.getItem(1024), undefined);
    f.api.start([0]); const summary = f.api.snapshot.value, other = f.other.value;
    let firstUpdates = 0, otherUpdates = 0, summaryUpdates = 0;
    const stops = [watch(f.first, () => firstUpdates++, { flush: 'sync' }), watch(f.other, () => otherUpdates++, { flush: 'sync' }), watch(f.api.snapshot, () => summaryUpdates++, { flush: 'sync' })];
    try {
      for (let loaded = 1; loaded <= 32; loaded++) f.requests[0].reportProgress({ loaded, total: 32 });
      assert.equal(firstUpdates, 32); assert.equal(otherUpdates, 0); assert.equal(summaryUpdates, 0); assert.equal(f.api.snapshot.value, summary); assert.equal(f.other.value, other);
      assert.equal(f.first.value.state.file, f.source.value[0].file); assert.equal(isReactive(f.first.value.state.file), false);
      const receipt = { remoteID: 'done' }; f.tasks[0].resolve(receipt); await settle(); assert.equal(f.first.value.state.receipt, receipt); assert.equal(isReactive(receipt), false);
      f.api.start([1]); const unobserved = f.api.getItem(1); assert.equal(unobserved.state.status, 'uploading');
      f.requests[1].reportProgress({ loaded: 1, total: 4 }); assert.equal(f.api.getItem(1).state.loaded, 1);
      assert.equal(f.other.value, other); const hiddenReceipt = { remoteID: 'offscreen' };
      f.tasks[1].resolve(hiddenReceipt); await settle(); assert.equal(f.api.getItem(1).state.receipt, hiddenReceipt);
      assert.equal(isReactive(f.api.getItem(1)), false); assert.equal(f.api.getItem(0), f.first.value);
    } finally { stops.forEach(stop => stop()); }
    assert.deepEqual(f.errors, []);
  } finally { f.close(); }
});
test('scope-owned rows rebind IDs, stop observing on disposal, and stay safe when their group has ended', async () => {
  const f = fixture();
  try {
    await settle(); f.api.start([0]); f.key.value = 1; assert.equal(f.first.value.state.file, f.source.value[1].file);
    const scope = effectScope(); let row;
    scope.run(() => { row = f.api.useItem(0); }); assert.equal(row.value.state.status, 'uploading');
    scope.stop(); assert.equal(row.value, undefined); f.requests[0].reportProgress({ loaded: 1 }); assert.equal(row.value, undefined);
    f.key.value = 99; assert.equal(f.first.value, undefined); f.key.value = 0; assert.equal(f.first.value.state.loaded, 1);
    assert.deepEqual(f.errors, []);
  } finally { f.close(); }
});
test('reactive membership keeps acknowledged/live identities and rejected membership leaves the admitted group intact', async () => {
  const f = fixture();
  try {
    await settle(); f.api.start([0, 1]); f.tasks[0].resolve('receipt'); await settle(); const done = f.first.value, live = f.requests[1];
    const before = f.api.snapshot.value; f.source.value = [f.source.value[0], f.source.value[0]]; await settle();
    assert.equal(f.api.error.value.code, 'duplicate-id'); assert.equal(f.api.snapshot.value, before); assert.equal(f.first.value, done); assert.equal(live.signal.aborted, false);
    const kept = { id: 1, file: live.file }; f.source.value = [{ id: 0, file: done.state.file }, kept, { id: 4, file: items(1)[0].file }]; await settle();
    assert.equal(f.api.error.value, undefined); assert.equal(f.first.value, done); assert.equal(live.signal.aborted, false); assert.equal(f.other.value, undefined);
    f.source.value = [{ id: 0, file: done.state.file }]; await settle(); assert.equal(live.signal.aborted, true); assert.equal(f.tasks[1].disposed, 1); assert.equal(f.first.value.state.receipt, 'receipt');
    assert.deepEqual(f.errors, []);
  } finally { f.close(); }
});
test('concurrency changes are admitted by the native owner and adapter replacement retires the previous lifetime', async () => {
  const f = fixture();
  try {
    await settle(); f.api.start(); f.concurrency.value = 1; await settle(); assert.equal(f.api.error.value.code, 'dom.file-upload-concurrency-active'); assert.equal(f.api.snapshot.value.state.concurrency, 2);
    f.concurrency.value = 3; await settle(); assert.equal(f.api.error.value, undefined); assert.equal(f.requests.length, 3);
    f.adapter.value = request => ({ result: Promise.resolve({ name: request.file.name }) }); await settle();
    assert.ok(f.requests.every(request => request.signal.aborted)); assert.ok(f.tasks.every(task => task.disposed === 1)); assert.equal(f.api.snapshot.value.state.counts.queued, 3);
    f.api.start([0]); await settle(); assert.equal(f.first.value.state.receipt.name, '0.txt'); assert.deepEqual(f.errors, []);
  } finally { f.close(); }
});
test('activity and KeepAlive cancel pending/live work without retrying or losing completed receipts', async () => {
  const f = fixture({ cached: true });
  try {
    await settle(); f.api.start([0]); f.tasks[0].resolve('ack'); await settle(); f.api.start(); f.active.value = false; await settle();
    assert.equal(f.api.ready.value, false); assert.equal(f.first.value.state.receipt, 'ack'); assert.ok(f.requests.slice(1).every(request => request.signal.aborted));
    assert.equal(f.api.getItem(0), f.first.value);
    assert.equal(f.api.start().error.code, 'dom.file-upload-group-inactive'); const requests = f.requests.length;
    f.active.value = true; await settle(); assert.equal(f.requests.length, requests); f.api.start(); f.enabled.value = false; await settle(); assert.equal(f.api.snapshot.value.state.active, 0);
    f.enabled.value = true; await settle(); f.api.start(); f.shown.value = false; await settle(); assert.equal(f.api.ready.value, false); assert.equal(f.api.snapshot.value.state.active, 0);
    f.shown.value = true; await settle(); assert.equal(f.first.value.state.receipt, 'ack'); assert.equal(f.api.ready.value, true); assert.deepEqual(f.errors, []);
  } finally { f.close(); }
});
test('synchronous row-triggered activity changes retire work after the native publication transaction', async () => {
  const f = fixture();
  try {
    await settle(); f.api.start([0]); const stop = watch(f.first, item => { if (item?.state.loaded) f.enabled.value = false; }, { flush: 'sync' });
    f.requests[0].reportProgress({ loaded: 1 }); await settle(); stop(); assert.equal(f.requests[0].signal.aborted, true); assert.equal(f.api.snapshot.value.state.active, 0); assert.deepEqual(f.errors, []);
  } finally { f.close(); }
});
test('adapter replacement during row publication cannot republish a retired generation to another observer', async () => {
  const f = fixture(); const scope = effectScope(); let duplicate;
  try {
    await settle(); scope.run(() => { duplicate = f.api.useItem(0); }); f.api.start([0]);
    const stop = watch(f.first, item => { if (item?.state.loaded) f.adapter.value = () => ({ result: Promise.resolve('new') }); }, { flush: 'sync' });
    f.requests[0].reportProgress({ loaded: 1 }); assert.equal(f.requests[0].signal.aborted, true);
    assert.equal(f.first.value, undefined); assert.equal(duplicate.value, undefined); assert.equal(f.api.ready.value, false);
    await settle(); stop(); assert.equal(duplicate.value.state.status, 'queued'); assert.equal(f.first.value.state.status, 'queued'); assert.deepEqual(f.errors, []);
  } finally { scope.stop(); f.close(); }
});
test('getter failure retires effects and recovers; unmount clears held rows/actions and ignores late settlement', async () => {
  const f = fixture(); await settle(); f.api.start([0]); f.failed.value = true; await settle();
  assert.equal(f.requests[0].signal.aborted, true); assert.equal(f.api.ready.value, false); assert.equal(f.first.value, undefined);
  f.failed.value = false; await settle(); assert.equal(f.api.ready.value, true); assert.equal(f.first.value.state.status, 'queued'); f.api.start([0]);
  const api = f.api, row = f.first; f.close(); assert.equal(f.requests[1].signal.aborted, true); assert.equal(api.snapshot.value, undefined); assert.equal(row.value, undefined); assert.equal(api.error.value, undefined);
  assert.equal(api.start().error.code, 'dom.file-upload-group-inactive'); f.tasks[1].resolve('late'); await settle(); assert.equal(row.value, undefined);
  assert.equal(api.getItem(0), undefined);
  assert.ok(f.errors.some(error => error.message === 'items unavailable'));
});
test('held Vue group APIs and row refs release file and observer payloads even while transport promises remain pending', () => {
  const result = spawnSync(process.execPath, ['--expose-gc', fileURLToPath(new URL('./file-upload-group-gc.worker.mjs', import.meta.url))], { encoding: 'utf8', timeout: 20000 });
  assert.equal(result.status, 0, result.stderr); assert.match(result.stdout, /released/);
});
