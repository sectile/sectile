import assert from 'node:assert/strict';
import test from 'node:test';
import { Window } from 'happy-dom';
import { createPopover } from '../.verification-dist/popover.js';
import { createTooltip } from '../.verification-dist/tooltip.js';
import {
  createPositionEngine,
  readPositionSourceRegistryDiagnostics,
  selectPositionRoute,
} from '../.verification-dist/internal/positioning/engine.js';

const completeCapabilities = Object.freeze({
  anchorName: true,
  positionAnchor: true,
  positionArea: true,
  positionTryFallbacks: true,
  positionVisibility: true,
  anchorCenter: true,
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
