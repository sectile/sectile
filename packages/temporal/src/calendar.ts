import { unwrap } from '@sectile/core/result';
import type { TemporalResult } from './error.js';
import { fail, freezeArray, ok } from './internal/foundation.js';
import { createMachineUpdate } from './internal/machine.js';
import {
  addDateDays,
  addDateMonths,
  addDateYears,
  compareDateValues,
  dateDayOfWeek,
  formatDateValue,
  type DateValue,
  tryCreateDateValue,
} from './date-field.js';

export interface CalendarView {
  readonly year: number;
  readonly month: number;
}

export type CalendarViewMode = 'week' | 'month' | 'year';

export interface CalendarMonthValue {
  readonly year: number;
  readonly month: number;
}

export interface CalendarState {
  readonly value: DateValue | null;
  readonly highlighted: DateValue;
  readonly view: CalendarView;
  readonly viewMode: CalendarViewMode;
}

export type CalendarEvent =
  | 'previous-month'
  | 'next-month'
  | 'previous-year'
  | 'next-year'
  | 'previous-day'
  | 'next-day'
  | 'previous-week'
  | 'next-week'
  | 'start-of-week'
  | 'end-of-week'
  | 'select-highlighted'
  | { readonly type: 'set-view-mode'; readonly value: CalendarViewMode }
  | { readonly type: 'select-month'; readonly value: CalendarMonthValue }
  | { readonly type: 'select'; readonly value: DateValue }
  | { readonly type: 'set-value'; readonly value: DateValue | null };

export type CalendarCommand =
  | { readonly type: 'value-committed'; readonly value: DateValue | null }
  | { readonly type: 'highlight-changed'; readonly value: DateValue }
  | { readonly type: 'view-mode-changed'; readonly value: CalendarViewMode };

export interface CalendarPolicies {
  readonly min?: DateValue;
  readonly max?: DateValue;
  readonly required?: boolean;
  readonly unavailable?: (value: DateValue) => boolean;
  readonly weekStartsOn?: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  readonly maxScan?: number;
}

export type CalendarUnavailablePredicate = NonNullable<CalendarPolicies['unavailable']>;

export interface CalendarUpdate {
  readonly state: CalendarState;
  readonly commands: readonly CalendarCommand[];
}

export interface CalendarStateInput {
  readonly value?: DateValue | null;
  readonly highlighted?: DateValue;
  readonly view?: CalendarView;
  readonly viewMode?: CalendarViewMode;
}

export function createCalendarState(input: CalendarStateInput = {}): CalendarState {
  return unwrap(tryCreateCalendarState(input));
}

export function tryCreateCalendarState(input: CalendarStateInput = {}): TemporalResult<CalendarState> {
  const value = input.value ?? null;
  if (value !== null) {
    const valid = tryCreateDateValue(value.year, value.month, value.day);
    if (!valid.ok) return valid;
  }
  const fallback = value ?? Object.freeze({ year: 1970, month: 1, day: 1 });
  const highlighted = input.highlighted ?? fallback;
  const validHighlight = tryCreateDateValue(highlighted.year, highlighted.month, highlighted.day);
  if (!validHighlight.ok) return validHighlight;
  const view = input.view ?? Object.freeze({ year: validHighlight.value.year, month: validHighlight.value.month });
  const validView = tryCreateDateValue(view.year, view.month, 1);
  if (!validView.ok) return validView;
  const viewMode = input.viewMode ?? 'month';
  if (!isCalendarViewMode(viewMode)) return fail('construction', 'invalid-calendar-view-mode', 'Calendar view mode must be week, month, or year.');
  return ok(calendarState(value, validHighlight.value, Object.freeze({ year: view.year, month: view.month }), viewMode));
}

