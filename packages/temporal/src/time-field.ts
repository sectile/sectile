import { unwrap } from '@sectile/core/result';
import type { TemporalResult } from './error.js';
import { fail, ok } from './internal/foundation.js';
import { createMachineUpdate } from './internal/machine.js';
import { applyTextEvent, createTextEditingState, normalizeTextEditingState, type TextEditingState, type TextEvent,tryCreateTextEditingState } from '@sectile/core/text';

export interface TimeValue {
  readonly hour: number;
  readonly minute: number;
  readonly second: number;
  readonly millisecond: number;
}

export type TimeSegment = 'hour' | 'minute' | 'second' | 'millisecond';

export interface TimeFieldState {
  readonly value: TimeValue | null;
  readonly inputState: TextEditingState;
}

export type TimeFieldEvent =
  | { readonly type: 'text'; readonly event: TextEvent }
  | { readonly type: 'set-value'; readonly value: TimeValue | null }
  | 'increment-segment'
  | 'decrement-segment'
  | 'commit'
  | 'cancel';

export type TimeFieldCommand =
  | { readonly type: 'input-state-changed'; readonly value: TextEditingState }
  | { readonly type: 'value-committed'; readonly value: TimeValue | null };

export interface TimeFieldPolicies {
  readonly min?: TimeValue;
  readonly max?: TimeValue;
  readonly required?: boolean;
  readonly step?: Partial<Record<TimeSegment, number>>;
}

export interface TimeFieldUpdate {
  readonly state: TimeFieldState;
  readonly commands: readonly TimeFieldCommand[];
}

const TIME_FIELD_MAX_CODE_UNITS = 12;

export function createTimeValue(hour: number, minute = 0, second = 0, millisecond = 0): TimeValue {
  return unwrap(tryCreateTimeValue(hour, minute, second, millisecond));
}

export function tryCreateTimeValue(hour: number, minute = 0, second = 0, millisecond = 0): TemporalResult<TimeValue> {
  for (const [name, value, maximum] of [['hour', hour, 23], ['minute', minute, 59], ['second', second, 59], ['millisecond', millisecond, 999]] as const) {
    if (!Number.isSafeInteger(value) || value < 0 || value > maximum) {
      return fail('construction', `invalid-time-${name}`, `Time ${name} must be an integer from 0 through ${maximum}.`, { [name]: value });
    }
  }
  return ok(Object.freeze({ hour, minute, second, millisecond }));
}

