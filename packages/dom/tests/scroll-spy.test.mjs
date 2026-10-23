import assert from 'node:assert/strict';
import test from 'node:test';
import { Window } from 'happy-dom';
import { connectScrollSpy } from '../.verification-dist/scroll-spy.js';

test('ScrollSpy projects all visible sections continuously through the actual article end', () => {
  const f = fixture(), updates = [];
  const result = connectScrollSpy({ id: 'outline', content: f.content, onChange: value => updates.push(value) });
  assert.equal(result.ok, true); const c = result.value;
  try {
    assert.deepEqual(range(c), [0, 1, 0, 0]);
    assert.deepEqual(c.getSnapshot().headings.map(row => row.depth), [0, 1, 0]);
    f.scroll(150); assert.equal(f.frames.size, 1); f.run(); assert.deepEqual(range(c), [1.5, 2.5, 1, 2]);
    f.scroll(200); f.run(); assert.deepEqual(range(c), [2, 3, 2, 2]);
    f.scroll(250); f.run(); assert.deepEqual(range(c), [2.5, 3, 2, 2]);
    f.scroll(300); f.run(); assert.deepEqual(range(c), [3, 3, -1, -1]);
    assert.ok(updates.length > 1);
  } finally { c.disconnect(); }
});

test('ScrollSpy respects nested clipping and caches document-coordinate clipping through own-root scroll', () => {
  for (const nested of [false, true]) {
    const f = fixture({ nested }); f.wrapper.style.overflowY = 'hidden'; f.wrapperTop = nested ? 80 : 20; f.wrapperHeight = nested ? 60 : 160;
    const r = connectScrollSpy({ id: 'clipped', content: f.content, ...(nested ? { scrollRoot: f.root } : {}), onChange() {} });
    assert.equal(r.ok, true); const c = r.value;
    try {
      if (nested) {
        assert.deepEqual(range(c), [0.3, 0.5, 0, 0]);
        f.scroll(100); f.run(); assert.deepEqual(range(c), [1.3, 1.5, 1, 1]);
        f.wrapperTop = 100; f.view.dispatchEvent(new f.view.Event('scroll')); f.run();
        const hidden = c.getSnapshot(); assert.equal(hidden.start, hidden.end); assert.equal(hidden.first, -1); assert.equal(hidden.last, -1);
      } else {
        assert.deepEqual(range(c), [0.2, 1, 0, 0]);
        f.resetReads(); f.scroll(100); f.run(); assert.deepEqual(range(c), [1, 1.8, 1, 1]); assert.equal(f.geometryReads, 0);
      }
    } finally { c.disconnect(); }
  }
  const f = fixture({ nested: true }); f.rootTop = 0;
  const clip = f.view.document.createElement('div'); clip.style.overflowY = 'hidden'; f.root.append(clip); clip.append(f.content);
  clip.getBoundingClientRect = () => box(-f.root.scrollTop, 150);
  Object.defineProperties(clip, { clientHeight: { get: () => 150 }, clientWidth: { get: () => 200 } });
  const result = connectScrollSpy({ id: 'inner-clip', content: f.content, scrollRoot: f.root, onChange() {} }); assert.equal(result.ok, true);
  try { f.scroll(100); f.run(); assert.deepEqual(range(result.value), [1, 1.5, 1, 1]); } finally { result.value.disconnect(); }
});

test('ScrollSpy refreshes dynamic headings and same-height sibling redistribution, then compare-restores only owned IDs', () => {
  const f = fixture(); f.headings[0].id = 'authored';
  const r = connectScrollSpy({ id: 'dynamic', content: f.content, onChange() {} }); assert.equal(r.ok, true); const c = r.value;
  try {
    const stableID = f.headings[1].id;
    f.headings[1].textContent = 'Renamed'; const removed = f.headings.pop(); removed.remove(); f.addHeading('Added', 2, 200);
    f.mutate(); f.run();
    assert.deepEqual(c.getSnapshot().headings.map(row => row.label), ['First', 'Renamed', 'Added']);
    assert.equal(f.headings[1].id, stableID); assert.equal(removed.hasAttribute('id'), false);
    const metadata = c.getSnapshot().headings;
    f.positions[1] = 50; f.resize(); f.run();
    assert.equal(c.getSnapshot().headings, metadata); assert.deepEqual(range(c), [0, 1 + 1 / 3, 0, 1]);
    f.visible[1] = false; f.resize([{ target: f.headings[1] }]); f.run();
    assert.deepEqual(c.getSnapshot().headings.map(row => row.label), ['First', 'Added']);
    f.visible[1] = true; f.resize([{ target: f.headings[1] }]); f.run();
    assert.deepEqual(c.getSnapshot().headings.map(row => row.label), ['First', 'Renamed', 'Added']);
    f.headings[1].id = 'app-replaced';
  } finally { c.disconnect(); }
  assert.equal(f.headings[0].id, 'authored'); assert.equal(f.headings[1].id, 'app-replaced'); assert.equal(f.headings[2].hasAttribute('id'), false);
});

