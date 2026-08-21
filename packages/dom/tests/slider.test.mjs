import assert from 'node:assert/strict';
import test from 'node:test';
import { unwrap } from '@sectile/primitives/result';
import { createRange } from '@sectile/primitives/range';
import {
  createSliderController,
  toSliderEffect,
  toSliderEvent,
} from '../dist/slider.js';

test('DOM keys map onto slider semantic events', () => {
  assert.equal(toSliderEvent({ key: 'ArrowRight' }), 'increment');
  assert.equal(toSliderEvent({ key: 'ArrowDown' }), 'decrement');
  assert.equal(toSliderEvent({ key: 'PageUp' }), 'page-up');
  assert.equal(toSliderEvent({ key: 'PageDown' }), 'page-down');
  assert.equal(toSliderEvent({ key: 'Home' }), 'home');
  assert.equal(toSliderEvent({ key: 'End' }), 'end');
  assert.equal(toSliderEvent({ key: 'ArrowRight', metaKey: true }), null);
});

test('DOM slider commands project into range effects', () => {
  assert.deepEqual(toSliderEffect({ type: 'announce-tick', tick: 3 }), {
    type: 'set-range-value',
    tick: 3,
  });
});

test('DOM slider controller supports uncontrolled state', () => {
  const controller = unwrap(createSliderController({
    range: range(),
    defaultValue: 1,
  }));
  const result = controller.handleKeyboardInput({ key: 'ArrowRight' });
  assert.equal(result.ok, true);
  assert.equal(result.snapshot.state.tick, 2);
  assert.deepEqual(result.commands, [{ type: 'set-range-value', tick: 2 }]);
});

test('DOM slider controller proposes controlled changes until synchronized', () => {
  const changes = [];
  const controller = unwrap(createSliderController({
    range: range(),
    value: 1,
    onValueChange(change) {
      changes.push(change);
    },
  }));
  const result = controller.handleKeyboardInput({ key: 'ArrowRight' });
  assert.equal(result.ok, true);
  assert.equal(result.snapshot.state.tick, 1);
  assert.deepEqual(result.commands, [{ type: 'set-range-value', tick: 2 }]);
  assert.deepEqual(changes, [{ value: 2, previousValue: 1 }]);
  const synchronized = unwrap(controller.syncControlledValues({ value: 2 }));
  assert.equal(synchronized.state.tick, 2);
});

test('unsupported and stale DOM slider inputs are failure-atomic', () => {
  const controller = unwrap(createSliderController({ range: range() }));
  const initial = controller.getSnapshot();
  const unsupported = controller.handleKeyboardInput({ key: 'Enter' });
  assert.equal(unsupported.ok, false);
  assert.equal(unsupported.snapshot, initial);
  const stale = controller.handleKeyboardInput({ key: 'ArrowRight' }, 1);
  assert.equal(stale.ok, false);
  assert.equal(stale.error.code, 'stale-revision');
  assert.equal(stale.snapshot, initial);
});

function range() {
  return unwrap(createRange({ origin: '0', step: '0.5', count: 5 }));
}
