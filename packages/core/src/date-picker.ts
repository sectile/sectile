import { unwrap } from './result.js';
import type { Result } from './shared.js';
import { fail, freezeArray, ok } from './internal/kernel/foundation.js';
import { createMachineUpdate } from './internal/kernel/machine.js';
import {
  addDateDays,
  addDateMonths,
  addDateYears,
  compareDateValues,
  createDateValue,
  dateDayOfWeek,
  formatDateValue,
  type DateValue,
  tryCreateDateValue,
} from './date-field.js';

export interface DatePickerView {
  readonly year: number;
  readonly month: number;
}

export type DatePickerViewMode = 'week' | 'month' | 'year';

export interface DatePickerMonthValue {
  readonly year: number;
  readonly month: number;
}

export interface DatePickerState {
  readonly value: DateValue | null;
  readonly highlighted: DateValue;
  readonly view: DatePickerView;
  readonly viewMode: DatePickerViewMode;
  readonly open: boolean;
}

export type DatePickerEvent =
  | 'open'
  | 'close'
  | 'toggle'
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
  | { readonly type: 'set-view-mode'; readonly value: DatePickerViewMode }
  | { readonly type: 'select-month'; readonly value: DatePickerMonthValue }
  | { readonly type: 'select'; readonly value: DateValue }
  | { readonly type: 'set-value'; readonly value: DateValue | null };

export type DatePickerCommand =
  | { readonly type: 'value-committed'; readonly value: DateValue | null }
  | { readonly type: 'highlight-changed'; readonly value: DateValue }
  | { readonly type: 'view-mode-changed'; readonly value: DatePickerViewMode }
  | { readonly type: 'open-changed'; readonly open: boolean };

export interface DatePickerPolicies {
  readonly min?: DateValue;
  readonly max?: DateValue;
  readonly required?: boolean;
  readonly unavailable?: (value: DateValue) => boolean;
  readonly weekStartsOn?: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  readonly maxScan?: number;
}

export type DatePickerUnavailablePredicate = NonNullable<DatePickerPolicies['unavailable']>;

export interface DatePickerUpdate {
  readonly state: DatePickerState;
  readonly commands: readonly DatePickerCommand[];
}

export interface DatePickerStateInput {
  readonly value?: DateValue | null;
  readonly highlighted?: DateValue;
  readonly view?: DatePickerView;
  readonly viewMode?: DatePickerViewMode;
  readonly open?: boolean;
}

export function createDatePickerState(input: DatePickerStateInput = {}): DatePickerState {
  return unwrap(tryCreateDatePickerState(input));
}

export function tryCreateDatePickerState(input: DatePickerStateInput = {}): Result<DatePickerState> {
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
  if (!isViewMode(viewMode)) return fail('construction', 'invalid-date-picker-view-mode', 'Date picker view mode must be week, month, or year.');
  if (typeof input.open !== 'undefined' && typeof input.open !== 'boolean') return fail('construction', 'invalid-date-picker-open', 'Date picker open state must be boolean.');
  return ok(pickerState(value, validHighlight.value, Object.freeze({ year: view.year, month: view.month }), viewMode, input.open ?? false));
}

