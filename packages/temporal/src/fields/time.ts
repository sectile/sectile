import {
  type TimeValue,
  tryCreateTimeValue,
  parseTimeValue,
  addTimeMilliseconds,
  compareTimeValues,
  formatTimeValue,
} from '../values/time.js';
import {
  type TextEditingState,
  type TextEvent,
  normalizeTextEditingState,
  applyTextEvent,
  tryCreateTextEditingState,
} from '@sectile/core/text';
import { unwrap } from '@sectile/core/result';
import type { TemporalResult } from '../error.js';
import { transitionFailure, ok, fail } from '../internal/foundation.js';
import { createMachineUpdate } from '../internal/machine.js';

export type {
  TimeValue,
} from '../values/time.js';
export {
  createTimeValue,
  tryCreateTimeValue,
  parseTimeValue,
  formatTimeValue,
  compareTimeValues,
  addTimeMilliseconds,
} from '../values/time.js';

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

export function createTimeFieldState(value: TimeValue | null = null, inputState?: TextEditingState): TimeFieldState {
  return unwrap(tryCreateTimeFieldState(value, inputState));
}

export function tryCreateTimeFieldState(value: TimeValue | null = null, inputState?: TextEditingState): TemporalResult<TimeFieldState> {
  if (value !== null) {
    const valid = normalizeTime(value);
    if (!valid.ok) return valid;
    value = valid.value;
  }
  const input = inputState === undefined ? committedInput(value) : normalizeTextEditingState(inputState);
  if (!input.ok) return input;
  if (input.value.snapshot.text.length > TIME_FIELD_MAX_CODE_UNITS) return fail('construction', 'time-field-draft-too-long', 'Time field drafts must fit HH:mm, HH:mm:ss, or HH:mm:ss.SSS.');
  return ok(Object.freeze({ value, inputState: input.value }));
}

export function applyTimeFieldEvent(state: TimeFieldState, event: TimeFieldEvent, policies: TimeFieldPolicies = {}): TemporalResult<TimeFieldUpdate> {
  const valid = tryCreateTimeFieldState(state.value, state.inputState);
  if (!valid.ok) return transitionFailure(valid);
  const policy = validatePolicies(policies);
  if (!policy.ok) return policy;
  const accepted = policy.value;
  if (typeof event === 'object' && event.type === 'text') {
    const edited = applyTextEvent(valid.value.inputState, event.event);
    if (!edited.ok) return edited;
    if (edited.value.state.snapshot.text.length > TIME_FIELD_MAX_CODE_UNITS) return fail('transition-rejection', 'time-field-draft-too-long', 'Time field drafts must fit HH:mm, HH:mm:ss, or HH:mm:ss.SSS.');
    return createMachineUpdate(Object.freeze({ value: valid.value.value, inputState: edited.value.state }), [{ type: 'input-state-changed', value: edited.value.state }]);
  }
  if (typeof event === 'object' && event.type === 'set-value') return commitValue(event.value, accepted);
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
    const requested = accepted.step?.[segment] ?? 1;
    if (!Number.isSafeInteger(requested) || requested < 1) return fail('construction', 'invalid-time-field-step', 'Time field segment steps must be positive safe integers.');
    const adjusted = addTimeMilliseconds(base, defaultStep * (requested % (86_400_000 / defaultStep)) * (event === 'increment-segment' ? 1 : -1));
    return adjusted.ok ? commitValue(adjusted.value, accepted, segment) : adjusted;
  }
  if (event !== 'commit') return fail('transition-rejection', 'unsupported-time-field-event', 'Time field event is unsupported.');
  if (valid.value.inputState.composition !== null) return fail('transition-rejection', 'time-field-composition-active', 'Time field cannot commit while text composition is active.');
  const text = valid.value.inputState.snapshot.text.trim();
  if (text.length === 0) return commitValue(null, accepted);
  const parsed = parseTimeValue(text);
  return parsed.ok ? commitValue(parsed.value, accepted) : parsed;
}

export function timeSegmentAt(offset: number): TimeSegment {
  return offset <= 2 ? 'hour' : offset <= 5 ? 'minute' : offset <= 8 ? 'second' : 'millisecond';
}

type CapturedPolicies = { [Key in keyof TimeFieldPolicies]-?: TimeFieldPolicies[Key] | undefined };

function commitValue(value: TimeValue | null, policies: CapturedPolicies, segment?: TimeSegment): TemporalResult<TimeFieldUpdate> {
  if (value === null) {
    if (policies.required === true) return fail('transition-rejection', 'time-field-value-required', 'Time field requires a value.');
  } else {
    const valid = normalizeTime(value);
    if (!valid.ok) return transitionFailure(valid);
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
  const text = value === null ? '' : formatTimeFieldInput(value, segment);
  const start = segment === 'hour' ? 0 : segment === 'minute' ? 3 : segment === 'second' ? 6 : segment === 'millisecond' ? 9 : text.length;
  const end = segment === undefined ? text.length : start + (segment === 'millisecond' ? 3 : 2);
  return tryCreateTextEditingState(text, { anchorCodeUnitOffset: Math.min(start, text.length), focusCodeUnitOffset: Math.min(end, text.length) });
}

function formatTimeFieldInput(value: TimeValue, segment?: TimeSegment): string {
  const text = formatTimeValue(value);
  if (segment === 'second' && value.second === 0 && value.millisecond === 0) return `${text}:00`;
  if (segment === 'millisecond' && value.millisecond === 0) return value.second === 0 ? `${text}:00.000` : `${text}.000`;
  return text;
}

function validatePolicies(policies: TimeFieldPolicies): TemporalResult<CapturedPolicies> {
  let { min, max, required, step } = policies;
  if (min !== undefined) {
    const valid = normalizeTime(min);
    if (!valid.ok) return valid;
    min = valid.value;
  }
  if (max !== undefined) {
    const valid = normalizeTime(max);
    if (!valid.ok) return valid;
    max = valid.value;
  }
  if (min !== undefined && max !== undefined && compareTimeValues(min, max) > 0) {
    return fail('construction', 'inverted-time-field-bounds', 'Time field minimum exceeds its maximum.');
  }
  return ok({ min, max, required, step });
}
function normalizeTime(value: TimeValue): TemporalResult<TimeValue> {
  return tryCreateTimeValue(value.hour, value.minute, value.second, value.millisecond);
}
