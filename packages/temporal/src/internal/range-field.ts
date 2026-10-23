import type { ErrorClass } from '@sectile/core';
import type { TextEditingState } from '@sectile/core/text';
import type { TemporalOwnErrorCode, TemporalResult } from '../error.js';
import { fail, ok, transitionFailure } from './foundation.js';
import { createMachineUpdate } from './machine.js';

type Endpoint = 'start' | 'end';
interface RangeValue<Value> { readonly start: Value; readonly end: Value }
interface FieldState<Value, Format> { readonly value: Value | null; readonly inputState: TextEditingState; readonly format?: Format }
interface ErrorSpec { readonly code: TemporalOwnErrorCode; readonly message: string }
interface RangeInput<Value, Range, Format> {
  readonly value?: Range | null; readonly startValue?: Value | null; readonly endValue?: Value | null;
  readonly startInputState?: TextEditingState; readonly endInputState?: TextEditingState;
  readonly startFormat?: Format; readonly endFormat?: Format; readonly active?: Endpoint;
}
interface RangeState<Range, State> { readonly value: Range | null; readonly start: State; readonly end: State; readonly active: Endpoint }
type RangeCommand<Range> = { readonly type: 'input-state-changed'; readonly endpoint: Endpoint; readonly value: TextEditingState }
  | { readonly type: 'range-committed'; readonly value: Range | null } | { readonly type: 'focus-endpoint'; readonly endpoint: Endpoint };
interface RangeUpdate<Range, State> { readonly state: RangeState<Range, State>; readonly commands: readonly RangeCommand<Range>[] }
type InputCommand<Value> = { readonly type: 'input-state-changed'; readonly value: TextEditingState } | { readonly type: 'value-committed'; readonly value: Value | null };
type RangeEvent<Event> = { readonly type: 'field'; readonly endpoint: Endpoint; readonly event: Event } | { readonly type: 'focus'; readonly endpoint: Endpoint } | 'cancel';

/** Operation-specific records keep constructors independent of editing reducers. */
export interface RangeFieldConstruction<Value, Range extends RangeValue<Value>, State extends FieldState<Value, Format>, Format> {
  readonly createField: (value: Value | null, input?: TextEditingState, format?: Format) => TemporalResult<State>;
  readonly createRange: (start: Value, end: Value) => TemporalResult<Range>;
  readonly endpointError: ErrorSpec; readonly invertedError: ErrorSpec;
}
export interface RangeFieldTransition<Value, Range extends RangeValue<Value>, State extends FieldState<Value, Format>, Format,
  Event extends string | { readonly type: string }, Policies extends { readonly required?: boolean }>
  extends RangeFieldConstruction<Value, Range, State, Format> {
  readonly applyField: (state: State, event: Event | 'cancel', policies: Omit<Policies, 'required'>) => TemporalResult<{ readonly state: State; readonly commands: readonly InputCommand<Value>[] }>;
  readonly compare: (left: Value, right: Value) => number;
  readonly requiredError: ErrorSpec;
}
export interface RangeFieldPresentation<Value, Range extends RangeValue<Value>, State extends FieldState<Value, Format>, Format>
  extends RangeFieldConstruction<Value, Range, State, Format> {
  readonly reformatField: (state: State, format?: Format) => TemporalResult<State>;
}

export function tryCreateRangeFieldState<Value, Range extends RangeValue<Value>, State extends FieldState<Value, Format>, Format>(
  spec: RangeFieldConstruction<Value, Range, State, Format>, input: RangeInput<Value, Range, Format>,
): TemporalResult<RangeState<Range, State>> {
  const range = input.value === undefined || input.value === null ? ok<Range | null>(null) : completeRange(spec, input.value.start, input.value.end, 'construction');
  if (!range.ok) return range;
  const startValue = input.startValue !== undefined ? input.startValue : range.value?.start ?? null;
  const endValue = input.endValue !== undefined ? input.endValue : range.value?.end ?? null;
  const start = spec.createField(startValue, input.startInputState, input.startFormat); if (!start.ok) return start;
  const end = spec.createField(endValue, input.endInputState, input.endFormat); if (!end.ok) return end;
  const value = completeRange(spec, start.value.value, end.value.value, 'construction'); if (!value.ok) return value;
  const active = input.active ?? 'start';
  if (active !== 'start' && active !== 'end') return fail('construction', spec.endpointError.code, spec.endpointError.message);
  return ok(Object.freeze({ value: value.value, start: start.value, end: end.value, active }));
}

