import { unwrap } from '@sectile/core/result';
import type { TemporalResult } from './error.js';
import { applyPeriodPickerNavigation, type PeriodPickerNavigationEvent } from './internal/period-picker.js';
export type { PeriodPickerNavigationEvent } from './internal/period-picker.js';
import { createDateValue, tryCreateDateValue, type DateValue } from './date-field.js';
import {
  applyDatePickerEvent,
  tryCreateDatePickerState,
  type DatePickerCommand,
  type DatePickerEvent,
  type DatePickerPolicies,
  type DatePickerState,
  type DatePickerStateInput,
  type DatePickerUpdate,
} from './date-picker.js';
export type MonthPickerValue = DateValue;
export type MonthPickerState = DatePickerState;
export type MonthPickerStateInput = DatePickerStateInput;
export type MonthPickerEvent = DatePickerEvent | PeriodPickerNavigationEvent;
export type MonthPickerCommand = DatePickerCommand;
export type MonthPickerPolicies = DatePickerPolicies;
export type MonthPickerUpdate = DatePickerUpdate;

export function createMonthPickerValue(year: number, month: number): MonthPickerValue {
  return createDateValue(year, month, 1);
}

export function tryCreateMonthPickerValue(year: number, month: number): TemporalResult<MonthPickerValue> {
  return tryCreateDateValue(year, month, 1);
}

export function createMonthPickerState(input: MonthPickerStateInput = {}): MonthPickerState {
  return unwrap(tryCreateMonthPickerState(input));
}

export function tryCreateMonthPickerState(input: MonthPickerStateInput = {}): TemporalResult<MonthPickerState> {
  if (input.value === undefined || input.value === null) return tryCreateDatePickerState(input);
  const value = tryCreateMonthPickerValue(input.value.year, input.value.month);
  return value.ok ? tryCreateDatePickerState({ ...input, value: value.value }) : value;
}

export function applyMonthPickerEvent(state: MonthPickerState, event: MonthPickerEvent, policies: MonthPickerPolicies = {}): TemporalResult<MonthPickerUpdate> {
  const valid = tryCreateMonthPickerState(state);
  if (!valid.ok) return { ok: false, error: { ...valid.error, class: 'transition-rejection' } };
  if (typeof event === 'object' && event.type === 'navigate-period') return applyPeriodPickerNavigation(valid.value, event, policies);
  if (event === 'select-highlighted' || (typeof event === 'object' && event.type === 'select-month')) {
    const requested = event === 'select-highlighted' ? valid.value.highlighted : event.value;
    const value = tryCreateMonthPickerValue(requested.year, requested.month);
    if (!value.ok) return { ok: false, error: { ...value.error, class: 'transition-rejection' } };
    return applyDatePickerEvent(valid.value, { type: 'select', value: value.value }, policies);
  }
  if (typeof event === 'object' && (event.type === 'select' || event.type === 'set-value') && event.value !== null) {
    const value = tryCreateMonthPickerValue(event.value.year, event.value.month);
    if (!value.ok) return { ok: false, error: { ...value.error, class: 'transition-rejection' } };
    return applyDatePickerEvent(valid.value, { ...event, value: value.value }, policies);
  }
  return applyDatePickerEvent(valid.value, event, policies);
}

export {
  createCalendarYear as createMonthPickerYear,
  isCalendarValueAvailable as isMonthPickerValueAvailable,
  tryCreateCalendarYear as tryCreateMonthPickerYear,
} from './calendar.js';
export type { CalendarMonthValue as MonthPickerCellValue } from './calendar.js';
