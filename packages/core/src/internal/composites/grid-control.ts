import { unwrap } from '../../result.js';
import type { AxisBoundaryPolicy, GridDirection, Result, StableID } from '../../shared.js';
import type { Grid } from '../../structures/grid.js';
import type { Sequence } from '../../structures/sequence.js';
import { bindCanonicalState, fail, hasCanonicalState, memoizeWeak, ok } from '../kernel/foundation.js';
import { findEligibleFromEdge, IndexedSequence } from '../kernel/indexed-sequence.js';
import { createMachineUpdate } from '../kernel/machine.js';
import { createCursorState, type CursorState } from '../state/cursor.js';
import { createSelectionState, selectOne, type SelectionState } from '../state/selection.js';

export type GridEditMode = 'navigation' | 'editing';
export type GridEvent<ID extends StableID = StableID> = GridDirection | 'select' | 'start-edit' | 'commit-edit' | 'cancel-edit' | { readonly type: 'focus' | 'select' | 'start-edit'; readonly id: ID };
export type GridCommand<ID extends StableID = StableID> = { readonly type: 'focus' | 'begin-edit' | 'commit-edit' | 'cancel-edit'; readonly id: ID };
export interface GridState<ID extends StableID = StableID> { readonly cursor: CursorState<ID>; readonly selection: SelectionState<ID>; readonly editMode: GridEditMode }
export interface GridStateInput<ID extends StableID = StableID> { readonly current?: ID | null; readonly selected?: readonly ID[]; readonly anchor?: ID | null; readonly editMode?: GridEditMode }
export interface GridPolicies<ID extends StableID = StableID> { readonly eligible?: (id: ID) => boolean; readonly boundary?: AxisBoundaryPolicy; readonly maxScan?: number }
export interface GridUpdate<ID extends StableID = StableID> { readonly state: GridState<ID>; readonly commands: readonly GridCommand<ID>[] }

const gridDomains = new WeakMap<object, Sequence<StableID>>();

export function createGridState<ID extends StableID>(grid: Grid<ID>, input: GridStateInput<ID> = {}): GridState<ID> {
  return unwrap(tryCreateGridState(grid, input));
}

export function tryCreateGridState<ID extends StableID>(grid: Grid<ID>, input: GridStateInput<ID> = {}): Result<GridState<ID>> {
  const domain = gridCells(grid);
  const current = input.current ?? null;
  if (current !== null && !domain.contains(current)) return fail('construction', 'grid-cursor-outside-grid', 'Grid cursor must identify a cell.');
  const selection = createSelectionState(domain, 'single', input);
  if (!selection.ok) return selection;
  const editMode = input.editMode ?? 'navigation';
  if (editMode !== 'navigation' && editMode !== 'editing') return fail('construction', 'invalid-grid-edit-mode', 'Grid edit mode must be navigation or editing.');
  if (editMode === 'editing' && current === null) return fail('construction', 'grid-edit-without-cursor', 'Grid editing requires a cursor.');
  return ok(gridState(grid, current, selection.value, editMode));
}

export function applyGridEvent<ID extends StableID>(grid: Grid<ID>, state: GridState<ID>, event: GridEvent<ID>, policies: GridPolicies<ID> = {}): Result<GridUpdate<ID>> {
  if (!hasCanonicalState(grid, state)) {
    const validation = tryCreateGridState(grid, { current: state.cursor.current, selected: state.selection.selected, anchor: state.selection.anchor, editMode: state.editMode });
    if (!validation.ok) return { ok: false, error: { ...validation.error, class: 'transition-rejection' } };
  }
  const boundary = policies.boundary ?? 'stop';
  if (boundary !== 'stop' && boundary !== 'wrap-axis') return fail('transition-rejection', 'invalid-grid-boundary', 'Grid boundary must be stop or wrap-axis.');
  const domain = gridCells(grid);
  if (typeof event === 'object') {
    if (!domain.contains(event.id) || policies.eligible?.(event.id) === false) return fail('transition-rejection', 'grid-target-unavailable', 'Direct grid events require an eligible cell.');
    if (event.type === 'focus') return createMachineUpdate(gridState(grid, event.id, state.selection, 'navigation'), [{ type: 'focus', id: event.id }]);
    const selection = selectOne(state.selection, event.id, domain);
    if (event.type === 'select') return createMachineUpdate(gridState(grid, event.id, selection, 'navigation'), [{ type: 'focus', id: event.id }]);
    return createMachineUpdate(gridState(grid, event.id, selection, 'editing'), [{ type: 'focus', id: event.id }, { type: 'begin-edit', id: event.id }]);
  }
  const current = state.cursor.current;
  if (event === 'commit-edit' || event === 'cancel-edit') {
    if (state.editMode !== 'editing' || current === null) return fail('transition-rejection', 'grid-not-editing', 'Grid can only finish an active edit.');
    return createMachineUpdate(gridState(grid, current, state.selection, 'navigation'), [{ type: event, id: current }]);
  }
  if (state.editMode === 'editing') return event === 'start-edit' ? createMachineUpdate(state) : fail('transition-rejection', 'grid-edit-active', 'Grid navigation is suspended during editing.');
  if (event === 'start-edit') {
    if (current === null) return fail('transition-rejection', 'no-cursor', 'Grid editing requires a cursor.');
    return createMachineUpdate(gridState(grid, current, state.selection, 'editing'), [{ type: 'begin-edit', id: current }]);
  }
  if (event === 'select') {
    if (current === null) return fail('transition-rejection', 'no-cursor', 'Grid selection requires a cursor.');
    return createMachineUpdate(gridState(grid, current, selectOne(state.selection, current, domain), 'navigation'));
  }
  const eligible = policies.eligible ?? (() => true);
  let target: ID | null = null;
  if (current === null) {
    const initial = findEligibleFromEdge(domain, event === 'right' || event === 'down' ? 1 : -1, { eligible, ...(policies.maxScan === undefined ? {} : { maxScan: policies.maxScan }) });
    if (!initial.ok) return initial;
    target = initial.value;
  } else {
    const movement = grid.move(current, event, boundary, { eligible, ...(policies.maxScan === undefined ? {} : { maxScan: policies.maxScan }) });
    if (movement.kind === 'resource-rejected') return { ok: false, error: movement.error };
    target = movement.kind === 'found' ? movement.id : null;
  }
  return target === null ? createMachineUpdate(state) : createMachineUpdate(gridState(grid, target, state.selection, 'navigation'), [{ type: 'focus', id: target }]);
}

function gridCells<ID extends StableID>(grid: Grid<ID>): Sequence<ID> {
  return memoizeWeak(gridDomains, grid, createGridCells) as Sequence<ID>;
}

function createGridCells(owner: object): Sequence<StableID> {
  const grid = owner as Grid<StableID>;
  const ids: StableID[] = [];
  for (let row = 0; row < grid.rowCount; row += 1) for (let column = 0; column < grid.columnCount; column += 1) { const id = grid.cellAt(row, column); if (id !== null) ids.push(id); }
  return new IndexedSequence(ids) as Sequence<StableID>;
}

function gridState<ID extends StableID>(grid: Grid<ID>, current: ID | null, selection: SelectionState<ID>, editMode: GridEditMode): GridState<ID> {
  return bindCanonicalState(grid, Object.freeze({ cursor: createCursorState(current), selection, editMode }));
}
