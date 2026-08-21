import assert from 'node:assert/strict';
import test from 'node:test';
import { createGrid } from '@sectile/primitives/grid';
import { createTree } from '@sectile/primitives/tree';
import { createTreeGridModel } from '@sectile/primitives/tree-grid';
import {
  createTreeGridController,
  toTreeGridEffect,
  toTreeGridEvent,
} from '../dist/tree-grid.js';

test('terminal keys map onto tree-grid navigation and edit modes', () => {
  assert.equal(toTreeGridEvent({ key: 'down' }), 'down');
  assert.equal(toTreeGridEvent({ key: 'expand' }), 'expand');
  assert.equal(toTreeGridEvent({ key: 'collapse' }), 'collapse');
  assert.equal(toTreeGridEvent({ key: 'space' }), 'select');
  assert.equal(toTreeGridEvent({ key: 'enter' }), 'start-edit');
  assert.equal(toTreeGridEvent({ key: 'enter' }, 'editing'), 'commit-edit');
  assert.equal(toTreeGridEvent({ key: 'escape' }, 'editing'), 'cancel-edit');
  assert.equal(toTreeGridEvent({ key: 'right' }, 'editing'), null);
});

test('terminal tree-grid commands project into highlight and cell edit effects', () => {
  assert.deepEqual(toTreeGridEffect({ type: 'focus', id: 'a' }), {
    type: 'move-highlight',
    id: 'a',
  });
  assert.deepEqual(toTreeGridEffect({ type: 'begin-edit', id: 'a' }), {
    type: 'begin-cell-edit',
    id: 'a',
  });
  assert.deepEqual(toTreeGridEffect({ type: 'commit-edit', id: 'a' }), {
    type: 'commit-cell-edit',
    id: 'a',
  });
  assert.deepEqual(toTreeGridEffect({ type: 'cancel-edit', id: 'a' }), {
    type: 'cancel-cell-edit',
    id: 'a',
  });
});

test('uncontrolled terminal tree-grid owns all semantic state', () => {
  const controller = unwrap(createTreeGridController({
    model: model(),
    defaultHighlightedValue: 'root-name',
  }));
  assert.equal(controller.handleKeyboardInput({ key: 'expand' }).ok, true);
  const moved = controller.handleKeyboardInput({ key: 'down' });
  assert.equal(moved.ok, true);
  assert.equal(moved.snapshot.state.cursor.current, 'child-name');
  assert.deepEqual(moved.commands, [{ type: 'move-highlight', id: 'child-name' }]);
  assert.equal(controller.handleKeyboardInput({ key: 'space' }).ok, true);

  const editing = controller.handleKeyboardInput({ key: 'edit' });
  assert.equal(editing.ok, true);
  assert.equal(editing.snapshot.state.editMode, 'editing');
  assert.deepEqual(editing.commands, [{ type: 'begin-cell-edit', id: 'child-name' }]);
  const cancelled = controller.handleKeyboardInput({ key: 'escape' });
  assert.equal(cancelled.ok, true);
  assert.equal(cancelled.snapshot.state.editMode, 'navigation');
  assert.deepEqual(cancelled.commands, [{ type: 'cancel-cell-edit', id: 'child-name' }]);
});

test('terminal tree-grid supports mixed controlled state and rejects unsupported input atomically', () => {
  const values = [];
  const controller = unwrap(createTreeGridController({
    model: model(),
    value: null,
    defaultExpandedValue: ['root'],
    defaultHighlightedValue: 'child-name',
    onValueChange(change) {
      values.push(change);
    },
  }));
  const selected = controller.handleKeyboardInput({ key: 'space' });
  assert.equal(selected.ok, true);
  assert.deepEqual(selected.snapshot.state.selection.selected, []);
  assert.deepEqual(values, [{ value: 'child-name', previousValue: null }]);
  assert.deepEqual(
    unwrap(controller.syncControlledValues({ value: 'child-name' })).state.selection.selected,
    ['child-name'],
  );

  const initial = controller.getSnapshot();
  const unsupported = controller.handleKeyboardInput({ key: 'tab' });
  assert.equal(unsupported.ok, false);
  assert.equal(unsupported.snapshot, initial);
  assert.deepEqual(unsupported.commands, []);
});

function model() {
  const tree = unwrap(createTree([
    { id: 'root', parentID: null },
    { id: 'child', parentID: 'root' },
  ]));
  const grid = unwrap(createGrid([
    ['root-name', 'root-value'],
    ['child-name', 'child-value'],
  ]));
  return unwrap(createTreeGridModel(tree, grid, ['root', 'child']));
}

function unwrap(result) {
  assert.equal(result.ok, true, result.ok ? undefined : result.error.message);
  return result.value;
}
