import assert from 'node:assert/strict';
import test from 'node:test';
import { createTreeGrid } from '@sectile/dom/tree-grid';
import { unwrap } from '@sectile/primitives/result';

test('DOM playground dependencies compose through public package subpaths', () => {
  const connection = unwrap(createTreeGrid({
    rows: rows(),
    root: fakeRoot(),
    defaultHighlightedValue: 'root-name',
    getCellValue: () => '',
    setCellValue: () => {},
  }));

  assert.equal(connection.handleKeyboardEvent(keyboardEvent('ArrowRight', { altKey: true })), true);
  assert.equal(connection.handleKeyboardEvent(keyboardEvent('ArrowDown')), true);
  assert.equal(connection.getSnapshot().state.cursor.current, 'child-name');
  assert.equal(connection.handleKeyboardEvent(keyboardEvent('Enter')), true);
  assert.equal(connection.getSnapshot().state.editMode, 'editing');
  assert.equal(connection.handleKeyboardEvent(keyboardEvent('Enter')), true);
  assert.equal(connection.getSnapshot().state.editMode, 'navigation');
});

function rows() {
  return [
    { id: 'root', parentID: null, cells: ['root-name', 'root-status'] },
    { id: 'child', parentID: 'root', cells: ['child-name', 'child-status'] },
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

function fakeRoot() {
  return {
    addEventListener() {},
    removeEventListener() {},
    setAttribute() {},
    querySelectorAll() { return []; },
    focus() {},
  };
}
