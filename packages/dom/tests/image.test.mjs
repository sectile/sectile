import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { Window } from 'happy-dom';
import { connectImage } from '../.verification-dist/image.js';

// Controlled platform delivery, not a real fetch/decoder or rendering assertion.
class NativeImage extends EventTarget {
  nodeType = 1; localName = 'img'; namespaceURI = 'http://www.w3.org/1999/xhtml';
  src = 'https://example.test/a.svg'; srcset = ''; sizes = ''; crossOrigin = null; referrerPolicy = '';
  currentSrc = ''; complete = false; naturalWidth = 16; naturalHeight = 24;
  listeners = new Map(); saved = []; pending = []; peak = 0; failAdd = false; failDecode = false;
  addEventListener(type, callback) {
    this.listeners.set(type, callback); this.saved.push(callback); this.peak = Math.max(this.peak, this.listeners.size);
    if (this.failAdd && type === 'error') throw Error('native add failed');
    super.addEventListener(type, callback);
  }
  removeEventListener(type, callback) { if (this.listeners.get(type) === callback) this.listeners.delete(type); super.removeEventListener(type, callback); }
  decode() {
    if (this.failDecode) throw Error('native decode failed');
    const pending = Promise.withResolvers(); this.pending.push(pending); return pending.promise;
  }
  emit(type) { this.dispatchEvent(new Event(type)); }
}
const flush = async () => { await Promise.resolve(); await Promise.resolve(); };
const connect = (image, onChange = () => {}) => { const result = connectImage({ element: image, onChange }); assert.equal(result.ok, true); return result.value; };

test('Image observes loading, decode readiness, explicit retry and empty source without repeated unchanged decoding', async () => {
  const image = new NativeImage(), snapshots = [], connection = connect(image, value => snapshots.push(value));
  assert.equal(connection.getSnapshot().status, 'loading'); assert.equal(Object.isFrozen(connection.getSnapshot()), true);
  for (let i = 0; i < 100; i++) connection.refresh();
  assert.equal(image.pending.length, 0); assert.equal(image.listeners.size, 2);
  image.complete = true; image.currentSrc = image.src; image.emit('load');
  for (let i = 0; i < 100; i++) { connection.refresh(); image.emit('load'); }
  assert.equal(image.pending.length, 1); assert.equal(connection.getSnapshot().status, 'loading');
  image.pending[0].resolve(); await flush();
  assert.deepEqual(connection.getSnapshot(), { connected: true, status: 'ready', currentSrc: image.src, naturalWidth: 16, naturalHeight: 24 });
  const ready = connection.getSnapshot(), count = snapshots.length;
  for (let i = 0; i < 100; i++) connection.refresh();
  assert.equal(connection.getSnapshot(), ready); assert.equal(snapshots.length, count); assert.equal(image.pending.length, 1);
  connection.invalidate(); image.emit('error'); assert.equal(image.pending.length, 1);
  connection.refresh(); image.pending[1].reject(Error('broken')); await flush();
  assert.equal(connection.getSnapshot().status, 'error');
  for (let i = 0; i < 100; i++) connection.refresh();
  assert.equal(image.pending.length, 2, 'no automatic retry loop');
  image.src = ''; image.currentSrc = ''; connection.refresh();
  assert.equal(connection.getSnapshot().status, 'empty'); assert.equal(image.pending.length, 2);
  connection.disconnect(); connection.disconnect(); assert.equal(image.listeners.size, 0); assert.equal(image.peak, 2);
  assert.equal(connection.getSnapshot().connected, false); assert.equal(connection.refresh().error.code, 'dom.image-disposed');
  assert.equal(connection.invalidate().error.code, 'dom.image-disposed');
});

test('Image complete is not success, dimensionless vectors may decode, and native events do not blindly choose error', async () => {
  const image = new NativeImage(); image.complete = true; image.currentSrc = image.src; image.naturalWidth = 0; image.naturalHeight = 0;
  const connection = connect(image);
  assert.equal(connection.getSnapshot().status, 'loading');
  image.pending[0].resolve(); await flush(); assert.equal(connection.getSnapshot().status, 'ready');
  image.emit('error'); assert.equal(connection.getSnapshot().status, 'loading');
  image.pending[1].resolve(); await flush(); assert.equal(connection.getSnapshot().status, 'ready');
  connection.invalidate(); connection.refresh(); image.pending[2].reject(Error('decode')); await flush();
  assert.equal(connection.getSnapshot().status, 'error'); connection.disconnect();
  const thrown = new NativeImage(); thrown.complete = true; thrown.failDecode = true;
  const syncFailure = connect(thrown); assert.equal(syncFailure.getSnapshot().status, 'error'); syncFailure.disconnect();
});

