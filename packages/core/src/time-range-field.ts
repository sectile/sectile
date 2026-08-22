import type { ErrorClass, Result } from './shared.js';
import { fail, ok } from './internal/kernel/foundation.js';
import { createMachineUpdate } from './internal/kernel/machine.js';
import type { TextEditingState } from './text.js';
import { applyTimeFieldEvent, compareTimeValues, createTimeFieldState, createTimeValue, type TimeFieldEvent, type TimeFieldPolicies, type TimeFieldState, type TimeValue } from './time-field.js';

export interface TimeRange { readonly start: TimeValue; readonly end: TimeValue }
export type TimeRangeFieldEndpoint = 'start' | 'end';
export interface TimeRangeFieldState { readonly value: TimeRange | null; readonly start: TimeFieldState; readonly end: TimeFieldState; readonly active: TimeRangeFieldEndpoint }
export interface TimeRangeFieldStateInput { readonly value?: TimeRange | null; readonly startValue?: TimeValue | null; readonly endValue?: TimeValue | null; readonly startInputState?: TextEditingState; readonly endInputState?: TextEditingState; readonly active?: TimeRangeFieldEndpoint }
export type TimeRangeFieldEvent = { readonly type: 'field'; readonly endpoint: TimeRangeFieldEndpoint; readonly event: TimeFieldEvent } | { readonly type: 'focus'; readonly endpoint: TimeRangeFieldEndpoint } | 'cancel';
export type TimeRangeFieldCommand = { readonly type: 'input-state-changed'; readonly endpoint: TimeRangeFieldEndpoint; readonly value: TextEditingState } | { readonly type: 'range-committed'; readonly value: TimeRange | null } | { readonly type: 'focus-endpoint'; readonly endpoint: TimeRangeFieldEndpoint };
export interface TimeRangeFieldPolicies extends TimeFieldPolicies {}
export interface TimeRangeFieldUpdate { readonly state: TimeRangeFieldState; readonly commands: readonly TimeRangeFieldCommand[] }

export function createTimeRange(start: TimeValue, end: TimeValue): Result<TimeRange> {
  const validStart = createTimeValue(start.hour, start.minute, start.second, start.millisecond); if (!validStart.ok) return validStart;
  const validEnd = createTimeValue(end.hour, end.minute, end.second, end.millisecond); if (!validEnd.ok) return validEnd;
  return compareTimeValues(validStart.value, validEnd.value) <= 0 ? ok(Object.freeze({ start: validStart.value, end: validEnd.value })) : fail('construction', 'inverted-time-range', 'Time range start must not be after end.');
}

export function createTimeRangeFieldState(input: TimeRangeFieldStateInput = {}): Result<TimeRangeFieldState> {
  const range = input.value === undefined || input.value === null ? ok<TimeRange | null>(null) : completeRange(input.value.start, input.value.end, 'construction'); if (!range.ok) return range;
  const startValue = input.startValue !== undefined ? input.startValue : range.value?.start ?? null;
  const endValue = input.endValue !== undefined ? input.endValue : range.value?.end ?? null;
  const start = createTimeFieldState(startValue, input.startInputState); if (!start.ok) return start;
  const end = createTimeFieldState(endValue, input.endInputState); if (!end.ok) return end;
  const value = completeRange(start.value.value, end.value.value, 'construction'); if (!value.ok) return value;
  const active = input.active ?? 'start'; if (active !== 'start' && active !== 'end') return fail('construction', 'invalid-time-range-field-endpoint', 'Time range field active endpoint must be start or end.');
  return ok(Object.freeze({ value: value.value, start: start.value, end: end.value, active }));
}

export function applyTimeRangeFieldEvent(state: TimeRangeFieldState, event: TimeRangeFieldEvent, policies: TimeRangeFieldPolicies = {}): Result<TimeRangeFieldUpdate> {
  const valid = createTimeRangeFieldState({ startValue: state.start.value, endValue: state.end.value, startInputState: state.start.inputState, endInputState: state.end.inputState, active: state.active }); if (!valid.ok) return invalidTransition(valid);
  if (event === 'cancel') {
    const start = applyTimeFieldEvent(valid.value.start, 'cancel', endpointPolicies(policies)); if (!start.ok) return start;
    const end = applyTimeFieldEvent(valid.value.end, 'cancel', endpointPolicies(policies)); if (!end.ok) return end;
    return composeState(start.value.state, end.value.state, valid.value.active, [{ type: 'input-state-changed', endpoint: 'start', value: start.value.state.inputState }, { type: 'input-state-changed', endpoint: 'end', value: end.value.state.inputState }]);
  }
  if (event.type === 'focus') return createMachineUpdate(Object.freeze({ ...valid.value, active: event.endpoint }), [{ type: 'focus-endpoint', endpoint: event.endpoint }]);
  const active = event.endpoint; const changed = applyTimeFieldEvent(active === 'start' ? valid.value.start : valid.value.end, event.event, endpointPolicies(policies)); if (!changed.ok) return changed;
  const start = active === 'start' ? changed.value.state : valid.value.start; const end = active === 'end' ? changed.value.state : valid.value.end;
  const next = completeRange(start.value, end.value); if (!next.ok) return next;
  const commands: TimeRangeFieldCommand[] = changed.value.commands.filter((command) => command.type === 'input-state-changed').map((command) => ({ type: 'input-state-changed', endpoint: active, value: command.value }));
  if ((event.event === 'commit' || typeof event.event === 'object' && event.event.type === 'set-value') && !sameRange(valid.value.value, next.value)) commands.push({ type: 'range-committed', value: next.value });
  return composeState(start, end, active, commands);
}

function composeState(start: TimeFieldState, end: TimeFieldState, active: TimeRangeFieldEndpoint, commands: readonly TimeRangeFieldCommand[]): Result<TimeRangeFieldUpdate> { const value = completeRange(start.value, end.value); return value.ok ? createMachineUpdate(Object.freeze({ value: value.value, start, end, active }), commands) : value; }
function completeRange(start: TimeValue | null, end: TimeValue | null, errorClass: ErrorClass = 'transition-rejection'): Result<TimeRange | null> { if (start === null || end === null) return ok(null); const range = createTimeRange(start, end); return range.ok ? ok(range.value) : fail(errorClass, 'inverted-time-range-field', 'Time range field start must not be after end.'); }
function endpointPolicies(policies: TimeRangeFieldPolicies): TimeFieldPolicies { const { required: _required, ...rest } = policies; return rest; }
function sameRange(left: TimeRange | null, right: TimeRange | null): boolean { return left === null || right === null ? left === right : compareTimeValues(left.start, right.start) === 0 && compareTimeValues(left.end, right.end) === 0; }
function invalidTransition<T>(result: Result<T>): Result<never> { return result.ok ? fail('internal-invariant', 'unexpected-valid-result', 'Expected an invalid result.') : { ok: false, error: { ...result.error, class: 'transition-rejection' } }; }
