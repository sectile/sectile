import assert from 'node:assert/strict';
import test from 'node:test';
import { unwrap } from '@sectile/primitives/result';
import { createGrid } from '@sectile/primitives/grid';
import { createTree } from '@sectile/primitives/tree';
import { createTreeGridModel } from '@sectile/primitives/tree-grid';
import {
  createTreeGrid,
  createTreeGridController,
  toTreeGridEffect,
  toTreeGridEvent,
} from '../dist/tree-grid.js';

test('DOM tree-grid connection owns ARIA, edit rollback, and IME Enter commit', async () => {
  const root = new FakeElement();
  const values = new Map([['root-name', 'Root']]);
  const events = [];
  const connection = unwrap(createTreeGrid({
    rows: modelRows(),
    root,
    defaultHighlightedValue: 'root-name',
    getCellValue: (id) => values.get(id) ?? '',
    setCellValue: (id, value) => values.set(id, value),
    onTransition: ({ event }) => events.push(event),
  }));
  assert.equal(connection.model.tree.parentOf('child'), 'root');

  connection.setGridAttributes(2, 2);
  assert.equal(root.attributes.get('role'), 'treegrid');
  assert.equal(root.attributes.get('aria-rowcount'), '2');
  const row = new FakeElement();
  connection.setRowAttributes(row, { rowIndex: 1, level: 1, expanded: false });
  assert.equal(row.attributes.get('aria-expanded'), 'false');
  const cell = new FakeElement();
  connection.setCellAttributes(cell, { id: 'root-name', columnIndex: 1 });
  assert.equal(cell.tabIndex, 0);
  assert.equal(cell.attributes.get('aria-selected'), 'false');

  assert.equal(connection.handleKeyboardEvent(keyboardEvent('Enter')), true);
  const input = new FakeInput();
  connection.bindEditor(input, { id: 'root-name' });
  input.emit('compositionstart');
  input.value = '한글';
  input.emit('input');
  assert.equal(connection.handleKeyboardEvent(keyboardEvent('Enter', { isComposing: true })), false);
  input.emit('compositionend');
  await new Promise((resolve) => setTimeout(resolve, 5));

  assert.equal(values.get('root-name'), '한글');
  assert.equal(connection.getSnapshot().state.editMode, 'navigation');
  connection.handleKeyboardEvent(keyboardEvent('Enter'));
  const cancelledInput = new FakeInput();
  connection.bindEditor(cancelledInput, { id: 'root-name' });
  cancelledInput.value = 'discard me';
  cancelledInput.emit('input');
  connection.handleKeyboardEvent(keyboardEvent('Escape'));
  assert.equal(values.get('root-name'), '한글');
  assert.deepEqual(events, ['start-edit', 'commit-edit', 'start-edit', 'cancel-edit']);
  connection.disconnect();
  assert.equal(root.listeners.get('keydown')?.size ?? 0, 0);

  const invalid = createTreeGrid({
    rows: [{ id: 'child', parentID: 'missing', cells: ['child-name'] }],
    root: new FakeElement(),
    getCellValue: () => '',
    setCellValue: () => {},
  });
  assert.equal(invalid.ok, false);
  assert.equal(invalid.error.code, 'missing-parent');

  let renders = 0;
  const controlled = unwrap(createTreeGrid({
    rows: modelRows(),
    root: new FakeElement(),
    value: null,
    getCellValue: () => '',
    setCellValue: () => {},
    onUpdate: () => { renders += 1; },
  }));
  const synchronized = unwrap(controlled.syncControlledValues({ value: 'root-name' }));
  assert.deepEqual(synchronized.state.selection.selected, ['root-name']);
  assert.equal(renders, 1);
});

test('DOM keys map onto tree-grid navigation and edit modes', () => {
  assert.equal(toTreeGridEvent({ key: 'ArrowDown' }), 'down');
  assert.equal(toTreeGridEvent({ key: 'ArrowRight', altKey: true }), 'expand');
  assert.equal(toTreeGridEvent({ key: 'ArrowLeft', altKey: true }), 'collapse');
  assert.equal(toTreeGridEvent({ key: ' ' }), 'select');
  assert.equal(toTreeGridEvent({ key: 'Enter' }), 'start-edit');
  assert.equal(toTreeGridEvent({ key: 'Enter' }, 'editing'), 'commit-edit');
  assert.equal(toTreeGridEvent({ key: 'Escape' }, 'editing'), 'cancel-edit');
  assert.equal(toTreeGridEvent({ key: 'Enter', isComposing: true }, 'editing'), null);
  assert.equal(toTreeGridEvent({ key: 'ArrowRight' }, 'editing'), null);
  assert.equal(toTreeGridEvent({ key: 'ArrowRight', ctrlKey: true }), null);
});

test('DOM tree-grid delegates disclosure, cell click, and double-click editing', () => {
  const root = new FakeElement();
  const connection = unwrap(createTreeGrid({
    rows: modelRows(),
    root,
    defaultHighlightedValue: 'root-name',
    getCellValue: () => '',
    setCellValue: () => {},
  }));
  const disclosure = new FakeElement();
  connection.setDisclosureAttributes(disclosure, 'root');
  root.emit('click', { target: disclosure });
  assert.deepEqual(connection.getSnapshot().state.expansion.ids, ['root']);
  const cell = new FakeElement();
  connection.setCellAttributes(cell, { id: 'child-name', columnIndex: 1 });
  root.emit('click', { target: cell, timeStamp: 100 });
  assert.deepEqual(connection.getSnapshot().state.selection.selected, ['child-name']);
  root.emit('click', { target: cell, timeStamp: 200 });
  assert.equal(connection.getSnapshot().state.editMode, 'editing');
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

function modelRows() {
  return [
    { id: 'root', parentID: null, cells: ['root-name', 'root-value'] },
    { id: 'child', parentID: 'root', cells: ['child-name', 'child-value'] },
  ];
}

function keyboardEvent(key, overrides = {}) {
  return {
    key,
    altKey: false,
    ctrlKey: false,
    metaKey: false,
    isComposing: false,
    preventDefault() {},
    ...overrides,
  };
}

class FakeElement {
  attributes = new Map();
  dataset = {};
  listeners = new Map();
  tabIndex = -1;

  addEventListener(type, listener) {
    const listeners = this.listeners.get(type) ?? new Set();
    listeners.add(listener);
    this.listeners.set(type, listeners);
  }

  removeEventListener(type, listener) {
    this.listeners.get(type)?.delete(listener);
  }

  emit(type, event = {}) {
    for (const listener of this.listeners.get(type) ?? []) listener(event);
  }

  setAttribute(name, value) {
    this.attributes.set(name, value);
  }

  removeAttribute(name) {
    this.attributes.delete(name);
  }

  querySelectorAll() {
    return [];
  }

  focus() {}
}

class FakeInput extends FakeElement {
  value = '';

  select() {}
}
