/* Composite evidence: determinism, purity, failure atomicity, ordered commands, disjoint authority */
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createListboxState,
  applyListboxEvent,
  findListboxTypeaheadMatch, tryCreateListboxState
} from '../../.verification-dist/internal/composites/listbox.js';
import {
  createReferenceListboxState,
  applyReferenceListboxEvent,
  findReferenceListboxTypeaheadMatch,
} from '../../.verification-dist/internal/reference/composites/listbox.js';
import { createSequence } from '../../.verification-dist/structures/sequence.js';
import { canonicalIDs, powerset, unwrap } from '../support.mjs';

const EVENTS = ['next', 'previous', 'first', 'last', 'toggle', 'activate', 'clear'];

test('listbox direct events target an eligible identity atomically', () => {
  const domain = createSequence(['a', 'b']);
  const state = createListboxState(domain, { current: 'a' });
  const activated = unwrap(applyListboxEvent(domain, state, { type: 'activate', id: 'b' }));
  assert.equal(activated.state.cursor.current, 'b');
  assert.deepEqual(activated.state.selection.selected, ['b']);
  assert.deepEqual(activated.commands, [
    { type: 'focus', id: 'b' },
    { type: 'activate', id: 'b' },
  ]);
  assert.equal(
    applyListboxEvent(domain, state, { type: 'focus', id: 'b' }, { eligible: () => false })
      .error.code,
    'listbox-target-unavailable',
  );
});

test('listbox uses one canonical single-selection default', () => {
  const domain = createSequence(['a', 'b']);
  const state = createListboxState(domain, { current: 'b', selected: ['a'] });
  const toggled = unwrap(applyListboxEvent(domain, state, 'toggle'));
  assert.deepEqual(toggled.state.selection.selected, ['b']);
});

