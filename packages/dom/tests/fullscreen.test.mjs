import assert from 'node:assert/strict';
import test from 'node:test';
import { connectFullscreen } from '../.verification-dist/fullscreen.js';

// Controlled native promises/state/events, not browser activation or rendering.
class NativeDocument extends EventTarget {
  nodeType = 9;
  fullscreenEnabled = true; fullscreenElement = null; listeners = new Map(); saved = []; peak = 0; exits = []; failAdd = false;
  addEventListener(type, callback) {
    this.listeners.set(type, callback); this.saved.push(callback); this.peak = Math.max(this.peak, this.listeners.size);
    super.addEventListener(type, callback); if (this.failAdd && type === 'fullscreenerror') throw Error('listener admission');
  }
  removeEventListener(type, callback) { if (this.listeners.get(type) === callback) this.listeners.delete(type); super.removeEventListener(type, callback); }
  exitFullscreen() { const pending = Promise.withResolvers(); this.exits.push(pending); return pending.promise; }
}
class NativeTarget {
  nodeType = 1; localName = 'div'; namespaceURI = 'http://www.w3.org/1999/xhtml'; isConnected = true; pending = []; failEnter = false;
  constructor(document = new NativeDocument()) { this.ownerDocument = document; this.root = document; }
  getRootNode() { return this.root; }
  requestFullscreen() { if (this.failEnter) throw Error('native request'); const pending = Promise.withResolvers(); this.pending.push(pending); return pending.promise; }
}
const connect = (element, onChange = () => {}) => { const result = connectFullscreen({ element, onChange }); assert.equal(result.ok, true); return result.value; };

