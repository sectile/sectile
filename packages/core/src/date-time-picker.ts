import { unwrap } from './result.js';
import type { Result } from './shared.js';
import { fail, ok } from './internal/kernel/foundation.js';
import { createMachineUpdate } from './internal/kernel/machine.js';
import { compareDateValues, createDateValue, type DateValue,tryCreateDateValue } from './date-field.js';
import {
  compareDateTimeValues,
  createDateTimeValue,
  type DateTimeValue,
  tryCreateDateTimeValue,
} from './date-time-field.js';
import {
  applyDatePickerEvent,
  createDatePickerState,
  isDatePickerValueAvailable,
  type DatePickerPolicies,
  type DatePickerState,
  type DatePickerViewMode,
  tryCreateDatePickerState,
} from './date-picker.js';
import {
  compareTimeValues,
  createTimeValue,
  type TimeFieldPolicies,
  type TimeValue,
  tryCreateTimeValue,
} from './time-field.js';

export interface DateTimePickerState {
  readonly value: DateTimeValue | null;
  readonly time: TimeValue;
  readonly calendar: DatePickerState;
}

export type DateTimePickerEvent =
  | 'open'
  | 'close'
  | 'toggle'
  | 'previous-month'
  | 'next-month'
  | 'previous-year'
  | 'next-year'
  | 'previous-day'
  | 'next-day'
  | 'previous-week'
  | 'next-week'
  | 'start-of-week'
  | 'end-of-week'
  | 'select-highlighted'
  | { readonly type: 'set-view-mode'; readonly value: DatePickerViewMode }
  | { readonly type: 'select-month'; readonly value: { readonly year: number; readonly month: number } }
  | { readonly type: 'select-date'; readonly value: DateValue }
  | { readonly type: 'set-date'; readonly value: DateValue }
  | { readonly type: 'set-time'; readonly value: TimeValue }
  | { readonly type: 'set-value'; readonly value: DateTimeValue | null };

export type DateTimePickerCommand =
  | { readonly type: 'value-committed'; readonly value: DateTimeValue | null }
  | { readonly type: 'time-changed'; readonly value: TimeValue }
  | { readonly type: 'highlight-changed'; readonly value: DateValue }
  | { readonly type: 'view-mode-changed'; readonly value: DatePickerViewMode }
  | { readonly type: 'open-changed'; readonly open: boolean };

export interface DateTimePickerPolicies {
  readonly date?: DatePickerPolicies;
  readonly time?: TimeFieldPolicies;
  readonly min?: DateTimeValue;
  readonly max?: DateTimeValue;
  readonly required?: boolean;
  readonly unavailable?: (value: DateTimeValue) => boolean;
  readonly defaultTime?: TimeValue;
}

export type DateTimePickerUnavailablePredicate = NonNullable<DateTimePickerPolicies['unavailable']>;

export interface DateTimePickerUpdate {
  readonly state: DateTimePickerState;
  readonly commands: readonly DateTimePickerCommand[];
}

export interface DateTimePickerStateInput {
  readonly value?: DateTimeValue | null;
  readonly time?: TimeValue;
  readonly calendar?: Partial<DatePickerState>;
}

export function createDateTimePickerState(
  input: DateTimePickerStateInput = {},
): DateTimePickerState {
  return unwrap(tryCreateDateTimePickerState(input));
}

export function tryCreateDateTimePickerState(
  input: DateTimePickerStateInput = {},
): Result<DateTimePickerState> {
  const value = input.value ?? null;
  const validValue = value === null ? ok(null) : tryCreateDateTimeValue(value.date, value.time);
  if (!validValue.ok) return validValue;
  const requestedTime = validValue.value?.time ?? input.time ?? Object.freeze({
    hour: 0,
    minute: 0,
    second: 0,
    millisecond: 0,
  });
  const time = tryCreateTimeValue(
    requestedTime.hour,
    requestedTime.minute,
    requestedTime.second,
    requestedTime.millisecond,
  );
  if (!time.ok) return time;
  const fallback = validValue.value?.date;
  const calendar = tryCreateDatePickerState({
    value: null,
    ...(input.calendar?.highlighted === undefined && fallback !== undefined
      ? { highlighted: fallback }
      : {}),
    ...input.calendar,
  });
  if (!calendar.ok) return calendar;
  return ok(Object.freeze({ value: validValue.value, time: time.value, calendar: calendar.value }));
}

export function applyDateTimePickerEvent(
  state: DateTimePickerState,
  event: DateTimePickerEvent,
  policies: DateTimePickerPolicies = {},
): Result<DateTimePickerUpdate> {
  const valid = tryCreateDateTimePickerState(state);
  if (!valid.ok) return invalidTransition(valid);
  const policy = validatePolicies(policies);
  if (!policy.ok) return policy;

  if (typeof event === 'object' && event.type === 'set-value') {
    return commitValue(valid.value, event.value, policies);
  }
  if (typeof event === 'object' && event.type === 'set-time') {
    const time = validateTime(event.value, policies.time);
    if (!time.ok) return time;
    const value = tryCreateDateTimeValue(valid.value.value?.date ?? valid.value.calendar.highlighted, time.value);
    return value.ok ? commitValue(valid.value, value.value, policies) : value;
  }
  if (event === 'select-highlighted') {
    return selectDate(valid.value, valid.value.calendar.highlighted, policies);
  }
  if (typeof event === 'object' && (event.type === 'select-date' || event.type === 'set-date')) {
    return selectDate(valid.value, event.value, policies);
  }

  const update = applyDatePickerEvent(valid.value.calendar, event, policies.date);
  if (!update.ok) return update;
  return createMachineUpdate(
    Object.freeze({ value: valid.value.value, time: valid.value.time, calendar: update.value.state }),
    update.value.commands.flatMap((command): DateTimePickerCommand[] =>
      command.type === 'highlight-changed' || command.type === 'view-mode-changed' || command.type === 'open-changed' ? [command] : []),
  );
}

