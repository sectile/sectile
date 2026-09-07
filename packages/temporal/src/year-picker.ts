import { unwrap } from '@sectile/core/result';
import type { TemporalResult } from './error.js';
import { createDateValue, tryCreateDateValue, type DateValue } from './date-field.js';
import { fail, freezeArray, ok } from './internal/foundation.js';
import {
  applyDatePickerEvent,
  tryCreateDatePickerState,
  type DatePickerCommand,
  type DatePickerEvent,
  type DatePickerPolicies,
  type DatePickerState,
  type DatePickerStateInput,
  type DatePickerUpdate,
} from './date-picker.js';

export type YearPickerValue = DateValue;
export interface YearPickerCellValue { readonly year: number }
export type YearPickerState = DatePickerState;
export type YearPickerStateInput = DatePickerStateInput;
export type YearPickerEvent = DatePickerEvent | { readonly type: 'select-year'; readonly value: YearPickerCellValue };
export type YearPickerCommand = DatePickerCommand;
export type YearPickerPolicies = DatePickerPolicies;
export type YearPickerUpdate = DatePickerUpdate;

export function createYearPickerValue(year: number): YearPickerValue {
  return createDateValue(year, 1, 1);
}

export function tryCreateYearPickerValue(year: number): TemporalResult<YearPickerValue> {
  return tryCreateDateValue(year, 1, 1);
}

export function createYearPickerPage(year: number, pageSize = 12): readonly (readonly YearPickerCellValue[])[] {
  return unwrap(tryCreateYearPickerPage(year, pageSize));
}

export function tryCreateYearPickerPage(year: number, pageSize = 12): TemporalResult<readonly (readonly YearPickerCellValue[])[]> {
  if (!Number.isSafeInteger(year)) return fail('construction', 'invalid-year-picker-year', 'Year picker year must be a safe integer.');
  if (!Number.isSafeInteger(pageSize) || pageSize < 1) return fail('construction', 'invalid-year-picker-page-size', 'Year picker page size must be a positive safe integer.');
  const columns = 4;
  const start = year - Math.floor(pageSize / 2);
  const rows: YearPickerCellValue[][] = [];
  for (let row = 0; row < Math.ceil(pageSize / columns); row += 1) {
    const values: YearPickerCellValue[] = [];
    for (let column = 0; column < columns; column += 1) {
      const offset = row * columns + column;
      if (offset < pageSize) values.push(Object.freeze({ year: start + offset }));
    }
    rows.push(values);
  }
  return ok(freezeArray(rows.map((values) => freezeArray(values))));
}

export function createYearPickerState(input: YearPickerStateInput = {}): YearPickerState {
  return unwrap(tryCreateYearPickerState(input));
}

export function tryCreateYearPickerState(input: YearPickerStateInput = {}): TemporalResult<YearPickerState> {
  if (input.value === undefined || input.value === null) return tryCreateDatePickerState(input);
  const value = tryCreateYearPickerValue(input.value.year);
  return value.ok ? tryCreateDatePickerState({ ...input, value: value.value }) : value;
}

export function applyYearPickerEvent(state: YearPickerState, event: YearPickerEvent, policies: YearPickerPolicies = {}): TemporalResult<YearPickerUpdate> {
  const valid = tryCreateYearPickerState(state);
  if (!valid.ok) return valid;
  if (event === 'select-highlighted') return applyDatePickerEvent(valid.value, { type: 'select', value: createYearPickerValue(valid.value.highlighted.year) }, policies);
  if (typeof event === 'object' && event.type === 'select-year') return applyDatePickerEvent(valid.value, { type: 'select', value: createYearPickerValue(event.value.year) }, policies);
  if (typeof event === 'object' && (event.type === 'select' || event.type === 'set-value') && event.value !== null) {
    return applyDatePickerEvent(valid.value, { ...event, value: createYearPickerValue(event.value.year) }, policies);
  }
  return applyDatePickerEvent(valid.value, event, policies);
}
