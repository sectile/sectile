import { createDateRangePicker, tryCreateDateRangePicker, type DateRangePickerConnection, type DateRangePickerControlledValues, type DateRangePickerOptions } from './date-range-picker.js';

export type MonthRangePickerConnection = DateRangePickerConnection;
export type MonthRangePickerControlledValues = DateRangePickerControlledValues;
export type MonthRangePickerOptions = DateRangePickerOptions;
export type { MonthRangePickerValue } from '@sectile/temporal/month-range-picker';

export function createMonthRangePicker(options: MonthRangePickerOptions = {}): ReturnType<typeof createDateRangePicker> { return createDateRangePicker({ ...options, valueGranularity: 'month' } as MonthRangePickerOptions); }
export function tryCreateMonthRangePicker(options: MonthRangePickerOptions = {}): ReturnType<typeof tryCreateDateRangePicker> { return tryCreateDateRangePicker({ ...options, valueGranularity: 'month' } as MonthRangePickerOptions); }
