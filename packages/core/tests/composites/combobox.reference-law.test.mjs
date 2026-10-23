/* Composite evidence: text/popup/cursor/selection authority and composition-safe acceptance */
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  acceptComboboxCandidate,
  applyComboboxEvent,
  createComboboxState, tryCreateComboboxState
} from '../../.verification-dist/internal/composites/combobox.js';
import {
  createReferenceComboboxState,
  referenceApplyComboboxEvent,
  referenceAcceptCombobox,
} from '../../.verification-dist/internal/reference/composites/combobox.js';
import {
  createTextEditingState,
  startTextComposition,
} from '../../.verification-dist/internal/editing/text.js';
import { createSequence } from '../../.verification-dist/structures/sequence.js';
import { unwrap } from '../support.mjs';

test('selection-only text events preserve popup/cursor authority without filtering candidates', () => {
  const domain = createSequence(Array.from({ length: 4096 }, (_, index) => 'candidate-' + index));
  const labels = new Map(domain.ids.map(id => [id, id]));
  let callbacks = 0;
  const policies = { matches() { callbacks++; return true; }, eligible() { callbacks++; return true; } };
  const text = createTextEditingState('a😀b', endSelection('a😀b'));
  const event = { type: 'text', event: { type: 'select', selection: { anchorCodeUnitOffset: 3, focusCodeUnitOffset: 1 } } };
  for (const popupOpen of [false, true]) {
    const input = { popupOpen, current: domain.ids.at(-1), selected: [domain.ids[0]] };
    const state = createComboboxState(domain, text, input);
    const actual = applyComboboxEvent(domain, labels, state, event, policies);
    const reference = referenceApplyComboboxEvent(domain, labels, createReferenceComboboxState(domain, text, input), event, policies);
    assert.deepEqual(resultObservation(actual), referenceResultObservation(reference));
    assert.equal(actual.ok, true); assert.equal(callbacks, 0);
    assert.equal(actual.value.state.cursor, state.cursor); assert.equal(actual.value.state.selection, state.selection);
    assert.deepEqual(actual.value.commands, []);
    assert.equal(unwrap(applyComboboxEvent(domain, labels, actual.value.state, event, policies)).state, actual.value.state);
  }
});

test('combobox candidate eligibility is independent of matching and rejects stale acceptance', () => {
  const domain = createSequence(['a', 'b', 'c']), labels = new Map([['a', 'Alpha'], ['b', 'Beta'], ['c', 'Charlie']]);
  let allowed = new Set(['b', 'c']); const policies = { matches: () => true, eligible: id => allowed.has(id), boundary: 'wrap' };
  let state = createComboboxState(domain, createTextEditingState(), { popupOpen: true });
  state = unwrap(applyComboboxEvent(domain, labels, state, 'next', policies)).state; assert.equal(state.cursor.current, 'b');
  state = unwrap(applyComboboxEvent(domain, labels, state, 'previous', policies)).state; assert.equal(state.cursor.current, 'c');
  assert.equal(applyComboboxEvent(domain, labels, state, { type: 'accept', id: 'a' }, policies).ok, false);
  const direct = unwrap(applyComboboxEvent(domain, labels, state, { type: 'accept', id: 'b' }, policies)); assert.deepEqual(direct.state.selection.selected, ['b']);
  allowed = new Set(['b']); const stale = applyComboboxEvent(domain, labels, state, 'accept', policies); assert.equal(stale.ok, false); assert.equal(stale.error.code, 'combobox-candidate-unavailable');
  state = unwrap(applyComboboxEvent(domain, labels, state, 'next', policies)).state; assert.equal(state.cursor.current, 'b');
  allowed.clear(); state = unwrap(applyComboboxEvent(domain, labels, state, 'next', policies)).state; assert.equal(state.cursor.current, null);
  assert.equal(applyComboboxEvent(domain, labels, state, { type: 'accept', id: 'b' }, policies).ok, false);
  assert.equal(applyComboboxEvent(domain, labels, state, 'accept', { eligible: true }).error.code, 'invalid-combobox-policies');
});
test('combobox eligibility scans once per candidate resolution and once for current acceptance', () => {
  for (const size of [0, 1, 128, 4096]) {
    const ids = Array.from({ length: size }, (_, i) => `i${i}`), domain = createSequence(ids), labels = new Map(ids.map(id => [id, id]));
    let calls = 0; const policies = { eligible: id => { calls++; return id === ids.at(-1); } };
    const state = createComboboxState(domain, createTextEditingState());
    const moved = unwrap(applyComboboxEvent(domain, labels, state, 'next', policies)); assert.equal(calls, size); assert.equal(moved.state.cursor.current, ids.at(-1) ?? null);
    calls = 0; const result = applyComboboxEvent(domain, labels, moved.state, 'accept', policies); assert.equal(calls, size ? 1 : 0); assert.equal(result.ok, size > 0);
    calls = 0;
    const edited = unwrap(applyComboboxEvent(domain, labels, state, { type: 'text', event: { type: 'replace', startCodeUnitOffset: 0, endCodeUnitOffset: 0, text: 'query', selection: endSelection('query') } }, policies));
    assert.equal(calls, size); assert.equal(edited.state.cursor.current, ids.at(-1) ?? null);
  }
});

