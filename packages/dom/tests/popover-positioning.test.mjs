import assert from 'node:assert/strict';
import test from 'node:test';
import { Window } from 'happy-dom';
import { createPopover } from '../.verification-dist/popover.js';
import { createTooltip } from '../.verification-dist/tooltip.js';
import { measureTextCaretRect } from '../.verification-dist/text/caret.js';
import {
  createPositionEngine,
  detectPositionEngineCapabilities,
  readPositionSourceRegistryDiagnostics,
  selectPositionRoute,
} from '../.verification-dist/overlay/position/engine.js';

const completeCapabilities = Object.freeze({
  anchorName: true,
  positionAnchor: true,
  positionArea: true,
  positionVisibility: true,
  anchorGeometry: true,
});

test('position policies inherit legacy defaults and independently preserve side, shift and available space', () => {
  for (const [policy, side, x, y] of [
    [{}, 'left', 162, 212],
    [{ avoidCollisions: false }, 'bottom', 270, 278],
    [{ flip: false }, 'bottom', 192, 278],
    [{ shift: false }, 'left', 162, 250],
    [{ avoidCollisions: false, shift: true }, 'bottom', 192, 278],
    [{ avoidCollisions: false, flip: true }, 'left', 162, 250],
    [{ avoidCollisions: true, flip: false, shift: false }, 'bottom', 270, 278],
  ]) {
    const fixture = createPositionFixture(), before = readPositionSourceRegistryDiagnostics();
    setRect(fixture.reference, { x: 270, y: 250, width: 20, height: 20 });
    setRect(fixture.root, { x: 0, y: 0, width: 100, height: 80 });
    setRect(fixture.boundary, { x: 0, y: 0, width: 300, height: 300 });
    const engine = createPositionEngine({ root: fixture.root, reference: fixture.reference,
      collisionBoundary: fixture.boundary, side: 'bottom', align: 'start', strategy: 'fixed', ...policy });
    try {
      engine.connect(); fixture.frames.flush();
      assert.equal(fixture.root.dataset.side, side);
      assert.equal(fixture.root.style.left, `${x}px`);
      assert.equal(fixture.root.style.top, `${y}px`);
      if (side === 'bottom') assert.equal(fixture.root.style.getPropertyValue('--sectile-position-available-height'), '14px');
      assert.equal(engine.diagnostics().candidateCount, side === 'bottom' ? 1 : 4);
    } finally { engine.disconnect(); }
    assert.deepEqual(readPositionSourceRegistryDiagnostics(), before);
    fixture.close();
  }
});

test('position route admission uses resolved policies and rejects malformed policies before acquiring resources', () => {
  const fixture = createPositionFixture(), before = readPositionSourceRegistryDiagnostics();
  const options = { root: fixture.root, reference: fixture.reference, capabilities: completeCapabilities };
  try {
    assert.equal(selectPositionRoute({ ...options, flip: false, shift: false }), 'css-anchor');
    assert.equal(selectPositionRoute({ ...options, avoidCollisions: false, flip: true }), 'javascript');
    assert.equal(selectPositionRoute({ ...options, avoidCollisions: false, shift: true }), 'javascript');
    for (const key of ['flip', 'shift', 'avoidCollisions']) {
      assert.throws(() => createPositionEngine({ ...options, [key]: 'false' }), /must be boolean/);
    }
    assert.equal(fixture.root.style.position, '');
    assert.deepEqual(readPositionSourceRegistryDiagnostics(), before);
  } finally { fixture.close(); }
});

test('live reference geometry shares one positioning frame and retires native invalidation sources', () => {
  const fixture = createPositionFixture(), before = readPositionSourceRegistryDiagnostics(); let current, reads = 0;
  const options = { root: fixture.root, reference: fixture.reference, measureAnchorRect: () => { reads++; return current; },
    strategy: 'fixed', side: 'bottom', align: 'start', sideOffset: 0, avoidCollisions: false, capabilities: completeCapabilities };
  assert.equal(selectPositionRoute(options), 'javascript');
  const engine = createPositionEngine(options);
  try {
    engine.connect(); fixture.frames.flush(); assert.equal(fixture.root.style.visibility, 'hidden');
    current = { x: 70, y: 80, width: 0, height: 16 };
    for (const name of ['scroll', 'input', 'select', 'compositionend']) fixture.reference.dispatchEvent(new fixture.window.Event(name));
    assert.equal(fixture.frames.pending, 1); fixture.frames.flush(); assert.equal(reads, 2);
    assert.equal(fixture.root.style.left, '70px'); assert.equal(fixture.root.style.top, '96px'); assert.equal(fixture.root.style.visibility, '');
    current = undefined; fixture.reference.dispatchEvent(new fixture.window.Event('select')); fixture.frames.flush();
    assert.equal(fixture.root.style.visibility, 'hidden');
    engine.disconnect(); const retired = reads;
    for (const name of ['scroll', 'input', 'select', 'compositionend']) fixture.reference.dispatchEvent(new fixture.window.Event(name));
    fixture.frames.flush(); assert.equal(reads, retired); assert.equal(fixture.frames.pending, 0);
    assert.equal(fixture.root.style.visibility, ''); assert.equal(engine.diagnostics().sourceSubscriptions, 0);
    assert.equal(readPositionSourceRegistryDiagnostics().callbacks, before.callbacks);
    assert.equal(readPositionSourceRegistryDiagnostics().physicalListeners, before.physicalListeners);
  } finally { engine.disconnect(); fixture.close(); }
});

function caretMeasurementFixture(multiline = false) {
  const window = new Window(), document = window.document, element = document.createElement(multiline ? 'textarea' : 'input');
  element.style.cssText = 'box-sizing:border-box;width:124px;height:44px;padding:5px 10px;border:2px solid;font:16px/20px monospace;font-feature-settings:"liga" 0;writing-mode:horizontal-tb;';
  element.value = multiline ? 'A😀\n@한tail' : 'A😀@한tail'; element.setSelectionRange(multiline ? 6 : 5, multiline ? 6 : 5);
  element.scrollLeft = 7; element.scrollTop = 3; document.body.append(element);
  setRect(element, { x: 100, y: 200, width: 248, height: 88 });
  Object.defineProperties(element, { clientWidth: { value: 120 }, clientHeight: { value: 40 }, clientLeft: { value: 2 }, clientTop: { value: 2 } });
  let mirror, node, offset, collapsed, failure = false, empty = false;
  let mirrorSize = { width: 100, height: 20 }, caretRect = { left: 40, top: 22, width: 0, height: 16 };
  const createElement = document.createElement.bind(document);
  document.createElement = name => {
    const result = createElement(name);
    if (name === 'div') { mirror = result; setRect(result, { x: 10, y: 20, ...mirrorSize });
      Object.defineProperties(result, { offsetWidth: { value: mirrorSize.width }, offsetHeight: { value: mirrorSize.height } }); }
    return result;
  };
  document.createRange = () => ({ setStart(value, start) { node = value; offset = start; }, collapse(value) { collapsed = value; },
    getClientRects() { if (failure) throw Error('Native measurement failed'); return empty ? [] : [caretRect]; } });
  return { window, element, get mirror() { return mirror; }, get node() { return node; }, get offset() { return offset; }, get collapsed() { return collapsed; },
    geometry(caret, size) { caretRect = caret; mirrorSize = size; }, fail() { failure = true; }, empty() { empty = true; }, close() { window.close(); } };
}