test('listbox composition is deterministic, failure-atomic, and preserves cursor/selection authority', () => {
  let states = 0;
  let transitions = 0;
  let traces = 0;

  for (let size = 0; size <= 4; size += 1) {
    const ids = canonicalIDs(size);
    const domain = createSequence(ids);
    for (const eligibleIDs of powerset(ids)) {
      const eligible = new Set(eligibleIDs);
      for (const selectionFollowsFocus of [false, true]) {
        for (const boundary of ['stop', 'wrap']) {
          const policies = {
            eligible: (id) => eligible.has(id),
            selectionFollowsFocus,
            boundary,
            selectionMode: 'multiple',
          };
          const starts = [createListboxState(domain, {}, 'multiple')];
          if (size > 0) starts.push(createListboxState(domain, { current: ids[0] }, 'multiple'));

          for (const start of starts) {
            const queue = [{ state: start, depth: 0 }];
            const seen = new Set([stateKey(start, 0)]);
            for (let cursor = 0; cursor < queue.length; cursor += 1) {
              const { state, depth } = queue[cursor];
              states += 1;
              assertStateInDomain(state, domain);
              if (depth === 5) continue;

              for (const event of EVENTS) {
                const left = applyListboxEvent(domain, state, event, policies);
                const repeated = applyListboxEvent(domain, state, event, policies);
                const reference = applyReferenceListboxEvent(domain, state, event, policies);
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

  assert.equal(states, 9_470);
  assert.equal(transitions, 44_968);
  assert.equal(traces, 44_968);
});

test('listbox policies control movement, selection following, boundaries, and command order', () => {
  const domain = createSequence(['a', 'b', 'c']);
  const initial = createListboxState(domain, { selected: ['c'], anchor: 'c' });
  const next = unwrap(applyListboxEvent(domain, initial, 'next', {
    eligible: (id) => id !== 'a',
  }));
  assert.equal(next.state.cursor.current, 'b');
  assert.deepEqual(next.state.selection.selected, ['c']);
  assert.deepEqual(next.commands, [{ type: 'focus', id: 'b' }]);

  const followed = unwrap(applyListboxEvent(domain, initial, 'next', {
    eligible: (id) => id !== 'a',
    selectionFollowsFocus: true,
  }));
  assert.deepEqual(followed.state.selection.selected, ['b']);
  assert.equal(followed.state.selection.anchor, 'b');

  const last = createListboxState(domain, { current: 'c' });
  const stopped = unwrap(applyListboxEvent(domain, last, 'next', { boundary: 'stop' }));
  assert.equal(stopped.state, last);
  assert.deepEqual(stopped.commands, []);
  const wrapped = unwrap(applyListboxEvent(domain, last, 'next', { boundary: 'wrap' }));
  assert.equal(wrapped.state.cursor.current, 'a');
  assert.deepEqual(wrapped.commands, [{ type: 'focus', id: 'a' }]);

  const toggled = unwrap(applyListboxEvent(domain, wrapped.state, 'toggle'));
  assert.deepEqual(toggled.state.selection.selected, ['a']);
  assert.deepEqual(toggled.commands, []);
  const activated = unwrap(applyListboxEvent(domain, toggled.state, 'activate'));
  assert.deepEqual(activated.state.selection.selected, ['a']);
  assert.deepEqual(activated.commands, [{ type: 'activate', id: 'a' }]);
  const cleared = unwrap(applyListboxEvent(domain, activated.state, 'clear'));
  assert.deepEqual(cleared.state.selection.selected, []);
  assert.equal(unwrap(applyListboxEvent(domain, cleared.state, 'clear')).state, cleared.state);
});

test('listbox supports single selection, edge movement, and deterministic typeahead', () => {
  const domain = createSequence(['alpha', 'beta', 'blocked', 'bravo']);
  const initial = createListboxState(domain, {
    current: 'beta',
    selected: ['beta'],
  }, 'single');
  const policies = {
    selectionMode: 'single',
    eligible: (id) => id !== 'blocked',
  };

  const toggled = unwrap(applyListboxEvent(domain, initial, 'toggle', policies));
  assert.deepEqual(toggled.state.selection.selected, ['beta']);
  assert.equal(tryCreateListboxState(domain, { selected: ['alpha', 'beta'] }, 'single').error.code,
    'invalid-selection-cardinality');
  assert.equal(unwrap(applyListboxEvent(domain, initial, 'first', policies)).state.cursor.current,
    'alpha');
  assert.equal(unwrap(applyListboxEvent(domain, initial, 'last', policies)).state.cursor.current,
    'bravo');

  const options = {
    textValue: (id) => id,
    eligible: policies.eligible,
  };
  for (const query of ['a', 'b', 'br', 'z']) {
    const actual = unwrap(findListboxTypeaheadMatch(domain, 'beta', query, options));
    const reference = findReferenceListboxTypeaheadMatch(domain, 'beta', query, options);
    assert.equal(actual, reference);
  }
  assert.equal(unwrap(findListboxTypeaheadMatch(domain, 'beta', 'b', options)), 'bravo');
  assert.equal(findListboxTypeaheadMatch(domain, 'beta', 'b', { ...options, maxScan: 1 }).error.code,
    'scan-ceiling-reached');
});

test('listbox rejects invalid snapshots and unknown semantics without partial state or commands', () => {
  const domain = createSequence(['a', 'b']);
  assert.equal(tryCreateListboxState(domain, { current: 'missing' }).error.code, 'listbox-cursor-outside-domain');
  assert.equal(tryCreateListboxState(domain, { selected: ['missing'] }).error.code, 'selected-id-outside-domain');

  const empty = createListboxState(domain);
  for (const event of ['toggle', 'activate']) {
    const result = applyListboxEvent(domain, empty, event);
    assert.equal(result.ok, false);
    assert.equal(result.error.class, 'transition-rejection');
    assert.equal(result.error.code, 'no-cursor');
  }
  for (const result of [
    applyListboxEvent(domain, empty, 'unknown'),
    applyListboxEvent(domain, empty, 'next', { boundary: 'invalid' }),
    applyListboxEvent(domain, empty, 'next', { selectionFollowsFocus: 'yes' }),
    applyListboxEvent(domain, empty, 'next', { eligible: true }),
    applyListboxEvent(domain, empty, 'next', { selectionMode: 'invalid' }),
  ]) {
    assert.equal(result.ok, false);
    assert.equal(result.error.class, 'transition-rejection');
  }

  const invalidCursor = Object.freeze({
    cursor: Object.freeze({ current: 'missing' }),
    selection: empty.selection,
  });
  const invalidState = applyListboxEvent(domain, invalidCursor, 'clear');
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
  const rejectedSelection = applyListboxEvent(domain, invalidSelection, 'clear');
  assert.equal(rejectedSelection.ok, false);
  assert.equal(rejectedSelection.error.code, 'invalid-listbox-selection');

  const ceiling = applyListboxEvent(domain, empty, 'next', {
    eligible: (id) => id === 'b',
    maxScan: 1,
  });
  assert.equal(ceiling.ok, false);
  assert.equal(ceiling.error.class, 'resource-rejection');
  assert.equal(ceiling.error.code, 'scan-ceiling-reached');
  assert.equal(empty.cursor.current, null);
  assert.deepEqual(empty.selection.selected, []);
  const enough = unwrap(applyListboxEvent(domain, empty, 'next', {
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
    ? { ok: true, ...observeUpdate(result.value) }
    : { ok: false, errorClass: result.error.class, errorCode: result.error.code };
}

function observeReferenceResult(result) {
  return result.ok
    ? { ok: true, ...observeUpdate(result.value) }
    : { ok: false, errorClass: result.errorClass, errorCode: result.errorCode };
}

function observeUpdate(update) {
  return {
    state: {
      current: update.state.cursor.current,
      selected: update.state.selection.selected,
      anchor: update.state.selection.anchor,
    },
    commands: update.commands,
  };
}