export function parseTimeValue(text: string): TemporalResult<TimeValue> {
  if (typeof text !== 'string') return fail('construction', 'invalid-time-text', 'Time text must be a string.');
  const match = /^(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?$/.exec(text);
  if (match === null) return fail('transition-rejection', 'invalid-time-format', 'Time text must use HH:mm, HH:mm:ss, or HH:mm:ss.SSS.', { text });
  return tryCreateTimeValue(Number(match[1]), Number(match[2]), Number(match[3] ?? 0), Number((match[4] ?? '0').padEnd(3, '0')));
}

export function formatTimeValue(value: TimeValue): string {
  const base = `${pad(value.hour, 2)}:${pad(value.minute, 2)}`;
  if (value.millisecond !== 0) return `${base}:${pad(value.second, 2)}.${pad(value.millisecond, 3)}`;
  return value.second === 0 ? base : `${base}:${pad(value.second, 2)}`;
}

export function compareTimeValues(left: TimeValue, right: TimeValue): -1 | 0 | 1 {
  const a = timeToMilliseconds(left);
  const b = timeToMilliseconds(right);
  return a < b ? -1 : a > b ? 1 : 0;
}

export function addTimeMilliseconds(value: TimeValue, amount: number): TemporalResult<TimeValue> {
  if (!Number.isSafeInteger(amount)) return fail('transition-rejection', 'invalid-time-delta', 'Time delta must be a safe integer.');
  const day = 86_400_000;
  const next = ((timeToMilliseconds(value) + amount) % day + day) % day;
  const hour = Math.floor(next / 3_600_000);
  const minute = Math.floor((next % 3_600_000) / 60_000);
  const second = Math.floor((next % 60_000) / 1_000);
  return tryCreateTimeValue(hour, minute, second, next % 1_000);
}

export function createTimeFieldState(value: TimeValue | null = null, inputState?: TextEditingState): TimeFieldState {
  return unwrap(tryCreateTimeFieldState(value, inputState));
}

export function tryCreateTimeFieldState(value: TimeValue | null = null, inputState?: TextEditingState): TemporalResult<TimeFieldState> {
  const valid = value === null ? ok(null) : tryCreateTimeValue(value.hour, value.minute, value.second, value.millisecond);
  if (!valid.ok) return valid;
  const input = inputState === undefined ? committedInput(valid.value) : normalizeTextEditingState(inputState);
  if (!input.ok) return input;
  if (input.value.snapshot.text.length > TIME_FIELD_MAX_CODE_UNITS) return fail('construction', 'time-field-draft-too-long', 'Time field drafts must fit HH:mm, HH:mm:ss, or HH:mm:ss.SSS.');
  return ok(Object.freeze({ value: valid.value, inputState: input.value }));
}

export function applyTimeFieldEvent(state: TimeFieldState, event: TimeFieldEvent, policies: TimeFieldPolicies = {}): TemporalResult<TimeFieldUpdate> {
  const valid = tryCreateTimeFieldState(state.value, state.inputState);
  if (!valid.ok) return invalidTransition(valid);
  const policy = validatePolicies(policies);
  if (!policy.ok) return policy;
  if (typeof event === 'object' && event.type === 'text') {
    const edited = applyTextEvent(valid.value.inputState, event.event);
    if (!edited.ok) return edited;
    if (edited.value.state.snapshot.text.length > TIME_FIELD_MAX_CODE_UNITS) return fail('transition-rejection', 'time-field-draft-too-long', 'Time field drafts must fit HH:mm, HH:mm:ss, or HH:mm:ss.SSS.');
    return createMachineUpdate(Object.freeze({ value: valid.value.value, inputState: edited.value.state }), [{ type: 'input-state-changed', value: edited.value.state }]);
  }
  if (typeof event === 'object' && event.type === 'set-value') return commitValue(event.value, policies);
  if (event === 'cancel') {
    const input = committedInput(valid.value.value);
    if (!input.ok) return input;
    return createMachineUpdate(Object.freeze({ value: valid.value.value, inputState: input.value }), [{ type: 'input-state-changed', value: input.value }]);
  }
  if (event === 'increment-segment' || event === 'decrement-segment') {
    const draft = parseTimeValue(valid.value.inputState.snapshot.text);
    if (!draft.ok && valid.value.value === null) return draft;
    const base = draft.ok ? draft.value : valid.value.value;
    if (base === null) return fail('transition-rejection', 'time-field-value-missing', 'Time field has no value to adjust.');
    const segment = timeSegmentAt(valid.value.inputState.snapshot.selection.focusCodeUnitOffset);
    const defaultStep = segment === 'hour' ? 3_600_000 : segment === 'minute' ? 60_000 : segment === 'second' ? 1_000 : 1;
    const requested = policies.step?.[segment] ?? 1;
    if (!Number.isSafeInteger(requested) || requested < 1) return fail('construction', 'invalid-time-field-step', 'Time field segment steps must be positive safe integers.');
    const adjusted = addTimeMilliseconds(base, defaultStep * requested * (event === 'increment-segment' ? 1 : -1));
    return adjusted.ok ? commitValue(adjusted.value, policies, segment) : adjusted;
  }
  if (event !== 'commit') return fail('transition-rejection', 'unsupported-time-field-event', 'Time field event is unsupported.');
  if (valid.value.inputState.composition !== null) return fail('transition-rejection', 'time-field-composition-active', 'Time field cannot commit while text composition is active.');
  const text = valid.value.inputState.snapshot.text.trim();
  if (text.length === 0) return commitValue(null, policies);
  const parsed = parseTimeValue(text);
  return parsed.ok ? commitValue(parsed.value, policies) : parsed;
}

export function timeSegmentAt(offset: number): TimeSegment {
  return offset <= 2 ? 'hour' : offset <= 5 ? 'minute' : offset <= 8 ? 'second' : 'millisecond';
}

function commitValue(value: TimeValue | null, policies: TimeFieldPolicies, segment?: TimeSegment): TemporalResult<TimeFieldUpdate> {
  if (value === null) {
    if (policies.required === true) return fail('transition-rejection', 'time-field-value-required', 'Time field requires a value.');
  } else {
    const valid = tryCreateTimeValue(value.hour, value.minute, value.second, value.millisecond);
    if (!valid.ok) return invalidTransition(valid);
    value = valid.value;
    if (policies.min !== undefined && compareTimeValues(value, policies.min) < 0) return fail('transition-rejection', 'time-field-value-below-minimum', 'Time field value is below its minimum.');
    if (policies.max !== undefined && compareTimeValues(value, policies.max) > 0) return fail('transition-rejection', 'time-field-value-above-maximum', 'Time field value is above its maximum.');
  }
  const input = committedInput(value, segment);
  if (!input.ok) return input;
  return createMachineUpdate(Object.freeze({ value, inputState: input.value }), [
    { type: 'input-state-changed', value: input.value },
    { type: 'value-committed', value },
  ]);
}

function committedInput(value: TimeValue | null, segment?: TimeSegment): TemporalResult<TextEditingState> {
  const text = value === null ? '' : formatTimeValue(value);
  const range = segment === 'hour' ? [0, 2] : segment === 'minute' ? [3, 5] : segment === 'second' ? [6, 8] : segment === 'millisecond' ? [9, 12] : [text.length, text.length];
  return tryCreateTextEditingState(text, { anchorCodeUnitOffset: Math.min(range[0] ?? 0, text.length), focusCodeUnitOffset: Math.min(range[1] ?? 0, text.length) });
}

function validatePolicies(policies: TimeFieldPolicies): TemporalResult<true> {
  if (policies.min !== undefined) { const min = tryCreateTimeValue(policies.min.hour, policies.min.minute, policies.min.second, policies.min.millisecond); if (!min.ok) return min; }
  if (policies.max !== undefined) { const max = tryCreateTimeValue(policies.max.hour, policies.max.minute, policies.max.second, policies.max.millisecond); if (!max.ok) return max; }
  if (policies.min !== undefined && policies.max !== undefined && compareTimeValues(policies.min, policies.max) > 0) return fail('construction', 'inverted-time-field-bounds', 'Time field minimum must not follow its maximum.');
  return ok(true);
}

function timeToMilliseconds(value: TimeValue): number { return ((value.hour * 60 + value.minute) * 60 + value.second) * 1_000 + value.millisecond; }
function pad(value: number, length: number): string { return String(value).padStart(length, '0'); }
function invalidTransition<T>(result: TemporalResult<T>): TemporalResult<never> { return result.ok ? fail('internal-invariant', 'unexpected-valid-result', 'Expected an invalid result.') : { ok: false, error: { ...result.error, class: 'transition-rejection' } }; }