export function applyCalendarEvent(state: CalendarState, event: CalendarEvent, policies: CalendarPolicies = {}): TemporalResult<CalendarUpdate> {
  const valid = tryCreateCalendarState(state);
  if (!valid.ok) return invalidTransition(valid);
  const policy = validateCalendarPolicies(policies);
  if (!policy.ok) return policy;
  if (typeof event === 'object' && event.type === 'set-view-mode') {
    if (!isCalendarViewMode(event.value)) return fail('transition-rejection', 'invalid-calendar-view-mode', 'Calendar view mode must be week, month, or year.');
    if (event.value === state.viewMode) return createMachineUpdate(state);
    return createMachineUpdate(calendarState(state.value, state.highlighted, state.view, event.value), [{ type: 'view-mode-changed', value: event.value }]);
  }
  if (typeof event === 'object' && event.type === 'select-month') {
    const month = tryCreateDateValue(event.value.year, event.value.month, 1);
    if (!month.ok) return invalidTransition(month);
    const delta = (event.value.year - state.highlighted.year) * 12 + event.value.month - state.highlighted.month;
    const highlighted = addDateMonths(state.highlighted, delta);
    if (!highlighted.ok) return highlighted;
    const eligible = findEligibleInMonth(highlighted.value, event.value, policies);
    if (!eligible.ok) return eligible;
    if (eligible.value === null) return fail('transition-rejection', 'calendar-month-unavailable', 'Calendar month has no available date within maxScan.');
    const view = Object.freeze({ year: eligible.value.year, month: eligible.value.month });
    const commands: CalendarCommand[] = [];
    if (compareDateValues(eligible.value, state.highlighted) !== 0) commands.push({ type: 'highlight-changed', value: eligible.value });
    if (state.viewMode !== 'month') commands.push({ type: 'view-mode-changed', value: 'month' });
    return createMachineUpdate(calendarState(state.value, eligible.value, view, 'month'), commands);
  }
  if (typeof event === 'object' && event.type === 'set-value') return commit(event.value, state, policies);
  if (typeof event === 'object' && event.type === 'select') return commit(event.value, state, policies);
  if (event === 'select-highlighted') return commit(state.highlighted, state, policies);

  let moved: TemporalResult<DateValue>;
  if (event === 'previous-month' || event === 'next-month') moved = addDateMonths(state.highlighted, event === 'previous-month' ? -1 : 1);
  else if (event === 'previous-year' || event === 'next-year') moved = addDateYears(state.highlighted, event === 'previous-year' ? -1 : 1);
  else if (event === 'previous-day' || event === 'next-day') moved = addDateDays(state.highlighted, event === 'previous-day' ? -1 : 1);
  else if (event === 'previous-week' || event === 'next-week') moved = addDateDays(state.highlighted, event === 'previous-week' ? -7 : 7);
  else if (event === 'start-of-week' || event === 'end-of-week') {
    const start = policies.weekStartsOn ?? 1;
    const relative = (dateDayOfWeek(state.highlighted) - start + 7) % 7;
    moved = addDateDays(state.highlighted, event === 'start-of-week' ? -relative : 6 - relative);
  } else return fail('transition-rejection', 'unsupported-calendar-event', 'Calendar event is unsupported.');
  if (!moved.ok) return moved;
  const direction = compareDateValues(moved.value, state.highlighted) < 0 ? -1 : 1;
  const eligible = findEligible(moved.value, direction, policies);
  if (!eligible.ok) return eligible;
  if (eligible.value === null || compareDateValues(eligible.value, state.highlighted) === 0) return createMachineUpdate(state);
  const view = Object.freeze({ year: eligible.value.year, month: eligible.value.month });
  return createMachineUpdate(calendarState(state.value, eligible.value, view, state.viewMode), [{ type: 'highlight-changed', value: eligible.value }]);
}

export function createCalendarWeek(value: DateValue, weekStartsOn: 1 | 2 | 3 | 4 | 5 | 6 | 7 = 1): readonly DateValue[] {
  return unwrap(tryCreateCalendarWeek(value, weekStartsOn));
}

