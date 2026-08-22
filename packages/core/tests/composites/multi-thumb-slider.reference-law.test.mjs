import assert from 'node:assert/strict';
import test from 'node:test';
import { createRange } from '../../.verification-dist/structures/range.js';
import { createSequence } from '../../.verification-dist/structures/sequence.js';
import { applyMultiThumbSliderEvent, createMultiThumbSliderState } from '../../.verification-dist/multi-thumb-slider.js';
import { applyReferenceMultiThumbSliderEvent, createReferenceMultiThumbSliderState } from '../../.verification-dist/internal/reference/composites/multi-thumb-slider.js';
import { unwrap } from '../support.mjs';

test('multi-thumb constraints match an independent vector reference', () => {
  const thumbs = unwrap(createSequence(['low', 'high']));
  const range = unwrap(createRange({ origin: '0', step: '1', count: 4 }));
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
          const state = unwrap(createMultiThumbSliderState(thumbs, range, [low, high], current, policies));
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