export function applyDatePickerEvent(state: DatePickerState, event: DatePickerEvent, policies: DatePickerPolicies = {}): Result<DatePickerUpdate> {
  const valid = tryCreateDatePickerState(state);
  if (!valid.ok) return invalidTransition(valid);
  const policy = validatePolicies(policies);
  if (!policy.ok) return policy;
  if (event === 'open' || event === 'close' || event === 'toggle') {
    const open = event === 'toggle' ? !state.open : event === 'open';
    if (open === state.open) return createMachineUpdate(state);
    return createMachineUpdate(pickerState(state.value, state.highlighted, state.view, state.viewMode, open), [{ type: 'open-changed', open }]);
  }
  if (typeof event === 'object' && event.type === 'set-view-mode') {
    if (!isViewMode(event.value)) return fail('transition-rejection', 'invalid-date-picker-view-mode', 'Date picker view mode must be week, month, or year.');
    if (event.value === state.viewMode) return createMachineUpdate(state);
    return createMachineUpdate(pickerState(state.value, state.highlighted, state.view, event.value, state.open), [{ type: 'view-mode-changed', value: event.value }]);
  }
  if (typeof event === 'object' && event.type === 'select-month') {
    const month = tryCreateDateValue(event.value.year, event.value.month, 1);
    if (!month.ok) return invalidTransition(month);
    const delta = (event.value.year - state.highlighted.year) * 12 + event.value.month - state.highlighted.month;
    const highlighted = addDateMonths(state.highlighted, delta);
    if (!highlighted.ok) return highlighted;
    const eligible = findEligibleInMonth(highlighted.value, event.value, policies);
    if (!eligible.ok) return eligible;
    if (eligible.value === null) return fail('transition-rejection', 'date-picker-month-unavailable', 'Date picker month has no available date within maxScan.');
    const view = Object.freeze({ year: eligible.value.year, month: eligible.value.month });
    const commands: DatePickerCommand[] = [];
    if (compareDateValues(eligible.value, state.highlighted) !== 0) commands.push({ type: 'highlight-changed', value: eligible.value });
    if (state.viewMode !== 'month') commands.push({ type: 'view-mode-changed', value: 'month' });
    return createMachineUpdate(pickerState(state.value, eligible.value, view, 'month', state.open), commands);
  }
  if (typeof event === 'object' && event.type === 'set-value') return commit(event.value, state, policies, false);
  if (typeof event === 'object' && event.type === 'select') return commit(event.value, state, policies, true);
  if (event === 'select-highlighted') return commit(state.highlighted, state, policies, true);

  let moved: Result<DateValue>;
  if (event === 'previous-month' || event === 'next-month') moved = addDateMonths(state.highlighted, event === 'previous-month' ? -1 : 1);
  else if (event === 'previous-year' || event === 'next-year') moved = addDateYears(state.highlighted, event === 'previous-year' ? -1 : 1);
  else if (event === 'previous-day' || event === 'next-day') moved = addDateDays(state.highlighted, event === 'previous-day' ? -1 : 1);
  else if (event === 'previous-week' || event === 'next-week') moved = addDateDays(state.highlighted, event === 'previous-week' ? -7 : 7);
  else if (event === 'start-of-week' || event === 'end-of-week') {
    const start = policies.weekStartsOn ?? 1;
    const relative = (dateDayOfWeek(state.highlighted) - start + 7) % 7;
    moved = addDateDays(state.highlighted, event === 'start-of-week' ? -relative : 6 - relative);
  } else return fail('transition-rejection', 'unsupported-date-picker-event', 'Date picker event is unsupported.');
  if (!moved.ok) return moved;
  const direction = compareDateValues(moved.value, state.highlighted) < 0 ? -1 : 1;
  const eligible = findEligible(moved.value, direction, policies);
  if (!eligible.ok) return eligible;
  if (eligible.value === null || compareDateValues(eligible.value, state.highlighted) === 0) return createMachineUpdate(state);
  const view = Object.freeze({ year: eligible.value.year, month: eligible.value.month });
  return createMachineUpdate(pickerState(state.value, eligible.value, view, state.viewMode, state.open), [{ type: 'highlight-changed', value: eligible.value }]);
}

export function createDatePickerWeek(value: DateValue, weekStartsOn: 1 | 2 | 3 | 4 | 5 | 6 | 7 = 1): readonly DateValue[] {
  return unwrap(tryCreateDatePickerWeek(value, weekStartsOn));
}

