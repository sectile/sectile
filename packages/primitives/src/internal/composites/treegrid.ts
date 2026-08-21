import type {
  AxisBoundaryPolicy,
  GridDirection,
  Result,
  SectileError,
  StableID,
} from '../../shared.js';
import type { Grid } from '../../structures/grid.js';
import type { Sequence } from '../../structures/sequence.js';
import type { Tree } from '../../structures/tree.js';
import { fail, freezeArray, ok } from '../kernel/foundation.js';
import { findEligibleFromEdge, IndexedSequence } from '../kernel/indexed-sequence.js';
import { createMachineUpdate } from '../kernel/machine.js';
import { createCursorState, type CursorState } from '../state/cursor.js';
import {
  createExpansionState,
  setExpansionOpen,
  type ExpansionState,
} from '../state/expansion.js';
import {
  createSelectionState,
  selectOne,
  type SelectionSnapshotInput,
  type SelectionState,
} from '../state/selection.js';

export type TreeGridEditMode = 'navigation' | 'editing';

export type TreeGridEvent =
  | GridDirection
  | 'expand'
  | 'collapse'
  | 'select'
  | 'start-edit'
  | 'commit-edit'
  | 'cancel-edit';

export type TreeGridCommand<CellID extends StableID = StableID> =
  | { readonly type: 'focus'; readonly id: CellID }
  | { readonly type: 'begin-edit'; readonly id: CellID }
  | { readonly type: 'commit-edit'; readonly id: CellID }
  | { readonly type: 'cancel-edit'; readonly id: CellID };

export interface TreeGridModel<
  RowID extends StableID = StableID,
  CellID extends StableID = StableID,
> {
  readonly tree: Tree<RowID>;
  readonly grid: Grid<CellID>;
  readonly rowIDs: readonly RowID[];
  rowIndexOf(id: RowID): number | null;
  rowOfCell(id: CellID): RowID | null;
}

export interface TreeGridState<
  RowID extends StableID = StableID,
  CellID extends StableID = StableID,
> {
  readonly expansion: ExpansionState<RowID>;
  readonly cursor: CursorState<CellID>;
  readonly selection: SelectionState<CellID>;
  readonly editMode: TreeGridEditMode;
}

export interface TreeGridStateInput<
  RowID extends StableID = StableID,
  CellID extends StableID = StableID,
> extends SelectionSnapshotInput<CellID> {
  readonly expanded?: Iterable<RowID>;
  readonly current?: CellID | null;
  readonly editMode?: TreeGridEditMode;
}

export interface TreeGridPolicies<CellID extends StableID = StableID> {
  readonly eligible?: (id: CellID) => boolean;
  readonly boundary?: AxisBoundaryPolicy;
  readonly maxScan?: number;
}

export interface TreeGridUpdate<
  RowID extends StableID = StableID,
  CellID extends StableID = StableID,
> {
  readonly state: TreeGridState<RowID, CellID>;
  readonly commands: readonly TreeGridCommand<CellID>[];
}

class IndexedTreeGridModel<RowID extends StableID, CellID extends StableID>
  implements TreeGridModel<RowID, CellID> {
  public readonly tree: Tree<RowID>;
  public readonly grid: Grid<CellID>;
  public readonly rowIDs: readonly RowID[];
  readonly #rowIndices: ReadonlyMap<RowID, number>;

  public constructor(
    tree: Tree<RowID>,
    grid: Grid<CellID>,
    rowIDs: readonly RowID[],
  ) {
    this.tree = tree;
    this.grid = grid;
    this.rowIDs = freezeArray(rowIDs);
    this.#rowIndices = new Map(this.rowIDs.map((id, index) => [id, index]));
    Object.freeze(this);
  }

  public rowIndexOf(id: RowID): number | null {
    return this.#rowIndices.get(id) ?? null;
  }

  public rowOfCell(id: CellID): RowID | null {
    const position = this.grid.positionOf(id);
    return position === null ? null : (this.rowIDs[position.row] ?? null);
  }
}

export function createTreeGridModel<RowID extends StableID, CellID extends StableID>(
  tree: Tree<RowID>,
  grid: Grid<CellID>,
  rowIDs: readonly RowID[],
): Result<TreeGridModel<RowID, CellID>> {
  if (rowIDs.length !== grid.rowCount || rowIDs.length !== tree.size) {
    return fail(
      'construction',
      'treegrid-row-count-mismatch',
      'Treegrid must map every tree row to exactly one grid row.',
      { mappedRows: rowIDs.length, gridRows: grid.rowCount, treeRows: tree.size },
    );
  }
  const seen = new Set<RowID>();
  for (let index = 0; index < rowIDs.length; index += 1) {
    const id = rowIDs[index];
    if (id === undefined || !tree.has(id)) {
      return fail(
        'construction',
        'treegrid-row-outside-tree',
        'Every mapped treegrid row must exist in the tree.',
        { index, id },
      );
    }
    if (seen.has(id)) {
      return fail(
        'construction',
        'duplicate-treegrid-row',
        'Each tree row must map to one grid row.',
        { index, id },
      );
    }
    seen.add(id);
  }
  return ok(new IndexedTreeGridModel(tree, grid, rowIDs));
}

