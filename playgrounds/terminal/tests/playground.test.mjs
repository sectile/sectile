import assert from 'node:assert/strict';
import test from 'node:test';
import { createGrid } from '@sectile/primitives/grid';
import { unwrap } from '@sectile/primitives/result';
import { createTree } from '@sectile/primitives/tree';
import { createTreeGridModel } from '@sectile/primitives/tree-grid';
import { fitTerminalText } from '@sectile/terminal/layout';
import { toTerminalKeyboardInput } from '@sectile/terminal/node';
import {
  connectTreeGrid,
  createTreeGridController,
} from '@sectile/terminal/tree-grid';

test('terminal playground dependencies compose through public package subpaths', () => {
  const controller = unwrap(createTreeGridController({
    model: createModel(),
    defaultHighlightedValue: 'root-name',
  }));

  assert.equal(controller.handleKeyboardInput({ key: 'expand' }).ok, true);
  assert.equal(controller.handleKeyboardInput({ key: 'down' }).snapshot.state.cursor.current, 'child-name');
  const connection = connectTreeGrid({
    controller,
    getCellValue: () => '',
    setCellValue: () => {},
  });
  assert.equal(connection.handleKeyboardInput(
    toTerminalKeyboardInput(undefined, { name: 'left', meta: true }),
  ), true);
  assert.equal(typeof fitTerminalText('한글', 8), 'string');
});

function createModel() {
  const tree = unwrap(createTree([
    { id: 'root', parentID: null },
    { id: 'child', parentID: 'root' },
  ]));
  const grid = unwrap(createGrid([
    ['root-name', 'root-status'],
    ['child-name', 'child-status'],
  ]));
  return unwrap(createTreeGridModel(tree, grid, ['root', 'child']));
}
