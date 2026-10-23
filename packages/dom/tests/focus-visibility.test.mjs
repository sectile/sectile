import assert from 'node:assert/strict';
import test from 'node:test';
import { connectFocusVisibility } from '../.verification-dist/focus-visibility.js';

// Native boxes/events are supplied facts, not rendered keyboard/scroll evidence.
const defaults = { overflowX: 'visible', overflowY: 'visible', transform: 'none', rotate: 'none', perspective: 'none',
  scrollPaddingTop: '0px', scrollPaddingRight: '0px', scrollPaddingBottom: '0px', scrollPaddingLeft: '0px',
  scrollMarginTop: '0px', scrollMarginRight: '0px', scrollMarginBottom: '0px', scrollMarginLeft: '0px' };
function events() {
  const listeners = new Map();
  return { listeners, addEventListener(type, callback) { let set = listeners.get(type); if (!set) listeners.set(type, set = new Set()); set.add(callback); },
    removeEventListener(type, callback) { const set = listeners.get(type); set?.delete(callback); if (!set?.size) listeners.delete(type); },
    emit(type, event) { for (const callback of listeners.get(type) ?? []) callback(event); } };
}
function fixture(depth = 0) {
  const frames = new Map(), observers = [], positions = []; let sequence = 0, styles = 0;
  const viewport = { ...events(), offsetLeft: 0, offsetTop: 0, width: 200, height: 200 };
  const view = { ...events(), visualViewport: viewport,
    requestAnimationFrame(callback) { const id = ++sequence; frames.set(id, callback); return id; }, cancelAnimationFrame(id) { frames.delete(id); },
    getComputedStyle(node) { styles++; return { ...defaults, ...node.style }; },
    ResizeObserver: class {
      targets = new Set(); constructor(callback) { this.callback = callback; observers.push(this); }
      observe(node) { this.targets.add(node); } unobserve(node) { this.targets.delete(node); } disconnect() { this.targets.clear(); }
    }, MutationObserver: class {
      targets = new Set(); constructor(callback) { this.callback = callback; positions.push(this); }
      observe(node, options) { this.targets.add(node); this.options = options; } disconnect() { this.targets.clear(); }
    } };
  const document = { defaultView: view, activeElement: undefined };
  const element = (parentElement = null) => ({ ...events(), nodeType: 1, isConnected: true, parentElement, ownerDocument: document, style: {},
    assignedSlot: null, getRootNode() { return document; }, offsetWidth: 100, offsetHeight: 100, clientWidth: 100, clientHeight: 100,
    clientLeft: 0, clientTop: 0, scrollWidth: 100, scrollHeight: 100, scrollTop: 0, scrollLeft: 0,
    box: { left: 0, top: 0, width: 100, height: 100 }, writes: [], reads: 0,
    get children() { throw Error('Focus visibility must not scan sibling collections'); },
    getBoundingClientRect() { this.reads++; return { ...this.box }; },
    scrollBy(value) { this.writes.push(value); this.scrollLeft += value.left; this.scrollTop += value.top; } });
  const documentPort = element(); documentPort.clientWidth = 200; documentPort.clientHeight = 200;
  document.documentElement = documentPort; document.scrollingElement = documentPort;
  const root = element(documentPort), port = element(root); port.style.overflowY = 'auto'; port.scrollHeight = 500;
  let ancestor = port; for (let n = 0; n < depth; n++) ancestor = element(ancestor);
  const target = element(ancestor); target.box = { left: 10, top: 150, width: 20, height: 20 };
  document.activeElement = target;
  return { root, port, target, documentPort, document, view, viewport, observers, positions, frames, element,
    flush() { const pending = [...frames.values()]; frames.clear(); for (const callback of pending) callback(); },
    get styles() { return styles; }, listeners() { return root.listeners.size + view.listeners.size + viewport.listeners.size; } };
}

test('focus visibility moves only the nearest local owner with native clearance', () => {
  const f = fixture(), result = connectFocusVisibility({ element: f.root, documentScroll: true }); assert.equal(result.ok, true);
  try {
    f.port.style.scrollPaddingBottom = '5px'; f.target.style.scrollMarginBottom = '7px'; f.flush();
    assert.deepEqual(f.port.writes, [{ left: 0, top: 82, behavior: 'instant' }]);
    assert.deepEqual(f.documentPort.writes, []); assert.equal(f.document.activeElement, f.target);
    assert.equal(f.observers.length, 1); assert.equal(f.observers[0].targets.size, 3);
    f.target.box.top -= 82; result.value.refresh(); f.flush(); assert.equal(f.port.writes.length, 1, 'Visible target does not move again');
  } finally { result.value.disconnect(); }
});