for (const multiline of [false, true]) test(`native caret measurement translates UTF16 Range geometry, scroll, padding and CSS scale (${multiline})`, () => {
  const fixture = caretMeasurementFixture(multiline), element = fixture.element, selection = element.selectionStart, value = element.value;
  try {
    assert.deepEqual(measureTextCaretRect(element), { x: 170, y: multiline ? 212 : 222, width: 0, height: 32 });
    assert.equal(fixture.offset, selection); assert.equal(fixture.collapsed, true); assert.equal(fixture.node.data, value + '\u200b');
    assert.equal(fixture.mirror.style.getPropertyValue('font-feature-settings'), '"liga" 0');
    assert.equal(fixture.mirror.style.getPropertyValue('white-space'), multiline ? 'pre-wrap' : 'pre');
    assert.equal(fixture.mirror.getAttribute('aria-hidden'), 'true'); assert.equal(fixture.mirror.inert, true); assert.equal(fixture.mirror.isConnected, false);
    assert.equal(element.value, value); assert.equal(element.selectionStart, selection);
    element.scrollLeft = -7; assert.equal(measureTextCaretRect(element).x, 198, 'Signed RTL scrolling is subtracted, not clamped');
    if (multiline) { element.wrap = 'off'; element.value = '\n'; element.setSelectionRange(1, 1); measureTextCaretRect(element);
      assert.equal(fixture.offset, 1); assert.equal(fixture.node.data, '\n\u200b'); assert.equal(fixture.mirror.style.whiteSpace, 'pre'); }
  } finally { fixture.close(); }
});

for (const [multiline, mode, x] of [[false, 'vertical-rl', 194], [true, 'vertical-rl', 274], [true, 'vertical-lr', 114]]) {
  test(`native caret measurement preserves vertical block origin and zero inline extent (${multiline}/${mode})`, () => {
    const fixture = caretMeasurementFixture(multiline);
    try {
      fixture.element.style.writingMode = mode;
      fixture.geometry({ left: 12, top: 30, width: 16, height: 0 }, { width: 20, height: 30 });
      assert.deepEqual(measureTextCaretRect(fixture.element), { x, y: 228, width: 32, height: 0 });
      assert.equal(fixture.mirror.style.writingMode, mode); assert.equal(fixture.mirror.style.height, '30px');
      assert.equal(fixture.mirror.isConnected, false);
    } finally { fixture.close(); }
  });
}

test('native caret measurement never invents geometry and removes temporary content after a failed native read', () => {
  for (const mode of ['range', 'empty', 'selection', 'password', 'detached']) {
    const fixture = caretMeasurementFixture();
    try {
      if (mode === 'range') fixture.fail(); if (mode === 'empty') fixture.empty();
      if (mode === 'selection') fixture.element.setSelectionRange(0, 1);
      if (mode === 'password') fixture.element.type = 'password'; if (mode === 'detached') fixture.element.remove();
      assert.equal(measureTextCaretRect(fixture.element), undefined); assert.equal(fixture.mirror?.isConnected ?? false, false);
      assert.equal(fixture.window.document.documentElement.querySelectorAll('div').length, 0);
    } finally { fixture.close(); }
  }
});

test('rectangle references use canonical point/rect geometry without measuring the context element', () => {
  for (const dimensions of [{ width: 0, height: 0 }, { width: 40, height: 20 }]) {
    const fixture = createPositionFixture(), before = readPositionSourceRegistryDiagnostics();
    let contextReads = 0;
    fixture.reference.getBoundingClientRect = () => { contextReads++; throw Error('context is not the geometry'); };
    const anchorRect = { x: 70, y: 80, ...dimensions };
    const eligibleCSS = { root: fixture.root, reference: fixture.reference,
      avoidCollisions: false, capabilities: completeCapabilities };
    assert.equal(selectPositionRoute(eligibleCSS), 'css-anchor');
    assert.equal(selectPositionRoute({ ...eligibleCSS, anchorRect }), 'javascript');
    const engine = createPositionEngine({ root: fixture.root, reference: fixture.reference, anchorRect,
      strategy: 'fixed', side: 'bottom', align: 'start', sideOffset: 0, avoidCollisions: false,
      collisionBoundary: fixture.boundary, capabilities: completeCapabilities });
    anchorRect.x = 900; anchorRect.height = 900;
    assert.equal(engine.route, 'javascript');
    engine.connect(); engine.update(); engine.update();
    assert.equal(fixture.frames.pending, 1);
    fixture.frames.flush();
    assert.equal(fixture.root.style.left, '70px');
    assert.equal(fixture.root.style.top, `${80 + dimensions.height}px`);
    assert.equal(fixture.root.style.getPropertyValue('--sectile-position-anchor-width'), `${dimensions.width}px`);
    assert.equal(contextReads, 0);
    assert.equal(engine.diagnostics().measurementReads, 2);
    assert.equal(engine.diagnostics().resizeObservers, 1);
    assert.equal(engine.diagnostics().layoutObservers, 1);
    assert.equal(fixture.resizeObservers[0].targets.length, 3);
    assert.ok(fixture.resizeObservers[0].targets.every((target, index) => target === [fixture.reference, fixture.root, fixture.boundary][index]));
    assert.equal(fixture.intersectionObservers[0].targets.length, 1);
    assert.ok(fixture.intersectionObservers[0].targets[0] === fixture.reference);
    engine.disconnect();
    fixture.resizeObservers[0].callback(); fixture.intersectionObservers[0].callback();
    fixture.frames.flush();
    assert.equal(fixture.frames.pending, 0);
    assert.equal(fixture.root.style.left, '');
    assert.equal(fixture.root.dataset.positionRoute, undefined);
    assert.equal(readPositionSourceRegistryDiagnostics().callbacks, before.callbacks);
    assert.equal(readPositionSourceRegistryDiagnostics().physicalListeners, before.physicalListeners);
    fixture.close();
  }
});

