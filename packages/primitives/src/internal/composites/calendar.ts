import type {
  AxisBoundaryPolicy,
  GridDirection,
  Result,
  SectileError,
  StableID,
} from '../../shared.js';
import type { Grid } from '../../structures/grid.js';
import type { Sequence } from '../../structures/sequence.js';
import { IndexedSequence } from '../kernel/indexed-sequence.js';
import { fail, freezeArray, normalizeMaxScan, ok, resourceError } from '../kernel/foundation.js';
import { createCursorState, type CursorState } from '../state/cursor.js';
import {
  createSelectionState,
  selectOne,
  type SelectionSnapshotInput,
  type SelectionState,
} from '../state/selection.js';

export type CalendarEvent = GridDirection | 'select' | 'previous-page' | 'next-page';

export type CalendarCommand<ID extends StableID = StableID> =
  | { readonly type: 'focus'; readonly id: ID }
  | { readonly type: 'request-page'; readonly direction: -1 | 1; readonly from: ID | null };

export interface CalendarState<ID extends StableID = StableID> {
  readonly cursor: CursorState<ID>;
  readonly selection: SelectionState<ID>;
}

export interface CalendarStateInput<ID extends StableID = StableID>
  extends SelectionSnapshotInput<ID> {
  readonly current?: ID | null;
}

export interface CalendarPolicies<ID extends StableID = StableID> {
  readonly eligible?: (id: ID) => boolean;
  readonly boundary?: AxisBoundaryPolicy;
  readonly maxScan?: number;
}

export interface CalendarTransition<ID extends StableID = StableID> {
  readonly state: CalendarState<ID>;
  readonly commands: readonly CalendarCommand<ID>[];
}

export function createCalendarState<ID extends StableID>(
  grid: Grid<ID>,
  input: CalendarStateInput<ID> = {},
): Result<CalendarState<ID>> {
  const domain = calendarDomain(grid);
  const current = input.current ?? null;
  if (current !== null && !domain.contains(current)) {
    return fail(
      'construction',
      'calendar-cursor-outside-grid',
      'Calendar cursor must exist in the current grid view.',
      { current },
    );
  }
  const selection = createSelectionState(domain, 'single', input);
  if (!selection.ok) return selection;
  return ok(calendarState(createCursorState(current), selection.value));
}

export function stepCalendar<ID extends StableID>(
  grid: Grid<ID>,
  state: CalendarState<ID>,
  event: CalendarEvent,
  policies: CalendarPolicies<ID> = {},
): Result<CalendarTransition<ID>> {
  const domain = calendarDomain(grid);
  const stateError = validateCalendarState(domain, state);
  if (stateError !== null) return { ok: false, error: stateError };
  if (!isCalendarEvent(event)) {
    return fail(
      'transition-rejection',
      'invalid-calendar-event',
      'Calendar event must be directional, select, previous-page, or next-page.',
      { event },
    );
  }
  const boundary = policies.boundary ?? 'stop';
  if (boundary !== 'stop' && boundary !== 'wrap-axis') {
    return fail(
      'transition-rejection',
      'invalid-calendar-boundary',
      'Calendar boundary must be stop or wrap-axis.',
      { boundary },
    );
  }
  if (policies.eligible !== undefined && typeof policies.eligible !== 'function') {
    return fail(
      'transition-rejection',
      'invalid-eligibility-policy',
      'Calendar eligibility policy must be a function.',
    );
  }

  if (event === 'previous-page' || event === 'next-page') {
    return accepted(state, [{
      type: 'request-page',
      direction: event === 'previous-page' ? -1 : 1,
      from: state.cursor.current,
    }]);
  }
  if (event === 'select') {
    const current = state.cursor.current;
    if (current === null) {
      return fail('transition-rejection', 'no-cursor', 'Calendar selection requires a cursor.');
    }
    const selection = selectOne(state.selection, current, domain);
    return accepted(
      selection === state.selection ? state : calendarState(state.cursor, selection),
    );
  }

  const eligible = policies.eligible ?? (() => true);
  const current = state.cursor.current;
  let target: ID | null;
  if (current === null) {
    const initial = initialEligible(
      domain,
      event === 'right' || event === 'down' ? 1 : -1,
      eligible,
      policies.maxScan,
    );
    if (!initial.ok) return initial;
    target = initial.value;
  } else {
    const movement = grid.move(current, event, boundary, {
      eligible,
      ...(policies.maxScan === undefined ? {} : { maxScan: policies.maxScan }),
    });
    if (movement.kind === 'resource-rejected') return { ok: false, error: movement.error };
    target = movement.kind === 'found' ? movement.id : null;
  }
  if (target === null) return accepted(state);
  return accepted(
    calendarState(createCursorState(target), state.selection),
    [{ type: 'focus', id: target }],
  );
}