test('combobox direct acceptance targets an eligible candidate', () => {
  const domain = createSequence(['a', 'b']);
  const labels = new Map([['a', 'Alpha'], ['b', 'Beta']]);
  const state = createComboboxState(
    domain,
    createTextEditingState(),
    { popupOpen: true },
  );
  const accepted = unwrap(applyComboboxEvent(
    domain,
    labels,
    state,
    { type: 'accept', id: 'b' },
  ));
  assert.equal(accepted.state.text.snapshot.text, 'Beta');
  assert.deepEqual(accepted.state.selection.selected, ['b']);
  assert.deepEqual(accepted.commands, [{ type: 'accept', id: 'b' }]);
});

test('combobox acceptance matches all accepted authority cases', () => {
  let cases = 0;
  for (let size = 0; size <= 4; size += 1) {
    const ids = Array.from({ length: size }, (_, index) => `i${index}`);
    const domain = createSequence(ids);
    const labels = new Map(ids.map((id) => [id, `item-${id}`]));
    const text = createTextEditingState('');
    for (const current of [null, ...ids]) {
      const input = { popupOpen: true, current };
      const state = createComboboxState(domain, text, input);
      const referenceState = createReferenceComboboxState(domain, text, input);
      assert.deepEqual(stateObservation(state), stateObservation(referenceState));
      const left = acceptComboboxCandidate(domain, labels, state);
      const right = referenceAcceptCombobox(domain, labels, referenceState);
      assert.deepEqual(resultObservation(left), referenceResultObservation(right));

      if (current === null) {
        assert.equal(left.ok, false);
        assert.equal(left.error.code, 'no-candidate');
        assert.deepEqual(stateObservation(state), stateObservation(referenceState));
      } else {
        const accepted = unwrap(left);
        assert.equal(accepted.state.text.snapshot.text, labels.get(current));
        assert.equal(accepted.state.text.snapshot.selection.startCodeUnitOffset, labels.get(current).length);
        assert.equal(accepted.state.popupOpen, false);
        assert.deepEqual(accepted.state.selection.selected, [current]);
        assert.deepEqual(accepted.commands, [{ type: 'accept', id: current }]);

        const composing = unwrap(startTextComposition(
          text,
          0,
          0,
          '가',
          { anchorCodeUnitOffset: 1, focusCodeUnitOffset: 1 },
        ));
        const active = createComboboxState(domain, composing, input);
        const rejected = acceptComboboxCandidate(domain, labels, active);
        assert.equal(rejected.ok, false);
        assert.equal(rejected.error.code, 'composition-active');
        assert.equal(active.text.composition === null, false);
        assert.equal(active.popupOpen, true);
      }
      cases += 1;
    }
  }
  assert.equal(cases, 15);
});

test('combobox acceptance replaces text at a collapsed UTF-16 endpoint', () => {
  const domain = createSequence(['a']);
  const text = createTextEditingState('query', {
    anchorCodeUnitOffset: 1,
    focusCodeUnitOffset: 4,
  });
  const state = createComboboxState(domain, text, { popupOpen: true, current: 'a' });
  const result = unwrap(acceptComboboxCandidate(domain, new Map([['a', '가😀']]), state));
  assert.equal(result.state.text.snapshot.text, '가😀');
  assert.equal(result.state.text.snapshot.selection.anchorCodeUnitOffset, 3);
  assert.equal(result.state.text.snapshot.selection.focusCodeUnitOffset, 3);
  assert.equal(result.state.text.composition, null);
});