test('popup rectangle snapshots retain, replace and clear independently of element anchors', () => {
  for (const create of [createPopover, createTooltip]) {
    const fixture = createPositionFixture(), before = readPositionSourceRegistryDiagnostics();
    const placement = { strategy: 'fixed', side: 'bottom', align: 'start', sideOffset: 0,
      avoidCollisions: false, collisionBoundary: fixture.boundary };
    const anchorRect = { x: 70, y: 80, width: 0, height: 0 };
    const popup = create({ root: fixture.root, trigger: fixture.reference, anchorRect,
      defaultOpen: true, autoFocus: false, manageVisibility: false, ...placement });
    anchorRect.x = 999; fixture.frames.flush();
    assert.equal(fixture.root.style.left, '70px'); assert.equal(fixture.root.style.top, '80px');
    const state = popup.getSnapshot();
    popup.syncPosition(placement); fixture.frames.flush();
    assert.equal(fixture.root.style.left, '70px', 'omission retains the snapshot');
    popup.suspend(); assert.equal(fixture.frames.pending, 0);
    assert.equal(readPositionSourceRegistryDiagnostics().callbacks, before.callbacks);
    popup.resume(); fixture.frames.flush();
    assert.equal(fixture.root.style.left, '70px', 'resume reuses the admitted snapshot');
    const nextRect = { x: 90, y: 100, width: 20, height: 30 };
    popup.syncPosition({ ...placement, anchorRect: nextRect }); nextRect.y = 999;
    fixture.frames.flush();
    assert.equal(fixture.root.style.left, '90px'); assert.equal(fixture.root.style.top, '130px');
    popup.syncPosition({ ...placement, anchorRect: null }); fixture.frames.flush();
    assert.equal(fixture.root.style.left, '20px'); assert.equal(fixture.root.style.top, '40px');
    setRect(fixture.reference, { x: 30, y: 40, width: 40, height: 20 });
    popup.updatePosition(); fixture.frames.flush();
    assert.equal(fixture.root.style.left, '30px'); assert.equal(fixture.root.style.top, '60px');
    assert.ok(popup.getSnapshot() === state);
    popup.destroy();
    assert.equal(fixture.frames.pending, 0);
    assert.equal(readPositionSourceRegistryDiagnostics().callbacks, before.callbacks);
    assert.equal(readPositionSourceRegistryDiagnostics().physicalListeners, before.physicalListeners);
    fixture.close();
  }
});

test('invalid rectangles are rejected before popup construction or position replacement acquires resources', () => {
  for (const create of [createPopover, createTooltip]) {
    const fixture = createPositionFixture(), before = readPositionSourceRegistryDiagnostics();
    const placement = { strategy: 'fixed', side: 'bottom', align: 'start', sideOffset: 0,
      avoidCollisions: false, collisionBoundary: fixture.boundary };
    const invalid = [NaN, Infinity, -Infinity].flatMap(value => ['x', 'y', 'width', 'height']
      .map(key => ({ x: 70, y: 80, width: 0, height: 0, [key]: value })));
    invalid.push({ x: 70, y: 80, width: -1, height: 0 }, { x: 70, y: 80, width: 0, height: -1 }, {});
    for (const anchorRect of invalid) {
      assert.throws(() => create({ root: fixture.root, trigger: fixture.reference, defaultOpen: true,
        anchorRect, ...placement }), /anchorRect/);
      assert.equal(fixture.frames.pending, 0);
      assert.equal(readPositionSourceRegistryDiagnostics().callbacks, before.callbacks);
      assert.equal(fixture.root.getAttribute('role'), null);
    }
    const popup = create({ root: fixture.root, trigger: fixture.reference, defaultOpen: true,
      anchorRect: { x: 70, y: 80, width: 0, height: 0 }, autoFocus: false, ...placement });
    fixture.frames.flush();
    const styles = fixture.root.getAttribute('style'), resources = readPositionSourceRegistryDiagnostics();
    const observers = fixture.resizeObservers.length, state = popup.getSnapshot();
    for (const anchorRect of invalid) {
      assert.throws(() => popup.syncPosition({ anchorRect }), /anchorRect/);
      assert.equal(fixture.root.getAttribute('style'), styles);
      assert.deepEqual(readPositionSourceRegistryDiagnostics(), resources);
      assert.equal(fixture.resizeObservers.length, observers);
      assert.ok(popup.getSnapshot() === state);
    }
    popup.destroy(); fixture.close();
  }
});

