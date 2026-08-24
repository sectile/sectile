import assert from 'node:assert/strict';
import test from 'node:test';
import { unwrap } from '../../dist/result.js';
import { applyEditableEvent, createEditableState } from '../../dist/editable.js';

test('editable separates draft, commit, and cancel state', () => {
  let state = createEditableState('Alpha');
  state = unwrap(applyEditableEvent(state, 'start-edit')).state;
  state = unwrap(applyEditableEvent(state, { type: 'input', text: 'Beta' })).state;
  assert.deepEqual(state, { value: 'Alpha', draft: 'Beta', editing: true });
  state = unwrap(applyEditableEvent(state, 'cancel')).state;
  assert.deepEqual(state, { value: 'Alpha', draft: 'Alpha', editing: false });

  state = unwrap(applyEditableEvent(state, 'start-edit')).state;
  state = unwrap(applyEditableEvent(state, { type: 'input', text: '  Gamma  ' })).state;
  const committed = unwrap(applyEditableEvent(state, 'commit', {
    normalize: (draft) => draft.trim(),
    validate: (draft) => draft.length >= 3,
  }));
  assert.deepEqual(committed.state, { value: 'Gamma', draft: 'Gamma', editing: false });
  assert.deepEqual(committed.commands, [{ type: 'commit', value: 'Gamma' }, { type: 'focus-preview' }]);
});

test('editable rejects invalid commits without discarding the draft', () => {
  let state = createEditableState('Stable');
  state = unwrap(applyEditableEvent(state, 'start-edit')).state;
  state = unwrap(applyEditableEvent(state, { type: 'input', text: '' })).state;
  const result = applyEditableEvent(state, 'commit', { allowEmpty: false });
  assert.equal(result.ok, false);
  assert.equal(result.error.code, 'editable-empty-value');
  assert.deepEqual(state, { value: 'Stable', draft: '', editing: true });
});
