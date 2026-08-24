import { unwrap } from './result.js';
import type { Result, StableID } from './shared.js';
import { createGrid,tryCreateGrid } from './structures/grid.js';
import { createTree,tryCreateTree } from './structures/tree.js';
import {
  createTreeGridModel,
  type TreeGridModel,
  tryCreateTreeGridModel,
} from './internal/composites/tree-grid.js';

export interface TreeGridRowInput<
  RowID extends StableID = StableID,
  CellID extends StableID = StableID,
> {
  readonly id: RowID;
  readonly parentID: RowID | null;
  readonly cells: readonly (CellID | null)[];
}

export function createTreeGridModelFromRows<
  RowID extends StableID,
  CellID extends StableID,
>(
  rows: readonly TreeGridRowInput<RowID, CellID>[],
): TreeGridModel<RowID, CellID> {
  return unwrap(tryCreateTreeGridModelFromRows(rows));
}

export function tryCreateTreeGridModelFromRows<
  RowID extends StableID,
  CellID extends StableID,
>(
  rows: readonly TreeGridRowInput<RowID, CellID>[],
): Result<TreeGridModel<RowID, CellID>> {
  const tree = tryCreateTree(rows.map((row) => ({ id: row.id, parentID: row.parentID })));
  if (!tree.ok) return tree;
  const grid = tryCreateGrid(rows.map((row) => row.cells));
  if (!grid.ok) return grid;
  return tryCreateTreeGridModel(tree.value, grid.value, rows.map((row) => row.id));
}

export {
  applyTreeGridEvent,
  createTreeGridModel,
  createTreeGridState,
  type TreeGridCommand,
  type TreeGridEditMode,
  type TreeGridEvent,
  type TreeGridModel,
  type TreeGridPolicies,
  type TreeGridState,
  type TreeGridStateInput,
  type TreeGridUpdate,
} from './internal/composites/tree-grid.js';

export { tryCreateTreeGridModel } from './internal/composites/tree-grid.js';
export { tryCreateTreeGridState } from './internal/composites/tree-grid.js';