export function createTreeGridState<RowID extends StableID, CellID extends StableID>(
  model: TreeGridModel<RowID, CellID>,
  input: TreeGridStateInput<RowID, CellID> = {},
): Result<TreeGridState<RowID, CellID>> {
  const expansion = createExpansionState(model.tree, input.expanded ?? []);
  const visible = visibleCells(model, expansion);
  const current = input.current ?? null;
  if (current !== null && !visible.contains(current)) {
    return fail(
      'construction',
      'treegrid-cursor-hidden',
      'Treegrid cursor must belong to a visible row.',
      { current },
    );
  }
  const selection = createSelectionState(allCells(model), 'single', input);
  if (!selection.ok) return selection;
  const editMode = input.editMode ?? 'navigation';
  if (!isTreeGridEditMode(editMode)) {
    return fail(
      'construction',
      'invalid-treegrid-edit-mode',
      'Treegrid edit mode must be navigation or editing.',
      { editMode },
    );
  }
  if (editMode === 'editing' && current === null) {
    return fail(
      'construction',
      'treegrid-edit-without-cursor',
      'Treegrid editing requires a current cell.',
    );
  }
  return ok(treeGridState(
    expansion,
    createCursorState(current),
    selection.value,
    editMode,
  ));
}

export function applyTreeGridEvent<RowID extends StableID, CellID extends StableID>(
  model: TreeGridModel<RowID, CellID>,
  state: TreeGridState<RowID, CellID>,
  event: TreeGridEvent,
  policies: TreeGridPolicies<CellID> = {},
): Result<TreeGridUpdate<RowID, CellID>> {
  const expansion = createExpansionState(model.tree, state.expansion.ids);
  const visible = visibleCells(model, expansion);
  const domain = allCells(model);
  const stateError = validateTreeGridState(visible, domain, state);
  if (stateError !== null) return { ok: false, error: stateError };
  if (!isTreeGridEvent(event)) {
    return fail(
      'transition-rejection',
      'invalid-treegrid-event',
      'Treegrid event is not part of the accepted event vocabulary.',
      { event },
    );
  }
  const boundary = policies.boundary ?? 'stop';
  if (boundary !== 'stop' && boundary !== 'wrap-axis') {
    return fail(
      'transition-rejection',
      'invalid-treegrid-boundary',
      'Treegrid boundary must be stop or wrap-axis.',
      { boundary },
    );
  }
  if (policies.eligible !== undefined && typeof policies.eligible !== 'function') {
    return fail(
      'transition-rejection',
      'invalid-eligibility-policy',
      'Treegrid eligibility policy must be a function.',
    );
  }

  const normalized = sameExpansion(expansion, state.expansion)
    ? state
    : treeGridState(expansion, state.cursor, state.selection, state.editMode);
  const current = state.cursor.current;

  if (event === 'commit-edit' || event === 'cancel-edit') {
    if (state.editMode !== 'editing' || current === null) {
      return fail(
        'transition-rejection',
        'treegrid-not-editing',
        'Treegrid can only finish an active edit.',
      );
    }
    return createMachineUpdate(
      treeGridState(expansion, state.cursor, state.selection, 'navigation'),
      [{ type: event, id: current }],
    );
  }
  if (state.editMode === 'editing') {
    if (event === 'start-edit') return createMachineUpdate(normalized);
    return fail(
      'transition-rejection',
      'treegrid-edit-active',
      'Treegrid navigation is suspended while a cell edit is active.',
      { event },
    );
  }
  if (event === 'start-edit') {
    if (current === null) {
      return fail('transition-rejection', 'no-cursor', 'Treegrid editing requires a cursor.');
    }
    return createMachineUpdate(
      treeGridState(expansion, state.cursor, state.selection, 'editing'),
      [{ type: 'begin-edit', id: current }],
    );
  }
  if (event === 'select') {
    if (current === null) {
      return fail('transition-rejection', 'no-cursor', 'Treegrid selection requires a cursor.');
    }
    const selection = selectOne(state.selection, current, domain);
    return createMachineUpdate(
      selection === state.selection
        ? normalized
        : treeGridState(expansion, state.cursor, selection, 'navigation'),
    );
  }
  if (event === 'expand' || event === 'collapse') {
    if (current === null) return createMachineUpdate(normalized);
    const row = model.rowOfCell(current);
    if (row === null) return createMachineUpdate(normalized);
    const nextExpansion = setExpansionOpen(
      expansion,
      row,
      event === 'expand',
      model.tree,
    );
    return createMachineUpdate(
      nextExpansion === expansion
        ? normalized
        : treeGridState(nextExpansion, state.cursor, state.selection, 'navigation'),
    );
  }

  const eligible = policies.eligible ?? (() => true);
  let target: CellID | null;
  if (current === null) {
    const initial = findEligibleFromEdge(
      visible,
      event === 'right' || event === 'down' ? 1 : -1,
      {
        eligible,
        ...(policies.maxScan === undefined ? {} : { maxScan: policies.maxScan }),
      },
    );
    if (!initial.ok) return initial;
    target = initial.value;
  } else {
    const visibleRows = new Set(model.tree.visible(expansion).ids);
    const movement = model.grid.move(current, event, boundary, {
      eligible: (id) => {
        const row = model.rowOfCell(id);
        return row !== null && visibleRows.has(row) && eligible(id);
      },
      ...(policies.maxScan === undefined ? {} : { maxScan: policies.maxScan }),
    });
    if (movement.kind === 'resource-rejected') return { ok: false, error: movement.error };
    target = movement.kind === 'found' ? movement.id : null;
  }
  if (target === null) return createMachineUpdate(normalized);
  return createMachineUpdate(
    treeGridState(expansion, createCursorState(target), state.selection, 'navigation'),
    [{ type: 'focus', id: target }],
  );
}

