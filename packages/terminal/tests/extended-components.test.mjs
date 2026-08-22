import assert from 'node:assert/strict';
import test from 'node:test';
import { createCheckboxGroup } from '../dist/checkbox-group.js';
import { createSelect } from '../dist/select.js';
import { createPagination } from '../dist/pagination.js';
import { createStepper } from '../dist/stepper.js';
import { createRating } from '../dist/rating.js';
import { createPinInput } from '../dist/pin-input.js';
import { createTagsInput } from '../dist/tags-input.js';

test('terminal extended selection facades own conventional keyboard input', async () => {
  const group = createCheckboxGroup({ items: ['a', 'b'], defaultValue: ['a'], defaultHighlightedValue: 'a' });
  group.handleKeyboardInput({ key: 'down' });
  group.handleKeyboardInput({ key: 'space' });
  assert.deepEqual(group.getSnapshot().state.selection.selected, ['a', 'b']);

  const select = createSelect({ items: ['a', 'b'], defaultValue: 'a' });
  select.handleKeyboardInput({ key: 'down' });
  select.handleKeyboardInput({ key: 'enter' });
  assert.deepEqual(select.getSnapshot().state.choice.selection.selected, ['b']);
  assert.equal(select.getSnapshot().state.open, false);

  const pagination = createPagination({ items: ['1', '2', '3'], defaultValue: '1' });
  pagination.handleKeyboardInput({ key: 'right' });
  assert.deepEqual(pagination.getSnapshot().state.selection.selected, ['2']);

  const stepper = createStepper({ items: ['one', 'two'], defaultValue: 'one', defaultHighlightedValue: 'one' });
  stepper.handleKeyboardInput({ key: 'right' });
  assert.deepEqual(stepper.getSnapshot().state.selection.selected, ['one']);
  stepper.handleKeyboardInput({ key: 'enter' });
  assert.deepEqual(stepper.getSnapshot().state.selection.selected, ['two']);

  const rating = createRating({ items: ['1', '2', '3'], defaultValue: '1', defaultHighlightedValue: '1', clearable: true });
  rating.handleEvent('increase');
  await Promise.resolve();
  assert.deepEqual(rating.getSnapshot().state.selection.selected, ['2']);
});

test('terminal pin and tags inputs handle text, deletion, and completion', () => {
  const completed = [];
  const pin = createPinInput({ length: 4, onComplete: (value) => completed.push(value) });
  for (const text of ['1', '2', '3', '4']) pin.handleKeyboardInput({ text });
  assert.deepEqual(pin.getSnapshot().state.values, ['1', '2', '3', '4']);
  assert.deepEqual(completed, ['1234']);

  const tags = createTagsInput({ defaultValue: ['dom'] });
  for (const text of ['t', 'u', 'i']) tags.handleKeyboardInput({ text });
  tags.handleKeyboardInput({ key: 'enter' });
  assert.deepEqual(tags.getSnapshot().state.tags, ['dom', 'tui']);
  tags.handleKeyboardInput({ key: 'backspace' });
  tags.handleKeyboardInput({ key: 'backspace' });
  assert.deepEqual(tags.getSnapshot().state.tags, ['dom']);
});

test('terminal extended facades keep navigation but reject read-only mutation', () => {
  const select = createSelect({ items: ['a', 'b'], defaultValue: 'a', readOnly: true });
  assert.equal(select.handleKeyboardInput({ key: 'down' }), true);
  assert.equal(select.handleKeyboardInput({ key: 'enter' }), false);
  assert.deepEqual(select.getSnapshot().state.choice.selection.selected, ['a']);

  const tags = createTagsInput({ defaultValue: ['dom'], readOnly: true });
  assert.equal(tags.handleKeyboardInput({ text: 'x' }), false);
  assert.deepEqual(tags.getSnapshot().state.tags, ['dom']);
});
