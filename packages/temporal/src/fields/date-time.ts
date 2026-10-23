import {
  type DateTimeValue,
  tryCreateDateTimeValue,
  parseDateTimeValue,
  addDateTimeMilliseconds,
  compareDateTimeValues,
  formatDateTimeValue,
} from '../values/date-time.js';
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
import { addDateYears, addDateMonths, addDateDays } from '../values/date.js';
import { addTimeMilliseconds } from '../values/time.js';
import { projectFieldSelection } from '../internal/field-format.js';
import { dateTimeFieldFormatLayout, dateTimeFieldFormatMaximum, tryFormatDateTimeFieldValue, formatDateTimeFieldValue, parseDateTimeFieldValue, type DateTimeFieldFormat, type DateTimeFieldFormatPart } from './date-time-format.js';
export { createDateTimeFieldFormat, tryCreateDateTimeFieldFormat, formatDateTimeFieldValue, parseDateTimeFieldValue } from './date-time-format.js';
export type { DateTimeFieldFormat, DateTimeFieldFormatOptions, DateTimeFieldFormatPart } from './date-time-format.js';

export type {
  DateTimeValue,
  DateTimeRange,
} from '../values/date-time.js';
export {
  createDateTimeValue,
  tryCreateDateTimeValue,
  parseDateTimeValue,
  formatDateTimeValue,
  compareDateTimeValues,
  createDateTimeRange,
  tryCreateDateTimeRange,
  formatDateTimeRange,
  addDateTimeMilliseconds,
} from '../values/date-time.js';

export type DateTimeSegment =
  | 'year'
  | 'month'
  | 'day'
  | 'hour'
  | 'minute'
  | 'second'
  | 'millisecond';

export interface DateTimeFieldState {
  readonly value: DateTimeValue | null;
  readonly inputState: TextEditingState;
  readonly format?: DateTimeFieldFormat;
}

export type DateTimeFieldEvent =
  | { readonly type: 'text'; readonly event: TextEvent }
  | { readonly type: 'set-value'; readonly value: DateTimeValue | null }
  | 'increment-segment'
  | 'decrement-segment'
  | 'commit'
  | 'cancel';

export type DateTimeFieldCommand =
  | { readonly type: 'input-state-changed'; readonly value: TextEditingState }
  | { readonly type: 'value-committed'; readonly value: DateTimeValue | null };

export interface DateTimeFieldPolicies {
  readonly min?: DateTimeValue;
  readonly max?: DateTimeValue;
  readonly required?: boolean;
  readonly unavailable?: (value: DateTimeValue) => boolean;
  readonly step?: Partial<Record<DateTimeSegment, number>>;
}

export type DateTimeFieldUnavailablePredicate = NonNullable<DateTimeFieldPolicies['unavailable']>;

export interface DateTimeFieldUpdate {
  readonly state: DateTimeFieldState;
  readonly commands: readonly DateTimeFieldCommand[];
}

const DATE_TIME_FIELD_MAX_CODE_UNITS = 23;

export function createDateTimeFieldState(
  value: DateTimeValue | null = null,
  inputState?: TextEditingState,
  format?: DateTimeFieldFormat,
): DateTimeFieldState {
  return unwrap(tryCreateDateTimeFieldState(value, inputState, format));
}

export function tryCreateDateTimeFieldState(
  value: DateTimeValue | null = null,
  inputState?: TextEditingState,
  format?: DateTimeFieldFormat,
): TemporalResult<DateTimeFieldState> {
  if (format !== undefined) { const issued = dateTimeFieldFormatMaximum(format); if (!issued.ok) return issued; }
  const valid = value === null ? ok(null) : tryCreateDateTimeValue(value.date, value.time);
  if (!valid.ok) return valid;
  if (format !== undefined) { const layout = dateTimeFieldFormatLayout(format, valid.value); if (!layout.ok) return layout; }
  const input = inputState === undefined
    ? committedInput(valid.value, undefined, format)
    : normalizeTextEditingState(inputState);
  if (!input.ok) return input;
  if (input.value.snapshot.text.length > fieldMaximum(format)) {
    return fail(
      'construction',
      'date-time-field-draft-too-long',
      draftMessage(format),
    );
  }
  return ok(fieldState(valid.value, input.value, format));
}

