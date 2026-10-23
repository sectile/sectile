import assert from 'node:assert/strict';
import test from 'node:test';
import { connectMediaGesture, readMediaViewport } from '../.verification-dist/media-gesture.js';

// Controlled native capture/events; not physical pointer dispatch or browser policy approval.
class NativeEvents extends EventTarget {
  listeners = new Map(); saved = []; listenerOptions = new Map(); failType;
  addEventListener(type, listener, options) {
    this.listenerOptions.set(type, options);
    this.listeners.set(type, listener); this.saved.push(listener); super.addEventListener(type, listener);
    if (type === this.failType) throw Error('listener install');
  }
  removeEventListener(type, listener) { if (this.listeners.get(type) === listener) this.listeners.delete(type); super.removeEventListener(type, listener); }
}
class Surface extends NativeEvents {
  nodeType = 1; namespaceURI = 'http://www.w3.org/1999/xhtml'; isConnected = true;
  captures = new Set(); peak = 0; failCapture = false;
  parentElement = null; fragments = 1; boxReads = 0;
  rect = { left: 100, top: 50, width: 800, height: 600 };
  styleFacts = { width: '400px', height: '300px', paddingTop: '0px', paddingRight: '0px', paddingBottom: '0px', paddingLeft: '0px', borderTopWidth: '0px', borderRightWidth: '0px', borderBottomWidth: '0px', borderLeftWidth: '0px', lineHeight: '25px', overflowX: 'hidden', overflowY: 'hidden', transform: 'none', rotate: 'none', scale: 'none', perspective: 'none', offsetPath: 'none' };
  constructor() {
    super(); this.ownerDocument = new NativeEvents(); this.ownerDocument.hidden = false; this.ownerDocument.defaultView = new NativeEvents();
    this.ownerDocument.defaultView.styleReads = 0;
    this.ownerDocument.defaultView.getComputedStyle = element => { this.ownerDocument.defaultView.styleReads++; return element.styleFacts; };
    this.ownerDocument.defaultView.DOMMatrixReadOnly = class {
      constructor(value) { this.is2D = value.startsWith('matrix('); const values = value.slice(value.indexOf('(') + 1, -1).split(',').map(Number); [this.a, this.b, this.c, this.d] = values; }
    };
  }
  getRootNode() { return this.ownerDocument; }
  getClientRects() { return Array.from({ length: this.fragments }, () => this.rect); }
  getBoundingClientRect() { this.boxReads++; return this.rect; }
  matches() { return false; }
  setPointerCapture(id) { if (this.failCapture) throw Error('capture'); this.captures.add(id); this.peak = Math.max(this.peak, this.captures.size); }
  releasePointerCapture(id) { this.captures.delete(id); this.emit('lostpointercapture', id, 0, 0); }
  emit(type, id = 1, x = 10, y = 20, overrides = {}) {
    const event = new Event(type, { cancelable: overrides.eventCancelable ?? (type !== 'pointercancel' && type !== 'lostpointercapture') });
    Object.assign(event, { pointerId: id, pointerType: 'touch', button: 0, isPrimary: id === 1, clientX: x, clientY: y, ...overrides });
    event.composedPath = () => [this]; if (overrides.preventBefore) event.preventDefault(); this.dispatchEvent(event); return event;
  }
}
function fixture(overrides = {}, surface = new Surface()) {
  const moves = [], ends = [], starts = [];
  const result = connectMediaGesture({ element: surface, onStart: input => { starts.push(input); return true; }, onMove: input => moves.push(input), onEnd: reason => ends.push(reason), ...overrides });
  assert.equal(result.ok, true); return { surface, owner: result.value, moves, ends, starts };
}
function clean(surface) {
  assert.equal(surface.captures.size, 0); assert.equal(surface.listeners.size, 0);
  assert.equal(surface.ownerDocument.listeners.size, 0); assert.equal(surface.ownerDocument.defaultView.listeners.size, 0);
}
test('Media gesture publishes bounded one-two-one native facts without a transition jump', () => {
  const { surface, owner, moves, ends, starts } = fixture();
  assert.equal(surface.listeners.size + surface.ownerDocument.listeners.size + surface.ownerDocument.defaultView.listeners.size, 7);
  assert.equal(surface.emit('pointerdown').defaultPrevented, true);
  surface.emit('pointermove', 1, 15, 25);
  assert.deepEqual(moves[0], { kind: 'drag', before: { x: 10, y: 20 }, after: { x: 15, y: 25 } });
  surface.emit('pointerdown', 2, 40, 50); surface.emit('pointerdown', 3, 90, 90);
  assert.equal(starts.length, 2); assert.equal(surface.captures.size, 2);
  surface.emit('pointermove', 2, 45, 55);
  assert.deepEqual(moves[1], { kind: 'pinch', before: [{ x: 15, y: 25 }, { x: 40, y: 50 }], after: [{ x: 15, y: 25 }, { x: 45, y: 55 }] });
  surface.emit('pointerup', 1, 15, 25); assert.equal(ends.length, 0);
  surface.emit('pointermove', 2, 47, 58);
  assert.deepEqual(moves[2], { kind: 'drag', before: { x: 45, y: 55 }, after: { x: 47, y: 58 } });
  surface.emit('pointerup', 2, 48, 59); assert.equal(moves.length, 4); assert.deepEqual(ends, ['complete']);
  assert.equal(surface.peak, 2); assert.equal(Object.isFrozen(moves[1].before), true); assert.equal(Object.isFrozen(moves[1].after[0]), true);
  owner.disconnect(); owner.disconnect(); clean(surface);
});
test('Media gesture rejects protected/declined/modified admission without capture or prevention', () => {
  const { surface, owner, starts } = fixture({ onStart: () => false });
  assert.equal(surface.emit('pointerdown').defaultPrevented, false); assert.equal(surface.captures.size, 0); owner.disconnect();
  const other = fixture(); other.surface.matches = () => true;
  other.surface.emit('pointerdown'); assert.equal(other.starts.length, 0);
  other.surface.matches = () => false;
  other.surface.emit('pointerdown', 1, 10, 20, { button: 2 });
  other.surface.emit('pointerdown', 2, 10, 20, { pointerType: 'mouse', isPrimary: false });
  other.surface.emit('pointerdown', 1, Infinity, 20); assert.equal(other.starts.length, 0); assert.equal(starts.length, 0);
  other.owner.disconnect(); clean(other.surface);
});
test('Media gesture interrupts all contacts once and can restart after each scoped cancellation', () => {
  for (const reason of ['cancel', 'capture-lost', 'blur', 'hidden', 'manual', 'disconnect', 'unavailable']) {
    const { surface, owner, ends } = fixture(); surface.emit('pointerdown'); surface.emit('pointerdown', 2);
    if (reason === 'cancel') surface.emit('pointercancel');
    if (reason === 'capture-lost') surface.emit('lostpointercapture');
    if (reason === 'blur') surface.ownerDocument.defaultView.dispatchEvent(new Event('blur'));
    if (reason === 'hidden') { surface.ownerDocument.hidden = true; surface.ownerDocument.dispatchEvent(new Event('visibilitychange')); surface.ownerDocument.hidden = false; }
    if (reason === 'manual') owner.cancel();
    if (reason === 'disconnect') owner.disconnect();
    if (reason === 'unavailable') { surface.isConnected = false; surface.emit('pointermove'); }
    assert.deepEqual(ends, [reason]); assert.equal(surface.captures.size, 0);
    if (reason !== 'disconnect' && reason !== 'unavailable') { surface.emit('pointerdown'); assert.equal(surface.captures.size, 1); }
    owner.disconnect(); clean(surface);
  }
});
test('Media gesture handles failed capture and partially installed listener rollback', () => {
  const { surface, owner, ends } = fixture(); surface.failCapture = true;
  surface.emit('pointerdown'); assert.deepEqual(ends, ['unavailable']); assert.equal(surface.captures.size, 0); owner.disconnect(); clean(surface);
  for (const failType of ['pointermove', 'visibilitychange', 'blur']) {
    const root = new Surface(); root.failType = failType; root.ownerDocument.failType = failType; root.ownerDocument.defaultView.failType = failType;
    assert.equal(connectMediaGesture({ element: root, onStart: () => true, onMove() {} }).ok, false); clean(root);
  }
});
test('Media gesture revokes callbacks before capture and retires on callback throw', () => {
  let owner;
  const first = fixture({ onStart: () => { owner.cancel(); return true; } }); owner = first.owner;
  first.surface.emit('pointerdown'); assert.equal(first.surface.captures.size, 0); owner.disconnect();
  const second = fixture({ onMove: () => { throw Error('subscriber'); } }); second.surface.emit('pointerdown');
  const handler = second.surface.listeners.get('pointermove');
  const event = new Event('pointermove'); Object.assign(event, { pointerId: 1, clientX: 30, clientY: 40 });
  assert.throws(() => handler(event), /subscriber/); clean(second.surface);
  for (const callback of second.surface.saved) callback(event);
  assert.equal(second.moves.length, 0); clean(second.surface);
  const detached = new Surface();
  const third = fixture({ onStart: () => { detached.isConnected = false; return true; } }, detached);
  third.surface.emit('pointerdown'); assert.deepEqual(third.ends, ['unavailable']); clean(third.surface);
  const fourth = fixture({ onStart: () => { throw Error('admission'); } });
  const down = new Event('pointerdown'); Object.assign(down, { pointerId: 1, pointerType: 'touch', button: 0, clientX: 10, clientY: 20 });
  down.composedPath = () => [fourth.surface];
  assert.throws(() => fourth.surface.listeners.get('pointerdown')(down), /admission/); clean(fourth.surface);
});
test('Media gesture saved connection and handlers release their surface and subscriber', { skip: typeof global.gc !== 'function', timeout: 15000 }, async () => {
  const held = retire();
  for (let i = 0; i < 20; i++) { await new Promise(resolve => setImmediate(resolve)); global.gc(); }
  assert.equal(held.surface.deref() === undefined, true, 'surface retained');
  assert.equal(held.document.deref() === undefined, true, 'document retained');
  assert.equal(held.subscriber.deref() === undefined, true, 'subscriber retained');
  for (const callback of held.saved) callback(new Event('pointermove'));
  held.owner.cancel(); held.owner.disconnect();
});
function retire() {
  const surface = new Surface(), subscriber = () => { void surface.isConnected; };
  const { owner } = fixture({ onMove: subscriber, onWheel: subscriber }, surface); surface.emit('pointerdown');
  const held = { owner, surface: new WeakRef(surface), document: new WeakRef(surface.ownerDocument), subscriber: new WeakRef(subscriber), saved: [...surface.saved, ...surface.ownerDocument.saved, ...surface.ownerDocument.defaultView.saved] };
  owner.disconnect(); return held;
}
test('Media viewport projects fractional scaled native coordinates and refreshes each explicit read', () => {
  const surface = new Surface(); surface.styleFacts.width = '400.5px'; surface.styleFacts.height = '300.25px';
  surface.styleFacts.transform = 'matrix(2, 0, 0, 2, 0, 0)'; surface.rect.width = 801; surface.rect.height = 600.5;
  const parent = new Surface(); surface.parentElement = parent;
  const result = readMediaViewport(surface, [{ x: 100, y: 50 }, { x: 500.5, y: 350.25 }, { x: 901, y: 650.5 }, { x: -100.25, y: -100.125 }]);
  assert.equal(result.ok, true); assert.deepEqual(result.value.viewport, { width: 400.5, height: 300.25 });
  assert.deepEqual(result.value.points, [{ x: 0, y: 0 }, { x: 200.25, y: 150.125 }, { x: 400.5, y: 300.25 }, { x: -100.125, y: -75.0625 }]);
  assert.equal(surface.boxReads, 1); assert.equal(surface.ownerDocument.defaultView.styleReads, 2);
  surface.rect.left = 200; const changed = readMediaViewport(surface, [{ x: 200, y: 50 }]); assert.deepEqual(changed.value.points, [{ x: 0, y: 0 }]);
  assert.equal(result.value.points[0].x, 0); assert.equal(Object.isFrozen(result.value.points[0]), true); assert.equal(Object.isFrozen(result.value.points), true);
});
test('Media viewport rejects unknown native bases and bounded invalid samples without guessing', () => {
  for (const change of [s => s.isConnected = false, s => s.fragments = 2, s => s.styleFacts.paddingLeft = '1px', s => s.styleFacts.borderTopWidth = '1px',
    s => s.styleFacts.overflowY = 'auto', s => s.styleFacts.width = 'auto', s => s.rect.height = 0, s => s.styleFacts.rotate = '90deg',
    s => s.styleFacts.transform = 'matrix(1, 1, 0, 1, 0, 0)', s => s.styleFacts.scale = '-1', s => s.styleFacts.perspective = '100px', s => s.styleFacts.offsetPath = 'path("M 0 0 L 1 1")']) {
    const surface = new Surface(); change(surface); assert.equal(readMediaViewport(surface).ok, false);
  }
  const surface = new Surface(), parent = new Surface(); surface.parentElement = parent; parent.styleFacts.rotate = '45deg';
  assert.equal(readMediaViewport(surface).ok, false); surface.parentElement = null;
  surface.assignedSlot = parent; assert.equal(readMediaViewport(surface).ok, false); surface.assignedSlot = null;
  const reads = surface.boxReads; assert.equal(readMediaViewport(surface, Array.from({ length: 5 }, () => ({ x: 0, y: 0 }))).ok, false); assert.equal(surface.boxReads, reads);
  assert.equal(readMediaViewport(surface, [{ x: NaN, y: 0 }]).ok, false);
  assert.deepEqual(readMediaViewport(surface).value.points, []);
});
const wheel = (surface, deltaY, deltaMode = 0, extra = {}) => surface.emit('wheel', 0, 500, 350, { deltaX: 0, deltaY, deltaMode, ctrlKey: false, metaKey: false, altKey: false, shiftKey: false, ...extra });
test('Media wheel normalizes pixel line and page input without event-count quantization', () => {
  const inputs = [], { surface, owner } = fixture({ onWheel: input => { inputs.push(input); return true; } });
  assert.equal(surface.listeners.size + surface.ownerDocument.listeners.size + surface.ownerDocument.defaultView.listeners.size, 8);
  assert.equal(surface.listenerOptions.get('wheel').passive, false);
  for (const [delta, mode] of [[100, 0], [2, 1], [1 / 6, 2]]) assert.equal(wheel(surface, delta, mode).defaultPrevented, true);
  for (const input of inputs) { assert.deepEqual(input, { anchor: { x: 200, y: 150 }, delta: 50, viewport: { width: 400, height: 300 } }); assert.equal(Object.isFrozen(input.anchor), true); }
  wheel(surface, -0.5); assert.equal(inputs.at(-1).delta, -0.25);
  owner.disconnect(); clean(surface); wheel(surface, -20); assert.equal(inputs.length, 4);
});
test('Media wheel preserves native defaults for modified protected declined or unavailable input', () => {
  const inputs = [], { surface, owner } = fixture({ onWheel: input => { inputs.push(input); return false; } });
  assert.equal(wheel(surface, 20).defaultPrevented, false); assert.equal(inputs.length, 1);
  for (const extra of [{ ctrlKey: true }, { metaKey: true }, { altKey: true }, { shiftKey: true }, { deltaX: 100 }, { eventCancelable: false }]) assert.equal(wheel(surface, 20, 0, extra).defaultPrevented, false);
  wheel(surface, 20, 0, { preventBefore: true });
  wheel(surface, 0); wheel(surface, Infinity); wheel(surface, 20, 3);
  surface.matches = () => true; wheel(surface, 20); surface.matches = () => false;
  surface.styleFacts.lineHeight = 'normal'; wheel(surface, 20, 1);
  surface.emit('pointerdown'); wheel(surface, 20); owner.cancel();
  assert.equal(inputs.length, 1); owner.disconnect(); clean(surface);
});
test('Media wheel accepted callbacks cannot consume after synchronous retirement and throw cleanup is complete', () => {
  let owner; const first = fixture({ onWheel: () => { owner.cancel(); return true; } }); owner = first.owner;
  assert.equal(wheel(first.surface, 20).defaultPrevented, false); owner.disconnect(); clean(first.surface);
  const second = fixture({ onWheel: () => { throw Error('wheel subscriber'); } });
  const event = new Event('wheel', { cancelable: true }); Object.assign(event, { clientX: 200, clientY: 200, deltaX: 0, deltaY: 20, deltaMode: 0 }); event.composedPath = () => [second.surface];
  assert.throws(() => second.surface.listeners.get('wheel')(event), /wheel subscriber/); clean(second.surface);
  const failed = new Surface(); failed.failType = 'wheel';
  assert.equal(connectMediaGesture({ element: failed, onStart: () => true, onMove() {}, onWheel: () => true }).ok, false); clean(failed);
});