test('combobox rejects missing and malformed labels without partial state', () => {
  const domain = createSequence(['a']);
  const text = createTextEditingState('query');
  const state = createComboboxState(domain, text, { popupOpen: true, current: 'a' });
  assert.equal(tryCreateComboboxState(domain, text, { current: 'missing' }).error.code, 'combobox-cursor-outside-domain');
  assert.equal(tryCreateComboboxState(domain, text, { popupOpen: 'yes' }).error.code, 'invalid-popup-state');

  const missing = acceptComboboxCandidate(domain, new Map(), state);
  assert.equal(missing.ok, false);
  assert.equal(missing.error.code, 'missing-candidate-label');
  const malformed = acceptComboboxCandidate(domain, new Map([['a', '\ud800']]), state);
  assert.equal(malformed.ok, false);
  assert.equal(malformed.error.code, 'invalid-candidate-label');
  assert.equal(state.text.snapshot.text, 'query');
  assert.equal(state.popupOpen, true);
  assert.deepEqual(state.selection.selected, []);
});

test('combobox text, filtering, popup, navigation, and acceptance match the reference', () => {
  const domain = createSequence(['a', 'b', 'c']);
  const labels = new Map([['a', 'Alpha'], ['b', 'Beta'], ['c', 'Alpine']]);
  const policies = {
    matches: (label, query) => label.toLowerCase().startsWith(query.toLowerCase()),
    boundary: 'stop',
  };
  let optimized = createComboboxState(domain, createTextEditingState());
  let reference = createReferenceComboboxState(domain, createTextEditingState());
  const events = [
    {
      type: 'text',
      event: {
        type: 'replace',
        startCodeUnitOffset: 0,
        endCodeUnitOffset: 0,
        text: 'al',
        selection: endSelection('al'),
      },
    },
    'next',
    'next',
    'previous',
    'close',
    {
      type: 'text',
      event: {
        type: 'composition-start',
        startCodeUnitOffset: 0,
        endCodeUnitOffset: 2,
        text: 'be',
        selection: endSelection('be'),
      },
    },
    {
      type: 'text',
      event: {
        type: 'composition-update',
        text: 'bet',
        selection: endSelection('bet'),
      },
    },
    { type: 'text', event: { type: 'composition-commit' } },
    'accept',
  ];

  for (const event of events) {
    const left = applyComboboxEvent(domain, labels, optimized, event, policies);
    const right = referenceApplyComboboxEvent(domain, labels, reference, event, policies);
    assert.deepEqual(resultObservation(left), referenceResultObservation(right));
    optimized = unwrap(left).state;
    reference = right.value.state;
  }
  assert.equal(optimized.text.snapshot.text, 'Beta');
  assert.equal(optimized.popupOpen, false);
  assert.equal(optimized.cursor.current, 'b');
  assert.deepEqual(optimized.selection.selected, ['b']);
});

test('combobox filtering rejects missing labels and invalid policies atomically', () => {
  const domain = createSequence(['a', 'b']);
  const state = createComboboxState(domain, createTextEditingState());
  const textEvent = {
    type: 'text',
    event: {
      type: 'replace',
      startCodeUnitOffset: 0,
      endCodeUnitOffset: 0,
      text: 'a',
      selection: endSelection('a'),
    },
  };
  const missing = applyComboboxEvent(
    domain,
    new Map([['a', 'Alpha']]),
    state,
    textEvent,
    { matches: () => true },
  );
  assert.equal(missing.ok, false);
  assert.equal(missing.error.code, 'missing-candidate-label');
  assert.equal(state.text.snapshot.text, '');

  const invalid = applyComboboxEvent(domain, new Map(), state, 'next', { boundary: 'loop' });
  assert.equal(invalid.ok, false);
  assert.equal(invalid.error.code, 'invalid-combobox-boundary');

});

function stateObservation(state) {
  return {
    text: state.text.snapshot.text,
    anchorCodeUnitOffset: state.text.snapshot.selection.anchorCodeUnitOffset,
    focusCodeUnitOffset: state.text.snapshot.selection.focusCodeUnitOffset,
    compositionActive: state.text.composition !== null,
    popupOpen: state.popupOpen,
    current: state.cursor.current,
    selected: state.selection.selected,
    anchor: state.selection.anchor,
  };
}

function endSelection(text) {
  return {
    anchorCodeUnitOffset: text.length,
    focusCodeUnitOffset: text.length,
  };
}

function resultObservation(result) {
  return result.ok
    ? { ok: true, ...stateObservation(result.value.state), commands: result.value.commands }
    : { ok: false, errorClass: result.error.class, errorCode: result.error.code };
}

function referenceResultObservation(result) {
  return result.ok
    ? { ok: true, ...stateObservation(result.value.state), commands: result.value.commands }
    : { ok: false, errorClass: result.errorClass, errorCode: result.errorCode };
}