test('positioned popup configuration keeps active and retained admission while replacing only owned layout resources', () => {
  for (const create of [createPopover, createTooltip]) {
    const fixture = createPositionFixture();
    const before = readPositionSourceRegistryDiagnostics();
    const popup = create({ root: fixture.root, trigger: fixture.reference, defaultOpen: true, retainExit: true,
      autoFocus: false, manageVisibility: false, collisionBoundary: fixture.boundary, avoidCollisions: false });
    let paint; popup.subscribeLayerPresentation(value => { paint = value; });
    fixture.frames.flush(); fixture.reference.focus();
    const active = paint, state = popup.getSnapshot();
    const invalidResources = readPositionSourceRegistryDiagnostics();
    assert.throws(() => popup.syncPosition({ sideOffset: NaN }), /finite/);
    assert.deepEqual(readPositionSourceRegistryDiagnostics(), invalidResources);
    assert.equal(paint, active); assert.equal(popup.getSnapshot(), state);
    popup.syncPosition({ side: 'top', align: 'start', sideOffset: 3, avoidCollisions: false, collisionBoundary: fixture.boundary });
    fixture.frames.flush(); assert.equal(fixture.root.style.top, '7px');
    assert.equal(fixture.root.dataset.side, 'top'); assert.equal(paint, active);
    assert.equal(fixture.window.document.activeElement, fixture.reference);
    const external = fixture.window.document.createElement('span'); fixture.window.document.body.append(external);
    setRect(external, { x: 100, y: 100, width: 20, height: 20 });
    popup.syncPosition({ anchor: external, side: 'bottom', align: 'start', sideOffset: 0, avoidCollisions: false, collisionBoundary: fixture.boundary });
    fixture.frames.flush(); assert.equal(fixture.root.style.left, '100px'); assert.equal(fixture.root.style.top, '120px');
    assert.ok(popup.getSnapshot() === state); assert.ok(paint === active);
    const anchoredResources = readPositionSourceRegistryDiagnostics();
    assert.throws(() => popup.syncPosition({ anchor: '#not-an-element' }), /anchor/);
    assert.deepEqual(readPositionSourceRegistryDiagnostics(), anchoredResources);
    popup.syncPosition({ side: 'top', align: 'start', sideOffset: 0, avoidCollisions: false, collisionBoundary: fixture.boundary });
    fixture.frames.flush(); assert.equal(fixture.root.style.left, '100px', 'omitted anchor retains the reference');
    popup.syncPosition({ anchor: null, side: 'bottom', align: 'start', sideOffset: 0, avoidCollisions: false, collisionBoundary: fixture.boundary });
    fixture.frames.flush(); assert.equal(fixture.root.style.left, '20px', 'null restores trigger fallback');
    assert.ok(fixture.window.document.activeElement === fixture.reference);
    assert.ok(popup.getSnapshot() === state); assert.ok(paint === active);
    popup.handleEvent('close'); const exit = paint;
    for (let index = 0; index < 32; index++) {
      popup.syncPosition({ strategy: 'fixed', tracking: 'animation-frame', collisionBoundary: fixture.boundary });
      assert.ok(fixture.frames.pending <= 1);
      popup.syncPosition({ position: false });
      assert.equal(fixture.frames.pending, 0); assert.equal(fixture.root.style.position, '');
      assert.equal(fixture.root.dataset.positionRoute, undefined);
      assert.deepEqual(readPositionSourceRegistryDiagnostics(), { ...before,
        dispatches: readPositionSourceRegistryDiagnostics().dispatches,
        affectedDispatches: readPositionSourceRegistryDiagnostics().affectedDispatches });
      assert.equal(paint, exit); assert.equal(paint.generation, active.generation);
    }
    popup.syncPosition({ avoidCollisions: false, collisionBoundary: fixture.boundary });
    fixture.frames.flush(); assert.equal(fixture.root.dataset.side, 'bottom');
    popup.destroy(); assert.equal(fixture.frames.pending, 0);
    assert.ok(fixture.resizeObservers.every(observer => observer.disconnected));
    assert.ok(fixture.intersectionObservers.every(observer => observer.disconnected));
    assert.equal(fixture.root.style.position, '');
    assert.equal(readPositionSourceRegistryDiagnostics().callbacks, before.callbacks);
    assert.equal(readPositionSourceRegistryDiagnostics().physicalListeners, before.physicalListeners);
    fixture.close();
  }
});

test('triggerless positioned popups clear and restore only their geometry reference', () => {
  for (const create of [createPopover, createTooltip]) {
    const fixture = createPositionFixture(), before = readPositionSourceRegistryDiagnostics();
    const options = { align: 'start', sideOffset: 0, avoidCollisions: false, collisionBoundary: fixture.boundary };
    const popup = create({ root: fixture.root, anchor: fixture.reference, defaultOpen: true, autoFocus: false, manageVisibility: false, ...options });
    const state = popup.getSnapshot(); fixture.frames.flush(); assert.equal(fixture.root.style.left, '20px');
    popup.syncPosition({ anchor: null, ...options });
    assert.equal(fixture.root.dataset.positionRoute, undefined); assert.equal(fixture.frames.pending, 0);
    assert.equal(readPositionSourceRegistryDiagnostics().callbacks, before.callbacks); assert.ok(popup.getSnapshot() === state);
    popup.syncPosition({ anchor: fixture.reference, ...options });
    fixture.frames.flush(); assert.equal(fixture.root.style.left, '20px'); assert.ok(popup.getSnapshot() === state);
    popup.destroy(); assert.equal(fixture.frames.pending, 0);
    assert.equal(readPositionSourceRegistryDiagnostics().callbacks, before.callbacks);
    assert.equal(readPositionSourceRegistryDiagnostics().physicalListeners, before.physicalListeners);
    fixture.close();
  }
});

test('DOM positioning reserves layout synchronously before measuring', () => {
  const window = new Window({ url: 'https://sectile.dev/' });
  const root = window.document.createElement('div');
  const trigger = window.document.createElement('button');
  const arrow = window.document.createElement('div');
  arrow.style.position = 'relative';
  root.append(arrow);
  window.document.body.append(trigger, root);
  const popover = createPopover({ root, trigger, arrow, defaultOpen: true, strategy: 'absolute' });
  assert.equal(root.style.position, 'absolute');
  assert.equal(root.style.visibility, 'hidden');
  assert.equal(arrow.style.position, 'absolute');
  popover.disconnect();
  assert.equal(arrow.style.position, 'relative');
  window.close();
});

test('DOM positioning excludes the arrow from its first floating measurement', () => {
  const fixture = createPositionFixture();
  const arrow = fixture.window.document.createElement('div');
  arrow.style.position = 'relative';
  fixture.root.append(arrow);
  setRect(fixture.reference, { x: 100, y: 200, width: 40, height: 20 });
  setRect(fixture.boundary, { x: 0, y: 0, width: 400, height: 400 });
  setRect(arrow, { x: 0, y: 0, width: 8, height: 8 });
  fixture.root.getBoundingClientRect = () => {
    const height = arrow.style.position === 'absolute' ? 10 : 28;
    return Object.freeze({ x: 0, y: 0, top: 0, right: 80, bottom: height, left: 0, width: 80, height, toJSON() { return this; } });
  };
  const engine = createPositionEngine({
    root: fixture.root,
    reference: fixture.reference,
    arrow,
    collisionBoundary: fixture.boundary,
    side: 'top',
    align: 'end',
    sideOffset: 3,
    avoidCollisions: false,
  });
  engine.connect();
  assert.equal(arrow.style.position, 'absolute');
  fixture.frames.flush();
  assert.equal(fixture.root.style.top, '187px');
  engine.disconnect();
  assert.equal(arrow.style.position, 'relative');
  fixture.close();
});

test('DOM popover and tooltip support resource-free manual positioning', () => {
  for (const [kind, create] of [['popover', createPopover], ['tooltip', createTooltip]]) {
    const window = new Window({ url: 'https://sectile.dev/' });
    const root = window.document.createElement('div');
    const trigger = window.document.createElement('button');
    window.document.body.append(trigger, root);
    const before = readPositionSourceRegistryDiagnostics();
    const connection = create({ root, trigger, defaultOpen: true, position: false });
    assert.equal(root.style.position, '', kind);
    assert.equal(root.dataset.positionRoute, undefined, kind);
    assert.deepEqual(readPositionSourceRegistryDiagnostics(), before, kind);
    connection.disconnect();
    assert.deepEqual(readPositionSourceRegistryDiagnostics(), before, kind);
    window.close();
  }
});

