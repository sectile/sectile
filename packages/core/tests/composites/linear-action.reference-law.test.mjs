/* Composite evidence: cursor-only linear action algebra and independent reference equivalence */
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  applyLinearActionEvent,
  createLinearActionState,
} from '../../.verification-dist/internal/composites/linear-action.js';
import {
  applyReferenceLinearActionEvent,
  createReferenceLinearActionState,
} from '../../.verification-dist/internal/reference/composites/linear-action.js';
import { applyToolbarEvent, createToolbarState } from '../../.verification-dist/toolbar.js';
import { createSequence } from '../../.verification-dist/structures/sequence.js';
import { powerset, unwrap } from '../support.mjs';

test('linear action matches its independent reference across movement and direct invocation', () => {
  let transitions = 0;
  for (let size = 0; size <= 5; size += 1) {
    const ids = Array.from({ length: size }, (_, index) => `i${index}`);
    const domain = unwrap(createSequence(ids));
    for (const eligibleIDs of powerset(ids)) {
      const eligible = new Set(eligibleIDs);
      for (const boundary of ['stop', 'wrap']) {
        for (const current of [null, ...ids]) {
          const optimized = unwrap(createLinearActionState(domain, { current }));
          const reference = createReferenceLinearActionState(domain, { current });
          const target = ids[0] ?? 'missing';
          const events = [
            'next', 'previous', 'first', 'last', 'invoke',
            { type: 'focus', id: target },
            { type: 'invoke', id: target },
          ];
          const policies = { eligible: (id) => eligible.has(id), boundary };
          for (const event of events) {
            const left = applyLinearActionEvent(domain, optimized, event, policies);
            const right = applyReferenceLinearActionEvent(domain, reference, event, policies);
            assert.deepEqual(observe(left), observeReference(right));
            transitions += 1;
          }
        }
      }
    }
  }
  assert.equal(transitions, 4_494);
});

test('toolbar facade exposes cursor-only focus and invocation', () => {
  const domain = unwrap(createSequence(['bold', 'italic']));
  const state = unwrap(createToolbarState(domain, { current: 'bold' }));
  const moved = unwrap(applyToolbarEvent(domain, state, 'next'));
  assert.equal(moved.state.cursor.current, 'italic');
  assert.deepEqual(moved.commands, [{ type: 'focus', id: 'italic' }]);
  const invoked = unwrap(applyToolbarEvent(domain, moved.state, 'invoke'));
  assert.deepEqual(invoked.commands, [{ type: 'invoke', id: 'italic' }]);
  assert.equal('selection' in invoked.state, false);
});

function observe(result) {
  return result.ok
    ? {
        ok: true,
        current: result.value.state.cursor.current,
        commands: result.value.commands,
      }
    : { ok: false, errorClass: result.error.class, errorCode: result.error.code };
}

function observeReference(result) {
  return result.ok
    ? {
        ok: true,
        current: result.value.state.cursor.current,
        commands: result.value.commands,
      }
    : { ok: false, errorClass: result.errorClass, errorCode: result.errorCode };
}
