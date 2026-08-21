import assert from 'node:assert/strict';
import test from 'node:test';
import { unwrap } from '@sectile/primitives/result';
import { createRange } from '@sectile/primitives/range';
import {
  createSliderController,
  toSliderEffect,
  toSliderEvent,
} from '../dist/slider.js';

test('terminal keys map onto slider semantic events', () => {
  assert.equal(toSliderEvent({ key: 'right' }), 'increment');
  assert.equal(toSliderEvent({ key: 'down' }), 'decrement');
  assert.equal(toSliderEvent({ key: 'page-up' }), 'page-up');
  assert.equal(toSliderEvent({ key: 'page-down' }), 'page-down');
  assert.equal(toSliderEvent({ key: 'home' }), 'home');
  assert.equal(toSliderEvent({ key: 'end' }), 'end');
  assert.equal(toSliderEvent({ key: 'enter' }), null);
});

test('terminal slider commands project into render effects', () => {
  assert.deepEqual(toSliderEffect({ type: 'announce-tick', tick: 3 }), {
    type: 'render-range-value',
    tick: 3,
  });
});

test('terminal slider controller supports controlled state', () => {
  const changes = [];
  const controller = unwrap(createSliderController({
    range: range(),
    value: 1,
    onValueChange(change) {
      changes.push(change);
    },
  }));
  const result = controller.handleKeyboardInput({ key: 'right' });
  assert.equal(result.ok, true);
  assert.equal(result.snapshot.state.tick, 1);
  assert.deepEqual(result.commands, [{ type: 'render-range-value', tick: 2 }]);
  assert.deepEqual(changes, [{ value: 2, previousValue: 1 }]);
  assert.equal(unwrap(controller.syncControlledValues({ value: 2 })).state.tick, 2);
});

test('uncontrolled terminal slider sync is rejected atomically', () => {
  const controller = unwrap(createSliderController({ range: range() }));
  const initial = controller.getSnapshot();
  const result = controller.syncControlledValues({ value: 2 });
  assert.equal(result.ok, false);
  assert.equal(result.error.code, 'uncontrolled-value-update');
  assert.equal(controller.getSnapshot(), initial);
});

function range() {
  return unwrap(createRange({ origin: '0', step: '0.5', count: 5 }));
}