export function tryCreateCalendarWeek(value: DateValue, weekStartsOn: 1 | 2 | 3 | 4 | 5 | 6 | 7 = 1): TemporalResult<readonly DateValue[]> {
  const valid = tryCreateDateValue(value.year, value.month, value.day);
  if (!valid.ok) return valid;
  if (!Number.isSafeInteger(weekStartsOn) || weekStartsOn < 1 || weekStartsOn > 7) return fail('construction', 'invalid-week-start', 'Week start must be an ISO weekday from 1 through 7.');
  const offset = (dateDayOfWeek(valid.value) - weekStartsOn + 7) % 7;
  const start = addDateDays(valid.value, -offset);
  if (!start.ok) return start;
  const days: DateValue[] = [];
  for (let index = 0; index < 7; index += 1) {
    const day = addDateDays(start.value, index);
    if (!day.ok) return day;
    days.push(day.value);
  }
  return ok(freezeArray(days));
}

export function createCalendarMonth(view: CalendarView, weekStartsOn: 1 | 2 | 3 | 4 | 5 | 6 | 7 = 1): readonly (readonly DateValue[])[] {
  return unwrap(tryCreateCalendarMonth(view, weekStartsOn));
}

export function tryCreateCalendarMonth(view: CalendarView, weekStartsOn: 1 | 2 | 3 | 4 | 5 | 6 | 7 = 1): TemporalResult<readonly (readonly DateValue[])[]> {
  const first = tryCreateDateValue(view.year, view.month, 1);
  if (!first.ok) return first;
  if (!Number.isSafeInteger(weekStartsOn) || weekStartsOn < 1 || weekStartsOn > 7) return fail('construction', 'invalid-week-start', 'Week start must be an ISO weekday from 1 through 7.');
  const offset = (dateDayOfWeek(first.value) - weekStartsOn + 7) % 7;
  const start = addDateDays(first.value, -offset);
  if (!start.ok) return start;
  const rows: DateValue[][] = [];
  for (let row = 0; row < 6; row += 1) {
    const cells: DateValue[] = [];
    for (let column = 0; column < 7; column += 1) {
      const value = addDateDays(start.value, row * 7 + column);
      if (!value.ok) return value;
      cells.push(value.value);
    }
    rows.push(cells);
  }
  return ok(freezeArray(rows.map((row) => freezeArray(row))));
}

export function createCalendarYear(year: number): readonly (readonly CalendarMonthValue[])[] {
  return unwrap(tryCreateCalendarYear(year));
}

export function tryCreateCalendarYear(year: number): TemporalResult<readonly (readonly CalendarMonthValue[])[]> {
  const valid = tryCreateDateValue(year, 1, 1);
  if (!valid.ok) return valid;
  const rows: CalendarMonthValue[][] = [];
  for (let row = 0; row < 4; row += 1) {
    const months: CalendarMonthValue[] = [];
    for (let column = 0; column < 3; column += 1) months.push(Object.freeze({ year, month: row * 3 + column + 1 }));
    rows.push(months);
  }
  return ok(freezeArray(rows.map((row) => freezeArray(row))));
}

export function isCalendarValueAvailable(value: DateValue, policies: CalendarPolicies = {}): boolean {
  return !(policies.min !== undefined && compareDateValues(value, policies.min) < 0)
    && !(policies.max !== undefined && compareDateValues(value, policies.max) > 0)
    && policies.unavailable?.(value) !== true;
}

export function calendarID(value: DateValue): string { return formatDateValue(value); }

