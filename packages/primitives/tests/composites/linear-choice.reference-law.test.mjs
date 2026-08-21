/* Composite evidence: shared linear single-choice algebra, policy separation, reference equivalence */
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  applyLinearChoiceEvent,
  createLinearChoiceState,
} from '../../.verification-dist/internal/composites/linear-choice.js';
import {
  applyReferenceLinearChoiceEvent,
  createReferenceLinearChoiceState,
} from '../../.verification-dist/internal/reference/composites/linear-choice.js';
import { applyTabsEvent, createTabsState } from '../../.verification-dist/tabs.js';
import {
  applyRadioGroupEvent,
  createRadioGroupState,
} from '../../.verification-dist/radio-group.js';
import { createSequence } from '../../.verification-dist/structures/sequence.js';
import { powerset, unwrap } from '../support.mjs';

test('linear choice matches its independent reference over bounded domains and direct targets', () => {
  let transitions = 0;
  for (let size = 0; size <= 4; size += 1) {
    const ids = Array.from({ length: size }, (_, index) => `i${index}`);
    const domain = unwrap(createSequence(ids));
    for (const eligibleIDs of powerset(ids)) {
      const eligible = new Set(eligibleIDs);
      for (const follows of [false, true]) {
        for (const boundary of ['stop', 'wrap']) {
          for (const current of [null, ...ids]) {
            for (const selected of [null, ...ids]) {
              const input = {
                current,
                selected: selected === null ? [] : [selected],
                anchor: selected,
              };
              const optimized = unwrap(createLinearChoiceState(domain, input));
              const reference = createReferenceLinearChoiceState(domain, input);
              const target = ids[0] ?? 'missing';
              const events = [
                'next', 'previous', 'first', 'last', 'select', 'activate',
                { type: 'focus', id: target },
                { type: 'select', id: target },
                { type: 'activate', id: target },
              ];
              const policies = {
                eligible: (id) => eligible.has(id),
                selectionFollowsFocus: follows,
                boundary,
              };
              for (const event of events) {
                const left = applyLinearChoiceEvent(domain, optimized, event, policies);
                const repeated = applyLinearChoiceEvent(domain, optimized, event, policies);
                const right = applyReferenceLinearChoiceEvent(domain, reference, event, policies);
                assert.deepEqual(observe(left), observe(repeated));
                assert.deepEqual(observe(left), observeReference(right));
                transitions += 1;
              }
            }
          }
        }
      }
    }
  }
  assert.equal(transitions > 10_000, true);
});

test('tabs preserve manual focus/selection separation and support automatic activation', () => {
  const domain = unwrap(createSequence(['a', 'b']));
  const state = unwrap(createTabsState(domain, {
    current: 'a',
    selected: ['a'],
    anchor: 'a',
  }));
  const manual = unwrap(applyTabsEvent(domain, state, 'next'));
  assert.equal(manual.state.cursor.current, 'b');
  assert.deepEqual(manual.state.selection.selected, ['a']);
  assert.deepEqual(manual.commands, [{ type: 'focus', id: 'b' }]);
  const automatic = unwrap(applyTabsEvent(domain, state, 'next', { activation: 'automatic' }));
  assert.deepEqual(automatic.state.selection.selected, ['b']);
  const activated = unwrap(applyTabsEvent(domain, manual.state, 'activate'));
  assert.deepEqual(activated.state.selection.selected, ['b']);
  assert.deepEqual(activated.commands, [{ type: 'activate', id: 'b' }]);
  assert.equal(applyTabsEvent(domain, state, 'next', { activation: 'eager' }).ok, false);
});

test('radio group wraps, follows focus, and checks direct targets without activation commands', () => {
  const domain = unwrap(createSequence(['a', 'b']));
  const state = unwrap(createRadioGroupState(domain, {
    current: 'b',
    selected: ['b'],
    anchor: 'b',
  }));
  const wrapped = unwrap(applyRadioGroupEvent(domain, state, 'next'));
  assert.equal(wrapped.state.cursor.current, 'a');
  assert.deepEqual(wrapped.state.selection.selected, ['a']);
  assert.deepEqual(wrapped.commands, [{ type: 'focus', id: 'a' }]);
  const checked = unwrap(applyRadioGroupEvent(domain, wrapped.state, {
    type: 'check',
    id: 'b',
  }));
  assert.deepEqual(checked.state.selection.selected, ['b']);
  assert.deepEqual(checked.commands, [{ type: 'focus', id: 'b' }]);
});

function observe(result) {
  return result.ok
    ? {
        ok: true,
        current: result.value.state.cursor.current,
        selected: result.value.state.selection.selected,
        anchor: result.value.state.selection.anchor,
        commands: result.value.commands,
      }
    : { ok: false, errorClass: result.error.class, errorCode: result.error.code };
}

function observeReference(result) {
  return result.ok
    ? {
        ok: true,
        current: result.value.state.cursor.current,
        selected: result.value.state.selection.selected,
        anchor: result.value.state.selection.anchor,
        commands: result.value.commands,
      }
    : { ok: false, errorClass: result.errorClass, errorCode: result.errorCode };
}
