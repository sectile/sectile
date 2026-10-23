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
import { projectFieldSelection } from '../internal/field-format.js';
import { formatTimeFieldValue, parseTimeFieldValue, tryFormatTimeFieldValue, timeFieldFormatLayout, timeFieldFormatMaximum, type TimeFieldFormat, type TimeFieldFormatPart } from './time-format.js';
export { createTimeFieldFormat, tryCreateTimeFieldFormat, formatTimeFieldValue, parseTimeFieldValue } from './time-format.js';
export type { TimeFieldFormat, TimeFieldFormatOptions, TimeFieldPrecision, TimeFieldHourCycle, TimeFieldFormatPart } from './time-format.js';

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
  readonly format?: TimeFieldFormat;
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

export function createTimeFieldState(value: TimeValue | null = null, inputState?: TextEditingState, format?: TimeFieldFormat): TimeFieldState {
  return unwrap(tryCreateTimeFieldState(value, inputState, format));
}

export function tryCreateTimeFieldState(value: TimeValue | null = null, inputState?: TextEditingState, format?: TimeFieldFormat): TemporalResult<TimeFieldState> {
  if (format !== undefined) { const issued = timeFieldFormatLayout(format, null); if (!issued.ok) return issued; }
  if (value !== null) {
    const valid = normalizeTime(value);
    if (!valid.ok) return valid;
    value = valid.value;
  }
  if (format !== undefined) { const layout = timeFieldFormatLayout(format, value); if (!layout.ok) return layout; }
  const input = inputState === undefined ? committedInput(value, undefined, format) : normalizeTextEditingState(inputState);
  if (!input.ok) return input;
  if (input.value.snapshot.text.length > fieldMaximum(format)) return fail('construction', 'time-field-draft-too-long', draftMessage(format));
  return ok(fieldState(value, input.value, format));
}

export function applyTimeFieldEvent(state: TimeFieldState, event: TimeFieldEvent, policies: TimeFieldPolicies = {}): TemporalResult<TimeFieldUpdate> {
  const valid = tryCreateTimeFieldState(state.value, state.inputState, state.format);
  if (!valid.ok) return transitionFailure(valid);
  const policy = validatePolicies(policies);
  if (!policy.ok) return policy;
  const accepted = policy.value;
  if (typeof event === 'object' && event.type === 'text') {
    const edited = applyTextEvent(valid.value.inputState, event.event);
    if (!edited.ok) return edited;
    if (edited.value.state.snapshot.text.length > fieldMaximum(valid.value.format)) return fail('transition-rejection', 'time-field-draft-too-long', draftMessage(valid.value.format));
    return createMachineUpdate(fieldState(valid.value.value, edited.value.state, valid.value.format), [{ type: 'input-state-changed', value: edited.value.state }]);
  }
  if (typeof event === 'object' && event.type === 'set-value') return commitValue(event.value, accepted, undefined, valid.value.format);
  if (event === 'cancel') {
    const input = committedInput(valid.value.value, undefined, valid.value.format);
    if (!input.ok) return input;
    return createMachineUpdate(fieldState(valid.value.value, input.value, valid.value.format), [{ type: 'input-state-changed', value: input.value }]);
  }
  if (event === 'increment-segment' || event === 'decrement-segment') {
    const draft = parseTimeFieldValue(valid.value.inputState.snapshot.text, valid.value.format);
    if (!draft.ok && valid.value.value === null) return draft;
    const base = draft.ok ? draft.value : valid.value.value;
    if (base === null) return fail('transition-rejection', 'time-field-value-missing', 'Time field has no value to adjust.');
    const segment = fieldPartAt(valid.value.inputState.snapshot.selection.focusCodeUnitOffset, base, valid.value.format);
    const defaultStep = segment === 'dayPeriod' ? 43_200_000 : segment === 'hour' ? 3_600_000 : segment === 'minute' ? 60_000 : segment === 'second' ? 1_000 : 1;
    const requested = segment === 'dayPeriod' ? 1 : accepted.step?.[segment] ?? 1;
    if (!Number.isSafeInteger(requested) || requested < 1) return fail('construction', 'invalid-time-field-step', 'Time field segment steps must be positive safe integers.');
    const adjusted = addTimeMilliseconds(base, defaultStep * (requested % (86_400_000 / defaultStep)) * (event === 'increment-segment' ? 1 : -1));
    return adjusted.ok ? commitValue(adjusted.value, accepted, segment, valid.value.format) : adjusted;
  }
  if (event !== 'commit') return fail('transition-rejection', 'unsupported-time-field-event', 'Time field event is unsupported.');
  if (valid.value.inputState.composition !== null) return fail('transition-rejection', 'time-field-composition-active', 'Time field cannot commit while text composition is active.');
  const text = valid.value.format === undefined ? valid.value.inputState.snapshot.text.trim() : valid.value.inputState.snapshot.text;
  if (text.trim().length === 0) return commitValue(null, accepted, undefined, valid.value.format);
  const parsed = parseTimeFieldValue(text, valid.value.format);
  return parsed.ok ? commitValue(parsed.value, accepted, undefined, valid.value.format) : parsed;
}

