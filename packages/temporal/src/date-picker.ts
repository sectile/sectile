import { unwrap } from '@sectile/core/result';
import type { Result } from '@sectile/core';
import {
  applyCalendarEvent,
  tryCreateCalendarState,
  type CalendarCommand,
  type CalendarEvent,
  type CalendarPolicies,
  type CalendarState,
  type CalendarStateInput,
} from './calendar.js';
import { fail, ok } from './internal/foundation.js';
import { createMachineUpdate } from './internal/machine.js';

export interface DatePickerState extends CalendarState {
  readonly open: boolean;
}

export type DatePickerEvent = CalendarEvent | 'open' | 'close' | 'toggle';

export type DatePickerCommand = CalendarCommand | { readonly type: 'open-changed'; readonly open: boolean };

export interface DatePickerPolicies extends CalendarPolicies {}

export type DatePickerUnavailablePredicate = NonNullable<DatePickerPolicies['unavailable']>;

export interface DatePickerUpdate {
  readonly state: DatePickerState;
  readonly commands: readonly DatePickerCommand[];
}

export interface DatePickerStateInput extends CalendarStateInput {
  readonly open?: boolean;
}

export function createDatePickerState(input: DatePickerStateInput = {}): DatePickerState {
  return unwrap(tryCreateDatePickerState(input));
}

export function tryCreateDatePickerState(input: DatePickerStateInput = {}): Result<DatePickerState> {
  const calendar = tryCreateCalendarState(input);
  if (!calendar.ok) return calendar;
  if (typeof input.open !== 'undefined' && typeof input.open !== 'boolean') return fail('construction', 'invalid-date-picker-open', 'Date picker open state must be boolean.');
  return ok(pickerState(calendar.value, input.open ?? false));
}

export function applyDatePickerEvent(state: DatePickerState, event: DatePickerEvent, policies: DatePickerPolicies = {}): Result<DatePickerUpdate> {
  const valid = tryCreateDatePickerState(state);
  if (!valid.ok) return invalidTransition(valid);
  if (event === 'open' || event === 'close' || event === 'toggle') {
    const open = event === 'toggle' ? !state.open : event === 'open';
    if (open === state.open) return createMachineUpdate(state);
    return createMachineUpdate(pickerState(state, open), [{ type: 'open-changed', open }]);
  }
  const calendar = applyCalendarEvent(state, event, policies);
  if (!calendar.ok) return calendar;
  const open = closesPicker(event) ? false : state.open;
  return createMachineUpdate(pickerState(calendar.value.state, open), [
    ...calendar.value.commands,
    ...openChanged(state.open, open),
  ]);
}

function pickerState(calendar: CalendarState, open: boolean): DatePickerState {
  return Object.freeze({ ...calendar, open });
}
function closesPicker(event: CalendarEvent): boolean {
  return event === 'select-highlighted' || (typeof event === 'object' && event.type === 'select');
}
function openChanged(previous: boolean, next: boolean): DatePickerCommand[] {
  return previous === next ? [] : [{ type: 'open-changed', open: next }];
}
function invalidTransition<T>(result: Result<T>): Result<never> {
  return result.ok ? fail('internal-invariant', 'unexpected-valid-result', 'Expected an invalid result.') : { ok: false, error: { ...result.error, class: 'transition-rejection' } };
}
