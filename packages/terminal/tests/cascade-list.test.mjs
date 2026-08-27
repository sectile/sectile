import assert from 'node:assert/strict';
import test from 'node:test';
import { createCascadeList } from '../dist/cascade-list.js';

const nodes = [
  { id: 'a', parentID: null }, { id: 'b', parentID: null },
  { id: 'a1', parentID: 'a' }, { id: 'a2', parentID: 'a' },
];

test('Terminal cascade list traverses visible levels and commits leaves', () => {
  const list = createCascadeList({ nodes, defaultHighlightedValue: 'a' });
  assert.equal(list.handleKeyboardInput({ key: 'right' }), true);
  assert.equal(list.getSnapshot().state.highlighted, 'a1');
  assert.deepEqual(list.getColumns(), [['a', 'b'], ['a1', 'a2']]);
  assert.equal(list.handleKeyboardInput({ key: 'down' }), true);
  assert.equal(list.getSnapshot().state.highlighted, 'a2');
  assert.equal(list.handleKeyboardInput({ key: 'enter' }), true);
  assert.equal(list.getSnapshot().state.value, 'a2');
  assert.deepEqual(list.getValuePath(), ['a', 'a2']);
  assert.equal(list.handleKeyboardInput({ key: 'escape' }), false);
});

test('Terminal cascade list skips disabled siblings', () => {
  const list = createCascadeList({ nodes, disabledItems: ['b'], defaultHighlightedValue: 'a' });
  list.handleKeyboardInput({ key: 'down' });
  assert.equal(list.getSnapshot().state.highlighted, 'a');
});

test('Terminal cascade list proposes controlled values once', () => {
  const values = [];
  const list = createCascadeList({ nodes, value: null, defaultHighlightedValue: 'a', onValueChange: (value) => values.push(value) });
  list.handleKeyboardInput({ key: 'right' });
  list.handleKeyboardInput({ key: 'enter' });
  assert.equal(list.getSnapshot().state.value, null);
  assert.deepEqual(values, ['a1']);
  assert.equal(list.syncControlledValues({ value: 'a1' }).ok, true);
  assert.equal(list.getSnapshot().state.value, 'a1');
});