function calendarDomain<ID extends StableID>(grid: Grid<ID>): Sequence<ID> {
  const ids: ID[] = [];
  for (let row = 0; row < grid.rowCount; row += 1) {
    for (let column = 0; column < grid.columnCount; column += 1) {
      const id = grid.cellAt(row, column);
      if (id !== null) ids.push(id);
    }
  }
  return new IndexedSequence(ids) as Sequence<ID>;
}

function initialEligible<ID extends StableID>(
  domain: Sequence<ID>,
  direction: -1 | 1,
  eligible: (id: ID) => boolean,
  requestedMaxScan: number | undefined,
): Result<ID | null> {
  const maxScan = normalizeMaxScan(requestedMaxScan);
  if (typeof maxScan !== 'number') return { ok: false, error: maxScan };
  let scanned = 0;
  let index = direction > 0 ? 0 : domain.size - 1;
  while (index >= 0 && index < domain.size) {
    if (scanned === maxScan) {
      return {
        ok: false,
        error: resourceError(
          'scan-ceiling-reached',
          'Calendar movement reached maxScan before its semantic result was determined.',
          { maxScan },
        ),
      };
    }
    const id = domain.at(index);
    scanned += 1;
    if (id !== null && eligible(id)) return ok(id);
    index += direction;
  }
  return ok(null);
}

function validateCalendarState<ID extends StableID>(
  domain: Sequence<ID>,
  state: CalendarState<ID>,
): SectileError | null {
  if (state.cursor.current !== null && !domain.contains(state.cursor.current)) {
    return {
      class: 'transition-rejection',
      code: 'calendar-cursor-outside-grid',
      message: 'Calendar cursor must exist in the current grid view.',
      details: { current: state.cursor.current },
    };
  }
  if (state.selection.size > 1 || state.selection.selected.length !== state.selection.size) {
    return {
      class: 'transition-rejection',
      code: 'invalid-calendar-selection',
      message: 'Calendar selection must contain at most one identity.',
    };
  }
  for (const id of state.selection.selected) {
    if (!domain.contains(id) || !state.selection.has(id)) {
      return {
        class: 'transition-rejection',
        code: 'calendar-selection-outside-grid',
        message: 'Calendar selection must agree with the current grid view.',
        details: { id },
      };
    }
  }
  if (state.selection.anchor !== null && !domain.contains(state.selection.anchor)) {
    return {
      class: 'transition-rejection',
      code: 'calendar-anchor-outside-grid',
      message: 'Calendar selection anchor must exist in the current grid view.',
      details: { anchor: state.selection.anchor },
    };
  }
  return null;
}

function calendarState<ID extends StableID>(
  cursor: CursorState<ID>,
  selection: SelectionState<ID>,
): CalendarState<ID> {
  return Object.freeze({ cursor, selection });
}

function accepted<ID extends StableID>(
  state: CalendarState<ID>,
  commands: readonly CalendarCommand<ID>[] = [],
): Result<CalendarTransition<ID>> {
  return ok(Object.freeze({
    state,
    commands: freezeArray(commands.map((command) => Object.freeze({ ...command }))),
  }));
}

function isCalendarEvent(value: string): value is CalendarEvent {
  return (
    value === 'left' ||
    value === 'right' ||
    value === 'up' ||
    value === 'down' ||
    value === 'select' ||
    value === 'previous-page' ||
    value === 'next-page'
  );
}
