import { unwrap } from '@sectile/core/result';
import type { TemporalResult } from './error.js';
import { applyPeriodRangePickerNavigation, type PeriodPickerNavigationEvent } from './internal/period-picker.js';
export type { PeriodPickerNavigationEvent } from './internal/period-picker.js';
import type { DateRange } from './date-field.js';
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
import { createYearPickerValue, type YearPickerCellValue } from './year-picker.js';

export type YearRangePickerValue = DateRange;
export type YearRangePickerCommand = DateRangePickerCommand;
export type YearRangePickerEvent = DateRangePickerEvent | PeriodPickerNavigationEvent | { readonly type: 'select-year'; readonly value: YearPickerCellValue };
export type YearRangePickerState = DateRangePickerState;
export type YearRangePickerStateInput = DateRangePickerStateInput;
export type YearRangePickerUpdate = DateRangePickerUpdate;

export function createYearRangePickerState(input: YearRangePickerStateInput = {}): YearRangePickerState { return unwrap(tryCreateYearRangePickerState(input)); }
export function tryCreateYearRangePickerState(input: YearRangePickerStateInput = {}): TemporalResult<YearRangePickerState> {
  const value = input.value === undefined || input.value === null ? input.value : {
    start: createYearPickerValue(input.value.start.year),
    end: createYearPickerValue(input.value.end.year),
  };
  const anchor = input.anchor === undefined || input.anchor === null ? input.anchor : createYearPickerValue(input.anchor.year);
  return tryCreateDateRangePickerState({ ...input, ...(value === undefined ? {} : { value }), ...(anchor === undefined ? {} : { anchor }) });
}

export function applyYearRangePickerEvent(state: YearRangePickerState, event: YearRangePickerEvent, policies: DatePickerPolicies = {}): TemporalResult<YearRangePickerUpdate> {
  const valid = tryCreateYearRangePickerState(state);
  if (!valid.ok) return valid;
  if (typeof event === 'object' && event.type === 'navigate-period') return applyPeriodRangePickerNavigation(valid.value, event, policies);
  if (event === 'select-highlighted') return applyDateRangePickerEvent(valid.value, { type: 'select', value: createYearPickerValue(valid.value.calendar.highlighted.year) }, policies);
  if (typeof event === 'object' && event.type === 'select-year') return applyDateRangePickerEvent(valid.value, { type: 'select', value: createYearPickerValue(event.value.year) }, policies);
  if (typeof event === 'object' && event.type === 'select') return applyDateRangePickerEvent(valid.value, { type: 'select', value: createYearPickerValue(event.value.year) }, policies);
  return applyDateRangePickerEvent(valid.value, event, policies);
}

export { createYearPickerPage as createYearRangePickerPage, tryCreateYearPickerPage as tryCreateYearRangePickerPage } from './year-picker.js';
