import assert from 'node:assert/strict';
import test from 'node:test';
import { connectLayoutMotion } from '../.verification-dist/layout-motion.js';

// Native layout and timelines are simulated. This proves scheduling/ownership, not rendered motion.
class Element {
  nodeType = 1; x = 0; y = 0; swipeX = 0; swipeY = 0; scrollLeft = 0; scrollTop = 0;
  children = []; animations = []; reads = 0; translateOnly = true;
  classList = { contains: name => name === 'notice' };
  constructor(document) { this.ownerDocument = document; }
  getBoundingClientRect() {
    this.reads++;
    const animation = this.animations.at(-1), fraction = animation?.effect ? 1 - animation.progress : 0;
    return { left: this.x + this.swipeX + (animation?.x ?? 0) * fraction,
      top: this.y + this.swipeY + (animation?.y ?? 0) * fraction };
  }
  animate(keyframes, timing) {
    const [x, y] = keyframes[0].translate.split(' ').map(parseFloat);
    const animation = { x, y, keyframes, timing, progress: 0, playState: 'running', cancellations: 0,
      effect: { getComputedTiming: () => ({ progress: animation.progress }) },
      pause() { this.playState = 'paused'; }, play() { this.playState = 'running'; },
      cancel() { this.playState = 'idle'; this.cancellations++; }, onfinish: null, oncancel: null };
    this.animations.push(animation); return animation;
  }
}
class Observer {
  targets = new Set(); disconnected = false;
  constructor(callback) { this.callback = callback; }
  observe(target, options) { this.targets.add(target); this.options = options; }
  unobserve(target) { this.targets.delete(target); }
  disconnect() { this.disconnected = true; this.targets.clear(); }
  emit() { this.callback([]); }
}
function fixture(count = 2) {
  const resize = [], mutation = [], frames = new Map(), listeners = new Map(); let sequence = 0;
  const media = { matches: false, addEventListener: (type, callback) => listeners.set(type, callback), removeEventListener: type => listeners.delete(type) };
  const policy = { '--duration': '200ms', '--easing': 'ease-out', '--spatial': '1' };
  const document = { defaultView: {
    HTMLElement: Element,
    ResizeObserver: class extends Observer { constructor(callback) { super(callback); resize.push(this); } },
    MutationObserver: class extends Observer { constructor(callback) { super(callback); mutation.push(this); } },
    DOMMatrixReadOnly: class { constructor(value) { const values = value.slice(7, -1).split(',').map(Number); [this.a, this.b, this.c, this.d, this.e, this.f] = values; this.is2D = true; } },
    getComputedStyle(element) { return { getPropertyValue: name => policy[name] ?? '', transform: `matrix(${element.translateOnly ? '1,0,0,1' : '2,0,0,2'},${element.swipeX},${element.swipeY})` }; },
    matchMedia: () => media,
    requestAnimationFrame(callback) { const id = ++sequence; frames.set(id, callback); return id; },
    cancelAnimationFrame: id => frames.delete(id),
  } };
  const root = new Element(document), rows = Array.from({ length: count }, (_, index) => { const row = new Element(document); row.y = index * 40; return row; });
  root.children = rows.slice();
  const options = { element: root, itemClass: 'notice', durationProperty: '--duration', easingProperty: '--easing', enabledProperty: '--spatial' };
  return { root, rows, resize, mutation, frames, media, listeners, policy, options,
    flush() { const batch = [...frames.values()]; frames.clear(); for (const callback of batch) callback(); },
    preference(matches) { media.matches = matches; listeners.get('change')?.(); },
    row() { return new Element(document); } };
}

test('flow changes preserve current presentation and unchanged targets do not restart timelines', () => {
  const f = fixture(), result = connectLayoutMotion(f.options); assert.equal(result.ok, true);
  const connection = result.value;
  try {
    assert.equal(f.rows[0].animations.length, 0, 'first rows establish resting facts');
    f.rows[0].y = 40; f.rows[1].y = 0; f.root.children.reverse();
    f.mutation[0].emit(); f.resize[0].emit(); connection.refresh();
    assert.equal(f.frames.size, 1, 'native changes coalesce'); f.flush();
    const first = f.rows[0].animations[0]; assert.equal(first.y, -40);
    assert.deepEqual(first.timing, { duration: 200, easing: 'ease-out' });
    first.progress = .75; const staleFinish = first.onfinish;
    f.rows[0].y = 80; f.resize[0].emit(); f.flush();
    const second = f.rows[0].animations[1]; assert.equal(second.y, -50, 'retarget from eased 30px presentation, not old origin');
    assert.equal(first.effect, null); staleFinish(); assert.equal(second.cancellations, 0, 'retired completion cannot cancel successor');
    second.progress = .5; connection.refresh(); f.flush();
    assert.equal(f.rows[0].animations.length, 2); assert.equal(second.playState, 'running');
    second.progress = 1; second.playState = 'finished'; second.onfinish(); assert.equal(second.effect, null);
    f.rows[0].y = 120; connection.refresh(); f.flush();
    const cancelled = f.rows[0].animations.at(-1); cancelled.playState = 'idle'; cancelled.oncancel();
    assert.equal(cancelled.effect, null, 'native cancellation releases the effect target immediately');
  } finally { connection.disconnect(); }
});

