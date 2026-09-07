import { createDatePicker, tryCreateDatePicker, toDatePickerEvent, type DatePickerConnection, type DatePickerControlledValues, type DatePickerOptions } from './date-picker.js';
import type { TerminalKeyboardInput } from './keyboard.js';

export type MonthPickerConnection = DatePickerConnection;
export type MonthPickerControlledValues = DatePickerControlledValues;
export type MonthPickerOptions = DatePickerOptions;
export type { MonthPickerValue } from '@sectile/temporal/month-picker';

export function createMonthPicker(options: MonthPickerOptions = {}): ReturnType<typeof createDatePicker> {
  return createDatePicker({ ...options, valueGranularity: 'month' } as MonthPickerOptions);
}

export function tryCreateMonthPicker(options: MonthPickerOptions = {}): ReturnType<typeof tryCreateDatePicker> {
  return tryCreateDatePicker({ ...options, valueGranularity: 'month' } as MonthPickerOptions);
}

export function toMonthPickerEvent(input: TerminalKeyboardInput): ReturnType<typeof toDatePickerEvent> { return toDatePickerEvent(input); }
