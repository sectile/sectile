import { createDateRangePicker, tryCreateDateRangePicker, type DateRangePickerConnection, type DateRangePickerControlledValues, type DateRangePickerOptions } from './date-range-picker.js';
import type { FacadeConnection } from '@sectile/core/adapter-runtime';
import type { TerminalTemporalResult } from './internal/result.js';
import type { YearRangePickerEvent } from '@sectile/temporal/year-range-picker';

export type YearRangePickerConnection = Omit<DateRangePickerConnection, 'handleEvent'> & { handleEvent(event: YearRangePickerEvent): boolean };
export type YearRangePickerControlledValues = DateRangePickerControlledValues;
export type YearRangePickerOptions = DateRangePickerOptions;
export type { YearRangePickerValue } from '@sectile/temporal/year-range-picker';

export function createYearRangePicker(options: YearRangePickerOptions = {}): FacadeConnection<YearRangePickerConnection> { return createDateRangePicker({ ...options, valueGranularity: 'year' } as YearRangePickerOptions); }
export function tryCreateYearRangePicker(options: YearRangePickerOptions = {}): TerminalTemporalResult<FacadeConnection<YearRangePickerConnection>> { return tryCreateDateRangePicker({ ...options, valueGranularity: 'year' } as YearRangePickerOptions); }