test('new/removing children and translated gestures keep semantic flow independent', () => {
  const f = fixture(), result = connectLayoutMotion(f.options); assert.equal(result.ok, true);
  try {
    const added = f.row(); added.y = 80; f.root.children.push(added); f.mutation[0].emit(); f.flush();
    assert.equal(added.animations.length, 0); assert.equal(f.resize[0].targets.size, 4);
    f.rows[0].swipeX = 24; f.rows[0].swipeY = 7;
    f.rows[0].y = 20; f.resize[0].emit(); f.flush();
    const moving = f.rows[0].animations.at(-1); assert.equal(moving.x, 0); assert.equal(moving.y, -20);
    assert.equal(f.rows[0].swipeX, 24); assert.equal(f.rows[0].swipeY, 7);
    f.root.children = [f.rows[1], added]; f.mutation[0].emit(); f.flush();
    assert.equal(moving.effect, null); assert.equal(f.resize[0].targets.has(f.rows[0]), false);
    f.rows[1].translateOnly = false; f.rows[1].y = 15; f.resize[0].emit(); f.flush();
    assert.equal(f.rows[1].animations.length, 0, 'unsupported transformed coordinates remain static');
  } finally { result.value.disconnect(); }
});

test('CSS policy and reduced motion cancel spatial effects without hiding or removing items', () => {
  const f = fixture(), result = connectLayoutMotion(f.options); assert.equal(result.ok, true);
  try {
    f.rows[1].y = 60; result.value.refresh(); f.flush();
    const animation = f.rows[1].animations.at(-1); assert.ok(animation.effect);
    f.preference(true); assert.equal(animation.effect, null); f.flush();
    assert.equal(f.root.children.length, 2); f.rows[1].y = 80; f.resize[0].emit(); f.flush();
    assert.equal(f.rows[1].animations.length, 1);
    f.preference(false); f.flush(); f.rows[1].y = 100; f.resize[0].emit(); f.flush();
    assert.equal(f.rows[1].animations.length, 2);
    f.policy['--spatial'] = '0'; result.value.refresh(); f.flush(); assert.equal(f.rows[1].animations.at(-1).effect, null);
    for (const duration of ['', 'invalid', '-1ms', '0s']) { f.policy['--duration'] = duration; f.policy['--spatial'] = '1'; f.rows[1].y += 20; result.value.refresh(); f.flush(); }
    assert.equal(f.rows[1].animations.length, 2);
  } finally { result.value.disconnect(); }
});

test('resources are event-driven, linear per changed stack, and all saved callbacks become inert', () => {
  for (const count of [1, 32, 256]) {
    const f = fixture(count), result = connectLayoutMotion(f.options); assert.equal(result.ok, true);
    assert.equal(f.resize.length, 1); assert.equal(f.mutation.length, 1);
    assert.equal(f.resize[0].targets.size, count + 1); assert.deepEqual(f.mutation[0].options, { childList: true });
    const before = f.rows.map(row => row.reads), rootReads = f.root.reads;
    for (let index = 0; index < count; index++) f.rows[index].y += 8;
    for (let index = 0; index < 20; index++) f.resize[0].emit();
    assert.equal(f.frames.size, 1); f.flush();
    assert.equal(f.root.reads - rootReads, 1); assert.ok(f.rows.every((row, index) => row.reads - before[index] === 1));
    assert.equal(f.frames.size, 0, 'native animation owns interpolation, not a JavaScript frame loop');
    result.value.refresh(); const savedFrame = [...f.frames.values()][0];
    const finish = f.rows.map(row => row.animations.at(-1).onfinish);
    result.value.disconnect(); result.value.disconnect();
    assert.equal(f.resize[0].targets.size, 0); assert.equal(f.mutation[0].targets.size, 0);
    assert.equal(f.frames.size, 0); assert.equal(f.listeners.size, 0);
    const reads = f.root.reads; savedFrame(); f.resize[0].emit(); f.mutation[0].emit(); result.value.refresh();
    for (const callback of finish) callback();
    assert.equal(f.root.reads, reads); assert.equal(f.frames.size, 0);
    assert.ok(f.rows.every(row => row.animations.every(animation => animation.effect === null && animation.onfinish === null && animation.oncancel === null)));
  }
});

test('invalid policy inputs and unavailable native observation acquire no live resources', () => {
  for (const overrides of [{ itemClass: '.notice' }, { durationProperty: 'transition-duration' }, { enabledProperty: '--' }, { element: null }]) {
    const f = fixture(), result = connectLayoutMotion({ ...f.options, ...overrides });
    assert.equal(result.ok, false); assert.equal(result.error.code, 'dom.layout-motion-invalid'); assert.equal(f.resize.length, 0);
  }
  const f = fixture(); f.root.ownerDocument.defaultView.MutationObserver = undefined;
  const result = connectLayoutMotion(f.options); assert.equal(result.ok, false); assert.equal(result.error.code, 'dom.layout-motion-unavailable'); assert.equal(f.resize.length, 0);
});

function retainedConnection() {
  const f = fixture(), result = connectLayoutMotion(f.options);
  assert.equal(result.ok, true);
  f.rows[0].y += 20; result.value.refresh(); f.flush();
  const animation = f.rows[0].animations[0], callbacks = [animation.onfinish, f.resize[0].callback, f.mutation[0].callback, f.listeners.get('change')];
  result.value.refresh(); callbacks.push([...f.frames.values()][0]);
  const weak = [new WeakRef(f.root), new WeakRef(f.rows[0]), new WeakRef(f.root.ownerDocument.defaultView)];
  result.value.disconnect();
  return { connection: result.value, animation, callbacks, weak };
}
test('retained facade, native effect and saved callbacks release the disconnected host graph', { skip: typeof global.gc !== 'function' }, async () => {
  const retained = retainedConnection();
  for (let attempt = 0; attempt < 30; attempt++) { await new Promise(resolve => setImmediate(resolve)); global.gc(); }
  assert.ok(retained.weak.every(reference => reference.deref() === undefined));
  for (const callback of retained.callbacks) callback();
  retained.connection.refresh(); retained.connection.disconnect();
  assert.equal(retained.animation.effect, null);
});
