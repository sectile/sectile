import assert from 'node:assert/strict';
import test from 'node:test';
import { unwrap } from '@sectile/core/result';
import { createCarousel } from '../dist/carousel.js';

test('terminal carousel owns movement, position, and pause keys', () => {
  const carousel = createCarousel({ slides: ['a', 'b'] });
  carousel.handleKeyboardInput({ key: 'right' });
  carousel.handleKeyboardInput({ key: 'space' });
  assert.equal(carousel.getSnapshot().state.cursor.current, 'b');
  assert.equal(carousel.getSnapshot().state.paused, true);
  assert.deepEqual(carousel.getPosition(), { index: 1, count: 2 });
});

test('terminal carousel preserves controlled slide and pause values', () => {
  const changes = [];
  const carousel = createCarousel({
    slides: ['a', 'b'],
    value: 'a',
    paused: false,
    onValueChange: (value) => changes.push(['value', value]),
    onPausedChange: (value) => changes.push(['paused', value]),
  });
  carousel.handleKeyboardInput({ key: 'right' });
  carousel.handleKeyboardInput({ key: 'space' });
  assert.deepEqual(changes, [['value', 'b'], ['paused', true]]);
  assert.equal(carousel.getSnapshot().state.cursor.current, 'a');
  unwrap(carousel.syncControlledValues({ value: 'b', paused: true }));
  assert.equal(carousel.getSnapshot().state.paused, true);
  assert.equal(carousel.syncControlledValues({ value: 'a' }).ok, false);
});

test('terminal carousel autoplay advances, honors orientation, and disconnects', () => {
  const scheduler = new FakeScheduler();
  const carousel = createCarousel({
    slides: ['a', 'b'],
    orientation: 'vertical',
    autoplay: { delayMs: 1200, stopOnInteraction: false, scheduler },
  });
  assert.equal(carousel.handleKeyboardInput({ key: 'right' }), false);
  assert.equal(carousel.handleKeyboardInput({ key: 'down' }), true);
  assert.equal(carousel.getSnapshot().state.cursor.current, 'b');
  scheduler.flush();
  assert.equal(carousel.getSnapshot().state.cursor.current, 'a');
  assert.equal(scheduler.pending, 1);
  carousel.disconnect();
  assert.equal(scheduler.pending, 0);
});

class FakeScheduler {
  callbacks = new Map();
  nextToken = 1;
  get pending() { return this.callbacks.size; }
  schedule(callback) { const token = this.nextToken++; this.callbacks.set(token, callback); return token; }
  cancel(token) { this.callbacks.delete(token); }
  flush() { const callbacks = [...this.callbacks.values()]; this.callbacks.clear(); for (const callback of callbacks) callback(); }
}
