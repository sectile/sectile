import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyCascadeListEvent,
  createCascadeListState,
  getCascadeListColumns,
  getCascadeListValuePath,
  tryCreateCascadeListState,
} from '../../.verification-dist/cascade-list.js';
import {
  applyCascadeSelectEvent,
  createCascadeSelectState,
} from '../../.verification-dist/cascade-select.js';
import { createTree } from '../../.verification-dist/structures/tree.js';

const tree = createTree([
  { id: 'asia', parentID: null }, { id: 'europe', parentID: null },
  { id: 'kr', parentID: 'asia' }, { id: 'jp', parentID: 'asia' },
  { id: 'seoul', parentID: 'kr' }, { id: 'busan', parentID: 'kr' },
  { id: 'tokyo', parentID: 'jp' }, { id: 'paris', parentID: 'europe' },
]);

test('Cascade List keeps progressive columns visible and commits leaves without popup commands', () => {
  const initial = createCascadeListState(tree, { highlighted: 'asia' });
  assert.equal('open' in initial, false);
  assert.deepEqual(getCascadeListColumns(tree, initial), [['asia', 'europe']]);

  const region = applyCascadeListEvent(tree, initial, { type: 'select', id: 'asia' });
  assert.equal(region.ok, true);
  assert.deepEqual(region.value.state.path, ['asia']);
  assert.deepEqual(getCascadeListColumns(tree, region.value.state), [['asia', 'europe'], ['kr', 'jp']]);

  const country = applyCascadeListEvent(tree, region.value.state, { type: 'select', id: 'kr' });
  const city = applyCascadeListEvent(tree, country.value.state, { type: 'select', id: 'seoul' });
  assert.equal(city.ok, true);
  assert.equal(city.value.state.value, 'seoul');
  assert.deepEqual(city.value.commands, [{ type: 'select-value', id: 'seoul' }]);
  assert.deepEqual(getCascadeListValuePath(tree, 'seoul'), ['asia', 'kr', 'seoul']);
});

test('Cascade List keyboard traversal enters and leaves branches', () => {
  const initial = createCascadeListState(tree, { highlighted: 'asia' });
  const right = applyCascadeListEvent(tree, initial, 'right');
  assert.equal(right.ok, true);
  assert.equal(right.value.state.highlighted, 'kr');
  assert.deepEqual(right.value.state.path, ['asia']);
  const left = applyCascadeListEvent(tree, right.value.state, 'left');
  assert.equal(left.ok, true);
  assert.equal(left.value.state.highlighted, 'asia');
  assert.deepEqual(left.value.state.path, []);
});

test('Cascade List and Cascade Select share hierarchy-choice traces', () => {
  let listState = createCascadeListState(tree, { highlighted: 'asia' });
  let selectState = createCascadeSelectState(tree, { open: true, highlighted: 'asia' });
  const events = [
    { type: 'select', id: 'asia' },
    { type: 'select', id: 'kr' },
    'next',
    'previous',
    { type: 'select', id: 'seoul' },
  ];

  for (const event of events) {
    const list = applyCascadeListEvent(tree, listState, event);
    const select = applyCascadeSelectEvent(tree, selectState, event);
    assert.equal(list.ok, true);
    assert.equal(select.ok, true);
    listState = list.value.state;
    selectState = select.value.state;
    assert.deepEqual(
      { value: listState.value, highlighted: listState.highlighted, path: listState.path },
      { value: selectState.value, highlighted: selectState.highlighted, path: selectState.path },
    );
    assert.deepEqual(
      list.value.commands,
      select.value.commands.filter((command) => command.type !== 'close-popup'),
    );
  }
});

test('Cascade List rejects disabled targets and invalid branch paths', () => {
  const initial = createCascadeListState(tree);
  const disabled = applyCascadeListEvent(
    tree,
    initial,
    { type: 'select', id: 'europe' },
    { eligible: (id) => id !== 'europe' },
  );
  assert.equal(disabled.ok, false);
  assert.equal(disabled.error.code, 'cascade-list-target-disabled');

  const invalid = tryCreateCascadeListState(tree, { path: ['asia', 'europe'] });
  assert.equal(invalid.ok, false);
  assert.equal(invalid.error.code, 'invalid-cascade-list-path');
});
