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
): DateTimeFieldState {
  return unwrap(tryCreateDateTimeFieldState(value, inputState));
}

export function tryCreateDateTimeFieldState(
  value: DateTimeValue | null = null,
  inputState?: TextEditingState,
): TemporalResult<DateTimeFieldState> {
  const valid = value === null ? ok(null) : tryCreateDateTimeValue(value.date, value.time);
  if (!valid.ok) return valid;
  const input = inputState === undefined
    ? committedInput(valid.value)
    : normalizeTextEditingState(inputState);
  if (!input.ok) return input;
  if (input.value.snapshot.text.length > DATE_TIME_FIELD_MAX_CODE_UNITS) {
    return fail(
      'construction',
      'date-time-field-draft-too-long',
      'Date-time field drafts must fit YYYY-MM-DDTHH:mm with optional seconds and milliseconds.',
    );
  }
  return ok(Object.freeze({ value: valid.value, inputState: input.value }));
}

export function applyDateTimeFieldEvent(
  state: DateTimeFieldState,
  event: DateTimeFieldEvent,
  policies: DateTimeFieldPolicies = {},
): TemporalResult<DateTimeFieldUpdate> {
  const valid = tryCreateDateTimeFieldState(state.value, state.inputState);
  if (!valid.ok) return transitionFailure(valid);
  const policy = validatePolicies(policies);
  if (!policy.ok) return policy;
  const accepted = policy.value;

  if (typeof event === 'object' && event.type === 'text') {
    const edited = applyTextEvent(valid.value.inputState, event.event);
    if (!edited.ok) return edited;
    if (edited.value.state.snapshot.text.length > DATE_TIME_FIELD_MAX_CODE_UNITS) {
      return fail(
        'transition-rejection',
        'date-time-field-draft-too-long',
        'Date-time field drafts must fit YYYY-MM-DDTHH:mm with optional seconds and milliseconds.',
      );
    }
    return createMachineUpdate(
      Object.freeze({ value: valid.value.value, inputState: edited.value.state }),
      [{ type: 'input-state-changed', value: edited.value.state }],
    );
  }

  if (typeof event === 'object' && event.type === 'set-value') {
    return commitValue(event.value, accepted);
  }

  if (event === 'cancel') {
    const input = committedInput(valid.value.value);
    if (!input.ok) return input;
    return createMachineUpdate(
      Object.freeze({ value: valid.value.value, inputState: input.value }),
      [{ type: 'input-state-changed', value: input.value }],
    );
  }

  if (event === 'increment-segment' || event === 'decrement-segment') {
    const draft = parseDateTimeValue(valid.value.inputState.snapshot.text);
    if (!draft.ok && valid.value.value === null) return draft;
    const base = draft.ok ? draft.value : valid.value.value;
    if (base === null) {
      return fail('transition-rejection', 'date-time-field-value-missing', 'Date-time field has no value to adjust.');
    }
    const segment = dateTimeSegmentAt(valid.value.inputState.snapshot.selection.focusCodeUnitOffset);
    const requested = accepted.step?.[segment] ?? 1;
    const direction = event === 'increment-segment' ? 1 : -1;
    const adjusted = adjustSegment(base, segment, requested * direction);
    return adjusted.ok ? commitValue(adjusted.value, accepted, segment) : adjusted;
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
  const text = valid.value.inputState.snapshot.text.trim();
  if (text.length === 0) return commitValue(null, accepted);
  const parsed = parseDateTimeValue(text);
  return parsed.ok ? commitValue(parsed.value, accepted) : parsed;
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

function commitValue(
  value: DateTimeValue | null,
  policies: CapturedPolicies,
  segment?: DateTimeSegment,
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
  const input = committedInput(value, segment);
  if (!input.ok) return input;
  return createMachineUpdate(Object.freeze({ value, inputState: input.value }), [
    { type: 'input-state-changed', value: input.value },
    { type: 'value-committed', value },
  ]);
}

function committedInput(
  value: DateTimeValue | null,
  segment?: DateTimeSegment,
): TemporalResult<TextEditingState> {
  const text = value === null ? '' : formatDateTimeFieldInput(value, segment);
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
