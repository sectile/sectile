import assert from 'node:assert/strict';
import test from 'node:test';
import { createTree } from '@sectile/primitives/tree';
import {
  createTreeViewController,
  toTreeViewEffect,
  toTreeViewEvent,
} from '../dist/tree-view.js';

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
  return unwrap(createTree([
    { id: 'root', parentID: null },
    { id: 'child-a', parentID: 'root' },
    { id: 'grandchild', parentID: 'child-a' },
    { id: 'child-b', parentID: 'root' },
  ]));
}

function unwrap(result) {
  assert.equal(result.ok, true, result.ok ? undefined : result.error.message);
  return result.value;
}
