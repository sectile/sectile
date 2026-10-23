import assert from 'node:assert/strict';
import test from 'node:test';
import { createRange } from '../../.verification-dist/structures/range.js';
import { createSequence } from '../../.verification-dist/structures/sequence.js';
import { applyMultiThumbSliderEvent, createMultiThumbSliderState, getMultiThumbSliderThumbBounds } from '../../.verification-dist/multi-thumb-slider.js';
import { applyReferenceMultiThumbSliderEvent, createReferenceMultiThumbSliderState } from '../../.verification-dist/internal/reference/composites/multi-thumb-slider.js';
import { unwrap } from '../support.mjs';

test('multi-thumb constraints match an independent vector reference', () => {
  const thumbs = createSequence(['low', 'high']);
  const range = createRange({ origin: '0', step: '1', count: 4 });
  const policies = { minGap: 1 };
  const events = [
    'next-thumb', 'previous-thumb', 'increment', 'decrement', 'home', 'end',
    { type: 'focus', id: 'low' }, { type: 'focus', id: 'high' },
    { type: 'set-tick', id: 'low', tick: 3 }, { type: 'set-tick', id: 'high', tick: 1 },
  ];
  for (let low = 0; low <= 4; low += 1) {
    for (let high = low + 1; high <= 4; high += 1) {
      for (const current of [null, 'low', 'high']) {
        for (const event of events) {
          const state = createMultiThumbSliderState(thumbs, range, [low, high], current, policies);
          const actual = applyMultiThumbSliderEvent(thumbs, range, state, event, policies);
          const expected = applyReferenceMultiThumbSliderEvent(
            thumbs, range, createReferenceMultiThumbSliderState(current, [low, high]), event, policies,
          );
          assert.deepEqual(observe(actual), observeReference(expected));
        }
      }
    }
  }
});

test('multi-thumb bounds expose exact neighbor constraints, crossing policy and invalid local input', () => {
  const thumbs = createSequence(['low', 'high']), range = createRange({ origin: '0', step: '1', count: 10 });
  const state = createMultiThumbSliderState(thumbs, range, [2, 8], null, { minGap: 2 });
  assert.deepEqual(unwrap(getMultiThumbSliderThumbBounds(thumbs, range, state, 'low', { minGap: 2 })), { index: 0, tick: 2, lowerTick: 0, upperTick: 6 });
  assert.deepEqual(unwrap(getMultiThumbSliderThumbBounds(thumbs, range, state, 'high', { minGap: 2 })), { index: 1, tick: 8, lowerTick: 4, upperTick: 10 });
  const crossing = createMultiThumbSliderState(thumbs, range, [8, 2], null, { allowCross: true });
  assert.deepEqual(unwrap(getMultiThumbSliderThumbBounds(thumbs, range, crossing, 'low', { allowCross: true })), { index: 0, tick: 8, lowerTick: 0, upperTick: 10 });
  assert.equal(getMultiThumbSliderThumbBounds(thumbs, range, state, 'missing').error.code, 'multi-thumb-target-unavailable');
  assert.equal(getMultiThumbSliderThumbBounds(thumbs, range, { ...state, ticks: [2] }, 'low').error.code, 'thumb-value-count-mismatch');
  assert.equal(getMultiThumbSliderThumbBounds(thumbs, range, { ...state, ticks: [2, NaN] }, 'low').error.code, 'thumb-tick-outside-range');
  assert.equal(getMultiThumbSliderThumbBounds(thumbs, range, state, 'low', { minGap: -1 }).error.code, 'invalid-thumb-gap');
});

test('multi-thumb bound query observes only adjacent ticks independently of domain cardinality', () => {
  const reads = [];
  for (const size of [5, 10_000]) {
    const thumbs = createSequence(Array.from({ length: size }, (_, index) => 'thumb-' + index));
    const range = createRange({ origin: '0', step: '1', count: size }), state = createMultiThumbSliderState(thumbs, range, Array.from({ length: size }, (_, index) => index));
    let count = 0; const queried = Math.floor(size / 2), touched = new Set();
    // Observe the real immutable array without replacing its values or behavior.
    const ticks = new Proxy(state.ticks, { get(target, property, receiver) {
      if (typeof property === 'string' && /^\d+$/u.test(property)) { count++; touched.add(Number(property)); }
      return Reflect.get(target, property, receiver);
    } });
    const bounds = unwrap(getMultiThumbSliderThumbBounds(thumbs, range, { ...state, ticks }, 'thumb-' + queried));
    assert.equal(bounds.tick, queried); assert.deepEqual([...touched].sort((a, b) => a - b), [queried - 1, queried, queried + 1]); reads.push(count);
  }
  assert.equal(reads[0], reads[1]);
});

function observe(result) {
  return result.ok
    ? { ok: true, state: result.value.state, commands: result.value.commands }
    : { ok: false, errorClass: result.error.class, errorCode: result.error.code };
}

function observeReference(result) {
  return result.ok
    ? { ok: true, state: result.value.state, commands: result.value.commands }
    : { ok: false, errorClass: result.errorClass, errorCode: result.errorCode };
}
