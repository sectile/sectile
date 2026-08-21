import assert from 'node:assert/strict';
import test from 'node:test';
import { unwrap } from '@sectile/primitives/result';
import { createTree } from '@sectile/primitives/tree';
import {
  createTreeView,
  createTreeViewController,
  toTreeViewEffect,
  toTreeViewEvent,
} from '../dist/tree-view.js';

test('terminal tree-view facade constructs the tree and owns keyboard updates', () => {
  let updates = 0;
  const connection = unwrap(createTreeView({
    nodes: nodes(),
    defaultHighlightedValue: 'root',
    onUpdate: () => { updates += 1; },
  }));
  assert.equal(connection.tree.size, 4);
  assert.equal(connection.handleKeyboardInput({ key: 'right' }), true);
  assert.equal(connection.handleKeyboardInput({ key: 'enter' }), false);
  assert.deepEqual(connection.getSnapshot().state.expansion.ids, ['root']);
  assert.equal(updates, 1);

  const invalid = createTreeView({ nodes: [{ id: 'child', parentID: 'missing' }] });
  assert.equal(invalid.ok, false);
});

test('terminal keys map onto tree-view semantic events', () => {
  assert.equal(toTreeViewEvent({ key: 'down' }), 'next');
  assert.equal(toTreeViewEvent({ key: 'up' }), 'previous');
  assert.equal(toTreeViewEvent({ key: 'right' }), 'right');
  assert.equal(toTreeViewEvent({ key: 'left' }), 'left');
  assert.equal(toTreeViewEvent({ key: 'space' }), 'toggle-select');
  assert.equal(toTreeViewEvent({ key: 'enter' }), null);
});

test('terminal tree-view commands project into highlight effects', () => {
  assert.deepEqual(toTreeViewEffect({ type: 'focus', id: 'root' }), {
    type: 'move-highlight',
    id: 'root',
  });
});

test('terminal tree-view skips disabled items without host policy glue', () => {
  const connection = unwrap(createTreeView({ nodes: nodes(), defaultExpandedValue: ['root', 'child-a'], defaultHighlightedValue: 'child-a', disabledItems: ['child-b'] }));
  connection.handleKeyboardInput({ key: 'down' });
  assert.equal(connection.getSnapshot().state.cursor.current, 'grandchild');
  connection.handleKeyboardInput({ key: 'down' });
  assert.equal(connection.getSnapshot().state.cursor.current, 'grandchild');
});

test('terminal tree-view supports mixed controlled state', () => {
  const selections = [];
  const controller = unwrap(createTreeViewController({
    tree: tree(),
    value: [],
    defaultExpandedValue: ['root'],
    defaultHighlightedValue: 'child-a',
    onValueChange(change) {
      selections.push(change);
    },
  }));
  const selected = controller.handleKeyboardInput({ key: 'space' });
  assert.equal(selected.ok, true);
  assert.deepEqual(selected.snapshot.state.selection.selected, []);
  assert.deepEqual(selections, [{ value: ['child-a'], previousValue: [] }]);
  assert.deepEqual(
    unwrap(controller.syncControlledValues({ value: ['child-a'] })).state.selection.selected,
    ['child-a'],
  );
});

test('unsupported terminal tree-view input is failure-atomic', () => {
  const controller = unwrap(createTreeViewController({ tree: tree() }));
  const initial = controller.getSnapshot();
  const result = controller.handleKeyboardInput({ key: 'enter' });
  assert.equal(result.ok, false);
  assert.equal(result.snapshot, initial);
});

function tree() {
  return unwrap(createTree(nodes()));
}

function nodes() {
  return [
    { id: 'root', parentID: null },
    { id: 'child-a', parentID: 'root' },
    { id: 'grandchild', parentID: 'child-a' },
    { id: 'child-b', parentID: 'root' },
  ];
}
