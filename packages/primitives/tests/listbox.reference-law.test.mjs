/* Composite evidence: determinism, purity, failure atomicity, ordered commands, disjoint authority */
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createListboxState,
  stepListbox,
} from '../.verification-dist/internal/composites/listbox.js';
import {
  createReferenceListboxState,
  referenceStepListbox,
} from '../.verification-dist/internal/reference/composites/listbox.js';
import { createSequence } from '../.verification-dist/sequence.js';
import { canonicalIDs, powerset, unwrap } from './support.mjs';

const EVENTS = ['next', 'previous', 'toggle', 'activate', 'clear'];

test('listbox composition is deterministic, failure-atomic, and preserves cursor/selection authority', () => {
  let states = 0;
  let transitions = 0;
  let traces = 0;

  for (let size = 0; size <= 4; size += 1) {
    const ids = canonicalIDs(size);
    const domain = unwrap(createSequence(ids));
    for (const eligibleIDs of powerset(ids)) {
      const eligible = new Set(eligibleIDs);
      for (const selectionFollowsFocus of [false, true]) {
        for (const boundary of ['stop', 'wrap']) {
          const policies = {
            eligible: (id) => eligible.has(id),
            selectionFollowsFocus,
            boundary,
          };
          const starts = [unwrap(createListboxState(domain))];
          if (size > 0) starts.push(unwrap(createListboxState(domain, { current: ids[0] })));

          for (const start of starts) {
            const queue = [{ state: start, depth: 0 }];
            const seen = new Set([stateKey(start, 0)]);
            for (let cursor = 0; cursor < queue.length; cursor += 1) {
              const { state, depth } = queue[cursor];
              states += 1;
              assertStateInDomain(state, domain);
              if (depth === 5) continue;

              for (const event of EVENTS) {
                const left = stepListbox(domain, state, event, policies);
                const repeated = stepListbox(domain, state, event, policies);
                const reference = referenceStepListbox(domain, state, event, policies);
                assert.deepEqual(observeResult(left), observeResult(repeated));
                assert.deepEqual(observeResult(left), observeReferenceResult(reference));
                transitions += 1;
                traces += 1;

                if (!left.ok) {
                  assertStateInDomain(state, domain);
                  continue;
                }
                assertStateInDomain(left.value.state, domain);
                assert.equal(Object.isFrozen(left.value), true);
                assert.equal(Object.isFrozen(left.value.commands), true);
                for (const command of left.value.commands) assert.equal(Object.isFrozen(command), true);
                const key = stateKey(left.value.state, depth + 1);
                if (!seen.has(key)) {
                  seen.add(key);
                  queue.push({ state: left.value.state, depth: depth + 1 });
                }
              }
            }
          }
        }
      }
    }
  }

  assert.equal(states, 9_034);
  assert.equal(transitions, 30_885);
  assert.equal(traces, 30_885);
});

test('listbox policies control movement, selection following, boundaries, and command order', () => {
  const domain = unwrap(createSequence(['a', 'b', 'c']));
  const initial = unwrap(createListboxState(domain, { selected: ['c'], anchor: 'c' }));
  const next = unwrap(stepListbox(domain, initial, 'next', {
    eligible: (id) => id !== 'a',
  }));
  assert.equal(next.state.cursor.current, 'b');
  assert.deepEqual(next.state.selection.selected, ['c']);
  assert.deepEqual(next.commands, [{ type: 'focus', id: 'b' }]);

  const followed = unwrap(stepListbox(domain, initial, 'next', {
    eligible: (id) => id !== 'a',
    selectionFollowsFocus: true,
  }));
  assert.deepEqual(followed.state.selection.selected, ['b']);
  assert.equal(followed.state.selection.anchor, 'b');

  const last = unwrap(createListboxState(domain, { current: 'c' }));
  const stopped = unwrap(stepListbox(domain, last, 'next', { boundary: 'stop' }));
  assert.equal(stopped.state, last);
  assert.deepEqual(stopped.commands, []);
  const wrapped = unwrap(stepListbox(domain, last, 'next', { boundary: 'wrap' }));
  assert.equal(wrapped.state.cursor.current, 'a');
  assert.deepEqual(wrapped.commands, [{ type: 'focus', id: 'a' }]);

  const toggled = unwrap(stepListbox(domain, wrapped.state, 'toggle'));
  assert.deepEqual(toggled.state.selection.selected, ['a']);
  assert.deepEqual(toggled.commands, []);
  const activated = unwrap(stepListbox(domain, toggled.state, 'activate'));
  assert.deepEqual(activated.state.selection.selected, ['a']);
  assert.deepEqual(activated.commands, [{ type: 'activate', id: 'a' }]);
  const cleared = unwrap(stepListbox(domain, activated.state, 'clear'));
  assert.deepEqual(cleared.state.selection.selected, []);
  assert.equal(unwrap(stepListbox(domain, cleared.state, 'clear')).state, cleared.state);
});

