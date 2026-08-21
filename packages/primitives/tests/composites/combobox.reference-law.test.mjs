/* Composite evidence: text/popup/cursor/selection authority and composition-safe acceptance */
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  acceptComboboxCandidate,
  createComboboxState,
} from '../../.verification-dist/internal/composites/combobox.js';
import {
  createReferenceComboboxState,
  referenceAcceptCombobox,
} from '../../.verification-dist/internal/reference/composites/combobox.js';
import {
  createTextEditingState,
  startTextComposition,
} from '../../.verification-dist/internal/editing/text.js';
import { createSequence } from '../../.verification-dist/structures/sequence.js';
import { unwrap } from '../support.mjs';

test('combobox acceptance matches all accepted authority cases', () => {
  let cases = 0;
  for (let size = 0; size <= 4; size += 1) {
    const ids = Array.from({ length: size }, (_, index) => `i${index}`);
    const domain = unwrap(createSequence(ids));
    const labels = new Map(ids.map((id) => [id, `item-${id}`]));
    const text = unwrap(createTextEditingState(''));
    for (const current of [null, ...ids]) {
      const input = { popupOpen: true, current };
      const state = unwrap(createComboboxState(domain, text, input));
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
        const active = unwrap(createComboboxState(domain, composing, input));
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
  const domain = unwrap(createSequence(['a']));
  const text = unwrap(createTextEditingState('query', {
    anchorCodeUnitOffset: 1,
    focusCodeUnitOffset: 4,
  }));
  const state = unwrap(createComboboxState(domain, text, { popupOpen: true, current: 'a' }));
  const result = unwrap(acceptComboboxCandidate(domain, new Map([['a', '가😀']]), state));
  assert.equal(result.state.text.snapshot.text, '가😀');
  assert.equal(result.state.text.snapshot.selection.anchorCodeUnitOffset, 3);
  assert.equal(result.state.text.snapshot.selection.focusCodeUnitOffset, 3);
  assert.equal(result.state.text.composition, null);
});

test('combobox rejects missing and malformed labels without partial state', () => {
  const domain = unwrap(createSequence(['a']));
  const text = unwrap(createTextEditingState('query'));
  const state = unwrap(createComboboxState(domain, text, { popupOpen: true, current: 'a' }));
  assert.equal(createComboboxState(domain, text, { current: 'missing' }).error.code, 'combobox-cursor-outside-domain');
  assert.equal(createComboboxState(domain, text, { popupOpen: 'yes' }).error.code, 'invalid-popup-state');

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