export function tryCreateDatePickerWeek(value: DateValue, weekStartsOn: 1 | 2 | 3 | 4 | 5 | 6 | 7 = 1): Result<readonly DateValue[]> {
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

export function createDatePickerMonth(view: DatePickerView, weekStartsOn: 1 | 2 | 3 | 4 | 5 | 6 | 7 = 1): readonly (readonly DateValue[])[] {
  return unwrap(tryCreateDatePickerMonth(view, weekStartsOn));
}

export function tryCreateDatePickerMonth(view: DatePickerView, weekStartsOn: 1 | 2 | 3 | 4 | 5 | 6 | 7 = 1): Result<readonly (readonly DateValue[])[]> {
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

export function createDatePickerYear(year: number): readonly (readonly DatePickerMonthValue[])[] {
  return unwrap(tryCreateDatePickerYear(year));
}

export function tryCreateDatePickerYear(year: number): Result<readonly (readonly DatePickerMonthValue[])[]> {
  const valid = tryCreateDateValue(year, 1, 1);
  if (!valid.ok) return valid;
  const rows: DatePickerMonthValue[][] = [];
  for (let row = 0; row < 4; row += 1) {
    const months: DatePickerMonthValue[] = [];
    for (let column = 0; column < 3; column += 1) months.push(Object.freeze({ year, month: row * 3 + column + 1 }));
    rows.push(months);
  }
  return ok(freezeArray(rows.map((row) => freezeArray(row))));
}

export function isDatePickerValueAvailable(value: DateValue, policies: DatePickerPolicies = {}): boolean {
  return !(policies.min !== undefined && compareDateValues(value, policies.min) < 0)
    && !(policies.max !== undefined && compareDateValues(value, policies.max) > 0)
    && policies.unavailable?.(value) !== true;
}

export function datePickerID(value: DateValue): string { return formatDateValue(value); }

function commit(value: DateValue | null, state: DatePickerState, policies: DatePickerPolicies, close: boolean): Result<DatePickerUpdate> {
  if (value === null) {
    if (policies.required === true) return fail('transition-rejection', 'date-picker-value-required', 'Date picker requires a value.');
    const open = close ? false : state.open;
    return createMachineUpdate(pickerState(null, state.highlighted, state.view, state.viewMode, open), [
      { type: 'value-committed', value: null },
      ...openChanged(state.open, open),
    ]);
  }
  const valid = tryCreateDateValue(value.year, value.month, value.day);
  if (!valid.ok) return invalidTransition(valid);
  if (!isDatePickerValueAvailable(valid.value, policies)) return fail('transition-rejection', 'date-picker-value-unavailable', 'Date picker value is outside its selectable domain.');
  const open = close ? false : state.open;
  const view = Object.freeze({ year: valid.value.year, month: valid.value.month });
  return createMachineUpdate(pickerState(valid.value, valid.value, view, state.viewMode, open), [
    { type: 'value-committed', value: valid.value },
    { type: 'highlight-changed', value: valid.value },
    ...openChanged(state.open, open),
  ]);
}

function findEligible(start: DateValue, direction: -1 | 1, policies: DatePickerPolicies): Result<DateValue | null> {
  const limit = policies.maxScan ?? 366;
  if (!Number.isSafeInteger(limit) || limit < 1) return fail('construction', 'invalid-date-picker-max-scan', 'Date picker max scan must be a positive safe integer.');
  let candidate = start;
  for (let scanned = 0; scanned < limit; scanned += 1) {
    if (isDatePickerValueAvailable(candidate, policies)) return ok(candidate);
    const next = addDateDays(candidate, direction);
    if (!next.ok) return ok(null);
    candidate = next.value;
  }
  return fail('resource-rejection', 'date-picker-scan-exhausted', 'Date picker did not find an available date within maxScan.', { maxScan: limit });
}

function findEligibleInMonth(start: DateValue, month: DatePickerMonthValue, policies: DatePickerPolicies): Result<DateValue | null> {
  const limit = policies.maxScan ?? 366;
  if (!Number.isSafeInteger(limit) || limit < 1) return fail('construction', 'invalid-date-picker-max-scan', 'Date picker max scan must be a positive safe integer.');
  let scanned = 0;
  for (const direction of [1, -1] as const) {
    let candidate = start;
    if (direction === -1) {
      const previous = addDateDays(candidate, -1);
      if (!previous.ok) continue;
      candidate = previous.value;
    }
    while (candidate.year === month.year && candidate.month === month.month) {
      if (scanned >= limit) return fail('resource-rejection', 'date-picker-scan-exhausted', 'Date picker did not find an available date within maxScan.', { maxScan: limit });
      scanned += 1;
      if (isDatePickerValueAvailable(candidate, policies)) return ok(candidate);
      const next = addDateDays(candidate, direction);
      if (!next.ok) break;
      candidate = next.value;
    }
  }
  return ok(null);
}

function validatePolicies(policies: DatePickerPolicies): Result<true> {
  if (policies.unavailable !== undefined && typeof policies.unavailable !== 'function') return fail('construction', 'invalid-date-picker-unavailable-policy', 'Date picker unavailable policy must be a function.');
  if (policies.min !== undefined) { const min = tryCreateDateValue(policies.min.year, policies.min.month, policies.min.day); if (!min.ok) return min; }
  if (policies.max !== undefined) { const max = tryCreateDateValue(policies.max.year, policies.max.month, policies.max.day); if (!max.ok) return max; }
  if (policies.min !== undefined && policies.max !== undefined && compareDateValues(policies.min, policies.max) > 0) return fail('construction', 'inverted-date-picker-bounds', 'Date picker minimum must not follow its maximum.');
  return ok(true);
}

function pickerState(value: DateValue | null, highlighted: DateValue, view: DatePickerView, viewMode: DatePickerViewMode, open: boolean): DatePickerState { return Object.freeze({ value, highlighted, view, viewMode, open }); }
function isViewMode(value: unknown): value is DatePickerViewMode { return value === 'week' || value === 'month' || value === 'year'; }
function openChanged(previous: boolean, next: boolean): DatePickerCommand[] { return previous === next ? [] : [{ type: 'open-changed', open: next }]; }
function invalidTransition<T>(result: Result<T>): Result<never> { return result.ok ? fail('internal-invariant', 'unexpected-valid-result', 'Expected an invalid result.') : { ok: false, error: { ...result.error, class: 'transition-rejection' } }; }