test('Image source invalidation blocks late fulfillment and rejection, and native responsive changes are reobserved', async () => {
  for (const method of ['resolve', 'reject']) {
    const image = new NativeImage(); image.complete = true; image.currentSrc = image.src;
    const connection = connect(image), first = image.pending[0];
    connection.invalidate(); image.src = 'https://example.test/b.svg'; image.currentSrc = image.src;
    image.emit('load'); assert.equal(image.pending.length, 1, 'source patch is suspended until refresh');
    connection.refresh(); image.pending[1].resolve(); await flush();
    const ready = connection.getSnapshot(); first[method](Error('old request')); await flush();
    assert.equal(connection.getSnapshot(), ready); assert.equal(ready.currentSrc, image.src);
    connection.invalidate(); connection.refresh();
    image.currentSrc = 'https://example.test/large.svg'; image.pending[2].resolve(); await flush();
    assert.equal(connection.getSnapshot().status, 'loading'); assert.equal(image.pending.length, 4);
    image.pending[3].resolve(); await flush(); assert.equal(connection.getSnapshot().currentSrc, image.currentSrc);
    connection.invalidate(); connection.refresh(); const last = image.pending[4];
    const saved = image.saved.slice(); connection.disconnect(); const retired = connection.getSnapshot();
    for (const callback of saved) callback(); last[method](Error('retired')); await flush();
    assert.equal(connection.getSnapshot(), retired); assert.equal(image.listeners.size, 0);
  }
});

test('Image admission, partial listener rollback, publication failure and reentrant updates release owned resources', async () => {
  assert.equal(connectImage({ element: {}, onChange() {} }).error.code, 'dom.image-invalid');
  const unsupported = new NativeImage(); unsupported.decode = undefined;
  assert.equal(connectImage({ element: unsupported, onChange() {} }).error.code, 'dom.image-unavailable'); assert.equal(unsupported.listeners.size, 0);
  const partial = new NativeImage(); partial.failAdd = true;
  assert.equal(connectImage({ element: partial, onChange() {} }).error.code, 'dom.image-unavailable'); assert.equal(partial.listeners.size, 0);
  const image = new NativeImage(), failure = Error('subscriber failed');
  assert.throws(() => connect(image, () => { throw failure; }), value => value === failure); assert.equal(image.listeners.size, 0);
  const reentrant = new NativeImage(); reentrant.complete = true;
  let connection;
  connection = connect(reentrant, snapshot => {
    if (snapshot.status !== 'ready') return;
    assert.equal(connection.refresh().error.code, 'dom.image-reentrant');
    assert.equal(connection.invalidate().error.code, 'dom.image-reentrant'); connection.disconnect();
  });
  reentrant.pending[0].resolve(); await flush(); assert.equal(reentrant.listeners.size, 0); assert.equal(connection.getSnapshot().connected, false);
  for (let turn = 0; turn < 32; turn++) {
    const current = new NativeImage(); const active = connect(current); active.invalidate(); active.refresh(); active.disconnect();
    assert.equal(current.peak, 2); assert.equal(current.listeners.size, 0);
  }
});

test('Image binds an actual HTML image without mutating source, alternative text or layout', async () => {
  const view = new Window(), image = view.document.createElement('img');
  image.setAttribute('src', 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg"/>'); image.alt = '프로필'; image.width = 40; image.height = 40;
  const pending = Promise.withResolvers();
  Object.defineProperties(image, { complete: { value: true }, currentSrc: { value: image.src }, decode: { value: () => pending.promise } });
  const before = image.outerHTML, connection = connect(image);
  pending.resolve(); await flush(); assert.equal(connection.getSnapshot().status, 'ready');
  connection.disconnect(); assert.equal(image.outerHTML, before); await view.happyDOM.close();
});

test('Image asynchronous subscriber exceptions retire the owner before being reported', () => {
  const module = new URL('../.verification-dist/image.js', import.meta.url).href;
  const script = `import assert from 'node:assert/strict'; import {connectImage} from ${JSON.stringify(module)};
    ${NativeImage.toString()}
    const image=new NativeImage(); image.complete=true;
    const result=connectImage({element:image,onChange:snapshot=>{if(snapshot.status==='ready')throw Error('subscriber');}});
    process.once('uncaughtException',error=>{assert.equal(error.message,'subscriber');assert.equal(result.value.getSnapshot().connected,false);assert.equal(image.listeners.size,0);console.log('retired before reporting');});
    image.pending[0].resolve();`;
  const result = spawnSync(process.execPath, ['--input-type=module', '-e', script], { encoding: 'utf8', timeout: 10_000 });
  assert.equal(result.status, 0, result.stderr); assert.match(result.stdout, /retired before reporting/u);
});

test('Image retired facades, saved native callbacks and unresolved decode ports release the caller graph', { skip: typeof global.gc !== 'function' }, async () => {
  const held = await retiredOwner();
  for (let i = 0; i < 20; i++) { await new Promise(resolve => setImmediate(resolve)); global.gc(); }
  assert.equal(held.image.deref(), undefined); assert.equal(held.subscriber.deref(), undefined);
  assert.equal(held.connection.getSnapshot().connected, false); assert.equal(held.snapshot.connected, true);
  for (const callback of held.saved) callback(); held.pending.resolve(); await flush();
  assert.equal(held.connection.getSnapshot().connected, false);
});
async function retiredOwner() {
  const image = new NativeImage(); image.complete = true;
  const subscriber = () => { void image.naturalWidth; }, connection = connect(image, subscriber);
  const held = { connection, snapshot: connection.getSnapshot(), image: new WeakRef(image), subscriber: new WeakRef(subscriber), saved: image.saved.slice(), pending: image.pending[0] };
  connection.disconnect(); return held;
}
