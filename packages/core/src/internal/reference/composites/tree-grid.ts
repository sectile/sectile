import type { AxisBoundaryPolicy, GridDirection, StableID } from '../../../shared.js';
import type { Expansion } from '../../../structures/tree.js';
import type {
  TreeGridCommand,
  TreeGridEditMode,
  TreeGridEvent,
  TreeGridModel,
  TreeGridPolicies,
  TreeGridState,
  TreeGridStateInput,
  TreeGridUpdate,
} from '../../composites/tree-grid.js';
import { ReferenceSelectionState, referenceSelectOne } from '../state/selection.js';

interface ReferenceTreeGridRejection {
  readonly ok: false;
  readonly errorClass: 'transition-rejection' | 'resource-rejection';
  readonly errorCode: string;
}

export type ReferenceTreeGridResult<
  RowID extends StableID,
  CellID extends StableID,
> =
  | { readonly ok: true; readonly value: TreeGridUpdate<RowID, CellID> }
  | ReferenceTreeGridRejection;

export function createReferenceTreeGridState<
  RowID extends StableID,
  CellID extends StableID,
>(
  model: TreeGridModel<RowID, CellID>,
  input: TreeGridStateInput<RowID, CellID> = {},
): TreeGridState<RowID, CellID> {
  const expansion = referenceExpansion(model, input.expanded ?? []);
  const visible = referenceVisibleCells(model, expansion);
  const cells = referenceCells(model);
  const current = input.current ?? null;
  if (current !== null && !visible.includes(current)) throw new TypeError('reference cursor hidden');
  const selected = [...new Set(input.selected ?? [])];
  if (selected.length > 1 || selected.some((id) => !cells.includes(id))) {
    throw new TypeError('reference selection outside grid');
  }
  const anchor = input.anchor ?? null;
  if (anchor !== null && !cells.includes(anchor)) throw new TypeError('reference anchor outside grid');
  const editMode = input.editMode ?? 'navigation';
  if (!referenceEditMode(editMode)) throw new TypeError('reference edit mode invalid');
  if (editMode === 'editing' && current === null) throw new TypeError('reference edit without cursor');
  return referenceState(
    expansion,
    current,
    new ReferenceSelectionState(selected, anchor),
    editMode,
  );
}

export function applyReferenceTreeGridEvent<
  RowID extends StableID,
  CellID extends StableID,