test('DOM positioning selects CSS only for the fully supported narrow route', () => {
  const window = new Window({ url: 'https://sectile.dev/' });
  const root = window.document.createElement('div');
  const reference = window.document.createElement('button');
  window.document.body.append(reference, root);
  assert.equal(selectPositionRoute({ root, reference, capabilities: completeCapabilities, avoidCollisions: false }), 'css-anchor');
  assert.equal(selectPositionRoute({ root, reference, capabilities: completeCapabilities, avoidCollisions: true }), 'javascript');
  assert.equal(selectPositionRoute({ root, reference, capabilities: completeCapabilities, avoidCollisions: false, onLayout() {} }), 'javascript');
  assert.equal(selectPositionRoute({ root, reference, capabilities: { ...completeCapabilities, anchorGeometry: false }, avoidCollisions: false }), 'javascript');
  window.close();
});

test('native area sizing admits a viewport containing block and not a clipped or transformed owner', () => {
  const fixture = createPositionFixture(), container = fixture.window.document.createElement('section');
  fixture.window.document.body.append(container); container.append(fixture.root);
  const options = { root: fixture.root, reference: fixture.reference, avoidCollisions: false, capabilities: completeCapabilities };
  try {
    container.style.position = 'relative';
    assert.equal(selectPositionRoute(options), 'javascript');
    assert.equal(selectPositionRoute({ ...options, strategy: 'fixed' }), 'css-anchor');
    container.style.transform = 'translateX(0px)';
    assert.equal(selectPositionRoute({ ...options, strategy: 'fixed' }), 'javascript');
    container.style.transform = ''; container.style.overflow = 'hidden';
    assert.equal(selectPositionRoute({ ...options, strategy: 'fixed' }), 'javascript');
  } finally { fixture.close(); }
});

test('native admission reads each root ancestor once and completion needs no measured layout', () => {
  const fixture = createPositionFixture(), container = fixture.window.document.createElement('section');
  fixture.window.document.body.append(container); container.append(fixture.root);
  const readStyle = fixture.window.getComputedStyle.bind(fixture.window);
  let styles = 0, notifications = 0;
  fixture.window.getComputedStyle = element => { styles++; return readStyle(element); };
  fixture.root.getBoundingClientRect = fixture.reference.getBoundingClientRect = () => { throw Error('native geometry must stay in CSS'); };
  const engine = createPositionEngine({ root: fixture.root, reference: fixture.reference, avoidCollisions: false,
    capabilities: completeCapabilities, onPositioned() { notifications++; } });
  try {
    assert.equal(styles, 3);
    engine.connect(); engine.connect(); engine.update();
    assert.equal(notifications, 2);
    assert.equal(styles, 3);
    assert.equal(engine.diagnostics().measurementReads, 0);
    assert.equal(fixture.frames.pending, 0);
  } finally { engine.disconnect(); fixture.close(); }
});

test('CSS route admits its exact geometry expressions and owns no measured layout resources', () => {
  const window = new Window({ url: 'https://sectile.dev/' }), document = window.document;
  const root = document.createElement('div'), reference = document.createElement('button');
  const other = document.createElement('div'), secondReference = document.createElement('button');
  document.body.append(reference, root, secondReference, other);
  const queried = [];
  Object.defineProperty(window, 'CSS', { configurable: true, value: { supports(property, value) { queried.push([property, value]); return true; } } });
  const capability = detectPositionEngineCapabilities(window);
  assert.equal(capability.anchorGeometry, true);
  const geometry = queried.filter(([, value]) => value.includes('anchor(') || value.includes('anchor-size('));
  assert.ok(geometry.some(([property, value]) => property === 'left' && value === 'anchor(left)'));
  assert.ok(geometry.some(([property, value]) => property === 'top' && value === 'anchor(center)'));
  for (const missing of geometry) {
    window.CSS.supports = (property, value) => property !== missing[0] || value !== missing[1];
    assert.equal(selectPositionRoute({ root, reference, avoidCollisions: false }), 'javascript');
  }
  window.CSS.supports = () => true;
  window.CSS.supports = (property) => property !== 'translate';
  assert.equal(selectPositionRoute({ root, reference, avoidCollisions: false }), 'javascript');
  window.CSS.supports = () => true;
  reference.style.setProperty('anchor-name', '--application-anchor'); root.style.position = 'relative';
  root.dataset.positionRoute = 'application';
  const before = readPositionSourceRegistryDiagnostics();
  const first = createPositionEngine({ root, reference, avoidCollisions: false });
  const second = createPositionEngine({ root: other, reference: secondReference, avoidCollisions: false });
  try {
    first.connect(); first.connect(); second.connect(); first.update();
    assert.equal(first.route, 'css-anchor');
    assert.equal(root.style.getPropertyValue('position-anchor'), reference.style.getPropertyValue('anchor-name'));
    assert.notEqual(reference.style.getPropertyValue('anchor-name'), secondReference.style.getPropertyValue('anchor-name'));
    assert.equal(root.style.getPropertyValue('--sectile-position-anchor-width'), 'anchor-size(width)');
    const diagnostics = first.diagnostics();
    for (const key of ['discoveryRuns', 'measurementReads', 'sourceSubscriptions', 'resizeObservers', 'layoutObservers', 'pendingFrames']) assert.equal(diagnostics[key], 0, key);
    assert.deepEqual(readPositionSourceRegistryDiagnostics(), before);
  } finally { first.disconnect(); first.disconnect(); second.disconnect(); }
  assert.equal(reference.style.getPropertyValue('anchor-name'), '--application-anchor');
  assert.equal(root.style.position, 'relative'); assert.equal(root.dataset.positionRoute, 'application');
  assert.equal(root.style.getPropertyValue('position-anchor'), '');
  assert.equal(root.style.getPropertyValue('--sectile-position-anchor-width'), '');
  assert.deepEqual(readPositionSourceRegistryDiagnostics(), before);
  window.close();
});

