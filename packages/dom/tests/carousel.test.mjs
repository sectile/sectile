import assert from 'node:assert/strict';
import test from 'node:test';
import { unwrap } from '@sectile/primitives/result';
import { createCarousel } from '../dist/carousel.js';

test('DOM carousel projects current slide and pause-independent movement', () => {
  const root = new FakeElement();
  const a = new FakeElement();
  const b = new FakeElement();
  const carousel = unwrap(createCarousel({ root, slides: ['a', 'b'] }));
  carousel.setSlideAttributes(a, 'a');
  carousel.setSlideAttributes(b, 'b');
  carousel.handleEvent('pause');
  carousel.handleEvent('next');
  assert.equal(carousel.getSnapshot().state.paused, true);
  assert.equal(carousel.getSnapshot().state.cursor.current, 'b');
  assert.deepEqual(carousel.getPosition(), { index: 1, count: 2 });
  assert.equal(a.hidden, true);
  assert.equal(b.hidden, false);
});

test('DOM carousel wires controls and preserves controlled ownership', () => {
  const root = new FakeElement();
  const previous = new FakeElement();
  const next = new FakeElement();
  const pause = new FakeElement();
  const changes = [];
  const carousel = unwrap(createCarousel({
    root,
    previousButton: previous,
    nextButton: next,
    pauseButton: pause,
    slides: ['a', 'b'],
    value: 'a',
    paused: false,
    onValueChange: (value) => changes.push(['value', value]),
    onPausedChange: (value) => changes.push(['paused', value]),
  }));
  next.emit('click');
  pause.emit('click');
  assert.deepEqual(changes, [['value', 'b'], ['paused', true]]);
  assert.equal(carousel.getSnapshot().state.cursor.current, 'a');
  unwrap(carousel.syncControlledValues({ value: 'b', paused: true }));
  assert.equal(carousel.getSnapshot().state.cursor.current, 'b');
  assert.equal(pause.attributes.get('aria-label'), 'Resume automatic rotation');
  assert.equal(carousel.syncControlledValues({ value: 'a' }).ok, false);
});

test('DOM carousel exposes accessible direct indicators and bounded controls', () => {
  const root = new FakeElement();
  const previous = new FakeElement();
  const next = new FakeElement();
  const indicators = new FakeElement();
  const indicatorA = new FakeElement();
  const indicatorB = new FakeElement();
  const carousel = unwrap(createCarousel({
    root,
    previousButton: previous,
    nextButton: next,
    indicatorGroup: indicators,
    slides: ['a', 'b'],
    policies: { wrap: false },
  }));
  carousel.setIndicatorAttributes(indicatorA, 'a');
  carousel.setIndicatorAttributes(indicatorB, 'b');
  assert.equal(indicators.attributes.get('role'), 'tablist');
  assert.equal(indicatorA.attributes.get('aria-selected'), 'true');
  assert.equal(previous.disabled, true);
  indicatorB.emit('click');
  assert.equal(carousel.getSnapshot().state.cursor.current, 'b');
  assert.equal(indicatorB.attributes.get('aria-selected'), 'true');
  assert.equal(indicatorB.attributes.get('aria-controls'), `${root.id}-slide-2`);
  assert.equal(next.disabled, true);
});

test('DOM carousel autoplay pauses independently for hover and cleans up its timer', () => {
  const scheduler = new FakeScheduler();
  const root = new FakeElement();
  const carousel = unwrap(createCarousel({
    root,
    slides: ['a', 'b'],
    autoplay: { delayMs: 2400, pauseOnFocus: false, stopOnInteraction: false, scheduler },
  }));
  assert.equal(scheduler.pending, 1);
  root.emit('mouseenter');
  assert.deepEqual(carousel.getSnapshot().state.pauseReasons, ['hover']);
  assert.equal(scheduler.pending, 0);
  root.emit('mouseleave');
  assert.equal(scheduler.pending, 1);
  scheduler.flush();
  assert.equal(carousel.getSnapshot().state.cursor.current, 'b');
  assert.equal(scheduler.pending, 1);
  carousel.disconnect();
  assert.equal(scheduler.pending, 0);
});

test('DOM carousel explicit resume overrides its existing focus pause', () => {
  const scheduler = new FakeScheduler();
  const root = new FakeElement();
  const pause = new FakeElement();
  const carousel = unwrap(createCarousel({ root, pauseButton: pause, slides: ['a', 'b'], autoplay: { scheduler } }));
  root.emit('focusin');
  pause.emit('click');
  assert.equal(carousel.getSnapshot().state.paused, true);
  pause.emit('click');
  assert.equal(carousel.getSnapshot().state.paused, false);
  assert.deepEqual(carousel.getSnapshot().state.pauseReasons, []);
  assert.equal(scheduler.pending, 1);
  carousel.disconnect();
});

test('DOM carousel leaves Space activation on nested controls to the browser', () => {
  const root = new FakeElement();
  const pause = new FakeElement();
  const carousel = unwrap(createCarousel({ root, pauseButton: pause, slides: ['a', 'b'] }));
  root.emit('keydown', { key: ' ', target: pause });
  assert.equal(carousel.getSnapshot().state.paused, false);
  pause.emit('click');
  assert.equal(carousel.getSnapshot().state.paused, true);
});

class FakeScheduler {
  callbacks = new Map();
  nextToken = 1;
  get pending() { return this.callbacks.size; }
  schedule(callback) { const token = this.nextToken++; this.callbacks.set(token, callback); return token; }
  cancel(token) { this.callbacks.delete(token); }
  flush() { const callbacks = [...this.callbacks.values()]; this.callbacks.clear(); for (const callback of callbacks) callback(); }
}

class FakeElement {
  attributes = new Map();
  listeners = new Map();
  tabIndex = -1;
  hidden = false;
  disabled = false;
  id = '';
  addEventListener(type, listener) { const listeners = this.listeners.get(type) ?? new Set(); listeners.add(listener); this.listeners.set(type, listeners); }
  removeEventListener(type, listener) { this.listeners.get(type)?.delete(listener); }
  setAttribute(name, value) { this.attributes.set(name, value); }
  removeAttribute(name) { this.attributes.delete(name); }
  contains(element) { return element === this; }
  emit(type, event = {}) { for (const listener of this.listeners.get(type) ?? []) listener({ relatedTarget: null, preventDefault() {}, ...event }); }
  focus() {}
}
