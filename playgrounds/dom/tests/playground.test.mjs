import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createTreeGridController,
  toTreeGridEvent,
} from '@sectile/dom/tree-grid';
import { createGrid } from '@sectile/primitives/grid';
import { unwrap } from '@sectile/primitives/result';
import { createTree } from '@sectile/primitives/tree';
import { createTreeGridModel } from '@sectile/primitives/tree-grid';

test('DOM playground dependencies compose through public package subpaths', () => {
  const controller = unwrap(createTreeGridController({
    model: createModel(),
    defaultHighlightedValue: 'root-name',
  }));

  assert.equal(controller.handleKeyboardInput({ key: 'ArrowRight', altKey: true }).ok, true);
  assert.equal(controller.handleKeyboardInput({ key: 'ArrowDown' }).snapshot.state.cursor.current, 'child-name');
  assert.equal(controller.handleKeyboardInput({ key: 'Enter' }).snapshot.state.editMode, 'editing');
  assert.equal(toTreeGridEvent({ key: 'Enter', isComposing: true }, 'editing'), null);
  assert.equal(controller.handleKeyboardInput({ key: 'Enter' }).snapshot.state.editMode, 'navigation');
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