export function applyDateTimeFieldEvent(
  state: DateTimeFieldState,
  event: DateTimeFieldEvent,
  policies: DateTimeFieldPolicies = {},
): TemporalResult<DateTimeFieldUpdate> {
  const valid = tryCreateDateTimeFieldState(state.value, state.inputState, state.format);
  if (!valid.ok) return transitionFailure(valid);
  const policy = validatePolicies(policies);
  if (!policy.ok) return policy;
  const accepted = policy.value;

  if (typeof event === 'object' && event.type === 'text') {
    const edited = applyTextEvent(valid.value.inputState, event.event);
    if (!edited.ok) return edited;
    if (edited.value.state.snapshot.text.length > fieldMaximum(valid.value.format)) {
      return fail(
        'transition-rejection',
        'date-time-field-draft-too-long',
        draftMessage(valid.value.format),
      );
    }
    return createMachineUpdate(
      fieldState(valid.value.value, edited.value.state, valid.value.format),
      [{ type: 'input-state-changed', value: edited.value.state }],
    );
  }

  if (typeof event === 'object' && event.type === 'set-value') {
    return commitValue(event.value, accepted, undefined, valid.value.format);
  }

  if (event === 'cancel') {
    const input = committedInput(valid.value.value, undefined, valid.value.format);
    if (!input.ok) return input;
    return createMachineUpdate(
      fieldState(valid.value.value, input.value, valid.value.format),
      [{ type: 'input-state-changed', value: input.value }],
    );
  }

  if (event === 'increment-segment' || event === 'decrement-segment') {
    const draft = parseDateTimeFieldValue(valid.value.inputState.snapshot.text, valid.value.format);
    if (!draft.ok && valid.value.value === null) return draft;
    const base = draft.ok ? draft.value : valid.value.value;
    if (base === null) {
      return fail('transition-rejection', 'date-time-field-value-missing', 'Date-time field has no value to adjust.');
    }
    const segment = fieldPartAt(valid.value.inputState.snapshot.selection.focusCodeUnitOffset, base, valid.value.format);
    const requested = segment === 'dayPeriod' ? 1 : accepted.step?.[segment] ?? 1;
    const direction = event === 'increment-segment' ? 1 : -1;
    const adjusted = segment === 'dayPeriod' ? adjustPeriod(base, direction) : adjustSegment(base, segment, requested * direction);
    return adjusted.ok ? commitValue(adjusted.value, accepted, segment, valid.value.format) : adjusted;
  }

  if (event !== 'commit') {
    return fail('transition-rejection', 'unsupported-date-time-field-event', 'Date-time field event is unsupported.');
  }
  if (valid.value.inputState.composition !== null) {
    return fail(
      'transition-rejection',
      'date-time-field-composition-active',
      'Date-time field cannot commit while text composition is active.',
    );
  }
  const text = valid.value.format === undefined ? valid.value.inputState.snapshot.text.trim() : valid.value.inputState.snapshot.text;
  if (text.trim().length === 0) return commitValue(null, accepted, undefined, valid.value.format);
  const parsed = parseDateTimeFieldValue(text, valid.value.format);
  return parsed.ok ? commitValue(parsed.value, accepted, undefined, valid.value.format) : parsed;
}

export function dateTimeSegmentAt(offset: number): DateTimeSegment {
  if (offset <= 4) return 'year';
  if (offset <= 7) return 'month';
  if (offset <= 10) return 'day';
  if (offset <= 13) return 'hour';
  if (offset <= 16) return 'minute';
  if (offset <= 19) return 'second';
  return 'millisecond';
}

function adjustSegment(
  value: DateTimeValue,
  segment: DateTimeSegment,
  amount: number,
): TemporalResult<DateTimeValue> {
  if (segment === 'year' || segment === 'month' || segment === 'day') {
    const date = segment === 'year'
      ? addDateYears(value.date, amount)
      : segment === 'month'
        ? addDateMonths(value.date, amount)
        : addDateDays(value.date, amount);
    return date.ok ? tryCreateDateTimeValue(date.value, value.time) : date;
  }
  const unit = segment === 'hour'
    ? 3_600_000
    : segment === 'minute'
      ? 60_000
      : segment === 'second'
        ? 1_000
        : 1;
  return addDateTimeMilliseconds(value, unit * amount);
}

