import { createDatePicker, tryCreateDatePicker, type DatePickerConnection, type DatePickerControlledValues, type DatePickerOptions } from './date-picker.js';
import type { TerminalKeyboardInput } from './keyboard.js';
import { toPeriodPickerEvent } from './internal/period-picker.js';
import type { FacadeConnection } from '@sectile/core/adapter-runtime';
import type { TerminalTemporalResult } from './internal/result.js';
import type { MonthPickerEvent } from '@sectile/temporal/month-picker';

export type MonthPickerConnection = Omit<DatePickerConnection, 'handleEvent'> & { handleEvent(event: MonthPickerEvent): boolean };
export type MonthPickerControlledValues = DatePickerControlledValues;
export type MonthPickerOptions = DatePickerOptions;
export type { MonthPickerValue } from '@sectile/temporal/month-picker';

export function createMonthPicker(options: MonthPickerOptions = {}): FacadeConnection<MonthPickerConnection> {
  return createDatePicker({ ...options, valueGranularity: 'month' } as MonthPickerOptions);
}

export function tryCreateMonthPicker(options: MonthPickerOptions = {}): TerminalTemporalResult<FacadeConnection<MonthPickerConnection>> {
  return tryCreateDatePicker({ ...options, valueGranularity: 'month' } as MonthPickerOptions);
}

export function toMonthPickerEvent(input: TerminalKeyboardInput): ReturnType<typeof toPeriodPickerEvent> { return toPeriodPickerEvent(input, 'month'); }
