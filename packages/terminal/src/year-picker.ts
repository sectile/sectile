import { createDatePicker, tryCreateDatePicker, type DatePickerConnection, type DatePickerControlledValues, type DatePickerOptions } from './date-picker.js';
import type { TerminalKeyboardInput } from './keyboard.js';
import { toPeriodPickerEvent } from './internal/period-picker.js';
import type { FacadeConnection } from '@sectile/core/adapter-runtime';
import type { TerminalTemporalResult } from './internal/result.js';
import type { YearPickerEvent } from '@sectile/temporal/year-picker';

export type YearPickerConnection = Omit<DatePickerConnection, 'handleEvent'> & { handleEvent(event: YearPickerEvent): boolean };
export type YearPickerControlledValues = DatePickerControlledValues;
export type YearPickerOptions = DatePickerOptions;
export type { YearPickerValue } from '@sectile/temporal/year-picker';

export function createYearPicker(options: YearPickerOptions = {}): FacadeConnection<YearPickerConnection> {
  return createDatePicker({ ...options, valueGranularity: 'year' } as YearPickerOptions);
}

export function tryCreateYearPicker(options: YearPickerOptions = {}): TerminalTemporalResult<FacadeConnection<YearPickerConnection>> {
  return tryCreateDatePicker({ ...options, valueGranularity: 'year' } as YearPickerOptions);
}

export function toYearPickerEvent(input: TerminalKeyboardInput, referenceYear = 7): ReturnType<typeof toPeriodPickerEvent> { return toPeriodPickerEvent(input, 'year', referenceYear); }
