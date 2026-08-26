import { unwrap } from '@sectile/core/result';
import type { Result } from '@sectile/core';
import { fail, ok } from './internal/foundation.js';
import { createMachineUpdate } from './internal/machine.js';
import { compareDateValues, createDateRange, createDateValue, type DateRange, type DateValue,tryCreateDateRange,tryCreateDateValue } from './date-field.js';
import {
  applyDatePickerEvent,
  createDatePickerState,
  isDatePickerValueAvailable,
  type DatePickerCommand,
  type DatePickerEvent,
  type DatePickerPolicies,
  type DatePickerState,
  tryCreateDatePickerState,
} from './date-picker.js';

export interface DateRangePickerState {
  readonly value: DateRange | null;
  readonly anchor: DateValue | null;
  readonly calendar: DatePickerState;
}

export type DateRangePickerEvent = DatePickerEvent | 'clear';

export type DateRangePickerCommand =
  | DatePickerCommand
  | { readonly type: 'range-committed'; readonly value: DateRange | null }
  | { readonly type: 'range-anchor-changed'; readonly value: DateValue | null };

export interface DateRangePickerUpdate {
  readonly state: DateRangePickerState;
  readonly commands: readonly DateRangePickerCommand[];
}

export interface DateRangePickerStateInput {
  readonly value?: DateRange | null;
  readonly anchor?: DateValue | null;
  readonly calendar?: Partial<DatePickerState>;
}

export function createDateRangePickerState(input: DateRangePickerStateInput = {}): DateRangePickerState {
  return unwrap(tryCreateDateRangePickerState(input));
}

export function tryCreateDateRangePickerState(input: DateRangePickerStateInput = {}): Result<DateRangePickerState> {
  let value: DateRange | null = null;
  if (input.value !== undefined && input.value !== null) {
    const valid = tryCreateDateRange(input.value.start, input.value.end);
    if (!valid.ok) return valid;
    value = valid.value;
  }
  let anchor: DateValue | null = null;
  if (input.anchor !== undefined && input.anchor !== null) {
    const valid = tryCreateDateValue(input.anchor.year, input.anchor.month, input.anchor.day);
    if (!valid.ok) return valid;
    anchor = valid.value;
  }
  const fallback = anchor ?? value?.end;
  const calendar = tryCreateDatePickerState({
    value: null,
    ...(input.calendar?.highlighted === undefined && fallback !== undefined ? { highlighted: fallback } : {}),
    ...input.calendar,
  });
  if (!calendar.ok) return calendar;
  return ok(Object.freeze({ value, anchor, calendar: calendar.value }));
}

export function applyDateRangePickerEvent(
  state: DateRangePickerState,
  event: DateRangePickerEvent,
  policies: DatePickerPolicies = {},
): Result<DateRangePickerUpdate> {
  const valid = tryCreateDateRangePickerState(state);
  if (!valid.ok) return invalidTransition(valid);
  if (event === 'clear') {
    if (policies.required === true) return fail('transition-rejection', 'date-range-picker-value-required', 'Date range picker requires a range.');
    return createMachineUpdate(Object.freeze({ value: null, anchor: null, calendar: state.calendar }), [
      { type: 'range-committed', value: null },
      { type: 'range-anchor-changed', value: null },
    ]);
  }
  const selected = event === 'select-highlighted' ? state.calendar.highlighted
    : typeof event === 'object' && event.type === 'select' ? event.value
      : null;
  if (selected !== null) return selectDate(state, selected, policies);
  if (typeof event === 'object' && event.type === 'set-value') {
    return fail('transition-rejection', 'unsupported-date-range-picker-set-value', 'Date range picker values must be synchronized as ranges.');
  }
  const update = applyDatePickerEvent(state.calendar, event, policies);
  if (!update.ok) return update;
  return createMachineUpdate(Object.freeze({ value: state.value, anchor: state.anchor, calendar: update.value.state }), update.value.commands);
}

function selectDate(state: DateRangePickerState, requested: DateValue, policies: DatePickerPolicies): Result<DateRangePickerUpdate> {
  const valid = tryCreateDateValue(requested.year, requested.month, requested.day);
  if (!valid.ok) return invalidTransition(valid);
  if (!isDatePickerValueAvailable(valid.value, policies)) return fail('transition-rejection', 'date-range-picker-value-unavailable', 'Date range endpoint is outside its selectable domain.');
  if (state.anchor === null) {
    const calendar = tryCreateDatePickerState({ ...state.calendar, value: null, highlighted: valid.value, view: { year: valid.value.year, month: valid.value.month }, open: true });
    if (!calendar.ok) return calendar;
    return createMachineUpdate(Object.freeze({ value: state.value, anchor: valid.value, calendar: calendar.value }), [
      { type: 'highlight-changed', value: valid.value },
      { type: 'range-anchor-changed', value: valid.value },
    ]);
  }
  const start = compareDateValues(state.anchor, valid.value) <= 0 ? state.anchor : valid.value;
  const end = compareDateValues(state.anchor, valid.value) <= 0 ? valid.value : state.anchor;
  const range = tryCreateDateRange(start, end);
  if (!range.ok) return range;
  const calendar = tryCreateDatePickerState({ value: null, highlighted: valid.value, view: { year: valid.value.year, month: valid.value.month }, viewMode: state.calendar.viewMode, open: state.calendar.open });
  if (!calendar.ok) return calendar;
  return createMachineUpdate(Object.freeze({ value: range.value, anchor: null, calendar: calendar.value }), [
    { type: 'range-committed', value: range.value },
    { type: 'range-anchor-changed', value: null },
    { type: 'highlight-changed', value: valid.value },
  ]);
}

function invalidTransition<T>(result: Result<T>): Result<never> { return result.ok ? fail('internal-invariant', 'unexpected-valid-result', 'Expected an invalid result.') : { ok: false, error: { ...result.error, class: 'transition-rejection' } }; }