test('spatial transition completion rechecks current native focus without scrolling intermediate boxes', () => {
  for (const event of ['transitionend', 'transitioncancel']) {
    const f = fixture(), panel = f.element(f.port); f.target.parentElement = panel;
    panel.style.transitionProperty = 'opacity, translate';
    let state = 'running';
    panel.getAnimations = () => [{ playState: state, transitionProperty: 'translate', effect: { getComputedTiming: () => ({ endTime: 180 }) } }];
    const result = connectFocusVisibility({ element: f.root }); assert.equal(result.ok, true);
    f.flush(); assert.deepEqual(f.port.writes, [], 'a translated intermediate target is not a scroll destination');
    assert.equal(f.frames.size, 0, 'no animation-frame polling loop');
    const saved = [...panel.listeners.get(event)];
    state = 'finished';
    for (let i = 0; i < 20; i++) panel.emit(event, { target: panel });
    assert.equal(f.frames.size, 1); f.flush();
    assert.deepEqual(f.port.writes, [{ left: 0, top: 70, behavior: 'instant' }]);
    assert.equal(panel.listeners.size, 0, 'settled motion releases both subscriptions');
    result.value.disconnect();
    for (const callback of saved) callback({ target: panel });
    assert.equal(f.frames.size, 0); assert.equal(f.listeners(), 0); assert.equal(f.observers[0].targets.size, 0);
  }
});

test('motion replacement and teardown release old roots while decorative tracks do not defer focus', () => {
  const f = fixture(), old = f.element(f.port), next = f.element(f.port);
  for (const panel of [old, next]) {
    panel.style.transitionProperty = 'all';
    panel.getAnimations = () => [{ playState: 'running', transitionProperty: 'transform', effect: { getComputedTiming: () => ({ endTime: 180 }) } }];
  }
  f.target.parentElement = old;
  const result = connectFocusVisibility({ element: f.root }); assert.equal(result.ok, true);
  f.flush(); assert.equal(old.listeners.size, 2);
  const stale = [...old.listeners.get('transitionend')];
  f.target.parentElement = next; result.value.refresh(); f.flush();
  assert.equal(old.listeners.size, 0); assert.equal(next.listeners.size, 2);
  for (const callback of stale) callback({ target: old }); assert.equal(f.frames.size, 0);
  result.value.disconnect(); assert.equal(next.listeners.size, 0);
  for (const [property, playState, endTime] of [['opacity', 'running', 180], ['translate', 'paused', 180], ['translate', 'running', Infinity]]) {
    const g = fixture(); g.target.style.transitionProperty = 'all';
    g.target.getAnimations = () => [{ playState, transitionProperty: property, effect: { getComputedTiming: () => ({ endTime }) } }];
    const connected = connectFocusVisibility({ element: g.root }); assert.equal(connected.ok, true);
    try { g.flush(); assert.equal(g.port.writes.length, 1); assert.equal(g.target.listeners.size, 0); }
    finally { connected.value.disconnect(); }
  }
});

test('infeasible native clearance reveals fitting controls without moving already visible content', () => {
  for (const candidate of [
    { extent: 52, padding: 12, margin: 8, start: 30, movement: 24 },
    { extent: 100, padding: 0, margin: 40, start: 90, movement: 60 },
    { extent: 52, padding: 30, margin: 0, start: 30, movement: 24 },
    { extent: 52, padding: 12, margin: 8, start: 6, movement: 0 },
    { extent: 52, padding: 12, margin: 8, start: 30, movement: 24, scale: 2 },
  ]) for (const horizontal of [false, true]) {
    const f = fixture(), scale = candidate.scale ?? 1;
    if (horizontal) {
      f.port.style.overflowX = 'auto'; f.port.style.overflowY = 'visible'; f.port.scrollWidth = 500;
      f.port.clientWidth = f.port.offsetWidth = candidate.extent; f.port.box.width = candidate.extent * scale;
      f.port.style.scrollPaddingLeft = f.port.style.scrollPaddingRight = candidate.padding + 'px';
      f.target.style.scrollMarginLeft = f.target.style.scrollMarginRight = candidate.margin + 'px';
      f.target.box = { left: candidate.start * scale, top: 10, width: 40 * scale, height: 20 };
    } else {
      f.port.clientHeight = f.port.offsetHeight = candidate.extent; f.port.box.height = candidate.extent * scale;
      f.port.style.scrollPaddingTop = f.port.style.scrollPaddingBottom = candidate.padding + 'px';
      f.target.style.scrollMarginTop = f.target.style.scrollMarginBottom = candidate.margin + 'px';
      f.target.box = { left: 10, top: candidate.start * scale, width: 20, height: 40 * scale };
    }
    const connected = connectFocusVisibility({ element: f.root }); assert.equal(connected.ok, true);
    try {
      f.flush();
      assert.deepEqual(f.port.writes, candidate.movement ? [{ left: horizontal ? candidate.movement : 0, top: horizontal ? 0 : candidate.movement, behavior: 'instant' }] : []);
      if (candidate.movement) {
        if (horizontal) f.target.box.left -= candidate.movement * scale; else f.target.box.top -= candidate.movement * scale;
        connected.value.refresh(); f.flush(); assert.equal(f.port.writes.length, 1, 'settled native focus stays put');
      }
      assert.ok(f.document.activeElement === f.target); assert.deepEqual(f.documentPort.writes, []);
    } finally { connected.value.disconnect(); }
    assert.equal(f.frames.size, 0); assert.equal(f.listeners(), 0); assert.equal(f.observers[0].targets.size, 0);
  }
});

