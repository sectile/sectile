import assert from 'node:assert/strict';
import test from 'node:test';
import { unwrap } from '@sectile/core/result';
import { createGrid } from '@sectile/core/grid';
import { createTree } from '@sectile/core/tree';
import { createTreeGridModel } from '@sectile/core/tree-grid';
import {
  createTreeGrid,
  tryCreateTreeGrid,
  createTreeGridController,
  toTreeGridEffect,
  toTreeGridEvent,
} from '../.verification-dist/tree-grid.js';

test('terminal keys map onto tree-grid navigation and edit modes', () => {
  assert.equal(toTreeGridEvent({ key: 'down' }), 'down');
  assert.equal(toTreeGridEvent({ key: 'expand' }), 'expand');
  assert.equal(toTreeGridEvent({ key: 'collapse' }), 'collapse');
  assert.equal(toTreeGridEvent({ key: 'space' }), 'select');
  assert.equal(toTreeGridEvent({ key: 'enter' }), 'start-edit');
  assert.equal(toTreeGridEvent({ key: 'enter' }, 'editing'), 'commit-edit');
  assert.equal(toTreeGridEvent({ key: 'escape' }, 'editing'), 'cancel-edit');
  assert.equal(toTreeGridEvent({ key: 'right' }, 'editing'), null);
  assert.equal(toTreeGridEvent({ key: 'left', altKey: true }), 'collapse');
  assert.equal(toTreeGridEvent({ key: 'right', altKey: true }), 'expand');
  assert.equal(toTreeGridEvent({ key: 'b', altKey: true }), null);
  assert.equal(toTreeGridEvent({ key: 'down', ctrlKey: true }), null);
});

test('terminal tree-grid connection owns edit buffering and cancel restoration', () => {
  const values = new Map([['root-name', 'Root']]);
  const events = [];
  let updates = 0;
  const connection = createTreeGrid({
    rows: modelRows(),
    defaultHighlightedValue: 'root-name',
    getCellValue: (id) => values.get(id) ?? '',
    setCellValue: (id, value) => values.set(id, value),
    onTransition: ({ event }) => events.push(event),
    onUpdate: () => { updates += 1; },
  });
  assert.equal(connection.model.tree.parentOf('child'), 'root');

  assert.equal(connection.handleKeyboardInput({ key: 'enter' }), true);
  assert.equal(connection.handleKeyboardInput({ key: '한', text: '한' }), true);
  assert.equal(values.get('root-name'), 'Root한');
  assert.equal(connection.handleKeyboardInput({ key: 'escape' }), true);
  assert.equal(values.get('root-name'), 'Root');
  assert.deepEqual(events, ['start-edit', 'cancel-edit']);
  assert.equal(updates, 3);

  const invalid = tryCreateTreeGrid({
    rows: [{ id: 'child', parentID: 'missing', cells: ['child-name'] }],
    getCellValue: () => '',
    setCellValue: () => {},
  });
  assert.equal(invalid.ok, false);
  assert.equal(invalid.error.code, 'missing-parent');

  let synchronizedUpdates = 0;
  const controlled = createTreeGrid({
    rows: modelRows(),
    value: null,
    getCellValue: () => '',
    setCellValue: () => {},
    onUpdate: () => { synchronizedUpdates += 1; },
  });
  const synchronized = unwrap(controlled.syncControlledValues({ value: 'root-name' }));
  assert.deepEqual(synchronized.state.selection.selected, ['root-name']);
  assert.equal(synchronizedUpdates, 1);
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
  const tree = createTree([
    { id: 'root', parentID: null },
    { id: 'child', parentID: 'root' },
  ]);
  const grid = createGrid([
    ['root-name', 'root-value'],
    ['child-name', 'child-value'],
  ]);
  return createTreeGridModel(tree, grid, ['root', 'child']);
}

function modelRows() {
  return [
    { id: 'root', parentID: null, cells: ['root-name', 'root-value'] },
    { id: 'child', parentID: 'root', cells: ['child-name', 'child-value'] },
  ];
}