export function timeSegmentAt(offset: number): TimeSegment {
  return offset <= 2 ? 'hour' : offset <= 5 ? 'minute' : offset <= 8 ? 'second' : 'millisecond';
}

type CapturedPolicies = { [Key in keyof TimeFieldPolicies]-?: TimeFieldPolicies[Key] | undefined };

function commitValue(value: TimeValue | null, policies: CapturedPolicies, segment?: TimeFieldFormatPart, format?: TimeFieldFormat): TemporalResult<TimeFieldUpdate> {
  if (value === null) {
    if (policies.required === true) return fail('transition-rejection', 'time-field-value-required', 'Time field requires a value.');
  } else {
    const valid = normalizeTime(value);
    if (!valid.ok) return transitionFailure(valid);
    value = valid.value;
    if (policies.min !== undefined && compareTimeValues(value, policies.min) < 0) return fail('transition-rejection', 'time-field-value-below-minimum', 'Time field value is below its minimum.');
    if (policies.max !== undefined && compareTimeValues(value, policies.max) > 0) return fail('transition-rejection', 'time-field-value-above-maximum', 'Time field value is above its maximum.');
  }
  const input = committedInput(value, segment, format);
  if (!input.ok) return input;
  return createMachineUpdate(fieldState(value, input.value, format), [
    { type: 'input-state-changed', value: input.value },
    { type: 'value-committed', value },
  ]);
}

function committedInput(value: TimeValue | null, segment?: TimeFieldFormatPart, format?: TimeFieldFormat): TemporalResult<TextEditingState> {
  if (format !== undefined) {
    const projected = value === null ? ok('') : tryFormatTimeFieldValue(value, format); if (!projected.ok) return projected;
    if (value !== null && segment !== undefined) {
      const layout = timeFieldFormatLayout(format, value); if (!layout.ok) return layout;
      const available = format.order.includes(segment) ? segment : segment === 'dayPeriod' ? 'hour' : format.precision === 'minute' ? 'minute' : 'second';
      const index = format.order.indexOf(available);
      return tryCreateTextEditingState(projected.value, { anchorCodeUnitOffset: layout.value.starts[index]!, focusCodeUnitOffset: layout.value.ends[index]! });
    }
    return tryCreateTextEditingState(projected.value);
  }
  if (segment === 'dayPeriod') segment = 'hour';
  const text = value === null ? '' : formatTimeFieldInput(value, segment);
  const start = segment === 'hour' ? 0 : segment === 'minute' ? 3 : segment === 'second' ? 6 : segment === 'millisecond' ? 9 : text.length;
  const end = segment === undefined ? text.length : start + (segment === 'millisecond' ? 3 : 2);
  return tryCreateTextEditingState(text, { anchorCodeUnitOffset: Math.min(start, text.length), focusCodeUnitOffset: Math.min(end, text.length) });
}
function fieldState(value: TimeValue | null, inputState: TextEditingState, format?: TimeFieldFormat): TimeFieldState {
  return Object.freeze(format === undefined ? { value, inputState } : { value, inputState, format });
}
function fieldMaximum(format?: TimeFieldFormat): number { return format === undefined ? TIME_FIELD_MAX_CODE_UNITS : unwrap(timeFieldFormatMaximum(format)); }
function draftMessage(format?: TimeFieldFormat): string { return format === undefined ? 'Time field drafts must fit HH:mm, HH:mm:ss, or HH:mm:ss.SSS.' : 'Time field drafts must fit their admitted time layout.'; }
function fieldPartAt(offset: number, value: TimeValue, format?: TimeFieldFormat): TimeFieldFormatPart {
  if (format === undefined) return timeSegmentAt(offset);
  const layout = unwrap(timeFieldFormatLayout(format, value));
  const index = layout.ends.findIndex(end => offset <= end);
  return format.order[index < 0 ? format.order.length - 1 : index]!;
}
export function reformatTimeFieldState(state: TimeFieldState, format?: TimeFieldFormat): TemporalResult<TimeFieldState> {
  const valid = tryCreateTimeFieldState(state.value, state.inputState, state.format); if (!valid.ok) return valid;
  const current = valid.value, text = current.inputState.snapshot.text;
  const canonical = current.value === null ? '' : formatTimeFieldValue(current.value, current.format);
  const expanded = current.value !== null && current.format === undefined && current.value.millisecond === 0
    && (current.value.second === 0 ? text === `${canonical}:00` || text === `${canonical}:00.000` : text === `${canonical}.000`);
  const settled = text === canonical || expanded;
  if (!settled || current.inputState.composition !== null) return fail('transition-rejection', 'time-field-format-draft-active', 'Time format changes require a settled draft.');
  if (current.format === format) return ok(current);
  if (current.value === null) return tryCreateTimeFieldState(null, undefined, format);
  const previous = current.inputState.snapshot.selection;
  const projected = committedInput(current.value, fieldPartAt(previous.focusCodeUnitOffset, current.value, current.format), format); if (!projected.ok) return projected;
  const range = projected.value.snapshot.selection;
  const input = tryCreateTextEditingState(projected.value.snapshot.text, projectFieldSelection(previous, text.length, range.anchorCodeUnitOffset, range.focusCodeUnitOffset, projected.value.snapshot.text.length));
  return input.ok ? ok(fieldState(current.value, input.value, format)) : input;
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