type CapturedPolicies = { [Key in keyof DateTimeFieldPolicies]-?: DateTimeFieldPolicies[Key] | undefined };

function fieldState(value: DateTimeValue | null, inputState: TextEditingState, format?: DateTimeFieldFormat): DateTimeFieldState {
  return Object.freeze(format === undefined ? { value, inputState } : { value, inputState, format });
}
function fieldMaximum(format?: DateTimeFieldFormat): number { return format === undefined ? DATE_TIME_FIELD_MAX_CODE_UNITS : unwrap(dateTimeFieldFormatMaximum(format)); }
function draftMessage(format?: DateTimeFieldFormat): string { return format === undefined ? 'Date-time field drafts must fit YYYY-MM-DDTHH:mm with optional seconds and milliseconds.' : 'Date-time field draft exceeds its format length.'; }
function fieldPartAt(offset: number, value: DateTimeValue | null, format?: DateTimeFieldFormat): DateTimeFieldFormatPart {
  if (format === undefined) return dateTimeSegmentAt(offset);
  const layout = unwrap(dateTimeFieldFormatLayout(format, value));
  const index = layout.ends.findIndex(end => offset <= end);
  return layout.parts[index < 0 ? layout.parts.length - 1 : index]!;
}
function adjustPeriod(value: DateTimeValue, direction: number): TemporalResult<DateTimeValue> {
  const time = addTimeMilliseconds(value.time, direction * 43_200_000);
  return time.ok ? tryCreateDateTimeValue(value.date, time.value) : time;
}

export function reformatDateTimeFieldState(state: DateTimeFieldState, format?: DateTimeFieldFormat): TemporalResult<DateTimeFieldState> {
  const valid = tryCreateDateTimeFieldState(state.value, state.inputState, state.format); if (!valid.ok) return valid;
  const current = valid.value, text = current.inputState.snapshot.text;
  const canonical = current.value === null ? '' : formatDateTimeFieldValue(current.value, current.format);
  const expanded = current.value !== null && current.format === undefined && current.value.time.millisecond === 0
    && (current.value.time.second === 0 ? text === `${canonical}:00` || text === `${canonical}:00.000` : text === `${canonical}.000`);
  if (current.inputState.composition !== null || !(text === canonical || expanded)) return fail('transition-rejection', 'date-time-field-format-draft-active', 'Date-time format changes require a settled draft.');
  if (current.format === format) return ok(current);
  if (current.value === null) return tryCreateDateTimeFieldState(null, undefined, format);
  const previous = current.inputState.snapshot.selection;
  const projected = committedInput(current.value, fieldPartAt(previous.focusCodeUnitOffset, current.value, current.format), format); if (!projected.ok) return projected;
  const range = projected.value.snapshot.selection;
  const input = tryCreateTextEditingState(projected.value.snapshot.text, projectFieldSelection(previous, text.length, range.anchorCodeUnitOffset, range.focusCodeUnitOffset, projected.value.snapshot.text.length));
  return input.ok ? ok(fieldState(current.value, input.value, format)) : input;
}

function commitValue(
  value: DateTimeValue | null,
  policies: CapturedPolicies,
  segment?: DateTimeFieldFormatPart,
  format?: DateTimeFieldFormat,
): TemporalResult<DateTimeFieldUpdate> {
  if (value === null) {
    if (policies.required === true) {
      return fail('transition-rejection', 'date-time-field-value-required', 'Date-time field requires a value.');
    }
  } else {
    const valid = tryCreateDateTimeValue(value.date, value.time);
    if (!valid.ok) return transitionFailure(valid);
    value = valid.value;
    if (policies.min !== undefined && compareDateTimeValues(value, policies.min) < 0) {
      return fail(
        'transition-rejection',
        'date-time-field-value-below-minimum',
        'Date-time field value is below its minimum.',
      );
    }
    if (policies.max !== undefined && compareDateTimeValues(value, policies.max) > 0) {
      return fail(
        'transition-rejection',
        'date-time-field-value-above-maximum',
        'Date-time field value is above its maximum.',
      );
    }
    if (policies.unavailable?.(value) === true) {
      return fail(
        'transition-rejection',
        'date-time-field-value-unavailable',
        'Date-time field value is unavailable.',
      );
    }
  }
  const input = committedInput(value, segment, format);
  if (!input.ok) return input;
  return createMachineUpdate(fieldState(value, input.value, format), [
    { type: 'input-state-changed', value: input.value },
    { type: 'value-committed', value },
  ]);
}

