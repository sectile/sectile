import assert from 'node:assert/strict';
import test from 'node:test';
import { createTree } from '@sectile/primitives/tree';
import {
  createTreeViewController,
  toTreeViewEffect,
  toTreeViewEvent,
} from '../dist/tree-view.js';

test('DOM keys map onto tree-view semantic events', () => {
  assert.equal(toTreeViewEvent({ key: 'ArrowDown' }), 'next');
  assert.equal(toTreeViewEvent({ key: 'ArrowUp' }), 'previous');
  assert.equal(toTreeViewEvent({ key: 'ArrowRight' }), 'right');
  assert.equal(toTreeViewEvent({ key: 'ArrowLeft' }), 'left');
  assert.equal(toTreeViewEvent({ key: ' ' }), 'toggle-select');
  assert.equal(toTreeViewEvent({ key: 'ArrowDown', altKey: true }), null);
});

test('DOM tree-view commands project into focus effects', () => {
  assert.deepEqual(toTreeViewEffect({ type: 'focus', id: 'root' }), {
    type: 'focus-element',
    id: 'root',
  });
});

test('uncontrolled DOM tree-view owns expansion, highlight, and selection', () => {
  const controller = unwrap(createTreeViewController({
    tree: tree(),
    defaultHighlightedValue: 'root',
  }));
  const opened = controller.handleKeyboardInput({ key: 'ArrowRight' });
  assert.equal(opened.ok, true);
  assert.deepEqual(opened.snapshot.state.expansion.ids, ['root']);
  const entered = controller.handleKeyboardInput({ key: 'ArrowRight' });
  assert.equal(entered.ok, true);
  assert.equal(entered.snapshot.state.cursor.current, 'child-a');
  const selected = controller.handleKeyboardInput({ key: ' ' });
  assert.equal(selected.ok, true);
  assert.deepEqual(selected.snapshot.state.selection.selected, ['child-a']);
});

test('controlled DOM tree-view emits expansion proposals until synchronized', () => {
  const expansions = [];
  const controller = unwrap(createTreeViewController({
    tree: tree(),
    expandedValue: [],
    defaultHighlightedValue: 'root',
    onExpandedValueChange(change) {
      expansions.push(change);
    },
  }));
  const opened = controller.handleKeyboardInput({ key: 'ArrowRight' });
  assert.equal(opened.ok, true);
  assert.deepEqual(opened.snapshot.state.expansion.ids, []);
  assert.deepEqual(expansions, [{ value: ['root'], previousValue: [] }]);
  const synchronized = unwrap(controller.syncControlledValues({ expandedValue: ['root'] }));
  assert.deepEqual(synchronized.state.expansion.ids, ['root']);
});

test('invalid controlled tree-view synchronization is failure-atomic', () => {
  const controller = unwrap(createTreeViewController({
    tree: tree(),
    expandedValue: ['root'],
    defaultHighlightedValue: 'child-a',
  }));
  const initial = controller.getSnapshot();
  const result = controller.syncControlledValues({ expandedValue: [] });
  assert.equal(result.ok, false);
  assert.equal(result.error.code, 'tree-view-cursor-hidden');
  assert.equal(controller.getSnapshot(), initial);
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