test('Fullscreen calls the native method immediately, samples actual state and serializes one pending operation', async () => {
  const element = new NativeTarget(), document = element.ownerDocument, snapshots = [], owner = connect(element, snapshot => snapshots.push(snapshot));
  assert.equal(owner.getSnapshot().available, true); const initial = owner.getSnapshot();
  for (let i = 0; i < 100; i++) owner.refresh(); assert.equal(owner.getSnapshot(), initial); assert.equal(snapshots.length, 1);
  const entering = owner.enter(); assert.equal(element.pending.length, 1); assert.equal(owner.getSnapshot().pending, 'enter');
  assert.equal((await owner.enter()).error.code, 'dom.fullscreen-pending');
  document.fullscreenElement = element; document.dispatchEvent(new Event('fullscreenchange')); assert.equal(owner.getSnapshot().active, true);
  element.pending[0].resolve(); assert.equal((await entering).ok, true); assert.equal(owner.getSnapshot().pending, null);
  assert.equal((await owner.enter()).ok, true); assert.equal(element.pending.length, 1);
  document.fullscreenEnabled = false;
  const exiting = owner.exit(); assert.equal(document.exits.length, 1, 'an owned target can exit after policy changes');
  document.fullscreenElement = null; document.exits[0].resolve(); assert.equal((await exiting).ok, true); assert.equal(owner.getSnapshot().active, false);
  assert.equal(Object.isFrozen(owner.getSnapshot()), true); owner.disconnect(); owner.disconnect(); assert.equal(document.listeners.size, 0); assert.equal(document.peak, 2);
});
test('Fullscreen respects exact shadow-root ownership and never exits another target', async () => {
  const element = new NativeTarget(), document = element.ownerDocument, host = {}, shadow = { fullscreenElement: element };
  document.fullscreenElement = host; element.root = shadow;
  const owner = connect(element); assert.equal(owner.getSnapshot().active, true);
  shadow.fullscreenElement = {}; document.dispatchEvent(new Event('fullscreenchange'));
  assert.equal((await owner.exit()).error.code, 'dom.fullscreen-not-owner'); assert.equal(document.exits.length, 0); owner.disconnect();
});
test('Fullscreen distinguishes missing capability and native rejection without automatic retry', async () => {
  const element = new NativeTarget(), document = element.ownerDocument; document.fullscreenEnabled = false;
  const owner = connect(element); assert.equal(owner.getSnapshot().available, false); assert.equal((await owner.enter()).error.code, 'dom.fullscreen-unavailable'); assert.equal(element.pending.length, 0);
  document.fullscreenEnabled = true;
  const exit = document.exitFullscreen; document.exitFullscreen = undefined; document.fullscreenElement = element;
  assert.equal((await owner.exit()).error.code, 'dom.fullscreen-unavailable');
  document.exitFullscreen = exit; document.fullscreenElement = null; owner.refresh(); element.failEnter = true;
  assert.equal((await owner.enter()).error.code, 'dom.fullscreen-failed'); assert.equal(owner.getSnapshot().pending, null);
  element.failEnter = false; const entering = owner.enter(); element.pending[0].reject(new TypeError('native permission or activation details'));
  const rejected = await entering; assert.equal(rejected.error.code, 'dom.fullscreen-failed'); assert.equal(JSON.stringify(rejected).includes('permission or activation details'), false);
  for (let i = 0; i < 100; i++) document.dispatchEvent(new Event('fullscreenerror')); assert.equal(element.pending.length, 1);
  owner.disconnect(); assert.equal((await owner.enter()).error.code, 'dom.fullscreen-disposed'); assert.equal(owner.refresh().error.code, 'dom.fullscreen-disposed');
});
test('Fullscreen retirement settles callers and revokes stale native completion without exiting global state', async () => {
  const element = new NativeTarget(), document = element.ownerDocument, changes = [], owner = connect(element, state => changes.push(state));
  const entering = owner.enter(); owner.disconnect(); assert.equal((await entering).error.code, 'dom.fullscreen-disposed');
  const count = changes.length; document.fullscreenElement = element; element.pending[0].resolve(); await Promise.resolve();
  for (const callback of document.saved) callback(); assert.equal(changes.length, count); assert.equal(document.exits.length, 0); assert.equal(owner.getSnapshot().connected, false);
});
test('Fullscreen permits retirement during publication and rejects recursive native effects', async () => {
  const element = new NativeTarget(); let owner, recursive;
  owner = connect(element, snapshot => { if (snapshot.pending) { recursive = owner.refresh(); owner.disconnect(); } });
  assert.equal((await owner.enter()).error.code, 'dom.fullscreen-disposed'); assert.equal(recursive.error.code, 'dom.fullscreen-reentrant'); assert.equal(element.pending.length, 0); assert.equal(element.ownerDocument.listeners.size, 0);
});
test('Fullscreen cleans partially admitted listeners and failed subscribers and retires adopted targets', () => {
  const element = new NativeTarget(), document = element.ownerDocument; document.failAdd = true;
  const malformed = new NativeTarget({ nodeType: 9, addEventListener() { throw Error('must not run'); } });
  assert.equal(connectFullscreen({ element: malformed, onChange() {} }).error.code, 'dom.fullscreen-invalid');
  assert.equal(connectFullscreen({ element, onChange() {} }).error.code, 'dom.fullscreen-unavailable'); assert.equal(document.listeners.size, 0);
  document.failAdd = false; assert.throws(() => connect(element, () => { throw Error('subscriber'); }), /subscriber/u); assert.equal(document.listeners.size, 0);
  const changes = [], owner = connect(element, state => changes.push(state)); element.ownerDocument = new NativeDocument();
  assert.equal(owner.refresh().error.code, 'dom.fullscreen-unavailable'); assert.equal(document.listeners.size, 0); assert.equal(changes.at(-1).connected, false);
  assert.equal(connectFullscreen({ element: { ...element, localName: 'dialog' }, onChange() {} }).error.code, 'dom.fullscreen-invalid');
});
test('Fullscreen saved facades, native callbacks and unsettled promises release their target and subscriber', { skip: typeof global.gc !== 'function' }, async () => {
  const held = await retire();
  for (let i = 0; i < 20; i++) { await new Promise(resolve => setImmediate(resolve)); global.gc(); }
  assert.equal(held.element.deref(), undefined); assert.equal(held.document.deref(), undefined); assert.equal(held.subscriber.deref(), undefined);
  for (const callback of held.saved) callback(); held.native.resolve(); await Promise.resolve();
  assert.equal(held.owner.getSnapshot().connected, false); assert.equal((await held.owner.exit()).error.code, 'dom.fullscreen-disposed');
});
async function retire() {
  const element = new NativeTarget(), subscriber = () => { void element.localName; }, owner = connect(element, subscriber), pending = owner.enter();
  const held = { element: new WeakRef(element), document: new WeakRef(element.ownerDocument), subscriber: new WeakRef(subscriber), owner, saved: element.ownerDocument.saved.slice(), native: element.pending[0] };
  owner.disconnect(); await pending; return held;
}