test('visible viewport changes coalesce and re-read the current target', () => {
  const f = fixture(), result = connectFocusVisibility({ element: f.root }); assert.equal(result.ok, true);
  try {
    const replacement = f.element(f.port); replacement.box = { left: 10, top: 65, width: 20, height: 10 };
    f.document.activeElement = replacement; f.viewport.height = 60;
    for (let n = 0; n < 20; n++) { f.viewport.emit('resize'); f.viewport.emit('scroll'); f.root.emit('focusin'); }
    assert.equal(f.frames.size, 1); f.flush();
    assert.deepEqual(f.port.writes, [{ left: 0, top: 15, behavior: 'instant' }]);
    assert.equal(f.observers[0].targets.has(f.target), false); assert.equal(f.observers[0].targets.has(replacement), true);
    f.document.activeElement = f.element(); f.root.emit('focusout'); f.flush();
    assert.equal(f.observers[0].targets.size, 1); assert.equal(f.port.writes.length, 1);
  } finally { result.value.disconnect(); }
});

test('one focus owner observes a logical Portal scrollport before it becomes constrained', () => {
  const f = fixture(), portal = f.element(f.documentPort), outer = f.element(portal), port = f.element(outer), target = f.element(port);
  outer.style.overflowY = 'auto'; outer.scrollHeight = 500;
  port.style.overflowY = 'auto'; target.box = { left: 10, top: 80, width: 20, height: 20 };
  f.document.activeElement = target; let scope = portal, reads = 0;
  const result = connectFocusVisibility({ element: f.root, documentScroll: true, getFocusRoot: () => { reads++; return scope; } });
  assert.equal(result.ok, true);
  try {
    f.flush(); assert.equal(f.observers.length, 1); assert.equal(f.observers[0].targets.has(port), true);
    assert.equal(f.observers[0].targets.size, 4); assert.equal(reads, 1);
    assert.deepEqual(port.writes, []); assert.deepEqual(f.documentPort.writes, []);
    port.clientHeight = 50; port.offsetHeight = 50; port.box.height = 50;
    for (let n = 0; n < 20; n++) f.observers[0].callback();
    assert.equal(f.frames.size, 1); f.flush();
    assert.equal(reads, 2); assert.deepEqual(outer.writes, []);
    assert.deepEqual(port.writes, [{ left: 0, top: 50, behavior: 'instant' }]);
    assert.equal(f.document.activeElement, target); assert.deepEqual(f.documentPort.writes, []);
    assert.equal(f.observers[0].targets.size, 3);
    scope = undefined; f.document.activeElement = f.target; f.root.emit('focusin'); f.flush();
    assert.equal(f.observers[0].targets.has(port), false);
    assert.deepEqual(f.port.writes, [{ left: 0, top: 70, behavior: 'instant' }]);
  } finally { result.value.disconnect(); assert.equal(f.observers[0].targets.size, 0); assert.equal(f.frames.size, 0); assert.equal(f.listeners(), 0); }
});

test('retirement during logical root resolution prevents native effects and new work', () => {
  const f = fixture();
  const result = connectFocusVisibility({ element: f.root, getFocusRoot() { result.value.disconnect(); return f.root; } });
  assert.equal(result.ok, true); f.flush();
  assert.deepEqual(f.port.writes, []); assert.equal(f.frames.size, 0); assert.equal(f.listeners(), 0); assert.equal(f.observers[0].targets.size, 0);
});

