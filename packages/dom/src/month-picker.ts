import { createPeriodPickerHost } from './internal/period-picker.js';
import { unwrap } from '@sectile/core/result';
import type { FacadeConnection } from '@sectile/core/adapter-runtime';
import { applyMonthPickerEvent, tryCreateMonthPickerState, tryCreateMonthPickerValue, type MonthPickerCellValue, type MonthPickerValue } from '@sectile/temporal/month-picker';
import { tryCreateDatePicker, createCalendarYear, type DatePickerConnection, type DatePickerControlledValues, type DatePickerOptions } from './date-picker.js';
import type { DOMTemporalResult } from './internal/result.js';
import type { MonthPickerEvent } from '@sectile/temporal/month-picker';

export type MonthPickerConnection = Omit<DatePickerConnection, 'setCellAttributes' | 'handleEvent'> & {
  setCellAttributes(element: HTMLElement, value: MonthPickerCellValue | MonthPickerValue): void;
  handleEvent(event: MonthPickerEvent): boolean;
};
export type MonthPickerControlledValues = DatePickerControlledValues;
export type MonthPickerOptions = DatePickerOptions;
export type { MonthPickerCellValue, MonthPickerValue } from '@sectile/temporal/month-picker';

export function createMonthPicker(options: MonthPickerOptions): FacadeConnection<MonthPickerConnection> {
  return unwrap(tryCreateMonthPicker(options));
}

export function tryCreateMonthPicker(options: MonthPickerOptions): DOMTemporalResult<FacadeConnection<MonthPickerConnection>> {
  return tryCreateDatePicker({ ...options, stateFactory: tryCreateMonthPickerState, reducer: applyMonthPickerEvent, ...createPeriodPickerHost('month', (value) => tryCreateMonthPickerValue(value.year, value.month)) } as MonthPickerOptions);
}

export function createMonthPickerYear(year: number): ReturnType<typeof createCalendarYear> { return createCalendarYear(year); }