test('DOM JavaScript positioning coalesces updates and restores owned projection', () => {
  const fixture = createPositionFixture();
  const arrow = fixture.window.document.createElement('div');
  fixture.root.append(arrow);
  arrow.style.position = 'relative';
  setRect(arrow, { x: 0, y: 0, width: 8, height: 8 });
  fixture.root.style.left = '3px';
  fixture.root.dataset.side = 'before';
  const layouts = [];
  const engine = createPositionEngine({
    root: fixture.root,
    reference: fixture.reference,
    arrow,
    collisionBoundary: fixture.boundary,
    capabilities: completeCapabilities,
    side: 'bottom',
    align: 'start',
    onLayout: (layout) => layouts.push(layout),
  });
  engine.connect();
  engine.update();
  engine.update();
  assert.equal(fixture.frames.pending, 1);
  assert.equal(engine.diagnostics().coalescedUpdates, 2);
  fixture.frames.flush();
  assert.equal(layouts.length, 1);
  assert.equal(fixture.root.dataset.positionRoute, 'javascript');
  assert.equal(fixture.root.dataset.side, 'bottom');
  assert.equal(fixture.root.style.visibility, '');
  assert.equal(arrow.style.position, 'absolute');
  assert.equal(fixture.root.style.getPropertyValue('--sectile-position-anchor-width'), '40px');
  assert.equal(engine.diagnostics().completedUpdates, 1);
  engine.disconnect();
  assert.equal(fixture.frames.pending, 0);
  assert.equal(fixture.root.style.left, '3px');
  assert.equal(fixture.root.dataset.side, 'before');
  assert.equal(fixture.root.dataset.positionRoute, undefined);
  assert.equal(arrow.style.position, 'relative');
  assert.equal(engine.diagnostics().sourceSubscriptions, 0);
  assert.equal(engine.diagnostics().resizeObservers, 0);
  assert.equal(engine.diagnostics().layoutObservers, 0);
  fixture.close();
});

test('DOM positioning tracks VisualViewport resize and scroll with coalesced cleanup', () => {
  const fixture = createPositionFixture();
  const visualViewport = new fixture.window.EventTarget();
  Object.assign(visualViewport, { offsetLeft: 0, offsetTop: 0, width: 300, height: 400 });
  Object.defineProperty(fixture.window, 'visualViewport', { configurable: true, value: visualViewport });
  setRect(fixture.reference, { x: 80, y: 180, width: 40, height: 20 });
  setRect(fixture.root, { x: 0, y: 0, width: 80, height: 80 });
  const before = readPositionSourceRegistryDiagnostics();
  const engine = createPositionEngine({ root: fixture.root, reference: fixture.reference, side: 'bottom' });
  engine.connect();
  fixture.frames.flush();
  assert.equal(fixture.root.dataset.side, 'bottom');
  assert.equal(engine.diagnostics().sourceSubscriptions, 4);

  visualViewport.height = 220;
  visualViewport.dispatchEvent(new fixture.window.Event('resize'));
  visualViewport.dispatchEvent(new fixture.window.Event('scroll'));
  assert.equal(fixture.frames.pending, 1);
  assert.equal(engine.diagnostics().coalescedUpdates >= 1, true);
  fixture.frames.flush();
  assert.equal(fixture.root.dataset.side, 'top');

  const completed = engine.diagnostics().completedUpdates;
  visualViewport.offsetTop = 20;
  visualViewport.dispatchEvent(new fixture.window.Event('scroll'));
  assert.equal(fixture.frames.pending, 1);
  fixture.frames.flush();
  assert.equal(engine.diagnostics().completedUpdates, completed + 1);

  engine.disconnect();
  assert.equal(engine.diagnostics().sourceSubscriptions, 0);
  const disconnected = readPositionSourceRegistryDiagnostics();
  assert.equal(disconnected.physicalListeners, before.physicalListeners);
  assert.equal(disconnected.callbacks, before.callbacks);
  visualViewport.dispatchEvent(new fixture.window.Event('resize'));
  assert.equal(fixture.frames.pending, 0);
  assert.deepEqual(readPositionSourceRegistryDiagnostics(), disconnected);
  fixture.close();
});

test('DOM positioning restores styles after browser CSSOM value normalization', () => {
  const fixture = createPositionFixture();
  setRect(fixture.reference, { x: 20.123456, y: 20.123456, width: 40, height: 20 });
  const style = fixture.root.style;
  const setProperty = style.setProperty.bind(style);
  style.setProperty = (property, value, priority) => {
    const normalized = property === 'top' && value.endsWith('px')
      ? `${Number.parseFloat(value).toFixed(3)}px`
      : value;
    setProperty(property, normalized, priority);
  };
  const engine = createPositionEngine({
    root: fixture.root,
    reference: fixture.reference,
    collisionBoundary: fixture.boundary,
    side: 'bottom',
    avoidCollisions: false,
  });
  engine.connect();
  fixture.frames.flush();
  assert.match(fixture.root.style.top, /^48\.123px$/);
  engine.disconnect();
  assert.equal(fixture.root.style.top, '');
  fixture.close();
});

test('DOM positioning disconnect preserves consumer style and data mutations made after projection', () => {
  const fixture = createPositionFixture();
  fixture.root.style.left = '3px';
  fixture.root.dataset.side = 'before';
  const engine = createPositionEngine({
    root: fixture.root,
    reference: fixture.reference,
    collisionBoundary: fixture.boundary,
    side: 'bottom',
    avoidCollisions: false,
  });
  engine.connect();
  fixture.frames.flush();
  assert.notEqual(fixture.root.style.left, '3px');
  assert.equal(fixture.root.dataset.side, 'bottom');

  fixture.root.style.left = '77px';
  fixture.root.dataset.side = 'consumer';
  engine.disconnect();
  assert.equal(fixture.root.style.left, '77px');
  assert.equal(fixture.root.dataset.side, 'consumer');
  fixture.close();
});

test('DOM positioning shares physical event sources and releases every resource', () => {
  const before = readPositionSourceRegistryDiagnostics();
  const first = createPositionFixture();
  const secondRoot = first.window.document.createElement('div');
  first.window.document.body.append(secondRoot);
  setRect(secondRoot, { x: 0, y: 0, width: 30, height: 10 });
  const one = createPositionEngine({ root: first.root, reference: first.reference });
  const two = createPositionEngine({ root: secondRoot, reference: first.reference });
  one.connect();
  two.connect();
  const connected = readPositionSourceRegistryDiagnostics();
  assert.equal(connected.physicalListeners - before.physicalListeners, 2);
  assert.equal(connected.callbacks - before.callbacks, 4);
  assert.equal(first.resizeObservers.length, 2);
  assert.equal(first.intersectionObservers.length, 2);
  assert.deepEqual(first.intersectionObservers.map((observer) => observer.targets.length), [1, 1]);
  one.disconnect();
  two.disconnect();
  assert.deepEqual(readPositionSourceRegistryDiagnostics(), before);
  assert.equal(first.resizeObservers.every((observer) => observer.disconnected), true);
  assert.equal(first.intersectionObservers.every((observer) => observer.disconnected), true);
  first.close();
});

test('DOM positioning discovers shorthand overflow through computed axes', () => {
  const fixture = createPositionFixture();
  const scroller = fixture.window.document.createElement('div');
  scroller.style.overflow = 'auto';
  scroller.append(fixture.reference, fixture.root);
  fixture.window.document.body.append(scroller);
  const engine = createPositionEngine({ root: fixture.root, reference: fixture.reference });
  engine.connect();
  assert.equal(engine.diagnostics().discoveredAncestors, 1);
  assert.equal(engine.diagnostics().sourceSubscriptions, 3);
  engine.disconnect();
  fixture.close();
});

