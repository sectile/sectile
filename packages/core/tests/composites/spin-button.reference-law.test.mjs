import assert from 'node:assert/strict';
import test from 'node:test';
import { createRange } from '../../.verification-dist/structures/range.js';
import { applySpinButtonEvent, createSpinButtonState } from '../../.verification-dist/spin-button.js';
import { applyReferenceSpinButtonEvent, createReferenceSpinButtonState } from '../../.verification-dist/internal/reference/composites/spin-button.js';
import { unwrap } from '../support.mjs';

test('spin button committed decimal value and invalid draft authority match an independent reference', () => {
  const range = createRange({ origin: '0', step: '0.5', count: 6 });
  for (let tick = 0; tick <= range.count; tick += 1) {
    const value = range.valueAt(tick);
    for (const draft of [null, '', '2', '2.25']) {
      for (const event of ['increment', 'decrement', 'home', 'end', 'commit', 'cancel', { type: 'input', text: '3' }]) {
        const left = applySpinButtonEvent(range, createSpinButtonState(range, value, draft), event);
        const right = applyReferenceSpinButtonEvent(range, createReferenceSpinButtonState(value, draft), event);
        assert.deepEqual(observe(left), observeReference(right));
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
    : result;
}
