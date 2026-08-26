import { unwrap } from '@sectile/core/result';
import type { Result } from '@sectile/core';
import { fail, ok } from './internal/foundation.js';
import { createMachineUpdate } from './internal/machine.js';
import { compareDateValues, createDateValue, type DateValue,tryCreateDateValue } from './date-field.js';
import {
  compareDateTimeValues,
  createDateTimeRange,
  createDateTimeValue,
  type DateTimeRange,
  type DateTimeValue,
  tryCreateDateTimeRange,
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

export interface DateTimeRangePickerState {
  readonly value: DateTimeRange | null;
  readonly anchor: DateValue | null;
  readonly startTime: TimeValue;
  readonly endTime: TimeValue;
  readonly calendar: DatePickerState;
}

export type DateTimeRangePickerEvent =
  | 'open'
  | 'close'
  | 'toggle'
  | 'clear'
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
  | { readonly type: 'set-start-date'; readonly value: DateValue }
  | { readonly type: 'set-end-date'; readonly value: DateValue }
  | { readonly type: 'set-start-time'; readonly value: TimeValue }
  | { readonly type: 'set-end-time'; readonly value: TimeValue }
  | { readonly type: 'set-value'; readonly value: DateTimeRange | null };

export type DateTimeRangePickerCommand =
  | { readonly type: 'range-committed'; readonly value: DateTimeRange | null }
  | { readonly type: 'range-anchor-changed'; readonly value: DateValue | null }
  | { readonly type: 'start-time-changed'; readonly value: TimeValue }
  | { readonly type: 'end-time-changed'; readonly value: TimeValue }
  | { readonly type: 'highlight-changed'; readonly value: DateValue }
  | { readonly type: 'view-mode-changed'; readonly value: DatePickerViewMode }
  | { readonly type: 'open-changed'; readonly open: boolean };

export interface DateTimeRangePickerPolicies {
  readonly date?: DatePickerPolicies;
  readonly startTime?: TimeFieldPolicies;
  readonly endTime?: TimeFieldPolicies;
  readonly min?: DateTimeValue;
  readonly max?: DateTimeValue;
  readonly required?: boolean;
  readonly unavailable?: (value: DateTimeValue) => boolean;
}

export type DateTimeRangePickerUnavailablePredicate = NonNullable<DateTimeRangePickerPolicies['unavailable']>;

export interface DateTimeRangePickerUpdate {
  readonly state: DateTimeRangePickerState;
  readonly commands: readonly DateTimeRangePickerCommand[];
}

export interface DateTimeRangePickerStateInput {
  readonly value?: DateTimeRange | null;
  readonly anchor?: DateValue | null;
  readonly startTime?: TimeValue;
  readonly endTime?: TimeValue;
  readonly calendar?: Partial<DatePickerState>;
}

const MIDNIGHT: TimeValue = Object.freeze({ hour: 0, minute: 0, second: 0, millisecond: 0 });

export function createDateTimeRangePickerState(
  input: DateTimeRangePickerStateInput = {},
): DateTimeRangePickerState {
  return unwrap(tryCreateDateTimeRangePickerState(input));
}

export function tryCreateDateTimeRangePickerState(
  input: DateTimeRangePickerStateInput = {},
): Result<DateTimeRangePickerState> {
  const value = input.value === undefined || input.value === null
    ? ok(null)
    : tryCreateDateTimeRange(input.value.start, input.value.end);
  if (!value.ok) return value;
  const anchor = input.anchor === undefined || input.anchor === null
    ? ok(null)
    : tryCreateDateValue(input.anchor.year, input.anchor.month, input.anchor.day);
  if (!anchor.ok) return anchor;
  const requestedStartTime = value.value?.start.time ?? input.startTime ?? MIDNIGHT;
  const requestedEndTime = value.value?.end.time ?? input.endTime ?? MIDNIGHT;
  const startTime = tryCreateTimeValue(
    requestedStartTime.hour,
    requestedStartTime.minute,
    requestedStartTime.second,
    requestedStartTime.millisecond,
  );
  if (!startTime.ok) return startTime;
  const endTime = tryCreateTimeValue(
    requestedEndTime.hour,
    requestedEndTime.minute,
    requestedEndTime.second,
    requestedEndTime.millisecond,
  );
  if (!endTime.ok) return endTime;
  const fallback = anchor.value ?? value.value?.end.date;
  const calendar = tryCreateDatePickerState({
    value: null,
    ...(input.calendar?.highlighted === undefined && fallback !== undefined
      ? { highlighted: fallback }
      : {}),
    ...input.calendar,
  });
  if (!calendar.ok) return calendar;
  return ok(Object.freeze({
    value: value.value,
    anchor: anchor.value,
    startTime: startTime.value,
    endTime: endTime.value,
    calendar: calendar.value,
  }));
}

export function applyDateTimeRangePickerEvent(
  state: DateTimeRangePickerState,
  event: DateTimeRangePickerEvent,
  policies: DateTimeRangePickerPolicies = {},
): Result<DateTimeRangePickerUpdate> {
  const valid = tryCreateDateTimeRangePickerState(state);
  if (!valid.ok) return invalidTransition(valid);
  const policy = validatePolicies(policies);
  if (!policy.ok) return policy;

  if (event === 'clear') return commitRange(valid.value, null, policies);
  if (typeof event === 'object' && event.type === 'set-value') {
    return commitRange(valid.value, event.value, policies);
  }
  if (typeof event === 'object' && event.type === 'set-start-time') {
    return setEndpointTime(valid.value, 'start', event.value, policies);
  }
  if (typeof event === 'object' && event.type === 'set-end-time') {
    return setEndpointTime(valid.value, 'end', event.value, policies);
  }
  if (typeof event === 'object' && event.type === 'set-start-date') {
    return setEndpointDate(valid.value, 'start', event.value, policies);
  }
  if (typeof event === 'object' && event.type === 'set-end-date') {
    return setEndpointDate(valid.value, 'end', event.value, policies);
  }
  if (event === 'select-highlighted') {
    return selectDate(valid.value, valid.value.calendar.highlighted, policies);
  }
  if (typeof event === 'object' && event.type === 'select-date') {
    return selectDate(valid.value, event.value, policies);
  }

  const update = applyDatePickerEvent(valid.value.calendar, event, policies.date);
  if (!update.ok) return update;
  return createMachineUpdate(
    Object.freeze({ ...valid.value, calendar: update.value.state }),
    update.value.commands.flatMap((command): DateTimeRangePickerCommand[] =>
      command.type === 'highlight-changed' || command.type === 'view-mode-changed' || command.type === 'open-changed' ? [command] : []),
  );
}

function selectDate(
  state: DateTimeRangePickerState,
  requested: DateValue,
  policies: DateTimeRangePickerPolicies,
): Result<DateTimeRangePickerUpdate> {
  const date = tryCreateDateValue(requested.year, requested.month, requested.day);
  if (!date.ok) return invalidTransition(date);
  if (!isDatePickerValueAvailable(date.value, policies.date)) {
    return fail('transition-rejection', 'date-time-range-picker-date-unavailable', 'Date-time range endpoint is outside its selectable domain.');
  }
  if (state.anchor === null) {
    const calendar = tryCreateDatePickerState({
      value: null,
      highlighted: date.value,
      view: { year: date.value.year, month: date.value.month },
      viewMode: state.calendar.viewMode,
      open: true,
    });
    if (!calendar.ok) return calendar;
    return createMachineUpdate(
      Object.freeze({ ...state, anchor: date.value, calendar: calendar.value }),
      [
        ...(compareDateValues(state.calendar.highlighted, date.value) === 0
          ? []
          : [{ type: 'highlight-changed' as const, value: date.value }]),
        { type: 'range-anchor-changed', value: date.value },
      ],
    );
  }
  const startDate = compareDateValues(state.anchor, date.value) <= 0 ? state.anchor : date.value;
  const endDate = compareDateValues(state.anchor, date.value) <= 0 ? date.value : state.anchor;
  const start = tryCreateDateTimeValue(startDate, state.startTime);
  if (!start.ok) return start;
  const end = tryCreateDateTimeValue(endDate, state.endTime);
  if (!end.ok) return end;
  const range = tryCreateDateTimeRange(start.value, end.value);
  return range.ok ? commitRange(state, range.value, policies, date.value) : range;
}

function setEndpointTime(
  state: DateTimeRangePickerState,
  endpoint: 'start' | 'end',
  requested: TimeValue,
  policies: DateTimeRangePickerPolicies,
): Result<DateTimeRangePickerUpdate> {
  const time = validateTime(requested, endpoint === 'start' ? policies.startTime : policies.endTime, endpoint);
  if (!time.ok) return time;
  if (state.value === null) {
    return createMachineUpdate(
      Object.freeze({
        ...state,
        ...(endpoint === 'start' ? { startTime: time.value } : { endTime: time.value }),
      }),
      [{ type: endpoint === 'start' ? 'start-time-changed' : 'end-time-changed', value: time.value }],
    );
  }
  const start = endpoint === 'start'
    ? tryCreateDateTimeValue(state.value.start.date, time.value)
    : ok(state.value.start);
  if (!start.ok) return start;
  const end = endpoint === 'end'
    ? tryCreateDateTimeValue(state.value.end.date, time.value)
    : ok(state.value.end);
  if (!end.ok) return end;
  const range = tryCreateDateTimeRange(start.value, end.value);
  return range.ok ? commitRange(state, range.value, policies) : range;
}

function setEndpointDate(
  state: DateTimeRangePickerState,
  endpoint: 'start' | 'end',
  requested: DateValue,
  policies: DateTimeRangePickerPolicies,
): Result<DateTimeRangePickerUpdate> {
  const date = tryCreateDateValue(requested.year, requested.month, requested.day);
  if (!date.ok) return invalidTransition(date);
  const fallback = state.value === null ? date.value : endpoint === 'start' ? state.value.end.date : state.value.start.date;
  const start = tryCreateDateTimeValue(endpoint === 'start' ? date.value : fallback, state.startTime);
  if (!start.ok) return start;
  const end = tryCreateDateTimeValue(endpoint === 'end' ? date.value : fallback, state.endTime);
  if (!end.ok) return end;
  const range = tryCreateDateTimeRange(start.value, end.value);
  return range.ok ? commitRange(state, range.value, policies, date.value) : range;
}

function commitRange(
  state: DateTimeRangePickerState,
  requested: DateTimeRange | null,
  policies: DateTimeRangePickerPolicies,
  highlighted?: DateValue,
): Result<DateTimeRangePickerUpdate> {
  if (requested === null) {
    if (policies.required === true) {
      return fail('transition-rejection', 'date-time-range-picker-value-required', 'Date-time range picker requires a range.');
    }
    return createMachineUpdate(
      Object.freeze({ ...state, value: null, anchor: null }),
      [
        { type: 'range-committed', value: null },
        ...(state.anchor === null ? [] : [{ type: 'range-anchor-changed' as const, value: null }]),
      ],
    );
  }
  const range = tryCreateDateTimeRange(requested.start, requested.end);
  if (!range.ok) return invalidTransition(range);
  const start = validateEndpoint(range.value.start, policies, 'start');
  if (!start.ok) return start;
  const end = validateEndpoint(range.value.end, policies, 'end');
  if (!end.ok) return end;
  const selectedHighlight = highlighted ?? range.value.end.date;
  const calendar = tryCreateDatePickerState({
    value: null,
    highlighted: selectedHighlight,
    view: { year: selectedHighlight.year, month: selectedHighlight.month },
    viewMode: state.calendar.viewMode,
    open: state.calendar.open,
  });
  if (!calendar.ok) return calendar;
  return createMachineUpdate(
    Object.freeze({
      value: range.value,
      anchor: null,
      startTime: range.value.start.time,
      endTime: range.value.end.time,
      calendar: calendar.value,
    }),
    [
      { type: 'range-committed', value: range.value },
      ...(state.anchor === null ? [] : [{ type: 'range-anchor-changed' as const, value: null }]),
      ...(compareTimeValues(state.startTime, range.value.start.time) === 0
        ? []
        : [{ type: 'start-time-changed' as const, value: range.value.start.time }]),
      ...(compareTimeValues(state.endTime, range.value.end.time) === 0
        ? []
        : [{ type: 'end-time-changed' as const, value: range.value.end.time }]),
      ...(compareDateValues(state.calendar.highlighted, selectedHighlight) === 0
        ? []
        : [{ type: 'highlight-changed' as const, value: selectedHighlight }]),
    ],
  );
}

function validateEndpoint(
  value: DateTimeValue,
  policies: DateTimeRangePickerPolicies,
  endpoint: 'start' | 'end',
): Result<DateTimeValue> {
  const valid = tryCreateDateTimeValue(value.date, value.time);
  if (!valid.ok) return invalidTransition(valid);
  if (!isDatePickerValueAvailable(valid.value.date, policies.date)) {
    return fail('transition-rejection', 'date-time-range-picker-date-unavailable', 'Date-time range endpoint is outside its selectable domain.');
  }
  const time = validateTime(
    valid.value.time,
    endpoint === 'start' ? policies.startTime : policies.endTime,
    endpoint,
  );
  if (!time.ok) return time;
  if (policies.min !== undefined && compareDateTimeValues(valid.value, policies.min) < 0) {
    return fail('transition-rejection', 'date-time-range-picker-value-below-minimum', 'Date-time range endpoint is below its minimum.');
  }
  if (policies.max !== undefined && compareDateTimeValues(valid.value, policies.max) > 0) {
    return fail('transition-rejection', 'date-time-range-picker-value-above-maximum', 'Date-time range endpoint is above its maximum.');
  }
  if (policies.unavailable?.(valid.value) === true) {
    return fail('transition-rejection', 'date-time-range-picker-value-unavailable', 'Date-time range endpoint is unavailable.');
  }
  return valid;
}

function validateTime(
  value: TimeValue,
  policies: TimeFieldPolicies = {},
  endpoint: 'start' | 'end',
): Result<TimeValue> {
  const valid = tryCreateTimeValue(value.hour, value.minute, value.second, value.millisecond);
  if (!valid.ok) return invalidTransition(valid);
  if (policies.min !== undefined && compareTimeValues(valid.value, policies.min) < 0) {
    return fail('transition-rejection', `date-time-range-picker-${endpoint}-time-below-minimum`, `Date-time range ${endpoint} time is below its minimum.`);
  }
  if (policies.max !== undefined && compareTimeValues(valid.value, policies.max) > 0) {
    return fail('transition-rejection', `date-time-range-picker-${endpoint}-time-above-maximum`, `Date-time range ${endpoint} time is above its maximum.`);
  }
  return valid;
}

function validatePolicies(policies: DateTimeRangePickerPolicies): Result<true> {
  if (policies.unavailable !== undefined && typeof policies.unavailable !== 'function') {
    return fail('construction', 'invalid-date-time-range-picker-unavailable-policy', 'Date-time range picker unavailable policy must be a function.');
  }
  if (policies.min !== undefined && policies.max !== undefined && compareDateTimeValues(policies.min, policies.max) > 0) {
    return fail('construction', 'inverted-date-time-range-picker-bounds', 'Date-time range picker minimum must not follow its maximum.');
  }
  return ok(true);
}

function invalidTransition<T>(result: Result<T>): Result<never> {
  return result.ok
    ? fail('internal-invariant', 'unexpected-valid-result', 'Expected an invalid result.')
    : { ok: false, error: { ...result.error, class: 'transition-rejection' } };
}
