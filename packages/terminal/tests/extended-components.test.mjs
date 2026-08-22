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

  const pagination = createPagination({ total: 30, defaultItemsPerPage: 10, defaultPage: 1 });
  pagination.handleKeyboardInput({ key: 'right' });
  assert.equal(pagination.getSnapshot().state.page, 2);
  assert.deepEqual(pagination.getItemRange(), { start: 11, end: 20, total: 30 });

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

test('terminal pagination exposes edge and ellipsis projection without enumerating every page', () => {
  const pagination = createPagination({
    total: 1_000,
    defaultItemsPerPage: 10,
    defaultPage: 50,
    siblingCount: 1,
    showEdges: true,
  });
  assert.equal(pagination.getPageCount(), 100);
  assert.deepEqual(
    pagination.getItems().filter((item) => item.type !== 'control'),
    [
      { type: 'page', page: 1, selected: false },
      { type: 'ellipsis', side: 'start' },
      { type: 'page', page: 49, selected: false },
      { type: 'page', page: 50, selected: true },
      { type: 'page', page: 51, selected: false },
      { type: 'ellipsis', side: 'end' },
      { type: 'page', page: 100, selected: false },
    ],
  );
  pagination.handleKeyboardInput({ key: 'home' });
  assert.equal(pagination.getSnapshot().state.page, 1);
  pagination.handleKeyboardInput({ key: 'end' });
  assert.equal(pagination.getSnapshot().state.page, 100);
  pagination.handleEvent({ type: 'set-items-per-page', itemsPerPage: 25 });
  assert.deepEqual(pagination.getSnapshot().state, { page: 40, itemsPerPage: 25 });
  assert.equal(pagination.getPageCount(), 40);
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
