import { createPeriodPickerHost } from './internal/period-picker.js';
import { unwrap } from '@sectile/core/result';
import type { FacadeConnection } from '@sectile/core/adapter-runtime';
import { applyYearPickerEvent, tryCreateYearPickerState, tryCreateYearPickerValue, type YearPickerCellValue, type YearPickerValue, type YearPickerEvent } from '@sectile/temporal/year-picker';
import { tryCreateDatePicker, type DatePickerConnection, type DatePickerControlledValues, type DatePickerOptions } from './date-picker.js';
import type { DOMTemporalResult } from './internal/result.js';

export type YearPickerConnection = Omit<DatePickerConnection, 'setCellAttributes' | 'handleEvent'> & {
  setCellAttributes(element: HTMLElement, value: YearPickerCellValue | YearPickerValue): void;
  handleEvent(event: YearPickerEvent): boolean;
};
export type YearPickerControlledValues = DatePickerControlledValues;
export type YearPickerOptions = DatePickerOptions;
export type { YearPickerCellValue, YearPickerValue } from '@sectile/temporal/year-picker';

export function createYearPicker(options: YearPickerOptions): FacadeConnection<YearPickerConnection> {
  return unwrap(tryCreateYearPicker(options));
}

export function tryCreateYearPicker(options: YearPickerOptions): DOMTemporalResult<FacadeConnection<YearPickerConnection>> {
  return tryCreateDatePicker({ ...options, stateFactory: tryCreateYearPickerState, reducer: applyYearPickerEvent, ...createPeriodPickerHost('year', (value) => tryCreateYearPickerValue(value.year)) } as YearPickerOptions);
}