test('DOM positioning refresh transfers reparented ancestor ownership without duplicate sources', () => {
  const fixture = createPositionFixture();
  const visualViewport = new fixture.window.EventTarget();
  Object.assign(visualViewport, { offsetLeft: 0, offsetTop: 0, width: 400, height: 400 });
  Object.defineProperty(fixture.window, 'visualViewport', { configurable: true, value: visualViewport });
  const first = fixture.window.document.createElement('div');
  const second = fixture.window.document.createElement('div');
  first.style.overflow = 'auto';
  second.style.overflow = 'auto';
  fixture.window.document.body.append(first, second);
  first.append(fixture.reference, fixture.root);
  setRect(first, { x: 0, y: 0, width: 300, height: 300 });
  setRect(second, { x: 0, y: 0, width: 300, height: 150 });
  setRect(fixture.reference, { x: 80, y: 100, width: 40, height: 20 });
  setRect(fixture.root, { x: 0, y: 0, width: 80, height: 80 });
  const before = readPositionSourceRegistryDiagnostics();
  const engine = createPositionEngine({ root: fixture.root, reference: fixture.reference, side: 'bottom' });
  engine.connect();
  fixture.frames.flush();
  assert.equal(fixture.root.dataset.side, 'bottom');

  second.append(fixture.reference, fixture.root);
  engine.update();
  fixture.frames.flush();
  assert.equal(fixture.root.dataset.side, 'top');
  const transferred = readPositionSourceRegistryDiagnostics();
  engine.update();
  engine.update();
  assert.equal(fixture.frames.pending, 1);
  assert.deepEqual(readPositionSourceRegistryDiagnostics(), transferred);
  fixture.frames.flush();

  first.dispatchEvent(new fixture.window.Event('scroll'));
  assert.equal(fixture.frames.pending, 0);
  setRect(fixture.reference, { x: 80, y: 20, width: 40, height: 20 });
  second.dispatchEvent(new fixture.window.Event('scroll'));
  assert.equal(fixture.frames.pending, 1);
  fixture.frames.flush();
  assert.equal(fixture.root.dataset.side, 'bottom');

  engine.disconnect();
  const disconnected = readPositionSourceRegistryDiagnostics();
  assert.equal(disconnected.physicalListeners, before.physicalListeners);
  assert.equal(disconnected.callbacks, before.callbacks);
  first.dispatchEvent(new fixture.window.Event('scroll'));
  second.dispatchEvent(new fixture.window.Event('scroll'));
  assert.equal(fixture.frames.pending, 0);
  assert.deepEqual(readPositionSourceRegistryDiagnostics(), disconnected);
  fixture.close();
});

test('DOM positioning tracks reference scrollers without treating them as portal clipping boundaries', () => {
  const fixture = createPositionFixture();
  const scroller = fixture.window.document.createElement('div');
  scroller.style.overflow = 'hidden';
  fixture.window.document.body.append(scroller, fixture.root);
  scroller.append(fixture.reference);
  setRect(scroller, { x: 0, y: 0, width: 200, height: 140 });
  setRect(fixture.reference, { x: 80, y: 100, width: 40, height: 20 });
  setRect(fixture.root, { x: 0, y: 0, width: 80, height: 80 });
  setRect(fixture.boundary, { x: 0, y: 0, width: 300, height: 300 });
  const engine = createPositionEngine({
    root: fixture.root,
    reference: fixture.reference,
    collisionBoundary: fixture.boundary,
    side: 'bottom',
  });
  engine.connect();
  fixture.frames.flush();
  assert.equal(fixture.root.dataset.side, 'bottom');
  assert.equal(engine.diagnostics().discoveredAncestors, 1);
  assert.equal(engine.diagnostics().sourceSubscriptions, 3);
  engine.disconnect();
  fixture.close();
});

test('DOM positioning returns to the preferred side when scrolling restores space', () => {
  const fixture = createPositionFixture();
  setRect(fixture.root, { x: 0, y: 0, width: 80, height: 80 });
  setRect(fixture.boundary, { x: 0, y: 0, width: 300, height: 300 });
  setRect(fixture.reference, { x: 80, y: 20, width: 40, height: 20 });
  const engine = createPositionEngine({
    root: fixture.root,
    reference: fixture.reference,
    collisionBoundary: fixture.boundary,
    side: 'bottom',
  });
  engine.connect();
  fixture.frames.flush();
  assert.equal(fixture.root.dataset.side, 'bottom');

  setRect(fixture.reference, { x: 80, y: 185, width: 40, height: 20 });
  fixture.window.dispatchEvent(new fixture.window.Event('scroll'));
  fixture.frames.flush();
  assert.equal(fixture.root.dataset.side, 'top');

  setRect(fixture.reference, { x: 80, y: 184, width: 40, height: 20 });
  fixture.window.dispatchEvent(new fixture.window.Event('scroll'));
  fixture.frames.flush();
  assert.equal(fixture.root.dataset.side, 'bottom');
  engine.disconnect();
  fixture.close();
});

test('DOM positioning flips a preferred top side on the first clipped pixel and returns when it fits', () => {
  const fixture = createPositionFixture();
  setRect(fixture.root, { x: 0, y: 0, width: 80, height: 80 });
  setRect(fixture.boundary, { x: 0, y: 0, width: 300, height: 300 });
  setRect(fixture.reference, { x: 80, y: 200, width: 40, height: 20 });
  const engine = createPositionEngine({
    root: fixture.root,
    reference: fixture.reference,
    collisionBoundary: fixture.boundary,
    side: 'top',
  });
  engine.connect();
  fixture.frames.flush();
  assert.equal(fixture.root.dataset.side, 'top');

  setRect(fixture.reference, { x: 80, y: 95, width: 40, height: 20 });
  fixture.window.dispatchEvent(new fixture.window.Event('scroll'));
  fixture.frames.flush();
  assert.equal(fixture.root.dataset.side, 'bottom');

  setRect(fixture.reference, { x: 80, y: 96, width: 40, height: 20 });
  fixture.window.dispatchEvent(new fixture.window.Event('scroll'));
  fixture.frames.flush();
  assert.equal(fixture.root.dataset.side, 'top');
  engine.disconnect();
  fixture.close();
});

