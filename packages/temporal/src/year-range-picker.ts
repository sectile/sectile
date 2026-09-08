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
import { tryCreateYearPickerValue, type YearPickerCellValue } from './year-picker.js';

export type YearRangePickerValue = DateRange;
export type YearRangePickerCommand = DateRangePickerCommand;
export type YearRangePickerEvent = DateRangePickerEvent | PeriodPickerNavigationEvent | { readonly type: 'select-year'; readonly value: YearPickerCellValue };
export type YearRangePickerState = DateRangePickerState;
export type YearRangePickerStateInput = DateRangePickerStateInput;
export type YearRangePickerUpdate = DateRangePickerUpdate;

export function createYearRangePickerState(input: YearRangePickerStateInput = {}): YearRangePickerState { return unwrap(tryCreateYearRangePickerState(input)); }
export function tryCreateYearRangePickerState(input: YearRangePickerStateInput = {}): TemporalResult<YearRangePickerState> {
  let value = input.value;
  if (value !== undefined && value !== null) {
    const start = tryCreateYearPickerValue(value.start.year);
    if (!start.ok) return start;
    const end = tryCreateYearPickerValue(value.end.year);
    if (!end.ok) return end;
    value = { start: start.value, end: end.value };
  }
  let anchor = input.anchor;
  if (anchor !== undefined && anchor !== null) {
    const valid = tryCreateYearPickerValue(anchor.year);
    if (!valid.ok) return valid;
    anchor = valid.value;
  }
  return tryCreateDateRangePickerState({ ...input, ...(value === undefined ? {} : { value }), ...(anchor === undefined ? {} : { anchor }) });
}

export function applyYearRangePickerEvent(state: YearRangePickerState, event: YearRangePickerEvent, policies: DatePickerPolicies = {}): TemporalResult<YearRangePickerUpdate> {
  const valid = tryCreateYearRangePickerState(state);
  if (!valid.ok) return { ok: false, error: { ...valid.error, class: 'transition-rejection' } };
  if (typeof event === 'object' && event.type === 'navigate-period') return applyPeriodRangePickerNavigation(valid.value, event, policies);
  if (event === 'select-highlighted' || (typeof event === 'object' && (event.type === 'select-year' || event.type === 'select'))) {
    const requested = event === 'select-highlighted' ? valid.value.calendar.highlighted : event.value;
    const value = tryCreateYearPickerValue(requested.year);
    if (!value.ok) return { ok: false, error: { ...value.error, class: 'transition-rejection' } };
    return applyDateRangePickerEvent(valid.value, { type: 'select', value: value.value }, policies);
  }
  return applyDateRangePickerEvent(valid.value, event, policies);
}

export { createYearPickerPage as createYearRangePickerPage, tryCreateYearPickerPage as tryCreateYearRangePickerPage } from './year-picker.js';