function commit(value: DateValue | null, state: CalendarState, policies: CalendarPolicies): TemporalResult<CalendarUpdate> {
  if (value === null) {
    if (policies.required === true) return fail('transition-rejection', 'calendar-value-required', 'Calendar requires a value.');
    return createMachineUpdate(calendarState(null, state.highlighted, state.view, state.viewMode), [{ type: 'value-committed', value: null }]);
  }
  const valid = tryCreateDateValue(value.year, value.month, value.day);
  if (!valid.ok) return invalidTransition(valid);
  if (!isCalendarValueAvailable(valid.value, policies)) return fail('transition-rejection', 'calendar-value-unavailable', 'Calendar value is outside its selectable domain.');
  const view = Object.freeze({ year: valid.value.year, month: valid.value.month });
  return createMachineUpdate(calendarState(valid.value, valid.value, view, state.viewMode), [
    { type: 'value-committed', value: valid.value },
    { type: 'highlight-changed', value: valid.value },
  ]);
}

function findEligible(start: DateValue, direction: -1 | 1, policies: CalendarPolicies): TemporalResult<DateValue | null> {
  const limit = policies.maxScan ?? 366;
  if (!Number.isSafeInteger(limit) || limit < 1) return fail('construction', 'invalid-calendar-max-scan', 'Calendar max scan must be a positive safe integer.');
  let candidate = start;
  for (let scanned = 0; scanned < limit; scanned += 1) {
    if (isCalendarValueAvailable(candidate, policies)) return ok(candidate);
    const next = addDateDays(candidate, direction);
    if (!next.ok) return ok(null);
    candidate = next.value;
  }
  return fail('resource-rejection', 'calendar-scan-exhausted', 'Calendar did not find an available date within maxScan.', { maxScan: limit });
}

function findEligibleInMonth(start: DateValue, month: CalendarMonthValue, policies: CalendarPolicies): TemporalResult<DateValue | null> {
  const limit = policies.maxScan ?? 366;
  if (!Number.isSafeInteger(limit) || limit < 1) return fail('construction', 'invalid-calendar-max-scan', 'Calendar max scan must be a positive safe integer.');
  let scanned = 0;
  for (const direction of [1, -1] as const) {
    let candidate = start;
    if (direction === -1) {
      const previous = addDateDays(candidate, -1);
      if (!previous.ok) continue;
      candidate = previous.value;
    }
    while (candidate.year === month.year && candidate.month === month.month) {
      if (scanned >= limit) return fail('resource-rejection', 'calendar-scan-exhausted', 'Calendar did not find an available date within maxScan.', { maxScan: limit });
      scanned += 1;
      if (isCalendarValueAvailable(candidate, policies)) return ok(candidate);
      const next = addDateDays(candidate, direction);
      if (!next.ok) break;
      candidate = next.value;
    }
  }
  return ok(null);
}

function validateCalendarPolicies(policies: CalendarPolicies): TemporalResult<true> {
  if (policies.unavailable !== undefined && typeof policies.unavailable !== 'function') return fail('construction', 'invalid-calendar-unavailable-policy', 'Calendar unavailable policy must be a function.');
  if (policies.min !== undefined) { const min = tryCreateDateValue(policies.min.year, policies.min.month, policies.min.day); if (!min.ok) return min; }
  if (policies.max !== undefined) { const max = tryCreateDateValue(policies.max.year, policies.max.month, policies.max.day); if (!max.ok) return max; }
  if (policies.min !== undefined && policies.max !== undefined && compareDateValues(policies.min, policies.max) > 0) return fail('construction', 'inverted-calendar-bounds', 'Calendar minimum must not follow its maximum.');
  return ok(true);
}

function calendarState(value: DateValue | null, highlighted: DateValue, view: CalendarView, viewMode: CalendarViewMode): CalendarState {
  return Object.freeze({ value, highlighted, view, viewMode });
}
function isCalendarViewMode(value: unknown): value is CalendarViewMode { return value === 'week' || value === 'month' || value === 'year'; }
function invalidTransition<T>(result: TemporalResult<T>): TemporalResult<never> { return result.ok ? fail('internal-invariant', 'unexpected-valid-result', 'Expected an invalid result.') : { ok: false, error: { ...result.error, class: 'transition-rejection' } }; }