test('listbox rejects invalid snapshots and unknown semantics without partial state or commands', () => {
  const domain = unwrap(createSequence(['a', 'b']));
  assert.equal(createListboxState(domain, { current: 'missing' }).error.code, 'listbox-cursor-outside-domain');
  assert.equal(createListboxState(domain, { selected: ['missing'] }).error.code, 'selected-id-outside-domain');

  const empty = unwrap(createListboxState(domain));
  for (const event of ['toggle', 'activate']) {
    const result = stepListbox(domain, empty, event);
    assert.equal(result.ok, false);
    assert.equal(result.error.class, 'transition-rejection');
    assert.equal(result.error.code, 'no-cursor');
  }
  for (const result of [
    stepListbox(domain, empty, 'unknown'),
    stepListbox(domain, empty, 'next', { boundary: 'invalid' }),
    stepListbox(domain, empty, 'next', { selectionFollowsFocus: 'yes' }),
    stepListbox(domain, empty, 'next', { eligible: true }),
  ]) {
    assert.equal(result.ok, false);
    assert.equal(result.error.class, 'transition-rejection');
  }

  const invalidCursor = Object.freeze({
    cursor: Object.freeze({ current: 'missing' }),
    selection: empty.selection,
  });
  const invalidState = stepListbox(domain, invalidCursor, 'clear');
  assert.equal(invalidState.ok, false);
  assert.equal(invalidState.error.code, 'listbox-cursor-outside-domain');

  const invalidSelection = Object.freeze({
    cursor: empty.cursor,
    selection: Object.freeze({
      selected: Object.freeze(['b', 'a']),
      anchor: null,
      size: 2,
      has: () => true,
    }),
  });
  const rejectedSelection = stepListbox(domain, invalidSelection, 'clear');
  assert.equal(rejectedSelection.ok, false);
  assert.equal(rejectedSelection.error.code, 'invalid-listbox-selection');

  const ceiling = stepListbox(domain, empty, 'next', {
    eligible: (id) => id === 'b',
    maxScan: 1,
  });
  assert.equal(ceiling.ok, false);
  assert.equal(ceiling.error.class, 'resource-rejection');
  assert.equal(ceiling.error.code, 'scan-ceiling-reached');
  assert.equal(empty.cursor.current, null);
  assert.deepEqual(empty.selection.selected, []);
  const enough = unwrap(stepListbox(domain, empty, 'next', {
    eligible: (id) => id === 'b',
    maxScan: 2,
  }));
  assert.equal(enough.state.cursor.current, 'b');
});

function assertStateInDomain(state, domain) {
  assert.equal(state.cursor.current === null || domain.contains(state.cursor.current), true);
  assert.equal(state.selection.selected.every((id) => domain.contains(id)), true);
  assert.equal(state.selection.anchor === null || domain.contains(state.selection.anchor), true);
}

function stateKey(state, depth) {
  return JSON.stringify([
    depth,
    state.cursor.current,
    state.selection.selected,
    state.selection.anchor,
  ]);
}

function observeResult(result) {
  return result.ok
    ? { ok: true, ...observeTransition(result.value) }
    : { ok: false, errorClass: result.error.class, errorCode: result.error.code };
}

function observeReferenceResult(result) {
  return result.ok
    ? { ok: true, ...observeTransition(result.value) }
    : { ok: false, errorClass: result.errorClass, errorCode: result.errorCode };
}

function observeTransition(transition) {
  return {
    state: {
      current: transition.state.cursor.current,
      selected: transition.state.selection.selected,
      anchor: transition.state.selection.anchor,
    },
    commands: transition.commands,
  };
}