test('DOM positioning keeps a popup visible by default when neither side can fit', () => {
  const fixture = createPositionFixture();
  setRect(fixture.root, { x: 0, y: 0, width: 80, height: 180 });
  setRect(fixture.boundary, { x: 0, y: 0, width: 300, height: 100 });
  setRect(fixture.reference, { x: 80, y: -21, width: 40, height: 20 });
  const engine = createPositionEngine({
    root: fixture.root,
    reference: fixture.reference,
    collisionBoundary: fixture.boundary,
    side: 'bottom',
  });
  engine.connect();
  fixture.frames.flush();
  assert.equal(fixture.root.dataset.referenceHidden, 'true');
  assert.equal(fixture.root.style.visibility, '');
  assert.ok(fixture.root.dataset.side === 'bottom' || fixture.root.dataset.side === 'top');
  engine.disconnect();
  fixture.close();
});

test('DOM positioning hides a detached popup only when explicitly requested', () => {
  const fixture = createPositionFixture();
  setRect(fixture.root, { x: 0, y: 0, width: 80, height: 80 });
  setRect(fixture.boundary, { x: 0, y: 0, width: 300, height: 300 });
  setRect(fixture.reference, { x: 80, y: -21, width: 40, height: 20 });
  const engine = createPositionEngine({
    root: fixture.root,
    reference: fixture.reference,
    collisionBoundary: fixture.boundary,
    hideWhenDetached: true,
  });
  engine.connect();
  fixture.frames.flush();
  assert.equal(fixture.root.dataset.referenceHidden, 'true');
  assert.equal(fixture.root.style.visibility, 'hidden');
  engine.disconnect();
  fixture.close();
});

test('DOM positioning cancels a queued generation before disconnect can project', () => {
  const fixture = createPositionFixture();
  const engine = createPositionEngine({ root: fixture.root, reference: fixture.reference });
  engine.connect();
  assert.equal(fixture.frames.pending, 1);
  engine.disconnect();
  fixture.frames.flush();
  assert.equal(engine.diagnostics().completedUpdates, 0);
  assert.equal(fixture.root.dataset.positionRoute, undefined);
  fixture.close();
});

test('absolute positioning separates a plain body sentinel from containing-block parents with bounded reads and cleanup', () => {
  for (const mode of ['plain', 'positioned', 'transformed', 'contained', 'will-change', 'element']) {
    const fixture = createPositionFixture(), before = readPositionSourceRegistryDiagnostics();
    const parent = mode === 'element' ? fixture.window.document.createElement('div') : fixture.window.document.body;
    if (mode === 'element') { fixture.window.document.body.append(parent); parent.append(fixture.root); }
    parent.style.margin = '8px';
    if (mode === 'positioned' || mode === 'element') parent.style.position = 'relative';
    if (mode === 'transformed') parent.style.transform = 'translateX(1px)';
    if (mode === 'contained') parent.style.contain = 'paint';
    if (mode === 'will-change') parent.style.willChange = 'transform';
    Object.defineProperties(fixture.window, { scrollX: { value: -25 }, scrollY: { value: 100 } });
    Object.defineProperty(fixture.root, 'offsetParent', { get: () => parent });
    Object.defineProperties(parent, { clientLeft: { value: 2 }, clientTop: { value: 3 } });
    parent.scrollLeft = 13; parent.scrollTop = 17;
    setRect(parent, { x: 8, y: -92, width: 180, height: 300 });
    let parentReads = 0; const measureParent = parent.getBoundingClientRect;
    parent.getBoundingClientRect = () => { parentReads++; return measureParent(); };
    const engine = createPositionEngine({ root: fixture.root, reference: fixture.reference, collisionBoundary: fixture.boundary,
      side: 'bottom', align: 'start', sideOffset: 0, collisionPadding: 0, avoidCollisions: false,
      capabilities: { ...completeCapabilities, anchorName: false } });
    try {
      engine.connect(); fixture.frames.flush();
      assert.equal(fixture.root.style.left, mode === 'plain' ? '-5px' : '23px', mode);
      assert.equal(fixture.root.style.top, mode === 'plain' ? '140px' : '146px', mode);
      assert.equal(parentReads, mode === 'plain' ? 0 : 1, mode);
      assert.equal(engine.diagnostics().measurementReads, mode === 'plain' || mode === 'element' ? 5 : 6, mode);
      assert.equal(engine.diagnostics().completedUpdates, 1);
    } finally { engine.disconnect(); fixture.frames.flush();
      assert.equal(fixture.frames.pending, 0); assert.equal(engine.diagnostics().sourceSubscriptions, 0);
      assert.equal(fixture.root.style.left, ''); assert.equal(fixture.root.style.top, '');
      assert.equal(readPositionSourceRegistryDiagnostics().callbacks, before.callbacks);
      assert.equal(readPositionSourceRegistryDiagnostics().physicalListeners, before.physicalListeners);
      fixture.close();
    }
  }
});

function createPositionFixture() {
  const window = new Window({ url: 'https://sectile.dev/' });
  const frames = installFrameQueue(window);
  const resizeObservers = [];
  const intersectionObservers = [];
  window.ResizeObserver = class {
    targets = [];
    disconnected = false;
    constructor(callback) { this.callback = callback; resizeObservers.push(this); }
    observe(target) { this.targets.push(target); }
    disconnect() { this.disconnected = true; this.targets.length = 0; }
  };
  window.IntersectionObserver = class {
    targets = [];
    disconnected = false;
    constructor(callback) { this.callback = callback; intersectionObservers.push(this); }
    observe(target) { this.targets.push(target); }
    disconnect() { this.disconnected = true; this.targets.length = 0; }
  };
  const reference = window.document.createElement('button');
  const root = window.document.createElement('div');
  const boundary = window.document.createElement('div');
  window.document.body.append(boundary, reference, root);
  setRect(reference, { x: 20, y: 20, width: 40, height: 20 });
  setRect(root, { x: 0, y: 0, width: 30, height: 10 });
  setRect(boundary, { x: 0, y: 0, width: 200, height: 200 });
  return { window, root, reference, boundary, frames, resizeObservers, intersectionObservers, close() { window.close(); } };
}

function installFrameQueue(window) {
  let sequence = 0;
  const callbacks = new Map();
  window.requestAnimationFrame = (callback) => { const id = ++sequence; callbacks.set(id, callback); return id; };
  window.cancelAnimationFrame = (id) => { callbacks.delete(id); };
  return {
    get pending() { return callbacks.size; },
    flush() { const queued = [...callbacks.values()]; callbacks.clear(); for (const callback of queued) callback(0); },
  };
}

function setRect(element, value) {
  element.getBoundingClientRect = () => Object.freeze({
    ...value,
    top: value.y,
    right: value.x + value.width,
    bottom: value.y + value.height,
    left: value.x,
    toJSON() { return this; },
  });
}
