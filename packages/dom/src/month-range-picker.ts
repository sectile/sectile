import { createPeriodPickerHost } from './internal/period-picker.js';
import { unwrap } from '@sectile/core/result';
import type { FacadeConnection } from '@sectile/core/adapter-runtime';
import { applyMonthRangePickerEvent, tryCreateMonthRangePickerState } from '@sectile/temporal/month-range-picker';
import { tryCreateMonthPickerValue, type MonthPickerCellValue, type MonthPickerValue } from '@sectile/temporal/month-picker';
import { tryCreateDateRangePicker, type DateRangePickerConnection, type DateRangePickerControlledValues, type DateRangePickerOptions } from './date-range-picker.js';
import { createCalendarYear } from './date-picker.js';
import type { DOMTemporalResult } from './internal/result.js';
import type { MonthRangePickerEvent } from '@sectile/temporal/month-range-picker';

export type MonthRangePickerConnection = Omit<DateRangePickerConnection, 'setCellAttributes' | 'handleEvent'> & {
  setCellAttributes(element: HTMLElement, value: MonthPickerCellValue | MonthPickerValue): void;
  handleEvent(event: MonthRangePickerEvent): boolean;
};
export type MonthRangePickerControlledValues = DateRangePickerControlledValues;
export type MonthRangePickerOptions = DateRangePickerOptions;
export type { MonthRangePickerValue } from '@sectile/temporal/month-range-picker';
export type { MonthPickerCellValue } from '@sectile/temporal/month-picker';

export function createMonthRangePicker(options: MonthRangePickerOptions): FacadeConnection<MonthRangePickerConnection> { return unwrap(tryCreateMonthRangePicker(options)); }
export function tryCreateMonthRangePicker(options: MonthRangePickerOptions): DOMTemporalResult<FacadeConnection<MonthRangePickerConnection>> { return tryCreateDateRangePicker({ ...options, stateFactory: tryCreateMonthRangePickerState, reducer: applyMonthRangePickerEvent, ...createPeriodPickerHost('month', (value) => tryCreateMonthPickerValue(value.year, value.month)) } as MonthRangePickerOptions); }
export function createMonthRangePickerYear(year: number): ReturnType<typeof createCalendarYear> { return createCalendarYear(year); }
