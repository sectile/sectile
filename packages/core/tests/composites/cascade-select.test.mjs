import test from 'node:test';
import assert from 'node:assert/strict';
import { applyCascadeSelectEvent, createCascadeSelectState, getCascadeSelectColumns, getCascadeSelectValuePath } from '../../dist/cascade-select.js';
import { createTree } from '../../dist/structures/tree.js';

const tree = createTree([
  { id: 'asia', parentID: null }, { id: 'europe', parentID: null },
  { id: 'kr', parentID: 'asia' }, { id: 'jp', parentID: 'asia' },
  { id: 'seoul', parentID: 'kr' }, { id: 'busan', parentID: 'kr' },
  { id: 'tokyo', parentID: 'jp' }, { id: 'paris', parentID: 'europe' },
]);
if (!tree.ok) throw new Error(tree.error.message);

test('Cascade Select opens one column per chosen branch and commits leaves', () => {
  const initial = createCascadeSelectState(tree.value, { open: true, highlighted: 'asia' });
  assert.equal(initial.ok, true);
  const branch = applyCascadeSelectEvent(tree.value, initial.value, { type: 'select', id: 'asia' });
  assert.equal(branch.ok, true);
  assert.deepEqual(branch.value.state.path, ['asia']);
  assert.deepEqual(getCascadeSelectColumns(tree.value, branch.value.state), [['asia', 'europe'], ['kr', 'jp']]);
  const country = applyCascadeSelectEvent(tree.value, branch.value.state, { type: 'select', id: 'kr' });
  const leaf = applyCascadeSelectEvent(tree.value, country.value.state, { type: 'select', id: 'seoul' });
  assert.equal(leaf.ok, true);
  assert.equal(leaf.value.state.value, 'seoul');
  assert.equal(leaf.value.state.open, false);
  assert.deepEqual(getCascadeSelectValuePath(tree.value, 'seoul'), ['asia', 'kr', 'seoul']);
});

test('Cascade Select keyboard traversal enters and leaves branches', () => {
  const initial = createCascadeSelectState(tree.value, { open: true, highlighted: 'asia' });
  const right = applyCascadeSelectEvent(tree.value, initial.value, 'right');
  assert.equal(right.ok, true);
  assert.equal(right.value.state.highlighted, 'kr');
  assert.deepEqual(right.value.state.path, ['asia']);
  const left = applyCascadeSelectEvent(tree.value, right.value.state, 'left');
  assert.equal(left.ok, true);
  assert.equal(left.value.state.highlighted, 'asia');
  assert.deepEqual(left.value.state.path, []);
});

test('Cascade Select rejects disabled direct targets', () => {
  const initial = createCascadeSelectState(tree.value);
  const result = applyCascadeSelectEvent(tree.value, initial.value, { type: 'select', id: 'europe' }, { eligible: (id) => id !== 'europe' });
  assert.equal(result.ok, false);
  assert.equal(result.error.code, 'cascade-select-target-disabled');
});
