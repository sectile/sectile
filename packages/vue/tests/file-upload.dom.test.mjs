import assert from 'node:assert/strict';
import test from 'node:test';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createTestWindow } from './happy-dom.mjs';
const window = createTestWindow();
Object.assign(globalThis, { window, document: window.document, Node: window.Node, Element: window.Element,
  HTMLElement: window.HTMLElement, SVGElement: window.SVGElement });
const { createApp, h, KeepAlive, nextTick, shallowRef, isReactive } = await import('vue');
const { useFileUpload } = await import('../.verification-dist/form/file-upload.js');
const { provideHostActive } = await import('../.verification-dist/host-provider.js');
const settle = async () => { for (let n = 0; n < 6; n++) await nextTick(); };
const file = name => new window.File([name], name, { type: 'text/plain' });
function fixture({ cached = false, initial = file('initial.txt') } = {}) {
  const source = shallowRef(initial), active = shallowRef(true), enabled = shallowRef(true), shown = shallowRef(true), sourceFailure = shallowRef(false), activityFailure = shallowRef(false);
  const requests = [], tasks = [], errors = [], host = document.createElement('div'); document.body.append(host);
  let api, beforeMount;
  const adapter = shallowRef(request => {
    requests.push(request); const pending = Promise.withResolvers();
    const task = { ...pending, result: pending.promise, disposed: 0, dispose() { this.disposed++; } }; tasks.push(task); return task;
  });
  const Child = { setup() {
    api = useFileUpload({ file: () => { if (sourceFailure.value) throw Error('source unavailable'); return source.value; }, adapter,
      active: () => { if (activityFailure.value) throw Error('activity unavailable'); return enabled.value; } });
    beforeMount = { snapshot: api.snapshot.value, ready: api.ready.value, error: api.error.value };
    return () => h('output', api.snapshot.value?.state?.status ?? 'pending');
  } };
  const app = createApp({ setup() { provideHostActive(active); return () => cached
    ? h(KeepAlive, null, { default: () => shown.value ? h(Child) : null }) : shown.value ? h(Child) : null; } });
  app.config.errorHandler = error => errors.push(error); app.mount(host);
  return { source, active, enabled, shown, sourceFailure, activityFailure, adapter, requests, tasks, errors, host,
    get api() { return api; }, get beforeMount() { return beforeMount; }, close() { app.unmount(); host.remove(); } };
}
test('Vue upload is lazy, shallow and preserves original file/receipt identity with readonly publication', async () => {
  const f = fixture();
  try {
    await settle(); assert.deepEqual(f.beforeMount, { snapshot: undefined, ready: false, error: undefined });
    assert.equal(f.api.ready.value, true); assert.equal(f.requests.length, 0); assert.equal(f.api.snapshot.value.state.status, 'queued');
    const start = f.api.start; assert.equal(f.api.start, start); start(); assert.equal(f.requests.length, 1);
    assert.equal(f.requests[0].file, f.source.value); assert.equal(isReactive(f.api.snapshot.value.state.file), false);
    f.requests[0].reportProgress({ loaded: 1, total: 1 }); assert.equal(f.api.snapshot.value.state.status, 'uploading');
    const snapshot = f.api.snapshot.value; f.requests[0].reportProgress({ loaded: 1 }); assert.equal(f.api.snapshot.value, snapshot);
    const receipt = { remoteID: 'stored' }; f.tasks[0].resolve(receipt); await settle();
    assert.equal(f.api.snapshot.value.state.receipt, receipt); assert.equal(isReactive(receipt), false); assert.equal(f.tasks[0].disposed, 1); assert.deepEqual(f.errors, []);
  } finally { f.close(); }
});
test('file and adapter ref replacement retires the old native attempt before admitting a new logical owner', async () => {
  const f = fixture();
  try {
    await settle(); f.api.start(); const first = f.requests[0]; f.source.value = file('replacement.txt'); await settle();
    assert.equal(first.signal.aborted, true); assert.equal(f.tasks[0].disposed, 1); assert.equal(f.api.snapshot.value.state.status, 'queued');
    f.tasks[0].resolve('old file'); await settle(); assert.equal(f.api.snapshot.value.state.status, 'queued');
    f.api.start(); assert.equal(f.requests[1].file, f.source.value);
    f.adapter.value = request => ({ result: Promise.resolve({ alternate: request.file.name }) }); await settle();
    assert.equal(f.requests[1].signal.aborted, true); assert.equal(f.tasks[1].disposed, 1); assert.equal(f.api.snapshot.value.state.status, 'queued');
    f.api.start(); await settle(); assert.deepEqual(f.api.snapshot.value.state.receipt, { alternate: 'replacement.txt' }); assert.deepEqual(f.errors, []);
  } finally { f.close(); }
});
test('HostActive, explicit activity and KeepAlive cancel running work without automatic restart or lost acknowledged receipts', async () => {
  const f = fixture({ cached: true });
  try {
    await settle(); f.api.start(); f.active.value = false; await settle();
    assert.equal(f.requests[0].signal.aborted, true); assert.equal(f.api.ready.value, false); assert.equal(f.api.snapshot.value.state.status, 'canceled');
    assert.equal(f.api.start().error.code, 'dom.file-upload-inactive'); f.active.value = true; await settle(); assert.equal(f.requests.length, 1);
    f.api.start(); f.enabled.value = false; await settle(); assert.equal(f.tasks[1].disposed, 1); f.enabled.value = true; await settle();
    f.api.start(); f.shown.value = false; await settle(); assert.equal(f.requests[2].signal.aborted, true); assert.equal(f.api.ready.value, false);
    f.shown.value = true; await settle(); assert.equal(f.requests.length, 3); f.api.start(); f.tasks[3].resolve('acknowledged'); await settle();
    f.active.value = false; await settle(); assert.equal(f.api.snapshot.value.state.receipt, 'acknowledged');
    f.active.value = true; await settle(); assert.equal(f.api.snapshot.value.state.receipt, 'acknowledged'); assert.equal(f.requests.length, 4); assert.deepEqual(f.errors, []);
  } finally { f.close(); }
});
test('native admission failure is typed and a corrected source recovers without invoking an adapter automatically', async () => {
  const f = fixture({ initial: { name: '', size: 0, type: '' } });
  try {
    await settle(); assert.equal(f.api.ready.value, false); assert.equal(f.api.snapshot.value, undefined); assert.equal(f.api.error.value.code, 'form-file-selection-invalid');
    f.source.value = file('valid.txt'); await settle(); assert.equal(f.api.ready.value, true); assert.equal(f.api.error.value, undefined); assert.equal(f.requests.length, 0); assert.deepEqual(f.errors, []);
  } finally { f.close(); }
});
test('source/activity getter failures retire active effects and later valid inputs recover', async () => {
  const f = fixture();
  try {
    await settle(); f.api.start(); f.activityFailure.value = true; await settle();
    assert.equal(f.requests[0].signal.aborted, true); assert.equal(f.api.ready.value, false);
    f.activityFailure.value = false; await settle(); assert.equal(f.api.ready.value, true); f.api.start();
    f.sourceFailure.value = true; await settle(); assert.equal(f.requests[1].signal.aborted, true); assert.equal(f.api.ready.value, false); assert.equal(f.api.snapshot.value, undefined);
    f.sourceFailure.value = false; await settle(); assert.equal(f.api.ready.value, true); assert.equal(f.api.snapshot.value.state.status, 'queued');
    assert.ok(f.errors.some(error => error.message === 'activity unavailable')); assert.ok(f.errors.some(error => error.message === 'source unavailable'));
  } finally { f.close(); }
});
test('unmount clears held shallow refs and makes public actions and old progress/report callbacks inert', async () => {
  const f = fixture(); await settle(); const held = f.api; held.start(); const request = f.requests[0];
  f.close(); assert.equal(request.signal.aborted, true); assert.equal(f.tasks[0].disposed, 1);
  assert.equal(held.snapshot.value, undefined); assert.equal(held.error.value, undefined); assert.equal(held.ready.value, false);
  for (const action of [held.start, held.cancel, held.reset]) assert.equal(action().error.code, 'dom.file-upload-inactive');
  f.tasks[0].resolve('late'); await settle(); assert.equal(held.snapshot.value, undefined); assert.equal(request.reportProgress({ loaded: 1 }).error.code, 'dom.file-upload-inactive');
});
test('held public refs/actions and unfinished native promises release retired Vue upload inputs', () => {
  const result = spawnSync(process.execPath, ['--expose-gc', fileURLToPath(new URL('./file-upload-gc.worker.mjs', import.meta.url))], { encoding: 'utf8', timeout: 20000 });
  assert.equal(result.status, 0, result.stderr); assert.match(result.stdout, /released/);
});
