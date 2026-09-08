import { applyYearPickerEvent, tryCreateYearPickerState } from '@sectile/temporal/year-picker';
import { createDatePicker, tryCreateDatePicker, type DatePickerConnection, type DatePickerControlledValues, type DatePickerOptions } from './date-picker.js';

export type YearPickerConnection = DatePickerConnection;
export type YearPickerControlledValues = DatePickerControlledValues;
export type YearPickerOptions = DatePickerOptions;
export type { YearPickerCellValue, YearPickerValue } from '@sectile/temporal/year-picker';

export function createYearPicker(options: YearPickerOptions): ReturnType<typeof createDatePicker> {
  return createDatePicker({ ...options, stateFactory: tryCreateYearPickerState, reducer: applyYearPickerEvent } as YearPickerOptions);
}

export function tryCreateYearPicker(options: YearPickerOptions): ReturnType<typeof tryCreateDatePicker> {
  return tryCreateDatePicker({ ...options, stateFactory: tryCreateYearPickerState, reducer: applyYearPickerEvent } as YearPickerOptions);
}
