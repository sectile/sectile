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

test('DOM keys map onto tree-grid navigation and edit modes', () => {
  assert.equal(toTreeGridEvent({ key: 'ArrowDown' }), 'down');
  assert.equal(toTreeGridEvent({ key: 'ArrowRight', altKey: true }), 'expand');
  assert.equal(toTreeGridEvent({ key: 'ArrowLeft', altKey: true }), 'collapse');
  assert.equal(toTreeGridEvent({ key: ' ' }), 'select');
  assert.equal(toTreeGridEvent({ key: 'Enter' }), 'start-edit');
  assert.equal(toTreeGridEvent({ key: 'Enter' }, 'editing'), 'commit-edit');
  assert.equal(toTreeGridEvent({ key: 'Escape' }, 'editing'), 'cancel-edit');
  assert.equal(toTreeGridEvent({ key: 'ArrowRight' }, 'editing'), null);
  assert.equal(toTreeGridEvent({ key: 'ArrowRight', ctrlKey: true }), null);
});

test('DOM tree-grid commands project into focus and cell edit effects', () => {
  assert.deepEqual(toTreeGridEffect({ type: 'focus', id: 'a' }), {
    type: 'focus-element',
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

test('uncontrolled DOM tree-grid owns expansion, highlight, selection, and edit mode', () => {
  const controller = unwrap(createTreeGridController({
    model: model(),
    defaultHighlightedValue: 'root-name',
  }));
  const expanded = controller.handleKeyboardInput({ key: 'ArrowRight', altKey: true });
  assert.equal(expanded.ok, true);
  assert.deepEqual(expanded.snapshot.state.expansion.ids, ['root']);

  const moved = controller.handleKeyboardInput({ key: 'ArrowDown' });
  assert.equal(moved.ok, true);
  assert.equal(moved.snapshot.state.cursor.current, 'child-name');
  assert.deepEqual(moved.commands, [{ type: 'focus-element', id: 'child-name' }]);

  const selected = controller.handleKeyboardInput({ key: ' ' });
  assert.equal(selected.ok, true);
  assert.deepEqual(selected.snapshot.state.selection.selected, ['child-name']);

  const editing = controller.handleKeyboardInput({ key: 'Enter' });
  assert.equal(editing.ok, true);
  assert.equal(editing.snapshot.state.editMode, 'editing');
  assert.deepEqual(editing.commands, [{ type: 'begin-cell-edit', id: 'child-name' }]);
  const unsupported = controller.handleKeyboardInput({ key: 'ArrowRight' });
  assert.equal(unsupported.ok, false);
  assert.equal(unsupported.snapshot, editing.snapshot);

  const committed = controller.handleKeyboardInput({ key: 'Enter' });
  assert.equal(committed.ok, true);
  assert.equal(committed.snapshot.state.editMode, 'navigation');
  assert.deepEqual(committed.commands, [{ type: 'commit-cell-edit', id: 'child-name' }]);
});

test('controlled DOM tree-grid emits proposals until every controlled field is synchronized', () => {
  const expansions = [];
  const highlights = [];
  const values = [];
  const editModes = [];
  const controller = unwrap(createTreeGridController({
    model: model(),
    value: null,
    expandedValue: [],
    highlightedValue: 'root-name',
    editMode: 'navigation',
    onExpandedValueChange(change) {
      expansions.push(change);
    },
    onHighlightedValueChange(change) {
      highlights.push(change);
    },
    onValueChange(change) {
      values.push(change);
    },
    onEditModeChange(change) {
      editModes.push(change);
    },
  }));

  const expanded = controller.handleKeyboardInput({ key: 'ArrowRight', altKey: true });
  assert.equal(expanded.ok, true);
  assert.deepEqual(expanded.snapshot.state.expansion.ids, []);
  assert.deepEqual(expansions, [{ value: ['root'], previousValue: [] }]);
  unwrap(controller.syncControlledValues({
    value: null,
    expandedValue: ['root'],
    highlightedValue: 'root-name',
    editMode: 'navigation',
  }));

  const moved = controller.handleKeyboardInput({ key: 'ArrowDown' });
  assert.equal(moved.snapshot.state.cursor.current, 'root-name');
  assert.deepEqual(highlights, [{ value: 'child-name', previousValue: 'root-name' }]);
  unwrap(controller.syncControlledValues({
    value: null,
    expandedValue: ['root'],
    highlightedValue: 'child-name',
    editMode: 'navigation',
  }));

  controller.handleKeyboardInput({ key: ' ' });
  assert.deepEqual(values, [{ value: 'child-name', previousValue: null }]);
  controller.handleKeyboardInput({ key: 'Enter' });
  assert.deepEqual(editModes, [{ value: 'editing', previousValue: 'navigation' }]);
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
