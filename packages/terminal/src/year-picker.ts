import { createDatePicker, tryCreateDatePicker, toDatePickerEvent, type DatePickerConnection, type DatePickerControlledValues, type DatePickerOptions } from './date-picker.js';
import type { TerminalKeyboardInput } from './keyboard.js';

export type YearPickerConnection = DatePickerConnection;
export type YearPickerControlledValues = DatePickerControlledValues;
export type YearPickerOptions = DatePickerOptions;
export type { YearPickerValue } from '@sectile/temporal/year-picker';

export function createYearPicker(options: YearPickerOptions = {}): ReturnType<typeof createDatePicker> {
  return createDatePicker({ ...options, valueGranularity: 'year' } as YearPickerOptions);
}

export function tryCreateYearPicker(options: YearPickerOptions = {}): ReturnType<typeof tryCreateDatePicker> {
  return tryCreateDatePicker({ ...options, valueGranularity: 'year' } as YearPickerOptions);
}

export function toYearPickerEvent(input: TerminalKeyboardInput): ReturnType<typeof toDatePickerEvent> { return toDatePickerEvent(input); }