test('ScrollSpy own-root scroll is coalesced without heading measurements or observer rebuilds at 1/128/4096 headings', () => {
  for (const count of [1, 128, 4096]) {
    const f = fixture({ count, nested: true }); f.rootTop = 0; f.wrapperTop = 0;
    const r = connectScrollSpy({ id: 'bounded', content: f.content, scrollRoot: f.root, onChange() {} }); assert.equal(r.ok, true); const c = r.value;
    const observer = f.observers[0], observed = [...observer.targets];
    try {
      f.resetReads(); f.scroll(25); f.scroll(40); f.scroll(50); assert.equal(f.frames.size, 1); f.run();
      assert.equal(f.geometryReads, 0); assert.deepEqual([...observer.targets], observed);
      assert.equal(c.getSnapshot().first, 0); assert.equal(c.getSnapshot().start, 0.5);
    } finally { c.disconnect(); }
    assert.equal(f.frames.size, 0); assert.ok(f.observers.every(row => row.targets.size === 0));
  }
});

test('ScrollSpy revokes invalid geometry, recovers, and releases saved callbacks and disconnected handles', () => {
  for (let turn = 0; turn < 3; turn++) {
    const f = fixture(), errors = [];
    const r = connectScrollSpy({ id: 'lifetime', content: f.content, onChange() {}, onError: error => errors.push(error.code) }); assert.equal(r.ok, true); const c = r.value;
    f.positions[1] = -1; assert.equal(c.refresh().ok, false); assert.equal(c.getSnapshot().headings.length, 0);
    f.positions[1] = 100; assert.equal(c.refresh().ok, true); assert.equal(c.getSnapshot().headings.length, 3);
    f.scroll(20); assert.equal(f.frames.size, 1);
    const callbacks = f.observers.map(row => row.callback), saved = [...f.frames.values()];
    c.disconnect(); c.disconnect();
    for (const callback of callbacks) callback([]);
    for (const callback of saved) callback(0);
    f.scroll(40); assert.equal(f.frames.size, 0); assert.equal(c.refresh().error.code, 'dom.scroll-spy-disposed');
    assert.equal(c.getSnapshot().headings.length, 0); assert.ok(f.observers.every(row => !row.targets.size)); assert.deepEqual(errors, ['dom.scroll-spy-invalid']);
    assert.ok(f.headings.every(row => !row.hasAttribute('id')));
  }
});

test('ScrollSpy admission rejects invalid options and colliding authored IDs without retaining resources', () => {
  const f = fixture();
  for (const props of [{ id: '' }, { levels: [2, 2] }, { offset: -1 }, { scrollRoot: f.view.document.createElement('div') }]) {
    assert.equal(connectScrollSpy({ id: 'admit', content: f.content, onChange() {}, ...props }).ok, false);
  }
  f.headings[0].id = 'same'; f.headings[1].id = 'same';
  assert.equal(connectScrollSpy({ id: 'admit', content: f.content, onChange() {} }).ok, false);
  assert.equal(f.frames.size, 0); assert.ok(f.observers.every(row => !row.targets.size)); assert.equal(f.headings[2].hasAttribute('id'), false);
  const thrown = fixture(), error = new Error('Application publication failed');
  assert.throws(() => connectScrollSpy({ id: 'throwing', content: thrown.content, onChange() { throw error; } }), value => value === error);
  assert.ok(thrown.observers.every(row => !row.targets.size)); assert.ok(thrown.headings.every(row => !row.hasAttribute('id')));
});

test('ScrollSpy retained handles, snapshots and callbacks release the disconnected content graph', { skip: typeof global.gc !== 'function' }, async () => {
  const held = await retired();
  for (let turn = 0; turn < 20; turn++) { await new Promise(resolve => setImmediate(resolve)); global.gc(); }
  assert.equal(held.content.deref() === undefined, true); assert.equal(held.heading.deref() === undefined, true);
  assert.equal(held.snapshot.headings.length, 3); assert.equal(held.connection.getSnapshot().headings.length, 0);
  for (const callback of held.callbacks) callback([]);
});
async function retired() {
  const f = fixture(), result = connectScrollSpy({ id: 'retired', content: f.content, onChange() { void f.content; } });
  assert.equal(result.ok, true);
  const value = { connection: result.value, callbacks: f.observers.map(row => row.callback), snapshot: result.value.getSnapshot(),
    content: new WeakRef(f.content), heading: new WeakRef(f.headings[0]) };
  result.value.disconnect(); await f.view.happyDOM.close(); return value;
}

