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
import { ok, fail } from '../internal/foundation.js';
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
  if (!valid.ok) return invalidTransition(valid);
  const policy = validatePolicies(policies);
  if (!policy.ok) return policy;

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
    return commitValue(event.value, policies);
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
    const requested = policies.step?.[segment] ?? 1;
    if (!Number.isSafeInteger(requested) || requested < 1) {
      return fail(
        'construction',
        'invalid-date-time-field-step',
        'Date-time field segment steps must be positive safe integers.',
      );
    }
    const direction = event === 'increment-segment' ? 1 : -1;
    const adjusted = adjustSegment(base, segment, requested * direction);
    return adjusted.ok ? commitValue(adjusted.value, policies, segment) : adjusted;
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
  if (text.length === 0) return commitValue(null, policies);
  const parsed = parseDateTimeValue(text);
  return parsed.ok ? commitValue(parsed.value, policies) : parsed;
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

function commitValue(
  value: DateTimeValue | null,
  policies: DateTimeFieldPolicies,
  segment?: DateTimeSegment,
): TemporalResult<DateTimeFieldUpdate> {
  if (value === null) {
    if (policies.required === true) {
      return fail('transition-rejection', 'date-time-field-value-required', 'Date-time field requires a value.');
    }
  } else {
    const valid = tryCreateDateTimeValue(value.date, value.time);
    if (!valid.ok) return invalidTransition(valid);
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
  const range = segment === 'year' ? [0, 4]
    : segment === 'month' ? [5, 7]
      : segment === 'day' ? [8, 10]
        : segment === 'hour' ? [11, 13]
          : segment === 'minute' ? [14, 16]
            : segment === 'second' ? [17, 19]
              : segment === 'millisecond' ? [20, 23]
                : [text.length, text.length];
  return tryCreateTextEditingState(text, {
    anchorCodeUnitOffset: Math.min(range[0] ?? 0, text.length),
    focusCodeUnitOffset: Math.min(range[1] ?? 0, text.length),
  });
}

function formatDateTimeFieldInput(value: DateTimeValue, segment?: DateTimeSegment): string {
  const text = formatDateTimeValue(value);
  if (segment === 'second' && value.time.second === 0 && value.time.millisecond === 0) return `${text}:00`;
  if (segment === 'millisecond' && value.time.millisecond === 0) return value.time.second === 0 ? `${text}:00.000` : `${text}.000`;
  return text;
}

function validatePolicies(policies: DateTimeFieldPolicies): TemporalResult<true> {
  if (policies.unavailable !== undefined && typeof policies.unavailable !== 'function') {
    return fail(
      'construction',
      'invalid-date-time-unavailable-policy',
      'Date-time unavailable policy must be a function.',
    );
  }
  if (policies.min !== undefined) {
    const min = tryCreateDateTimeValue(policies.min.date, policies.min.time);
    if (!min.ok) return min;
  }
  if (policies.max !== undefined) {
    const max = tryCreateDateTimeValue(policies.max.date, policies.max.time);
    if (!max.ok) return max;
  }
  if (
    policies.min !== undefined
    && policies.max !== undefined
    && compareDateTimeValues(policies.min, policies.max) > 0
  ) {
    return fail(
      'construction',
      'inverted-date-time-field-bounds',
      'Date-time field minimum must not follow its maximum.',
    );
  }
  if (policies.step !== undefined) {
    for (const value of Object.values(policies.step)) {
      if (value !== undefined && (!Number.isSafeInteger(value) || value < 1)) {
        return fail(
          'construction',
          'invalid-date-time-field-step',
          'Date-time field segment steps must be positive safe integers.',
        );
      }
    }
  }
  return ok(true);
}

function invalidTransition<T>(result: TemporalResult<T>): TemporalResult<never> {
  return result.ok
    ? fail('internal-invariant', 'unexpected-valid-result', 'Expected an invalid result.')
    : { ok: false, error: { ...result.error, class: 'transition-rejection' } };
}