>(
  model: TreeGridModel<RowID, CellID>,
  state: TreeGridState<RowID, CellID>,
  event: TreeGridEvent<RowID, CellID>,
  policies: TreeGridPolicies<CellID> = {},
): ReferenceTreeGridResult<RowID, CellID> {
  if (!referenceEditMode(state.editMode)) return rejected('invalid-tree-grid-edit-mode');
  const expansion = referenceExpansion(model, state.expansion.ids);
  const visible = referenceVisibleCells(model, expansion);
  const cells = referenceCells(model);
  const current = state.cursor.current;
  if (current !== null && !visible.includes(current)) return rejected('tree-grid-cursor-hidden');
  if (state.editMode === 'editing' && current === null) {
    return rejected('tree-grid-edit-without-cursor');
  }
  if (
    state.selection.size > 1 ||
    state.selection.selected.length !== state.selection.size
  ) {
    return rejected('invalid-tree-grid-selection');
  }
  if (
    state.selection.selected.some((id) => !cells.includes(id) || !state.selection.has(id))
  ) {
    return rejected('tree-grid-selection-outside-grid');
  }
  if (state.selection.anchor !== null && !cells.includes(state.selection.anchor)) {
    return rejected('tree-grid-anchor-outside-grid');
  }
  if (!referenceEvent(event)) return rejected('invalid-tree-grid-event');
  const boundary = policies.boundary ?? 'stop';
  if (boundary !== 'stop' && boundary !== 'wrap-axis') {
    return rejected('invalid-tree-grid-boundary');
  }
  if (policies.eligible !== undefined && typeof policies.eligible !== 'function') {
    return rejected('invalid-eligibility-policy');
  }

  const normalized = sameExpansion(expansion, state.expansion)
    ? state
    : referenceState(expansion, current, state.selection, state.editMode);

  if (typeof event === 'object') {
    if (event.type === 'set-expanded') {
      if (!model.tree.has(event.id)) return rejected('tree-grid-row-outside-tree');
      const requested = event.open
        ? [...expansion.ids, event.id]
        : expansion.ids.filter((id) => id !== event.id);
      const nextExpansion = referenceExpansion(model, requested);
      const nextVisible = referenceVisibleCells(model, nextExpansion);
      const rowIndex = model.rowIndexOf(event.id);
      const target = current === null || nextVisible.includes(current)
        ? current
        : (rowIndex === null ? null : model.grid.row(rowIndex)?.at(0) ?? null);
      return accepted(
        referenceState(nextExpansion, target, state.selection, 'navigation'),
        target === null || target === current ? [] : [{ type: 'focus', id: target }],
      );
    }
    if (!visible.includes(event.id) || policies.eligible?.(event.id) === false) {
      return rejected('tree-grid-target-unavailable');
    }
    if (event.type === 'focus') {
      return accepted(referenceState(expansion, event.id, state.selection, 'navigation'), [
        { type: 'focus', id: event.id },
      ]);
    }
    const selection = referenceSelectOne(state.selection, event.id, referenceDomain(cells));
    if (event.type === 'select') {
      return accepted(referenceState(expansion, event.id, selection, 'navigation'), [
        { type: 'focus', id: event.id },
      ]);
    }
    return accepted(referenceState(expansion, event.id, selection, 'editing'), [
      { type: 'focus', id: event.id },
      { type: 'begin-edit', id: event.id },
    ]);
  }

  if (event === 'commit-edit' || event === 'cancel-edit') {
    if (state.editMode !== 'editing' || current === null) return rejected('tree-grid-not-editing');
    return accepted(
      referenceState(expansion, current, state.selection, 'navigation'),
      [{ type: event, id: current }],
    );
  }
  if (state.editMode === 'editing') {
    return event === 'start-edit' ? accepted(normalized) : rejected('tree-grid-edit-active');
  }
  if (event === 'start-edit') {
    if (current === null) return rejected('no-cursor');
    return accepted(
      referenceState(expansion, current, state.selection, 'editing'),
      [{ type: 'begin-edit', id: current }],
    );
  }
  if (event === 'select') {
    if (current === null) return rejected('no-cursor');
    const selection = referenceSelectOne(state.selection, current, referenceDomain(cells));
    return accepted(referenceState(expansion, current, selection, 'navigation'));
  }
  if (event === 'expand' || event === 'collapse') {
    if (current === null) return accepted(normalized);
    const row = model.rowOfCell(current);
    if (row === null || model.tree.isLeaf(row) !== false) return accepted(normalized);
    const requested = event === 'expand'
      ? [...expansion.ids, row]
      : expansion.ids.filter((id) => id !== row);
    return accepted(referenceState(
      referenceExpansion(model, requested),
      current,
      state.selection,
      'navigation',
    ));
  }

  const eligible = policies.eligible ?? (() => true);
  let movement: ReferenceMovement<CellID>;
  if (current === null) {
    movement = referenceInitialMovement(
      visible,
      event === 'right' || event === 'down' ? 1 : -1,
      eligible,
      policies.maxScan,
    );
  } else {
    movement = referenceGridMovement(
      model,
      current,
      event,
      boundary,
      (id) => visible.includes(id) && eligible(id),
      policies.maxScan,
    );
  }
  if (!movement.ok) return movement;
  if (movement.id === null) return accepted(normalized);
  return accepted(
    referenceState(expansion, movement.id, state.selection, 'navigation'),
    [{ type: 'focus', id: movement.id }],
  );
}

type ReferenceMovement<ID extends StableID> =
  | { readonly ok: true; readonly id: ID | null }
  | ReferenceTreeGridRejection;

function referenceInitialMovement<ID extends StableID>(
  ids: readonly ID[],
  direction: -1 | 1,
  eligible: (id: ID) => boolean,
  maxScan: number | undefined,
): ReferenceMovement<ID> {
  const ceiling = referenceScanCeiling(maxScan);
  if (ceiling === null) return rejected('invalid-scan-ceiling', 'resource-rejection');
  let scanned = 0;
  let index = direction > 0 ? 0 : ids.length - 1;
  while (index >= 0 && index < ids.length) {
    if (scanned === ceiling) return rejected('scan-ceiling-reached', 'resource-rejection');
    const id = ids[index];
    scanned += 1;
    if (id !== undefined && eligible(id)) return { ok: true, id };
    index += direction;
  }
  return { ok: true, id: null };
}

function referenceGridMovement<RowID extends StableID, CellID extends StableID>(
  model: TreeGridModel<RowID, CellID>,
  current: CellID,
  direction: GridDirection,
  boundary: AxisBoundaryPolicy,
  eligible: (id: CellID) => boolean,
  maxScan: number | undefined,
): ReferenceMovement<CellID> {
  const ceiling = referenceScanCeiling(maxScan);
  if (ceiling === null) return rejected('invalid-scan-ceiling', 'resource-rejection');
  const position = model.grid.positionOf(current);
  if (position === null) return { ok: true, id: null };
  const horizontal = direction === 'left' || direction === 'right';
  const positive = direction === 'right' || direction === 'down';
  const currentAxis = horizontal ? position.column : position.row;
  const axisLength = horizontal ? model.grid.columnCount : model.grid.rowCount;
  const cellAt = (axis: number): CellID | null => horizontal
    ? model.grid.cellAt(position.row, axis)
    : model.grid.cellAt(axis, position.column);
  let axis = currentAxis + (positive ? 1 : -1);
  let scanned = 0;
  while (axis >= 0 && axis < axisLength) {
    if (scanned === ceiling) return rejected('scan-ceiling-reached', 'resource-rejection');
    const id = cellAt(axis);
    scanned += 1;
    if (id !== null && eligible(id)) return { ok: true, id };
    axis += positive ? 1 : -1;
  }
  if (boundary === 'wrap-axis') {
    axis = positive ? 0 : axisLength - 1;
    while (axis !== currentAxis) {
      if (scanned === ceiling) return rejected('scan-ceiling-reached', 'resource-rejection');
      const id = cellAt(axis);
      scanned += 1;
      if (id !== null && eligible(id)) return { ok: true, id };
      axis += positive ? 1 : -1;
    }
  }
  return { ok: true, id: null };
}

