import assert from 'node:assert/strict';
import test from 'node:test';
import { createTestWindow } from './happy-dom.mjs';

const window = createTestWindow({ url: 'https://sectile.test/' });
Object.assign(globalThis, { window, document: window.document, Node: window.Node, Element: window.Element, HTMLElement: window.HTMLElement, SVGElement: window.SVGElement });
const { createApp, createSSRApp, effectScope, h, isReadonly, isShallow, KeepAlive, nextTick, shallowRef, toRef, useTemplateRef } = await import('vue');
const { renderToString } = await import('vue/server-renderer');
const { useMediaGesture } = await import('../.verification-dist/media-gesture.js');
const { provideHostActive } = await import('../.verification-dist/host-provider.js');
const tracked = new Map(), saved = [], captures = new WeakMap();
let failAdmission = false, peak = 0;
const pointerTypes = new Set(['pointerdown', 'pointermove', 'pointerup', 'pointercancel', 'lostpointercapture', 'wheel', 'click', 'dragstart']);
const relevant = (target, type) => target === document ? type === 'visibilitychange' || ['pointermove', 'pointerup', 'pointercancel'].includes(type) : target === window ? type === 'blur' : pointerTypes.has(type);
const count = () => [...tracked.values()].reduce((sum, types) => sum + [...types.values()].reduce((total, callbacks) => total + callbacks.size, 0), 0);
for (const prototype of [window.HTMLElement.prototype, document, window]) {
  const add = prototype.addEventListener, remove = prototype.removeEventListener;
  Object.defineProperties(prototype, {
    addEventListener: { configurable: true, value(type, callback, options) {
      if (relevant(this, type)) {
        if (failAdmission && type === 'wheel') throw Error('native admission');
        const types = tracked.get(this) ?? new Map(), callbacks = types.get(type) ?? new Set();
        callbacks.add(callback); types.set(type, callbacks); tracked.set(this, types); saved.push(callback); peak = Math.max(peak, count());
      }
      return add.call(this, type, callback, options);
    } },
    removeEventListener: { configurable: true, value(type, callback, options) {
      const types = tracked.get(this), callbacks = types?.get(type); callbacks?.delete(callback);
      if (callbacks?.size === 0) types.delete(type); if (types?.size === 0) tracked.delete(this);
      return remove.call(this, type, callback, options);
    } },
  });
}
Object.defineProperties(window.HTMLElement.prototype, {
  setPointerCapture: { configurable: true, value(id) { const ids = captures.get(this) ?? new Set(); ids.add(id); captures.set(this, ids); } },
  releasePointerCapture: { configurable: true, value(id) { if (captures.get(this)?.delete(id)) this.dispatchEvent(new window.PointerEvent('lostpointercapture', { pointerId: id })); } },
});
const settle = async () => { await nextTick(); await nextTick(); };
const pointer = (target, type, x = 500, y = 350) => target.dispatchEvent(new window.PointerEvent(type, { pointerId: 1, pointerType: 'touch', isPrimary: true, button: 0, clientX: x, clientY: y, bubbles: true, cancelable: true }));
function basis(element) {
  element.style.cssText = 'width:400px;height:300px;padding:0;border:0;line-height:25px;overflow:hidden';
  Object.defineProperty(element, 'getClientRects', { configurable: true, value: () => [{ left: 100, top: 50, width: 800, height: 600 }] });
  Object.defineProperty(element, 'getBoundingClientRect', { configurable: true, value: () => ({ left: 100, top: 50, width: 800, height: 600 }) });
}
function fixture({ scoped = false, cached = false, inherited = false, onStart, onMove, onEnd, onWheel, admitPointer, dragThreshold } = {}) {
  if (count() === 0) peak = 0;
  const active = shallowRef(true), hostActive = shallowRef(true), shown = shallowRef(true), key = shallowRef(0), starts = [], moves = [], ends = [], wheels = [];
  let gesture, scope;
  const Child = { setup() {
    const element = useTemplateRef('scene'), connect = () => useMediaGesture({ element, active,
      ...(admitPointer === undefined ? {} : { admitPointer }), ...(dragThreshold === undefined ? {} : { dragThreshold }),
      onStart(input) { starts.push(input); return onStart?.(input) ?? true; },
      onMove(input) { moves.push(input); onMove?.(input); }, onEnd(reason) { ends.push(reason); onEnd?.(reason); },
      onWheel(input) { wheels.push(input); return onWheel?.(input) ?? true; },
    });
    if (scoped) { scope = effectScope(); gesture = scope.run(connect); } else gesture = connect();
    return () => h('section', { ref: 'scene', key: key.value }, 'Viewer');
  } };
  const app = createApp({ setup() { if (inherited) provideHostActive(hostActive); return () => cached ? h(KeepAlive, null, { default: () => shown.value ? h(Child) : null }) : h(Child); } });
  const host = document.createElement('div'); document.body.append(host); const errors = []; app.config.errorHandler = failure => errors.push(failure); app.mount(host); basis(host.querySelector('section'));
  return { active, hostActive, shown, key, starts, moves, ends, wheels, errors, get gesture() { return gesture; }, get scope() { return scope; }, get element() { return host.querySelector('section'); }, close() { app.unmount(); host.remove(); } };
}
test('Vue media gesture forwards explicit interactive admission and retires pending native observation', () => {
  const button = document.createElement('button'), image = document.createElement('img'); button.append(image);
  const f = fixture({ admitPointer: input => input.origin === image }); f.element.append(button);
  try {
    pointer(image, 'pointerdown'); assert.equal(f.starts.length, 0); assert.equal(count(), 13);
    pointer(image, 'pointermove', 506, 350); assert.equal(f.starts.length, 1); assert.equal(count(), 10);
    f.active.value = false;
    assert.deepEqual(f.ends, ['disconnect']); assert.equal(count(), 0);
    assert.equal(captures.get(f.element)?.size ?? 0, 0);
  } finally { f.close(); }
  assert.equal(count(), 0);
});
test('Vue media gesture delegates native facts and projects current points through stable methods', () => {
  const f = fixture(), gesture = f.gesture, cancel = gesture.cancel, measure = gesture.measure;
  try {
    assert.equal(count(), 8); assert.equal(isReadonly(gesture.error), true); assert.equal(isShallow(gesture.error), true);
    assert.equal(gesture.error.value, undefined); assert.deepEqual(measure([{ x: 500, y: 350 }]).value.points, [{ x: 200, y: 150 }]);
    pointer(f.element, 'pointerdown'); pointer(f.element, 'pointermove', 600, 350);
    assert.deepEqual(f.moves[0], { kind: 'drag', before: { x: 500, y: 350 }, after: { x: 600, y: 350 } });
    const wheel = new window.WheelEvent('wheel', { clientX: 500, clientY: 350, deltaY: -100, cancelable: true });
    // The controlled WheelEvent implementation inherits UIEvent, not MouseEvent.
    Object.defineProperties(wheel, { clientX: { value: 500 }, clientY: { value: 350 } });
    cancel(); assert.deepEqual(f.ends, ['manual']); f.element.dispatchEvent(wheel); assert.equal(wheel.defaultPrevented, true); assert.equal(f.wheels[0].delta, -50);
    assert.equal(gesture.cancel, cancel); assert.equal(gesture.measure, measure);
  } finally { f.close(); }
  assert.equal(count(), 0); assert.equal(measure().error.code, 'dom.media-gesture-unavailable'); cancel(); assert.deepEqual(f.errors, []);
});
test('Vue media gesture revokes synchronously on participation and target replacement with ABA recovery', async () => {
  const f = fixture(), target = f.element, measure = f.gesture.measure;
  try {
    pointer(target, 'pointerdown'); f.active.value = false;
    assert.equal(count(), 0); assert.equal(captures.get(target).size, 0); assert.deepEqual(f.ends, ['disconnect']); assert.equal(measure().ok, false);
    f.active.value = true; await settle(); assert.equal(count(), 8);
    f.active.value = false; f.active.value = true; await settle(); assert.equal(count(), 8);
    pointer(target, 'pointerdown'); f.key.value++; await settle(); basis(f.element);
    assert.notEqual(f.element, target); assert.equal(count(), 8); assert.deepEqual(f.ends, ['disconnect', 'disconnect']);
    pointer(target, 'pointermove', 800, 600); assert.equal(f.moves.length, 0); assert.equal(f.gesture.measure, measure);
  } finally { f.close(); }
  assert.equal(count(), 0); assert.equal(peak, 8); assert.deepEqual(f.errors, []);
});
test('Vue media gesture honors inherited host activity and KeepAlive without another native owner', async () => {
  const f = fixture({ cached: true, inherited: true }), gesture = f.gesture;
  try {
    f.hostActive.value = false; assert.equal(count(), 0); f.hostActive.value = true; await settle(); assert.equal(count(), 8);
    f.shown.value = false; await settle(); assert.equal(count(), 0); assert.equal(gesture.measure().ok, false);
    f.shown.value = true; await settle(); basis(f.element); assert.equal(count(), 8); assert.equal(f.gesture, gesture);
  } finally { f.close(); }
  assert.equal(count(), 0); assert.deepEqual(f.errors, []);
});
test('Vue media gesture admission failures are shallow and recover only after an explicit input change', async () => {
  failAdmission = true; const f = fixture();
  try {
    assert.equal(count(), 0); assert.equal(f.gesture.error.value, 'dom.media-gesture-unavailable'); assert.equal(f.gesture.measure().ok, false);
    failAdmission = false; await settle(); assert.equal(count(), 0);
    f.active.value = false; assert.equal(f.gesture.error.value, undefined); f.active.value = true; await settle(); assert.equal(count(), 8);
  } finally { failAdmission = false; f.close(); }
  assert.equal(count(), 0); assert.deepEqual(f.errors, []);
});
test('Vue media gesture cannot capture after callback retirement and clears failed callback authority', async () => {
  let f; f = fixture({ onStart: () => { f.active.value = false; return true; } });
  try { pointer(f.element, 'pointerdown'); assert.equal(count(), 0); assert.equal(captures.get(f.element)?.size ?? 0, 0); assert.equal(f.gesture.measure().ok, false); }
  finally { f.close(); }
  const failure = Error('move callback'), other = fixture({ onMove: () => { throw failure; } });
  try {
    pointer(other.element, 'pointerdown'); const callback = [...tracked.get(other.element).get('pointermove')][0];
    assert.throws(() => callback(new window.PointerEvent('pointermove', { pointerId: 1, clientX: 600, clientY: 350 })), error => error === failure);
    assert.equal(count(), 0); assert.equal(other.gesture.measure().ok, false);
    other.active.value = false; other.active.value = true; await settle(); assert.equal(count(), 8);
  } finally { other.close(); }
  assert.equal(count(), 0);
});
test('Vue media gesture has no native SSR work and terminal effect-scope disposal is silent', async () => {
  let gesture;
  const html = await renderToString(createSSRApp({ setup() {
    const element = useTemplateRef('scene'); gesture = useMediaGesture({ element, onStart: () => true, onMove() {} });
    return () => h('section', { ref: 'scene', 'data-state': gesture.error.value ?? 'unobserved' });
  } }));
  assert.match(html, /data-state="unobserved"/); assert.equal(count(), 0); assert.equal(gesture.measure().ok, false);
  const f = fixture({ scoped: true });
  try {
    pointer(f.element, 'pointerdown'); f.scope.stop(); assert.equal(count(), 0); assert.deepEqual(f.ends, []);
    f.active.value = false; f.active.value = true; f.key.value++; await settle(); assert.equal(count(), 0); assert.equal(f.gesture.measure().ok, false);
  } finally { f.close(); }
  assert.throws(() => useMediaGesture({}), error => error.code === 'vue.media-gesture-scope-required');
});
test('Vue media gesture initial-target-read disposal prevents native admission', () => {
  const target = document.createElement('section'); document.body.append(target); let gesture;
  const app = createApp({ setup() {
    const scope = effectScope(), element = toRef(() => { scope.stop(); return target; });
    gesture = scope.run(() => useMediaGesture({ element, onStart: () => true, onMove() {} }));
    return () => h('div');
  } });
  const host = document.createElement('div'); document.body.append(host); app.mount(host);
  try { assert.equal(count(), 0); assert.equal(gesture.measure().ok, false); }
  finally { app.unmount(); host.remove(); target.remove(); }
});
test('Vue media gesture saved methods and native callbacks release target refs and caller hooks', { skip: typeof global.gc !== 'function', timeout: 15000 }, async () => {
  const held = retire();
  for (let i = 0; i < 20; i++) { await new Promise(resolve => setImmediate(resolve)); global.gc(); }
  for (const [label, ref] of Object.entries(held.weak)) assert.equal(ref.deref() === undefined, true, label + ' retained');
  for (const callback of held.callbacks) callback(new window.Event('pointermove'));
  held.cancel(); assert.equal(held.measure().ok, false); assert.equal(count(), 0);
});
function retire() {
  const element = shallowRef(null), active = shallowRef(true), caller = () => { void element.value; }; let gesture;
  const app = createApp({ setup() { gesture = useMediaGesture({ element, active, onStart: () => true, onMove: caller, onWheel: () => true }); return () => h('section', { ref: element }); } });
  const host = document.createElement('div'); document.body.append(host); app.mount(host); const target = element.value;
  const held = { cancel: gesture.cancel, measure: gesture.measure, gesture, weak: { target: new WeakRef(target), element: new WeakRef(element), active: new WeakRef(active), caller: new WeakRef(caller) }, callbacks: saved.slice() };
  app.unmount(); host.remove(); return held;
}
