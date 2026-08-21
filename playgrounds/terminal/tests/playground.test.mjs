import assert from 'node:assert/strict';
import test from 'node:test';
import { unwrap } from '@sectile/primitives/result';
import { fitTerminalText } from '@sectile/terminal/layout';
import { toTerminalKeyboardInput } from '@sectile/terminal/node';
import { createTreeGrid } from '@sectile/terminal/tree-grid';

test('terminal playground dependencies compose through public package subpaths', () => {
  const connection = unwrap(createTreeGrid({
    rows: rows(),
    defaultHighlightedValue: 'root-name',
    getCellValue: () => '',
    setCellValue: () => {},
  }));
  assert.equal(connection.handleKeyboardInput({ key: 'expand' }), true);
  assert.equal(connection.handleKeyboardInput({ key: 'down' }), true);
  assert.equal(connection.getSnapshot().state.cursor.current, 'child-name');
  assert.equal(connection.handleKeyboardInput(
    toTerminalKeyboardInput(undefined, { name: 'left', meta: true }),
  ), true);
  assert.equal(typeof fitTerminalText('한글', 8), 'string');
});

function rows() {
  return [
    { id: 'root', parentID: null, cells: ['root-name', 'root-status'] },
    { id: 'child', parentID: 'root', cells: ['child-name', 'child-status'] },
  ];
}