function referenceScanCeiling(value: number | undefined): number | null {
  if (value === undefined) return Number.MAX_SAFE_INTEGER;
  return Number.isSafeInteger(value) && value >= 0 ? value : null;
}

function referenceExpansion<RowID extends StableID, CellID extends StableID>(
  model: TreeGridModel<RowID, CellID>,
  requested: Iterable<RowID>,
): Expansion<RowID> {
  const requestedSet = new Set(requested);
  const ids = model.tree.preorder().ids.filter((id) => {
    const children = model.tree.childrenOf(id);
    return requestedSet.has(id) && children !== null && children.size > 0;
  });
  return Object.freeze({
    ids: Object.freeze(ids),
    size: ids.length,
    has: (id: RowID) => ids.includes(id),
  });
}

function referenceVisibleCells<RowID extends StableID, CellID extends StableID>(
  model: TreeGridModel<RowID, CellID>,
  expansion: Expansion<RowID>,
): readonly CellID[] {
  const visibleRows = model.tree.preorder().ids.filter((id) => {
    const ancestors = model.tree.ancestorsOf(id);
    return ancestors !== null && ancestors.every((ancestor) => expansion.has(ancestor));
  });
  const result: CellID[] = [];
  for (let row = 0; row < model.grid.rowCount; row += 1) {
    const rowID = model.rowIDs[row];
    if (rowID === undefined || !visibleRows.includes(rowID)) continue;
    for (let column = 0; column < model.grid.columnCount; column += 1) {
      const id = model.grid.cellAt(row, column);
      if (id !== null) result.push(id);
    }
  }
  return result;
}

function referenceCells<RowID extends StableID, CellID extends StableID>(
  model: TreeGridModel<RowID, CellID>,
): readonly CellID[] {
  const result: CellID[] = [];
  for (let row = 0; row < model.grid.rowCount; row += 1) {
    for (let column = 0; column < model.grid.columnCount; column += 1) {
      const id = model.grid.cellAt(row, column);
      if (id !== null) result.push(id);
    }
  }
  return result;
}

function referenceDomain<ID extends StableID>(ids: readonly ID[]) {
  return {
    size: ids.length,
    at: (index: number) => ids[index] ?? null,
    contains: (id: ID) => ids.includes(id),
    indexOf: (id: ID) => {
      const index = ids.indexOf(id);
      return index < 0 ? null : index;
    },
  };
}

function referenceState<RowID extends StableID, CellID extends StableID>(
  expansion: Expansion<RowID>,
  current: CellID | null,
  selection: TreeGridState<RowID, CellID>['selection'],
  editMode: TreeGridEditMode,
): TreeGridState<RowID, CellID> {
  return Object.freeze({
    expansion,
    cursor: Object.freeze({ current }),
    selection,
    editMode,
  });
}

function accepted<RowID extends StableID, CellID extends StableID>(
  state: TreeGridState<RowID, CellID>,
  commands: readonly TreeGridCommand<CellID>[] = [],
): ReferenceTreeGridResult<RowID, CellID> {
  return {
    ok: true,
    value: Object.freeze({
      state,
      commands: Object.freeze(commands.map((command) => Object.freeze({ ...command }))),
    }),
  };
}

function rejected(
  errorCode: string,
  errorClass: ReferenceTreeGridRejection['errorClass'] = 'transition-rejection',
): ReferenceTreeGridRejection {
  return { ok: false, errorClass, errorCode };
}

function sameExpansion<ID extends StableID>(left: Expansion<ID>, right: Expansion<ID>): boolean {
  return left.ids.length === right.ids.length && left.ids.every((id, index) => id === right.ids[index]);
}

function referenceEditMode(value: string): value is TreeGridEditMode {
  return value === 'navigation' || value === 'editing';
}

function referenceEvent<RowID extends StableID, CellID extends StableID>(
  value: unknown,
): value is TreeGridEvent<RowID, CellID> {
  if (typeof value === 'string') return [
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
  return typeof value === 'object' && value !== null
    && 'type' in value && 'id' in value && typeof value.id === 'string'
    && (value.type === 'focus' || value.type === 'select' || value.type === 'start-edit'
      || (value.type === 'set-expanded' && 'open' in value && typeof value.open === 'boolean'));
}