function range(c) { const { start, end, first, last } = c.getSnapshot(); return [start, end, first, last]; }
test('ScrollSpy excludes its presentation subtree without observing mutation feedback or losing its flow size', () => {
  const f = fixture(), nav = f.view.document.createElement('nav'), heading = f.view.document.createElement('h2');
  heading.id = 'presentation'; heading.textContent = 'Not article content'; heading.getClientRects = () => [box(250, 20)]; heading.getBoundingClientRect = () => box(250, 20);
  const hidden = f.view.document.createElement('section'); hidden.hidden = true;
  nav.append(heading); f.content.append(nav, hidden);
  const r = connectScrollSpy({ id: 'exclude', content: f.content, exclude: nav, onChange() {} }); assert.equal(r.ok, true);
  try {
    assert.equal(r.value.getSnapshot().headings.length, 3); assert.ok(f.observers[0].targets.has(nav)); assert.equal(f.observers[0].targets.has(heading), false);
    assert.ok(f.observers[0].targets.has(hidden), 'ordinary hidden flow boxes remain observed when CSS later exposes them');
    f.observers[1].callback([{ target: nav, type: 'attributes' }, { target: heading, type: 'characterData' }]); assert.equal(f.frames.size, 0);
    f.resize([{ target: nav }]); assert.equal(f.frames.size, 1); f.run(); assert.equal(r.value.getSnapshot().headings.length, 3);
  } finally { r.value.disconnect(); }
  const plain = connectScrollSpy({ id: 'plain', content: f.content, onChange() {} }); assert.equal(plain.ok, true);
  try { assert.equal(plain.value.getSnapshot().headings.length, 4); } finally { plain.value.disconnect(); }
});
// A native observer constructor does not close over the fixture's DOM graph.
// Keep this class outside fixture() so retaining an observer tests the provider,
// not an artificial constructor closure retaining that entire fixture.
let observerCollector;
class Observer {
  constructor(callback) { this.callback = callback; this.targets = new Set(); observerCollector?.push(this); }
  observe(target) { this.targets.add(target); }
  disconnect() { this.targets.clear(); }
}
function fixture({ count = 3, nested = false } = {}) {
  const view = new Window(), document = view.document, frames = new Map(), observers = [];
  let nextFrame = 0, scrollY = 0, geometryReads = 0;
  Object.defineProperty(view, 'scrollY', { get: () => scrollY });
  Object.defineProperties(document.documentElement, { clientWidth: { get: () => 200 }, clientHeight: { get: () => 100 }, scrollHeight: { get: () => count * 100 } });
  view.requestAnimationFrame = callback => { frames.set(++nextFrame, callback); return nextFrame; }; view.cancelAnimationFrame = id => frames.delete(id);
  observerCollector = observers;
  view.ResizeObserver = Observer; view.MutationObserver = Observer;
  const wrapper = document.createElement('div'), root = document.createElement('div'), content = document.createElement('article');
  document.body.append(wrapper); wrapper.append(root); root.append(content);
  const headings = [], positions = [], visible = [], f = { view, wrapper, root, content, headings, positions, visible, frames, observers, rootTop: 50, wrapperTop: 0, wrapperHeight: count * 100,
    get geometryReads() { return geometryReads; }, resetReads() { geometryReads = 0; },
    scroll(value) { if (nested) { root.scrollTop = value; root.dispatchEvent(new view.Event('scroll')); } else { scrollY = value; view.dispatchEvent(new view.Event('scroll')); } },
    run() { const current = [...frames.values()]; frames.clear(); for (const callback of current) callback(0); },
    mutate() { observers[1].callback([]); }, resize(entries = []) { observers[0].callback(entries); },
    addHeading(label, level, position) { const element = document.createElement('h' + level), index = headings.length;
      positions[index] = position; visible[index] = true; element.textContent = label; content.append(element); headings.push(element);
      element.getBoundingClientRect = () => { geometryReads++; return box(positions[index] - (nested ? root.scrollTop : scrollY) + (nested ? f.rootTop : 0), 20); };
      element.getClientRects = () => visible[index] ? [element.getBoundingClientRect()] : []; return element; },
  };
  Object.defineProperties(root, { clientWidth: { get: () => 200 }, clientHeight: { get: () => 100 } });
  wrapper.getBoundingClientRect = () => { geometryReads++; return box(f.wrapperTop - (nested ? 0 : scrollY), f.wrapperHeight); };
  Object.defineProperties(wrapper, { clientWidth: { get: () => 200 }, clientHeight: { get: () => f.wrapperHeight } });
  root.getBoundingClientRect = () => { geometryReads++; return box(nested ? f.rootTop : -scrollY, 100); };
  content.getBoundingClientRect = () => { geometryReads++; return box((nested ? f.rootTop - root.scrollTop : -scrollY), count * 100); };
  for (let i = 0; i < count; i++) f.addHeading(['First', 'Second', 'Third'][i] ?? 'Section ' + i, i === 1 ? 3 : 2, i * 100);
  return f;
}
function box(top, height) { return { x: 0, y: top, left: 0, top, right: 200, bottom: top + height, width: 200, height }; }
