import { applyYearRangePickerEvent, tryCreateYearRangePickerState } from '@sectile/temporal/year-range-picker';
import { createDateRangePicker, tryCreateDateRangePicker, type DateRangePickerConnection, type DateRangePickerControlledValues, type DateRangePickerOptions } from './date-range-picker.js';

export type YearRangePickerConnection = DateRangePickerConnection;
export type YearRangePickerControlledValues = DateRangePickerControlledValues;
export type YearRangePickerOptions = DateRangePickerOptions;
export type { YearRangePickerValue } from '@sectile/temporal/year-range-picker';

export function createYearRangePicker(options: YearRangePickerOptions): ReturnType<typeof createDateRangePicker> { return createDateRangePicker({ ...options, stateFactory: tryCreateYearRangePickerState, reducer: applyYearRangePickerEvent } as YearRangePickerOptions); }
export function tryCreateYearRangePicker(options: YearRangePickerOptions): ReturnType<typeof tryCreateDateRangePicker> { return tryCreateDateRangePicker({ ...options, stateFactory: tryCreateYearRangePickerState, reducer: applyYearRangePickerEvent } as YearRangePickerOptions); }
