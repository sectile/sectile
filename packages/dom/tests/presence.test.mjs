import assert from 'node:assert/strict';
import test from 'node:test';
import { createPresence } from '../.verification-dist/presence.js';

test('presence is SSR-safe and an initially closed surface does not start an exit generation', () => {
  const element = new FakeElement(style({ transitionDuration: '100ms' }));
  const changes = [];
  const presence = createPresence({ open: false, element, onPresentChange: (present) => changes.push(present) });

  assert.equal(presence.getPresent(), false);
  assert.equal(presence.update(false, element), false);
  assert.equal(element.listenerCount(), 0);
  assert.deepEqual(changes, []);
  presence.disconnect();
});

test('presence waits for the longest transition on the owner element', () => {
  const view = new FakeView(style({
    transitionProperty: 'opacity, transform',
    transitionDuration: '5ms, 40ms',
    transitionDelay: '0ms',
  }));
  const element = new FakeElement(view);
  const changes = [];
  const presence = createPresence({ open: true, element, onPresentChange: (present) => changes.push(present) });

  assert.equal(presence.update(false, element), true);
  assert.equal(element.listenerCount(), 2);
  view.now = 5;
  element.emit('transitionend');
  assert.equal(presence.getPresent(), true);
  view.now = 40;
  element.emit('transitionend');
  assert.equal(presence.getPresent(), false);
  assert.equal(element.listenerCount(), 0);
  assert.deepEqual(changes, [false]);
  presence.disconnect();
});

test('presence normalizes animation lists and ignores non-finite iterations', () => {
  const view = new FakeView(style({
    animationName: 'fade, pulse, hold',
    animationDuration: '10ms, 20ms',
    animationDelay: '0ms, -5ms',
    animationIterationCount: '2, 3, infinite',
  }));
  const element = new FakeElement(view);
  const presence = createPresence({ open: true, element });

  assert.equal(presence.update(false, element), true);
  view.now = 54;
  element.emit('animationend');
  assert.equal(presence.getPresent(), true);
  view.now = 55;
  element.emit('animationend');
  assert.equal(presence.getPresent(), false);
  presence.disconnect();
});

test('reopen and element replacement cancel stale exit generations', () => {
  const firstView = new FakeView(style({ transitionDuration: '100ms' }));
  const secondView = new FakeView(style());
  const first = new FakeElement(firstView);
  const second = new FakeElement(secondView);
  const changes = [];
  const presence = createPresence({ open: true, element: first, onPresentChange: (present) => changes.push(present) });

  presence.update(false, first);
  assert.equal(first.listenerCount(), 2);
  presence.update(true, first);
  assert.equal(first.listenerCount(), 0);
  firstView.now = 100;
  first.emit('transitionend');
  assert.equal(presence.getPresent(), true);

  presence.update(false, first);
  assert.equal(first.listenerCount(), 2);
  assert.equal(presence.update(false, second), false);
  assert.equal(first.listenerCount(), 0);
  assert.equal(second.listenerCount(), 0);
  first.emit('transitionend');
  assert.deepEqual(changes, [false]);
  presence.disconnect();
});

test('completion releases resources before a reentrant present-change callback', () => {
  const view = new FakeView(style({ transitionDuration: '10ms' }));
  const element = new FakeElement(view);
  const changes = [];
  let presence;
  presence = createPresence({
    open: true,
    element,
    onPresentChange: (present) => {
      changes.push(present);
      if (!present) {
        assert.equal(element.listenerCount(), 0);
        presence.update(true, element);
      }
    },
  });

  presence.update(false, element);
  view.now = 10;
  element.emit('transitionend');
  assert.equal(presence.getPresent(), true);
  assert.equal(element.listenerCount(), 0);
  assert.deepEqual(changes, [false, true]);
  presence.disconnect();
});

test('fallback completion and disconnect both leave zero owned resources', async () => {
  const element = new FakeElement(style({ transitionDuration: '1ms' }));
  const changes = [];
  const presence = createPresence({ open: true, element, onPresentChange: (present) => changes.push(present) });

  presence.update(false, element);
  assert.equal(element.listenerCount(), 2);
  await new Promise((resolve) => setTimeout(resolve, 70));
  assert.equal(presence.getPresent(), false);
  assert.equal(element.listenerCount(), 0);
  assert.deepEqual(changes, [false]);

  const second = new FakeElement(style({ transitionDuration: '100ms' }));
  const disconnectedChanges = [];
  const disconnected = createPresence({ open: true, element: second, onPresentChange: (present) => disconnectedChanges.push(present) });
  disconnected.update(false, second);
  disconnected.disconnect();
  assert.equal(second.listenerCount(), 0);
  second.view.now = 100;
  second.emit('transitionend');
  assert.deepEqual(disconnectedChanges, []);
});

test('presence caps consumer-controlled fallback waits at sixty seconds', () => {
  const element = new FakeElement(style({ transitionDuration: '120s' }));
  const originalSetTimeout = globalThis.setTimeout;
  const originalClearTimeout = globalThis.clearTimeout;
  let capturedDelay;
  globalThis.setTimeout = (_callback, delay) => {
    capturedDelay = delay;
    return 1;
  };
  globalThis.clearTimeout = () => {};
  try {
    const presence = createPresence({ open: true, element });
    presence.update(false, element);
    assert.equal(capturedDelay, 60_000);
    presence.disconnect();
    assert.equal(element.listenerCount(), 0);
  } finally {
    globalThis.setTimeout = originalSetTimeout;
    globalThis.clearTimeout = originalClearTimeout;
  }
});

class FakeView {
  constructor(computedStyle) {
    this.computedStyle = computedStyle;
    this.now = 0;
    this.performance = { now: () => this.now };
  }
  getComputedStyle() { return this.computedStyle; }
}

class FakeElement {
  constructor(viewOrStyle) {
    this.view = viewOrStyle instanceof FakeView ? viewOrStyle : new FakeView(viewOrStyle);
    this.ownerDocument = { defaultView: this.view };
    this.listeners = new Map();
  }
  addEventListener(type, listener) {
    const listeners = this.listeners.get(type) ?? new Set();
    listeners.add(listener);
    this.listeners.set(type, listeners);
  }
  removeEventListener(type, listener) { this.listeners.get(type)?.delete(listener); }
  emit(type) { for (const listener of [...(this.listeners.get(type) ?? [])]) listener({ target: this }); }
  listenerCount() { return [...this.listeners.values()].reduce((total, listeners) => total + listeners.size, 0); }
}

function style(overrides = {}) {
  return {
    transitionProperty: 'all',
    transitionDuration: '0s',
    transitionDelay: '0s',
    animationName: 'none',
    animationDuration: '0s',
    animationDelay: '0s',
    animationIterationCount: '1',
    ...overrides,
  };
}