function committedInput(
  value: DateTimeValue | null,
  segment?: DateTimeFieldFormatPart,
  format?: DateTimeFieldFormat,
): TemporalResult<TextEditingState> {
  if (format !== undefined) {
    const projected = value === null ? ok('') : tryFormatDateTimeFieldValue(value, format); if (!projected.ok) return projected;
    if (value !== null && segment !== undefined) {
      const layout = dateTimeFieldFormatLayout(format, value); if (!layout.ok) return layout;
      const available = layout.value.parts.includes(segment) ? segment : segment === 'dayPeriod' ? 'hour' : format.time.precision === 'minute' ? 'minute' : 'second';
      const index = layout.value.parts.indexOf(available);
      return tryCreateTextEditingState(projected.value, { anchorCodeUnitOffset: layout.value.starts[index]!, focusCodeUnitOffset: layout.value.ends[index]! });
    }
    return tryCreateTextEditingState(projected.value);
  }
  const legacy = segment === 'dayPeriod' ? 'hour' : segment;
  const text = value === null ? '' : formatDateTimeFieldInput(value, legacy);
  segment = legacy;
  const start = segment === 'year' ? 0
    : segment === 'month' ? 5
      : segment === 'day' ? 8
        : segment === 'hour' ? 11
          : segment === 'minute' ? 14
            : segment === 'second' ? 17
              : segment === 'millisecond' ? 20 : text.length;
  const end = segment === undefined ? text.length
    : start + (segment === 'year' ? 4 : segment === 'millisecond' ? 3 : 2);
  return tryCreateTextEditingState(text, {
    anchorCodeUnitOffset: Math.min(start, text.length),
    focusCodeUnitOffset: Math.min(end, text.length),
  });
}

function formatDateTimeFieldInput(value: DateTimeValue, segment?: DateTimeSegment): string {
  const text = formatDateTimeValue(value);
  if (segment === 'second' && value.time.second === 0 && value.time.millisecond === 0) return `${text}:00`;
  if (segment === 'millisecond' && value.time.millisecond === 0) return value.time.second === 0 ? `${text}:00.000` : `${text}.000`;
  return text;
}

function validatePolicies(policies: DateTimeFieldPolicies): TemporalResult<CapturedPolicies> {
  let { min, max, required, unavailable, step } = policies;
  if (min !== undefined) {
    const valid = tryCreateDateTimeValue(min.date, min.time);
    if (!valid.ok) return valid;
    min = valid.value;
  }
  if (max !== undefined) {
    const valid = tryCreateDateTimeValue(max.date, max.time);
    if (!valid.ok) return valid;
    max = valid.value;
  }
  if (unavailable !== undefined && typeof unavailable !== 'function') {
    return fail('construction', 'invalid-date-time-unavailable-policy', 'Date-time unavailable policy must be a function.');
  }
  if (min !== undefined && max !== undefined && compareDateTimeValues(min, max) > 0) {
    return fail('construction', 'inverted-date-time-field-bounds', 'Date-time minimum exceeds its maximum.');
  }
  if (step !== undefined) {
    const input = step;
    step = {};
    for (const segment of ['year', 'month', 'day', 'hour', 'minute', 'second', 'millisecond'] as const) {
      const value = input[segment];
      if (value !== undefined) {
        if (!Number.isSafeInteger(value) || value < 1) return fail(
          'construction', 'invalid-date-time-field-step', 'Date-time field segment steps must be positive safe integers.',
        );
        step[segment] = value;
      }
    }
  }
  return ok({ min, max, required, unavailable, step });
}