test('one local style observer rechecks position-only Portal commits without a retry loop', () => {
  const f = fixture(), portal = f.element(f.documentPort), port = f.element(portal), target = f.element(port);
  port.style.overflowY = 'auto'; port.style.position = 'absolute'; port.scrollHeight = 200;
  port.box.top = -120; target.box = { left: 10, top: 20, width: 20, height: 20 }; f.document.activeElement = target;
  const result = connectFocusVisibility({ element: f.root, documentScroll: true, getFocusRoot: () => portal });
  assert.equal(result.ok, true);
  try {
    f.flush(); assert.deepEqual(port.writes, []); assert.equal(f.observers.length, 1); assert.equal(f.positions.length, 1);
    assert.deepEqual([...f.positions[0].targets], [port]);
    assert.deepEqual(f.positions[0].options, { attributes: true, attributeFilter: ['style'] });
    assert.equal(f.frames.size, 0, 'Offscreen input does not create a retry frame');
    port.box.top = 8; target.box.top = 148;
    for (let n = 0; n < 20; n++) f.positions[0].callback();
    assert.equal(f.frames.size, 1); f.flush();
    assert.deepEqual(port.writes, [{ left: 0, top: 60, behavior: 'instant' }]);
    assert.deepEqual(f.documentPort.writes, []); assert.equal(f.document.activeElement, target); assert.equal(f.frames.size, 0);
    f.document.activeElement = f.target; result.value.refresh(); f.flush();
    assert.equal(f.positions[0].targets.size, 0, 'Scope exit releases the old style target');
  } finally { result.value.disconnect(); assert.equal(f.positions[0].targets.size, 0); assert.equal(f.observers[0].targets.size, 0); }
});

test('logical focus roots fail closed across document ownership, disconnection and getter failure', () => {
  for (const mode of ['foreign', 'disconnected', 'throw']) {
    const f = fixture(), portal = f.element(f.documentPort);
    if (mode === 'foreign') portal.ownerDocument = {};
    if (mode === 'disconnected') portal.isConnected = false;
    const result = connectFocusVisibility({ element: f.root, getFocusRoot() { if (mode === 'throw') throw Error('Unavailable scope'); return portal; } });
    assert.equal(result.ok, true);
    try { f.flush(); assert.deepEqual(f.port.writes, []); assert.deepEqual(f.documentPort.writes, []); assert.equal(f.observers[0].targets.size, 1); }
    finally { result.value.disconnect(); }
  }
});

test('document scrolling is explicit and an oversized covering target is retained', () => {
  for (const documentScroll of [false, true]) {
    const f = fixture(); f.port.scrollHeight = f.port.clientHeight; f.target.box.top = 250;
    const result = connectFocusVisibility({ element: f.root, documentScroll }); assert.equal(result.ok, true);
    try { f.flush(); assert.equal(f.documentPort.writes.length, documentScroll ? 1 : 0); }
    finally { result.value.disconnect(); }
  }
  const f = fixture(); f.target.box = { left: -10, top: -50, width: 150, height: 200 };
  const result = connectFocusVisibility({ element: f.root }); assert.equal(result.ok, true);
  try { f.flush(); assert.deepEqual(f.port.writes, []); } finally { result.value.disconnect(); }
});

test('horizontal and absent visual viewport facts retain native axis ownership', () => {
  const f = fixture(); delete f.view.visualViewport;
  f.port.style.overflowX = 'auto'; f.port.style.overflowY = 'visible'; f.port.scrollWidth = 500;
  f.target.box = { left: -30, top: 150, width: 20, height: 20 };
  const result = connectFocusVisibility({ element: f.root }); assert.equal(result.ok, true);
  try {
    f.flush(); assert.deepEqual(f.port.writes, [{ left: -30, top: 0, behavior: 'instant' }]);
    assert.equal(f.viewport.listeners.size, 0); assert.equal(f.listeners(), 3);
    f.port.style.scale = '-1'; result.value.refresh(); f.flush(); assert.equal(f.port.writes.length, 1);
  } finally { result.value.disconnect(); }
});

test('scaled local coordinates use native scroll units and invalid facts do not force scrolling', () => {
  const f = fixture(); f.port.box.width = 200; f.port.box.height = 200; f.viewport.height = 400; f.viewport.width = 400;
  f.target.box = { left: 20, top: 300, width: 40, height: 40 };
  const result = connectFocusVisibility({ element: f.root }); assert.equal(result.ok, true);
  try {
    f.flush(); assert.deepEqual(f.port.writes, [{ left: 0, top: 70, behavior: 'instant' }]);
    f.viewport.height = 0; result.value.refresh(); f.flush(); assert.equal(f.port.writes.length, 1);
    f.viewport.height = 400; f.port.style.rotate = '45deg'; result.value.refresh(); f.flush(); assert.equal(f.port.writes.length, 1);
  } finally { result.value.disconnect(); }
});

