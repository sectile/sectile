import type { ErrorClass, Result } from './shared.js';
import { fail, ok } from './internal/kernel/foundation.js';
import { createMachineUpdate } from './internal/kernel/machine.js';
import type { TextEditingState } from './text.js';
import { applyDateFieldEvent, compareDateValues, createDateFieldState, createDateRange, type DateFieldEvent, type DateFieldPolicies, type DateFieldState, type DateRange, type DateValue } from './date-field.js';

export type DateRangeFieldEndpoint = 'start' | 'end';
export interface DateRangeFieldState { readonly value: DateRange | null; readonly start: DateFieldState; readonly end: DateFieldState; readonly active: DateRangeFieldEndpoint }
export interface DateRangeFieldStateInput { readonly value?: DateRange | null; readonly startValue?: DateValue | null; readonly endValue?: DateValue | null; readonly startInputState?: TextEditingState; readonly endInputState?: TextEditingState; readonly active?: DateRangeFieldEndpoint }
export type DateRangeFieldEvent = { readonly type: 'field'; readonly endpoint: DateRangeFieldEndpoint; readonly event: DateFieldEvent } | { readonly type: 'focus'; readonly endpoint: DateRangeFieldEndpoint } | 'cancel';
export type DateRangeFieldCommand = { readonly type: 'input-state-changed'; readonly endpoint: DateRangeFieldEndpoint; readonly value: TextEditingState } | { readonly type: 'range-committed'; readonly value: DateRange | null } | { readonly type: 'focus-endpoint'; readonly endpoint: DateRangeFieldEndpoint };
export interface DateRangeFieldPolicies extends DateFieldPolicies {}
export interface DateRangeFieldUpdate { readonly state: DateRangeFieldState; readonly commands: readonly DateRangeFieldCommand[] }

export function createDateRangeFieldState(input: DateRangeFieldStateInput = {}): Result<DateRangeFieldState> {
  const range = input.value === undefined || input.value === null ? ok<DateRange | null>(null) : completeRange(input.value.start, input.value.end, 'construction');
  if (!range.ok) return range;
  const startValue = input.startValue !== undefined ? input.startValue : range.value?.start ?? null;
  const endValue = input.endValue !== undefined ? input.endValue : range.value?.end ?? null;
  const start = createDateFieldState(startValue, input.startInputState); if (!start.ok) return start;
  const end = createDateFieldState(endValue, input.endInputState); if (!end.ok) return end;
  const value = completeRange(start.value.value, end.value.value, 'construction'); if (!value.ok) return value;
  const active = input.active ?? 'start';
  if (active !== 'start' && active !== 'end') return fail('construction', 'invalid-date-range-field-endpoint', 'Date range field active endpoint must be start or end.');
  return ok(Object.freeze({ value: value.value, start: start.value, end: end.value, active }));
}

export function applyDateRangeFieldEvent(state: DateRangeFieldState, event: DateRangeFieldEvent, policies: DateRangeFieldPolicies = {}): Result<DateRangeFieldUpdate> {
  const valid = createDateRangeFieldState({ startValue: state.start.value, endValue: state.end.value, startInputState: state.start.inputState, endInputState: state.end.inputState, active: state.active });
  if (!valid.ok) return invalidTransition(valid);
  if (event === 'cancel') {
    const start = applyDateFieldEvent(valid.value.start, 'cancel', endpointPolicies(policies)); if (!start.ok) return start;
    const end = applyDateFieldEvent(valid.value.end, 'cancel', endpointPolicies(policies)); if (!end.ok) return end;
    return composeState(start.value.state, end.value.state, valid.value.active, [
      { type: 'input-state-changed', endpoint: 'start', value: start.value.state.inputState },
      { type: 'input-state-changed', endpoint: 'end', value: end.value.state.inputState },
    ]);
  }
  if (event.type === 'focus') return createMachineUpdate(Object.freeze({ ...valid.value, active: event.endpoint }), [{ type: 'focus-endpoint', endpoint: event.endpoint }]);
  const active = event.endpoint;
  const changed = applyDateFieldEvent(active === 'start' ? valid.value.start : valid.value.end, event.event, endpointPolicies(policies));
  if (!changed.ok) return changed;
  const start = active === 'start' ? changed.value.state : valid.value.start;
  const end = active === 'end' ? changed.value.state : valid.value.end;
  const next = completeRange(start.value, end.value); if (!next.ok) return next;
  const commands: DateRangeFieldCommand[] = changed.value.commands.filter((command) => command.type === 'input-state-changed').map((command) => ({ type: 'input-state-changed', endpoint: active, value: command.value }));
  if ((event.event === 'commit' || typeof event.event === 'object' && event.event.type === 'set-value') && !sameRange(valid.value.value, next.value)) commands.push({ type: 'range-committed', value: next.value });
  return composeState(start, end, active, commands);
}

function composeState(start: DateFieldState, end: DateFieldState, active: DateRangeFieldEndpoint, commands: readonly DateRangeFieldCommand[]): Result<DateRangeFieldUpdate> { const value = completeRange(start.value, end.value); return value.ok ? createMachineUpdate(Object.freeze({ value: value.value, start, end, active }), commands) : value; }
function completeRange(start: DateValue | null, end: DateValue | null, errorClass: ErrorClass = 'transition-rejection'): Result<DateRange | null> { if (start === null || end === null) return ok(null); const range = createDateRange(start, end); return range.ok ? ok(range.value) : fail(errorClass, 'inverted-date-range-field', 'Date range field start must not be after end.'); }
function endpointPolicies(policies: DateRangeFieldPolicies): DateFieldPolicies { const { required: _required, ...rest } = policies; return rest; }
function sameRange(left: DateRange | null, right: DateRange | null): boolean { return left === null || right === null ? left === right : compareDateValues(left.start, right.start) === 0 && compareDateValues(left.end, right.end) === 0; }
function invalidTransition<T>(result: Result<T>): Result<never> { return result.ok ? fail('internal-invariant', 'unexpected-valid-result', 'Expected an invalid result.') : { ok: false, error: { ...result.error, class: 'transition-rejection' } }; }
