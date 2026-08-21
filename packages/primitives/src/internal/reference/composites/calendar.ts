import type { AxisBoundaryPolicy, GridDirection, StableID } from '../../../shared.js';
import type { Grid } from '../../../structures/grid.js';
import type {
  CalendarCommand,
  CalendarEvent,
  CalendarPolicies,
  CalendarState,
  CalendarStateInput,
  CalendarUpdate,
} from '../../composites/calendar.js';
import { ReferenceSelectionState, referenceSelectOne } from '../state/selection.js';

interface ReferenceCalendarRejection {
  readonly ok: false;
  readonly errorClass: 'transition-rejection' | 'resource-rejection';
  readonly errorCode: string;
}

export type ReferenceCalendarResult<ID extends StableID> =
  | { readonly ok: true; readonly value: CalendarUpdate<ID> }
  | ReferenceCalendarRejection;

export function createReferenceCalendarState<ID extends StableID>(
  grid: Grid<ID>,
  input: CalendarStateInput<ID> = {},
): CalendarState<ID> {
  const ids = referenceIDs(grid);
  const current = input.current ?? null;
  if (current !== null && !ids.includes(current)) throw new TypeError('reference cursor outside grid');
  const selected = [...new Set(input.selected ?? [])];
  if (selected.length > 1 || selected.some((id) => !ids.includes(id))) {
    throw new TypeError('reference selection outside grid');
  }
  const anchor = input.anchor ?? null;
  if (anchor !== null && !ids.includes(anchor)) throw new TypeError('reference anchor outside grid');
  return referenceState(current, new ReferenceSelectionState(selected, anchor));
}

export function applyReferenceCalendarEvent<ID extends StableID>(
  grid: Grid<ID>,
  state: CalendarState<ID>,
  event: CalendarEvent,
  policies: CalendarPolicies<ID> = {},
): ReferenceCalendarResult<ID> {
  const ids = referenceIDs(grid);
  const current = state.cursor.current;
  if (current !== null && !ids.includes(current)) return rejected('transition-rejection', 'calendar-cursor-outside-grid');
  if (!referenceEvent(event)) return rejected('transition-rejection', 'invalid-calendar-event');
  const boundary = policies.boundary ?? 'stop';
  if (boundary !== 'stop' && boundary !== 'wrap-axis') {
    return rejected('transition-rejection', 'invalid-calendar-boundary');
  }
  if (policies.eligible !== undefined && typeof policies.eligible !== 'function') {
    return rejected('transition-rejection', 'invalid-eligibility-policy');
  }
  if (event === 'previous-page' || event === 'next-page') {
    return accepted(state, [{
      type: 'request-page',
      direction: event === 'previous-page' ? -1 : 1,
      from: current,
    }]);
  }
  if (event === 'select') {
    if (current === null) return rejected('transition-rejection', 'no-cursor');
    const domain = referenceDomain(ids);
    return accepted(referenceState(current, referenceSelectOne(state.selection, current, domain)));
  }
  const eligible = policies.eligible ?? (() => true);
  const target = current === null
    ? initialTarget(ids, event, eligible, policies.maxScan)
    : movementTarget(grid, current, event, boundary, eligible, policies.maxScan);
  if (!target.ok) return target;
  if (target.id === null) return accepted(state);
  return accepted(referenceState(target.id, state.selection), [{ type: 'focus', id: target.id }]);
}

type Target<ID extends StableID> =
  | { readonly ok: true; readonly id: ID | null }
  | ReferenceCalendarRejection;

function initialTarget<ID extends StableID>(
  ids: readonly ID[],
  event: GridDirection,
  eligible: (id: ID) => boolean,
  requestedMaxScan: number | undefined,
): Target<ID> {
  const maxScan = referenceMaxScan(requestedMaxScan);
  if (maxScan === null) return rejected('resource-rejection', 'invalid-scan-ceiling');
  const candidates = event === 'right' || event === 'down' ? ids : [...ids].reverse();
  let scanned = 0;
  for (const id of candidates) {
    if (scanned === maxScan) return rejected('resource-rejection', 'scan-ceiling-reached');
    scanned += 1;
    if (eligible(id)) return { ok: true, id };
  }
  return { ok: true, id: null };
}

function movementTarget<ID extends StableID>(
  grid: Grid<ID>,
  current: ID,
  event: GridDirection,
  boundary: AxisBoundaryPolicy,
  eligible: (id: ID) => boolean,
  requestedMaxScan: number | undefined,
): Target<ID> {
  const maxScan = referenceMaxScan(requestedMaxScan);
  if (maxScan === null) return rejected('resource-rejection', 'invalid-scan-ceiling');
  const position = grid.positionOf(current);
  if (position === null) return { ok: true, id: null };
  const horizontal = event === 'left' || event === 'right';
  const positive = event === 'right' || event === 'down';
  const currentAxis = horizontal ? position.column : position.row;
  const axisLength = horizontal ? grid.columnCount : grid.rowCount;
  const at = (axis: number) => horizontal
    ? grid.cellAt(position.row, axis)
    : grid.cellAt(axis, position.column);
  const candidates: number[] = [];
  for (
    let axis = currentAxis + (positive ? 1 : -1);
    axis >= 0 && axis < axisLength;
    axis += positive ? 1 : -1
  ) candidates.push(axis);
  if (boundary === 'wrap-axis') {
    for (
      let axis = positive ? 0 : axisLength - 1;
      axis !== currentAxis;
      axis += positive ? 1 : -1
    ) candidates.push(axis);
  }
  let scanned = 0;
  for (const axis of candidates) {
    if (scanned === maxScan) return rejected('resource-rejection', 'scan-ceiling-reached');
    const id = at(axis);
    scanned += 1;
    if (id !== null && eligible(id)) return { ok: true, id };
  }
  return { ok: true, id: null };
}

function referenceIDs<ID extends StableID>(grid: Grid<ID>): readonly ID[] {
  const result: ID[] = [];
  for (let row = 0; row < grid.rowCount; row += 1) {
    for (let column = 0; column < grid.columnCount; column += 1) {
      const id = grid.cellAt(row, column);
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

function referenceMaxScan(value: number | undefined): number | null {
  return value === undefined
    ? Number.MAX_SAFE_INTEGER
    : Number.isSafeInteger(value) && value >= 0 ? value : null;
}

function referenceState<ID extends StableID>(
  current: ID | null,
  selection: CalendarState<ID>['selection'],
): CalendarState<ID> {
  return Object.freeze({ cursor: Object.freeze({ current }), selection });
}

function accepted<ID extends StableID>(
  state: CalendarState<ID>,
  commands: readonly CalendarCommand<ID>[] = [],
): ReferenceCalendarResult<ID> {
  return { ok: true, value: Object.freeze({ state, commands: Object.freeze(commands.map((command) => Object.freeze({ ...command }))) }) };
}

function rejected(
  errorClass: 'transition-rejection' | 'resource-rejection',
  errorCode: string,
): ReferenceCalendarRejection {
  return { ok: false, errorClass, errorCode };
}

function referenceEvent(value: string): value is CalendarEvent {
  return ['left', 'right', 'up', 'down', 'select', 'previous-page', 'next-page'].includes(value);
}