test('clipping ancestors constrain the local effect without gaining scroll authority', () => {
  const f = fixture(), outer = f.element(f.documentPort);
  f.root.parentElement = outer; outer.style.overflowY = 'clip';
  outer.clientHeight = 60; outer.offsetHeight = 60; outer.box.height = 60;
  const result = connectFocusVisibility({ element: f.root, documentScroll: true }); assert.equal(result.ok, true);
  try {
    f.flush(); assert.deepEqual(f.port.writes, [{ left: 0, top: 110, behavior: 'instant' }]);
    assert.deepEqual(outer.writes, []); assert.deepEqual(f.documentPort.writes, []);
    outer.style.rotate = '45deg'; result.value.refresh(); f.flush();
    assert.equal(f.port.writes.length, 1, 'Unsupported transforms above the boundary defer to native behavior');
  } finally { result.value.disconnect(); }
});

test('scroll padding belongs to its port edge rather than a newly clipped visual edge', () => {
  const f = fixture(); f.viewport.height = 60; f.port.style.scrollPaddingBottom = '10px';
  f.target.box.top = 65; f.target.box.height = 10;
  const result = connectFocusVisibility({ element: f.root }); assert.equal(result.ok, true);
  try { f.flush(); assert.deepEqual(f.port.writes, [{ left: 0, top: 15, behavior: 'instant' }]); }
  finally { result.value.disconnect(); }
});

test('event work follows ancestry, never siblings, and disconnect retires saved deliveries', () => {
  for (const depth of [0, 10, 100]) {
    const f = fixture(depth), result = connectFocusVisibility({ element: f.root }); assert.equal(result.ok, true);
    const initialStyles = f.styles; f.flush(); assert.equal(f.styles - initialStyles, depth + 5);
    assert.equal(f.listeners(), 5); assert.equal(f.frames.size, 0);
    result.value.refresh(); const saved = [...f.frames.values(), f.observers[0].callback, ...f.viewport.listeners.get('resize')];
    result.value.disconnect(); result.value.disconnect();
    assert.equal(f.frames.size, 0); assert.equal(f.listeners(), 0); assert.equal(f.observers[0].targets.size, 0);
    const reads = f.styles; for (const callback of saved) callback(); result.value.refresh();
    assert.equal(f.styles, reads); assert.equal(f.frames.size, 0);
  }
});

test('invalid input and partial acquisition failure leave no listener or pending frame', () => {
  const f = fixture();
  assert.equal(connectFocusVisibility({ element: null }).error.code, 'dom.focus-visibility-invalid');
  assert.equal(connectFocusVisibility({ element: f.root, documentScroll: 'yes' }).error.code, 'dom.focus-visibility-invalid');
  assert.equal(connectFocusVisibility({ element: f.root, getFocusRoot: 'portal' }).error.code, 'dom.focus-visibility-invalid');
  f.view.ResizeObserver = class { constructor() { throw Error('native acquisition failed'); } };
  assert.equal(connectFocusVisibility({ element: f.root }).error.code, 'dom.focus-visibility-unavailable');
  assert.equal(f.listeners(), 0); assert.equal(f.frames.size, 0);
});

function retiredConnection() {
  const f = fixture(), portal = f.element(f.documentPort); f.port.parentElement = portal; f.port.style.position = 'absolute';
  const result = connectFocusVisibility({ element: f.root, getFocusRoot: () => portal }); assert.equal(result.ok, true); f.flush();
  result.value.refresh();
  const callbacks = [...f.frames.values(), f.observers[0].callback, ...f.positions.map(observer => observer.callback), ...f.viewport.listeners.get('resize')];
  const references = [f.root, portal, f.port, f.target, f.view].map(value => new WeakRef(value));
  result.value.disconnect();
  return { connection: result.value, callbacks, references };
}
test('retained connection and callbacks release native roots after disconnect', { skip: typeof global.gc !== 'function' }, async () => {
  const held = retiredConnection();
  for (let n = 0; n < 10; n++) { await new Promise(resolve => setImmediate(resolve)); global.gc(); }
  assert.equal(held.references.every(reference => reference.deref() === undefined), true);
  for (const callback of held.callbacks) callback(); held.connection.refresh();
});
