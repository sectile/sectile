import type { Grid } from '../../../structures/grid.js';
import type { StableID } from '../../../shared.js';
import type { GridCommand, GridEvent, GridPolicies, GridState, GridStateInput, GridUpdate } from '../../composites/grid-control.js';
import { ReferenceSelectionState, referenceSelectOne } from '../state/selection.js';

export type ReferenceGridResult<ID extends StableID> = { readonly ok: true; readonly value: GridUpdate<ID> } | { readonly ok: false; readonly errorClass: string; readonly errorCode: string };

export function createReferenceGridState<ID extends StableID>(grid: Grid<ID>, input: GridStateInput<ID> = {}): GridState<ID> {
  const cells = allCells(grid); const current = input.current ?? null;
  if (current !== null && !cells.includes(current)) throw new TypeError('reference cursor outside grid');
  const selected = [...new Set(input.selected ?? [])];
  if (selected.length > 1 || selected.some((id) => !cells.includes(id))) throw new TypeError('reference selection outside grid');
  const anchor = input.anchor ?? null; if (anchor !== null && !cells.includes(anchor)) throw new TypeError('reference anchor outside grid');
  const editMode = input.editMode ?? 'navigation'; if (editMode !== 'navigation' && editMode !== 'editing') throw new TypeError('reference edit mode');
  if (editMode === 'editing' && current === null) throw new TypeError('reference edit without cursor');
  return stateOf(current, new ReferenceSelectionState(selected, anchor), editMode);
}

export function applyReferenceGridEvent<ID extends StableID>(grid: Grid<ID>, state: GridState<ID>, event: GridEvent<ID>, policies: GridPolicies<ID> = {}): ReferenceGridResult<ID> {
  const cells = allCells(grid); const current = state.cursor.current; const boundary = policies.boundary ?? 'stop';
  if (current !== null && !cells.includes(current)) return rejected('grid-cursor-outside-grid');
  if (state.editMode === 'editing' && current === null) return rejected('grid-edit-without-cursor');
  if (boundary !== 'stop' && boundary !== 'wrap-axis') return rejected('invalid-grid-boundary');
  if (typeof event === 'object') {
    if (!cells.includes(event.id) || policies.eligible?.(event.id) === false) return rejected('grid-target-unavailable');
    if (event.type === 'focus') return accepted(stateOf(event.id, state.selection, 'navigation'), [{ type: 'focus', id: event.id }]);
    const selection = referenceSelectOne(state.selection, event.id, domain(cells));
    if (event.type === 'select') return accepted(stateOf(event.id, selection, 'navigation'), [{ type: 'focus', id: event.id }]);
    return accepted(stateOf(event.id, selection, 'editing'), [{ type: 'focus', id: event.id }, { type: 'begin-edit', id: event.id }]);
  }
  if (event === 'commit-edit' || event === 'cancel-edit') {
    if (state.editMode !== 'editing' || current === null) return rejected('grid-not-editing');
    return accepted(stateOf(current, state.selection, 'navigation'), [{ type: event, id: current }]);
  }
  if (state.editMode === 'editing') return event === 'start-edit' ? accepted(state) : rejected('grid-edit-active');
  if (event === 'start-edit') return current === null ? rejected('no-cursor') : accepted(stateOf(current, state.selection, 'editing'), [{ type: 'begin-edit', id: current }]);
  if (event === 'select') return current === null ? rejected('no-cursor') : accepted(stateOf(current, referenceSelectOne(state.selection, current, domain(cells)), 'navigation'));
  const eligible = policies.eligible ?? (() => true); let target: ID | null = null;
  if (current === null) {
    const ordered = event === 'right' || event === 'down' ? cells : [...cells].reverse();
    target = ordered.find(eligible) ?? null;
  } else {
    const position = grid.positionOf(current); if (position === null) return rejected('grid-cursor-outside-grid');
    const horizontal = event === 'left' || event === 'right'; const positive = event === 'right' || event === 'down';
    const length = horizontal ? grid.columnCount : grid.rowCount; const currentAxis = horizontal ? position.column : position.row; let axis = currentAxis + (positive ? 1 : -1);
    if ((axis < 0 || axis >= length) && boundary === 'wrap-axis') axis = positive ? 0 : length - 1;
    const seen = new Set<number>();
    while (axis >= 0 && axis < length && axis !== currentAxis && !seen.has(axis)) {
      seen.add(axis); const id = horizontal ? grid.cellAt(position.row, axis) : grid.cellAt(axis, position.column);
      if (id !== null && eligible(id)) { target = id; break; }
      axis += positive ? 1 : -1;
      if ((axis < 0 || axis >= length) && boundary === 'wrap-axis') axis = positive ? 0 : length - 1;
    }
  }
  return target === null ? accepted(state) : accepted(stateOf(target, state.selection, 'navigation'), [{ type: 'focus', id: target }]);
}

function allCells<ID extends StableID>(grid: Grid<ID>): ID[] { const ids: ID[] = []; for (let row = 0; row < grid.rowCount; row += 1) for (let column = 0; column < grid.columnCount; column += 1) { const id = grid.cellAt(row, column); if (id !== null) ids.push(id); } return ids; }
function domain<ID extends StableID>(ids: readonly ID[]) { return { size: ids.length, contains: (id: ID) => ids.includes(id), at: (index: number) => ids[index] ?? null, indexOf: (id: ID) => { const index = ids.indexOf(id); return index < 0 ? null : index; } }; }
function stateOf<ID extends StableID>(current: ID | null, selection: GridState<ID>['selection'], editMode: GridState<ID>['editMode']): GridState<ID> { return Object.freeze({ cursor: Object.freeze({ current }), selection, editMode }); }
function accepted<ID extends StableID>(state: GridState<ID>, commands: readonly GridCommand<ID>[] = []): ReferenceGridResult<ID> { return { ok: true, value: { state, commands } }; }
function rejected<ID extends StableID>(errorCode: string): ReferenceGridResult<ID> { return { ok: false, errorClass: 'transition-rejection', errorCode }; }