export function applyRangeFieldEvent<Value, Range extends RangeValue<Value>, State extends FieldState<Value, Format>, Format,
  Event extends string | { readonly type: string }, Policies extends { readonly required?: boolean }>(
  spec: RangeFieldTransition<Value, Range, State, Format, Event, Policies>, state: RangeState<Range, State>, event: RangeEvent<Event>, policies: Policies,
): TemporalResult<RangeUpdate<Range, State>> {
  const valid = normalize(spec, state); if (!valid.ok) return transitionFailure(valid);
  if (event === 'cancel') {
    const start = spec.applyField(valid.value.start, 'cancel', endpointPolicies(policies)); if (!start.ok) return start;
    const end = spec.applyField(valid.value.end, 'cancel', endpointPolicies(policies)); if (!end.ok) return end;
    return compose(spec, start.value.state, end.value.state, valid.value.active, [
      { type: 'input-state-changed', endpoint: 'start', value: start.value.state.inputState },
      { type: 'input-state-changed', endpoint: 'end', value: end.value.state.inputState },
    ]);
  }
  if (event.type === 'focus') return createMachineUpdate(Object.freeze({ ...valid.value, active: event.endpoint }), [{ type: 'focus-endpoint', endpoint: event.endpoint }]);
  const active = event.endpoint;
  const changed = spec.applyField(active === 'start' ? valid.value.start : valid.value.end, event.event, endpointPolicies(policies)); if (!changed.ok) return changed;
  const start = active === 'start' ? changed.value.state : valid.value.start, end = active === 'end' ? changed.value.state : valid.value.end;
  const next = completeRange(spec, start.value, end.value); if (!next.ok) return next;
  const committing = event.event === 'commit' || typeof event.event === 'object' && event.event.type === 'set-value';
  if (committing && policies.required === true && next.value === null) return fail('transition-rejection', spec.requiredError.code, spec.requiredError.message);
  const commands: RangeCommand<Range>[] = changed.value.commands.filter(command => command.type === 'input-state-changed')
    .map(command => ({ type: 'input-state-changed', endpoint: active, value: command.value }));
  if (committing && !sameRange(spec.compare, valid.value.value, next.value)) commands.push({ type: 'range-committed', value: next.value });
  return compose(spec, start, end, active, commands);
}

export function reformatRangeFieldState<Value, Range extends RangeValue<Value>, State extends FieldState<Value, Format>, Format>(
  spec: RangeFieldPresentation<Value, Range, State, Format>, state: RangeState<Range, State>, format?: Format,
): TemporalResult<RangeState<Range, State>> {
  const valid = normalize(spec, state); if (!valid.ok) return valid;
  const start = spec.reformatField(valid.value.start, format); if (!start.ok) return start;
  const end = spec.reformatField(valid.value.end, format); if (!end.ok) return end;
  return ok(Object.freeze({ value: valid.value.value, start: start.value, end: end.value, active: valid.value.active }));
}

function normalize<Value, Range extends RangeValue<Value>, State extends FieldState<Value, Format>, Format>(
  spec: RangeFieldConstruction<Value, Range, State, Format>, state: RangeState<Range, State>,
): TemporalResult<RangeState<Range, State>> {
  return tryCreateRangeFieldState<Value, Range, State, Format>(spec, { startValue: state.start.value, endValue: state.end.value,
    startInputState: state.start.inputState, endInputState: state.end.inputState,
    ...(state.start.format === undefined ? {} : { startFormat: state.start.format }),
    ...(state.end.format === undefined ? {} : { endFormat: state.end.format }), active: state.active });
}
function compose<Value, Range extends RangeValue<Value>, State extends FieldState<Value, Format>, Format>(
  spec: RangeFieldConstruction<Value, Range, State, Format>, start: State, end: State, active: Endpoint, commands: readonly RangeCommand<Range>[],
): TemporalResult<RangeUpdate<Range, State>> {
  const value = completeRange(spec, start.value, end.value);
  return value.ok ? createMachineUpdate(Object.freeze({ value: value.value, start, end, active }), commands) : value;
}
function completeRange<Value, Range extends RangeValue<Value>>(
  spec: { readonly createRange: (start: Value, end: Value) => TemporalResult<Range>; readonly invertedError: ErrorSpec },
  start: Value | null, end: Value | null, errorClass: ErrorClass = 'transition-rejection',
): TemporalResult<Range | null> {
  if (start === null || end === null) return ok(null);
  const range = spec.createRange(start, end);
  return range.ok ? ok(range.value) : fail(errorClass, spec.invertedError.code, spec.invertedError.message);
}
function endpointPolicies<Policies extends { readonly required?: boolean }>(policies: Policies): Omit<Policies, 'required'> {
  const { required: _required, ...rest } = policies; return rest;
}
function sameRange<Value, Range extends RangeValue<Value>>(compare: (left: Value, right: Value) => number, left: Range | null, right: Range | null): boolean {
  return left === null || right === null ? left === right : compare(left.start, right.start) === 0 && compare(left.end, right.end) === 0;
}
