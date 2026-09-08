import { createDateRangePicker, tryCreateDateRangePicker, type DateRangePickerConnection, type DateRangePickerControlledValues, type DateRangePickerOptions } from './date-range-picker.js';
import type { FacadeConnection } from '@sectile/core/adapter-runtime';
import type { TerminalTemporalResult } from './internal/result.js';
import type { MonthRangePickerEvent } from '@sectile/temporal/month-range-picker';

export type MonthRangePickerConnection = Omit<DateRangePickerConnection, 'handleEvent'> & { handleEvent(event: MonthRangePickerEvent): boolean };
export type MonthRangePickerControlledValues = DateRangePickerControlledValues;
export type MonthRangePickerOptions = DateRangePickerOptions;
export type { MonthRangePickerValue } from '@sectile/temporal/month-range-picker';

export function createMonthRangePicker(options: MonthRangePickerOptions = {}): FacadeConnection<MonthRangePickerConnection> { return createDateRangePicker({ ...options, valueGranularity: 'month' } as MonthRangePickerOptions); }
export function tryCreateMonthRangePicker(options: MonthRangePickerOptions = {}): TerminalTemporalResult<FacadeConnection<MonthRangePickerConnection>> { return tryCreateDateRangePicker({ ...options, valueGranularity: 'month' } as MonthRangePickerOptions); }
