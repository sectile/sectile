import { createPeriodPickerHost } from './internal/period-picker.js';
import { unwrap } from '@sectile/core/result';
import type { FacadeConnection } from '@sectile/core/adapter-runtime';
import { applyYearRangePickerEvent, tryCreateYearRangePickerState, type YearRangePickerEvent } from '@sectile/temporal/year-range-picker';
import { tryCreateYearPickerValue, type YearPickerCellValue, type YearPickerValue } from '@sectile/temporal/year-picker';
import { tryCreateDateRangePicker, type DateRangePickerConnection, type DateRangePickerControlledValues, type DateRangePickerOptions } from './date-range-picker.js';
import type { DOMTemporalResult } from './internal/result.js';

export type YearRangePickerConnection = Omit<DateRangePickerConnection, 'setCellAttributes' | 'handleEvent'> & {
  setCellAttributes(element: HTMLElement, value: YearPickerCellValue | YearPickerValue): void;
  handleEvent(event: YearRangePickerEvent): boolean;
};
export type YearRangePickerControlledValues = DateRangePickerControlledValues;
export type YearRangePickerOptions = DateRangePickerOptions;
export type { YearRangePickerValue } from '@sectile/temporal/year-range-picker';
export type { YearPickerCellValue } from '@sectile/temporal/year-picker';

export function createYearRangePicker(options: YearRangePickerOptions): FacadeConnection<YearRangePickerConnection> { return unwrap(tryCreateYearRangePicker(options)); }
export function tryCreateYearRangePicker(options: YearRangePickerOptions): DOMTemporalResult<FacadeConnection<YearRangePickerConnection>> { return tryCreateDateRangePicker({ ...options, stateFactory: tryCreateYearRangePickerState, reducer: applyYearRangePickerEvent, ...createPeriodPickerHost('year', (value) => tryCreateYearPickerValue(value.year)) } as YearRangePickerOptions); }
