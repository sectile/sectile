/* Composite evidence: bounded ticks, determinism, purity, failure atomicity, ordered commands */
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createSliderState,
  applySliderEvent,
} from '../../.verification-dist/internal/composites/slider.js';
import {
  createReferenceSliderState,
  applyReferenceSliderEvent,
} from '../../.verification-dist/internal/reference/composites/slider.js';
import { createRange } from '../../.verification-dist/structures/range.js';
import { unwrap } from '../support.mjs';

const EVENTS = ['increment', 'decrement', 'page-up', 'page-down', 'home', 'end'];

test('slider direct events set an exact bounded tick', () => {
  const range = quantizedRange(4);
  const state = unwrap(createSliderState(range, 0));
  const set = unwrap(applySliderEvent(range, state, { type: 'set-tick', tick: 3 }));
  assert.equal(set.state.tick, 3);
  assert.deepEqual(set.commands, [{ type: 'announce-tick', tick: 3 }]);
  assert.equal(
    applySliderEvent(range, state, { type: 'set-tick', tick: 5 }).error.code,
    'slider-tick-outside-range',
  );
});

test('slider composition is deterministic, bounded, and matches its independent reference', () => {
  let states = 0;
  let transitions = 0;

  for (let count = 0; count <= 8; count += 1) {
    const range = quantizedRange(count);
    for (let initial = 0; initial <= count; initial += 1) {
      const start = unwrap(createSliderState(range, initial));
      assert.deepEqual(start, createReferenceSliderState(range, initial));
      const queue = [{ state: start, depth: 0 }];
      const seen = new Set([stateKey(start, 0)]);

      for (let cursor = 0; cursor < queue.length; cursor += 1) {
        const { state, depth } = queue[cursor];
        states += 1;
        assertTickInRange(state, range);
        if (depth === 6) continue;

        for (const event of EVENTS) {
          const left = applySliderEvent(range, state, event);
          const repeated = applySliderEvent(range, state, event);
          const reference = applyReferenceSliderEvent(range, state, event);
          assert.deepEqual(observeResult(left), observeResult(repeated));
          assert.deepEqual(observeResult(left), observeReferenceResult(reference));
          transitions += 1;

          const accepted = unwrap(left);
          assertTickInRange(accepted.state, range);
          assert.equal(Object.isFrozen(accepted), true);
          assert.equal(Object.isFrozen(accepted.commands), true);
          for (const command of accepted.commands) assert.equal(Object.isFrozen(command), true);
          const key = stateKey(accepted.state, depth + 1);
          if (!seen.has(key)) {
            seen.add(key);
            queue.push({ state: accepted.state, depth: depth + 1 });
          }
        }
      }
    }
  }

  assert.equal(states, 1_655);
  assert.equal(transitions, 8_220);
});

test('slider events clamp to boundaries and announce only changed ticks', () => {
  const range = quantizedRange(5);
  const initial = unwrap(createSliderState(range, 2));

  const incremented = unwrap(applySliderEvent(range, initial, 'increment'));
  assert.equal(incremented.state.tick, 3);
  assert.deepEqual(incremented.commands, [{ type: 'announce-tick', tick: 3 }]);

  const paged = unwrap(applySliderEvent(range, initial, 'page-up'));
  assert.equal(paged.state.tick, 4);
  assert.deepEqual(paged.commands, [{ type: 'announce-tick', tick: 4 }]);

  const clamped = unwrap(applySliderEvent(range, initial, 'page-up', 10));
  assert.equal(clamped.state.tick, 5);
  assert.deepEqual(clamped.commands, [{ type: 'announce-tick', tick: 5 }]);

  const first = unwrap(applySliderEvent(range, initial, 'home'));
  assert.equal(first.state.tick, 0);
  const stopped = unwrap(applySliderEvent(range, first.state, 'decrement'));
  assert.equal(stopped.state, first.state);
  assert.deepEqual(stopped.commands, []);

  const last = unwrap(applySliderEvent(range, initial, 'end'));
  assert.equal(last.state.tick, 5);
  const ended = unwrap(applySliderEvent(range, last.state, 'end'));
  assert.equal(ended.state, last.state);
  assert.deepEqual(ended.commands, []);

  const singleton = quantizedRange(0);
  const only = unwrap(createSliderState(singleton));
  for (const event of EVENTS) {
    const result = unwrap(applySliderEvent(singleton, only, event));
    assert.equal(result.state, only);
    assert.deepEqual(result.commands, []);
  }
});

test('slider rejects invalid snapshots, events, and page sizes atomically', () => {
  const range = quantizedRange(5);
  for (const tick of [-1, 6, 1.5]) {
    const result = createSliderState(range, tick);
    assert.equal(result.ok, false);
    assert.equal(result.error.class, 'construction');
    assert.equal(result.error.code, 'slider-tick-outside-range');
  }

  const invalidState = Object.freeze({ tick: 6 });
  const rejectedState = applySliderEvent(range, invalidState, 'home');
  assert.equal(rejectedState.ok, false);
  assert.equal(rejectedState.error.class, 'transition-rejection');
  assert.equal(rejectedState.error.code, 'slider-tick-outside-range');
  assert.equal(invalidState.tick, 6);

  const state = unwrap(createSliderState(range, 2));
  const invalidEvent = applySliderEvent(range, state, 'unknown');
  assert.deepEqual(observeResult(invalidEvent), {
    ok: false,
    errorClass: 'transition-rejection',
    errorCode: 'invalid-slider-event',
  });
  assert.deepEqual(observeResult(invalidEvent), observeReferenceResult(
    applyReferenceSliderEvent(range, state, 'unknown'),
  ));

  for (const page of [0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
    const result = applySliderEvent(range, state, 'page-up', page);
    assert.deepEqual(observeResult(result), {
      ok: false,
      errorClass: 'transition-rejection',
      errorCode: 'invalid-slider-page',
    });
    assert.deepEqual(observeResult(result), observeReferenceResult(
      applyReferenceSliderEvent(range, state, 'page-up', page),
    ));
    assert.equal(state.tick, 2);
  }
});

function quantizedRange(count) {
  return unwrap(createRange({ origin: '-2', step: '0.5', count }));
}

function assertTickInRange(state, range) {
  assert.equal(Number.isSafeInteger(state.tick), true);
  assert.equal(state.tick >= 0 && state.tick <= range.count, true);
  assert.notEqual(range.valueAt(state.tick), null);
}

function stateKey(state, depth) {
  return `${state.tick}:${depth}`;
}

function observeResult(result) {
  return result.ok
    ? { ok: true, tick: result.value.state.tick, commands: result.value.commands }
    : { ok: false, errorClass: result.error.class, errorCode: result.error.code };
}

function observeReferenceResult(result) {
  return result.ok
    ? { ok: true, tick: result.value.state.tick, commands: result.value.commands }
    : { ok: false, errorClass: result.errorClass, errorCode: result.errorCode };
}