function allCells<RowID extends StableID, CellID extends StableID>(
  model: TreeGridModel<RowID, CellID>,
): Sequence<CellID> {
  return cellsWhere(model, () => true);
}

function visibleCells<RowID extends StableID, CellID extends StableID>(
  model: TreeGridModel<RowID, CellID>,
  expansion: ExpansionState<RowID>,
): Sequence<CellID> {
  const visibleRows = new Set(model.tree.visible(expansion).ids);
  return cellsWhere(model, (row) => visibleRows.has(row));
}

function cellsWhere<RowID extends StableID, CellID extends StableID>(
  model: TreeGridModel<RowID, CellID>,
  includeRow: (row: RowID) => boolean,
): Sequence<CellID> {
  const ids: CellID[] = [];
  for (let rowIndex = 0; rowIndex < model.grid.rowCount; rowIndex += 1) {
    const row = model.rowIDs[rowIndex];
    if (row === undefined || !includeRow(row)) continue;
    for (let column = 0; column < model.grid.columnCount; column += 1) {
      const id = model.grid.cellAt(rowIndex, column);
      if (id !== null) ids.push(id);
    }
  }
  return new IndexedSequence(ids) as Sequence<CellID>;
}

function validateTreeGridState<CellID extends StableID>(
  visible: Sequence<CellID>,
  domain: Sequence<CellID>,
  state: TreeGridState<StableID, CellID>,
): SectileError | null {
  if (!isTreeGridEditMode(state.editMode)) {
    return {
      class: 'transition-rejection',
      code: 'invalid-treegrid-edit-mode',
      message: 'Treegrid edit mode must be navigation or editing.',
    };
  }
  if (state.cursor.current !== null && !visible.contains(state.cursor.current)) {
    return {
      class: 'transition-rejection',
      code: 'treegrid-cursor-hidden',
      message: 'Treegrid cursor must remain on a visible row.',
      details: { current: state.cursor.current },
    };
  }
  if (state.editMode === 'editing' && state.cursor.current === null) {
    return {
      class: 'transition-rejection',
      code: 'treegrid-edit-without-cursor',
      message: 'Treegrid editing requires a current cell.',
    };
  }
  if (state.selection.size > 1 || state.selection.selected.length !== state.selection.size) {
    return {
      class: 'transition-rejection',
      code: 'invalid-treegrid-selection',
      message: 'Treegrid selection must contain at most one identity.',
    };
  }
  for (const id of state.selection.selected) {
    if (!domain.contains(id) || !state.selection.has(id)) {
      return {
        class: 'transition-rejection',
        code: 'treegrid-selection-outside-grid',
        message: 'Treegrid selection must agree with the cell grid.',
        details: { id },
      };
    }
  }
  if (state.selection.anchor !== null && !domain.contains(state.selection.anchor)) {
    return {
      class: 'transition-rejection',
      code: 'treegrid-anchor-outside-grid',
      message: 'Treegrid selection anchor must exist in the cell grid.',
      details: { anchor: state.selection.anchor },
    };
  }
  return null;
}

function treeGridState<RowID extends StableID, CellID extends StableID>(
  expansion: ExpansionState<RowID>,
  cursor: CursorState<CellID>,
  selection: SelectionState<CellID>,
  editMode: TreeGridEditMode,
): TreeGridState<RowID, CellID> {
  return Object.freeze({ expansion, cursor, selection, editMode });
}

function sameExpansion<ID extends StableID>(
  left: ExpansionState<ID>,
  right: ExpansionState<ID>,
): boolean {
  return left.ids.length === right.ids.length && left.ids.every((id, index) => id === right.ids[index]);
}

function isTreeGridEditMode(value: string): value is TreeGridEditMode {
  return value === 'navigation' || value === 'editing';
}

function isTreeGridEvent(value: string): value is TreeGridEvent {
  return [
    'left',
    'right',
    'up',
    'down',
    'expand',
    'collapse',
    'select',
    'start-edit',
    'commit-edit',
    'cancel-edit',
  ].includes(value);
}
