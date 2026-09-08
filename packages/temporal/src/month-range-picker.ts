import { unwrap } from '@sectile/core/result';
import type { TemporalResult } from './error.js';
import { applyPeriodRangePickerNavigation, type PeriodPickerNavigationEvent } from './internal/period-picker.js';
export type { PeriodPickerNavigationEvent } from './internal/period-picker.js';
import type { DateRange } from './date-field.js';
import { createMonthPickerValue } from './month-picker.js';
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
  const value = input.value === undefined || input.value === null ? input.value : {
    start: createMonthPickerValue(input.value.start.year, input.value.start.month),
    end: createMonthPickerValue(input.value.end.year, input.value.end.month),
  };
  const anchor = input.anchor === undefined || input.anchor === null ? input.anchor : createMonthPickerValue(input.anchor.year, input.anchor.month);
  return tryCreateDateRangePickerState({ ...input, ...(value === undefined ? {} : { value }), ...(anchor === undefined ? {} : { anchor }) });
}

export function applyMonthRangePickerEvent(state: MonthRangePickerState, event: MonthRangePickerEvent, policies: DatePickerPolicies = {}): TemporalResult<MonthRangePickerUpdate> {
  const valid = tryCreateMonthRangePickerState(state);
  if (!valid.ok) return valid;
  if (typeof event === 'object' && event.type === 'navigate-period') return applyPeriodRangePickerNavigation(valid.value, event, policies);
  if (event === 'select-highlighted') return applyDateRangePickerEvent(valid.value, { type: 'select', value: createMonthPickerValue(valid.value.calendar.highlighted.year, valid.value.calendar.highlighted.month) }, policies);
  if (typeof event === 'object' && event.type === 'select-month') return applyDateRangePickerEvent(valid.value, { type: 'select', value: createMonthPickerValue(event.value.year, event.value.month) }, policies);
  if (typeof event === 'object' && event.type === 'select') return applyDateRangePickerEvent(valid.value, { type: 'select', value: createMonthPickerValue(event.value.year, event.value.month) }, policies);
  return applyDateRangePickerEvent(valid.value, event, policies);
}

export { createCalendarYear as createMonthRangePickerYear, tryCreateCalendarYear as tryCreateMonthRangePickerYear } from './calendar.js';
