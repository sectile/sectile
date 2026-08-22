import assert from 'node:assert/strict';
import test from 'node:test';
import { createSequence } from '../../.verification-dist/structures/sequence.js';
import { applyCheckboxGroupEvent, createCheckboxGroupState } from '../../.verification-dist/checkbox-group.js';
import { applySelectEvent, createSelectState } from '../../.verification-dist/select.js';
import { applyPaginationEvent, createPaginationState } from '../../.verification-dist/pagination.js';
import { applyStepperEvent, createStepperState } from '../../.verification-dist/stepper.js';
import { applyRatingEvent, createRatingState } from '../../.verification-dist/rating.js';
import { applyPinInputEvent, createPinInputState } from '../../.verification-dist/pin-input.js';
import { applyTagsInputEvent, createTagsInputState } from '../../.verification-dist/tags-input.js';
import { unwrap } from '../support.mjs';

const domain = unwrap(createSequence(['a', 'b', 'c']));

test('checkbox group composes multiple selection without coupling focus and value', () => {
  const initial = unwrap(createCheckboxGroupState(domain, { current: 'a', selected: ['a'] }));
  const moved = unwrap(applyCheckboxGroupEvent(domain, initial, 'next'));
  assert.equal(moved.state.cursor.current, 'b');
  assert.deepEqual(moved.state.selection.selected, ['a']);
  const toggled = unwrap(applyCheckboxGroupEvent(domain, moved.state, 'toggle'));
  assert.deepEqual(toggled.state.selection.selected, ['a', 'b']);
});

test('select keeps navigation open and closes only after selection', () => {
  const initial = unwrap(createSelectState(domain, { value: 'a' }));
  const moved = unwrap(applySelectEvent(domain, initial, 'next'));
  assert.equal(moved.state.open, true);
  assert.equal(moved.state.choice.cursor.current, 'b');
  const selected = unwrap(applySelectEvent(domain, moved.state, 'select'));
  assert.equal(selected.state.open, false);
  assert.deepEqual(selected.state.choice.selection.selected, ['b']);
  assert.deepEqual(selected.commands.at(-1), { type: 'close-popup' });
});

test('pagination movement and direct page requests update the active page', () => {
  const initial = unwrap(createPaginationState(domain, 'a'));
  const moved = unwrap(applyPaginationEvent(domain, initial, 'next-page'));
  assert.deepEqual(moved.state.selection.selected, ['b']);
  const direct = unwrap(applyPaginationEvent(domain, moved.state, { type: 'go-to-page', id: 'c' }));
  assert.deepEqual(direct.state.selection.selected, ['c']);
});

test('stepper separates focus movement from step activation', () => {
  const initial = unwrap(createStepperState(domain, 'a'));
  const moved = unwrap(applyStepperEvent(domain, initial, 'next-step'));
  assert.equal(moved.state.cursor.current, 'b');
  assert.deepEqual(moved.state.selection.selected, ['a']);
  const activated = unwrap(applyStepperEvent(domain, moved.state, 'activate-step'));
  assert.deepEqual(activated.state.selection.selected, ['b']);
});

test('rating selects, increases, and clears one value', () => {
  const initial = unwrap(createRatingState(domain, 'a'));
  const increased = unwrap(applyRatingEvent(domain, initial, 'increase'));
  assert.deepEqual(increased.state.selection.selected, ['b']);
  const cleared = unwrap(applyRatingEvent(domain, increased.state, 'clear'));
  assert.deepEqual(cleared.state.selection.selected, []);
});

test('pin input advances cells and emits completion', () => {
  let state = unwrap(createPinInputState(4));
  for (const value of ['1', '2', '3', '4']) state = unwrap(applyPinInputEvent(4, state, { type: 'input', value }, { accept: (part) => /^\d$/.test(part) })).state;
  assert.deepEqual(state.values, ['1', '2', '3', '4']);
  const rejected = applyPinInputEvent(4, state, { type: 'input', value: 'x' }, { accept: (part) => /^\d$/.test(part) });
  assert.equal(rejected.ok, false);
});

test('tags input normalizes additions, rejects duplicates, and preserves focus after removal', () => {
  const initial = unwrap(createTagsInputState(['dom'], ' terminal '));
  const added = unwrap(applyTagsInputEvent(initial, { type: 'add' }));
  assert.deepEqual(added.state.tags, ['dom', 'terminal']);
  assert.equal(applyTagsInputEvent(added.state, { type: 'add', value: 'dom' }).ok, false);
  const focused = unwrap(applyTagsInputEvent(added.state, { type: 'focus-tag', index: 0 }));
  const removed = unwrap(applyTagsInputEvent(focused.state, 'remove-current'));
  assert.deepEqual(removed.state.tags, ['terminal']);
});
