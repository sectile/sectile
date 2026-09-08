import { unwrap } from '@sectile/core/result';
import type { TemporalResult } from './error.js';
import { applyPeriodRangePickerNavigation, type PeriodPickerNavigationEvent } from './internal/period-picker.js';
export type { PeriodPickerNavigationEvent } from './internal/period-picker.js';
import type { DateRange } from './date-field.js';
import { tryCreateMonthPickerValue } from './month-picker.js';
import {
  applyDateRangePickerEvent,
  tryCreateDateRangePickerState,
  type DateRangePickerCommand,
  type DateRangePickerEvent,
  type DateRangePickerState,
  type DateRangePickerStateInput,
  type DateRangePickerUpdate,
} from './date-range-picker.js';
import type { DatePickerPolicies } from './date-picker.js';

export type MonthRangePickerValue = DateRange;
export type MonthRangePickerCommand = DateRangePickerCommand;
export type MonthRangePickerEvent = DateRangePickerEvent | PeriodPickerNavigationEvent;
export type MonthRangePickerState = DateRangePickerState;
export type MonthRangePickerStateInput = DateRangePickerStateInput;
export type MonthRangePickerUpdate = DateRangePickerUpdate;

export function createMonthRangePickerState(input: MonthRangePickerStateInput = {}): MonthRangePickerState { return unwrap(tryCreateMonthRangePickerState(input)); }
export function tryCreateMonthRangePickerState(input: MonthRangePickerStateInput = {}): TemporalResult<MonthRangePickerState> {
  let value = input.value;
  if (value !== undefined && value !== null) {
    const start = tryCreateMonthPickerValue(value.start.year, value.start.month);
    if (!start.ok) return start;
    const end = tryCreateMonthPickerValue(value.end.year, value.end.month);
    if (!end.ok) return end;
    value = { start: start.value, end: end.value };
  }
  let anchor = input.anchor;
  if (anchor !== undefined && anchor !== null) {
    const valid = tryCreateMonthPickerValue(anchor.year, anchor.month);
    if (!valid.ok) return valid;
    anchor = valid.value;
  }
  return tryCreateDateRangePickerState({ ...input, ...(value === undefined ? {} : { value }), ...(anchor === undefined ? {} : { anchor }) });
}

export function applyMonthRangePickerEvent(state: MonthRangePickerState, event: MonthRangePickerEvent, policies: DatePickerPolicies = {}): TemporalResult<MonthRangePickerUpdate> {
  const valid = tryCreateMonthRangePickerState(state);
  if (!valid.ok) return { ok: false, error: { ...valid.error, class: 'transition-rejection' } };
  if (typeof event === 'object' && event.type === 'navigate-period') return applyPeriodRangePickerNavigation(valid.value, event, policies);
  if (event === 'select-highlighted' || (typeof event === 'object' && (event.type === 'select-month' || event.type === 'select'))) {
    const requested = event === 'select-highlighted' ? valid.value.calendar.highlighted : event.value;
    const value = tryCreateMonthPickerValue(requested.year, requested.month);
    if (!value.ok) return { ok: false, error: { ...value.error, class: 'transition-rejection' } };
    return applyDateRangePickerEvent(valid.value, { type: 'select', value: value.value }, policies);
  }
  return applyDateRangePickerEvent(valid.value, event, policies);
}

export { createCalendarYear as createMonthRangePickerYear, tryCreateCalendarYear as tryCreateMonthRangePickerYear } from './calendar.js';
