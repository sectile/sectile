import { applyMonthPickerEvent, tryCreateMonthPickerState } from '@sectile/temporal/month-picker';
import { createDatePicker, tryCreateDatePicker, createCalendarYear, type DatePickerConnection, type DatePickerControlledValues, type DatePickerOptions } from './date-picker.js';

export type MonthPickerConnection = DatePickerConnection;
export type MonthPickerControlledValues = DatePickerControlledValues;
export type MonthPickerOptions = DatePickerOptions;
export type { MonthPickerCellValue, MonthPickerValue } from '@sectile/temporal/month-picker';

export function createMonthPicker(options: MonthPickerOptions): ReturnType<typeof createDatePicker> {
  return createDatePicker({ ...options, stateFactory: tryCreateMonthPickerState, reducer: applyMonthPickerEvent } as MonthPickerOptions);
}

export function tryCreateMonthPicker(options: MonthPickerOptions): ReturnType<typeof tryCreateDatePicker> {
  return tryCreateDatePicker({ ...options, stateFactory: tryCreateMonthPickerState, reducer: applyMonthPickerEvent } as MonthPickerOptions);
}

export function createMonthPickerYear(year: number): ReturnType<typeof createCalendarYear> { return createCalendarYear(year); }