function selectDate(
  state: DateTimePickerState,
  requested: DateValue,
  policies: DateTimePickerPolicies,
): Result<DateTimePickerUpdate> {
  const date = tryCreateDateValue(requested.year, requested.month, requested.day);
  if (!date.ok) return invalidTransition(date);
  if (!isDatePickerValueAvailable(date.value, policies.date)) {
    return fail(
      'transition-rejection',
      'date-time-picker-date-unavailable',
      'Date-time picker date is outside its selectable domain.',
    );
  }
  const value = tryCreateDateTimeValue(date.value, state.time);
  return value.ok ? commitValue(state, value.value, policies) : value;
}

function commitValue(
  state: DateTimePickerState,
  requested: DateTimeValue | null,
  policies: DateTimePickerPolicies,
): Result<DateTimePickerUpdate> {
  if (requested === null) {
    if (policies.required === true) {
      return fail(
        'transition-rejection',
        'date-time-picker-value-required',
        'Date-time picker requires a value.',
      );
    }
    return createMachineUpdate(
      Object.freeze({ value: null, time: state.time, calendar: state.calendar }),
      [{ type: 'value-committed', value: null }],
    );
  }
  const value = validateValue(requested, policies);
  if (!value.ok) return value;
  const calendar = tryCreateDatePickerState({
    value: null,
    highlighted: value.value.date,
    view: { year: value.value.date.year, month: value.value.date.month },
    viewMode: state.calendar.viewMode,
    open: state.calendar.open,
  });
  if (!calendar.ok) return calendar;
  return createMachineUpdate(
    Object.freeze({ value: value.value, time: value.value.time, calendar: calendar.value }),
    [
      { type: 'value-committed', value: value.value },
      ...(compareTimeValues(state.time, value.value.time) === 0
        ? []
        : [{ type: 'time-changed' as const, value: value.value.time }]),
      ...(compareDateValues(state.calendar.highlighted, value.value.date) === 0
        ? []
        : [{ type: 'highlight-changed' as const, value: value.value.date }]),
    ],
  );
}

function validateValue(
  requested: DateTimeValue,
  policies: DateTimePickerPolicies,
): Result<DateTimeValue> {
  const value = tryCreateDateTimeValue(requested.date, requested.time);
  if (!value.ok) return invalidTransition(value);
  if (!isDatePickerValueAvailable(value.value.date, policies.date)) {
    return fail('transition-rejection', 'date-time-picker-date-unavailable', 'Date-time picker date is outside its selectable domain.');
  }
  const time = validateTime(value.value.time, policies.time);
  if (!time.ok) return time;
  if (policies.min !== undefined && compareDateTimeValues(value.value, policies.min) < 0) {
    return fail('transition-rejection', 'date-time-picker-value-below-minimum', 'Date-time picker value is below its minimum.');
  }
  if (policies.max !== undefined && compareDateTimeValues(value.value, policies.max) > 0) {
    return fail('transition-rejection', 'date-time-picker-value-above-maximum', 'Date-time picker value is above its maximum.');
  }
  if (policies.unavailable?.(value.value) === true) {
    return fail('transition-rejection', 'date-time-picker-value-unavailable', 'Date-time picker value is unavailable.');
  }
  return value;
}

function validateTime(value: TimeValue, policies: TimeFieldPolicies = {}): Result<TimeValue> {
  const valid = tryCreateTimeValue(value.hour, value.minute, value.second, value.millisecond);
  if (!valid.ok) return invalidTransition(valid);
  if (policies.min !== undefined && compareTimeValues(valid.value, policies.min) < 0) {
    return fail('transition-rejection', 'date-time-picker-time-below-minimum', 'Date-time picker time is below its minimum.');
  }
  if (policies.max !== undefined && compareTimeValues(valid.value, policies.max) > 0) {
    return fail('transition-rejection', 'date-time-picker-time-above-maximum', 'Date-time picker time is above its maximum.');
  }
  return valid;
}

function validatePolicies(policies: DateTimePickerPolicies): Result<true> {
  if (policies.unavailable !== undefined && typeof policies.unavailable !== 'function') {
    return fail('construction', 'invalid-date-time-picker-unavailable-policy', 'Date-time picker unavailable policy must be a function.');
  }
  if (policies.defaultTime !== undefined) {
    const time = validateTime(policies.defaultTime, policies.time);
    if (!time.ok) return time;
  }
  if (policies.min !== undefined && policies.max !== undefined && compareDateTimeValues(policies.min, policies.max) > 0) {
    return fail('construction', 'inverted-date-time-picker-bounds', 'Date-time picker minimum must not follow its maximum.');
  }
  return ok(true);
}

function invalidTransition<T>(result: Result<T>): Result<never> {
  return result.ok
    ? fail('internal-invariant', 'unexpected-valid-result', 'Expected an invalid result.')
    : { ok: false, error: { ...result.error, class: 'transition-rejection' } };
}
