import type { Result } from './shared.js';
import { fail, ok } from './internal/kernel/foundation.js';
import { createMachineUpdate } from './internal/kernel/machine.js';
import {
  addDateDays,
  addDateMonths,
  addDateYears,
  compareDateValues,
  createDateValue,
  formatDateValue,
  parseDateValue,
  type DateValue,
} from './date-field.js';
import {
  createTimeValue,
  formatTimeValue,
  parseTimeValue,
  type TimeValue,
} from './time-field.js';
import {
  applyTextEvent,
  createTextEditingState,
  normalizeTextEditingState,
  type TextEditingState,
  type TextEvent,
} from './text.js';

export interface DateTimeValue {
  readonly date: DateValue;
  readonly time: TimeValue;
}

export interface DateTimeRange {
  readonly start: DateTimeValue;
  readonly end: DateTimeValue;
}

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

export interface DateTimeFieldUpdate {
  readonly state: DateTimeFieldState;
  readonly commands: readonly DateTimeFieldCommand[];
}

const DATE_TIME_FIELD_MAX_CODE_UNITS = 23;
const MILLISECONDS_PER_DAY = 86_400_000;

export function createDateTimeValue(date: DateValue, time: TimeValue): Result<DateTimeValue> {
  const validDate = createDateValue(date.year, date.month, date.day);
  if (!validDate.ok) return validDate;
  const validTime = createTimeValue(time.hour, time.minute, time.second, time.millisecond);
  if (!validTime.ok) return validTime;
  return ok(Object.freeze({ date: validDate.value, time: validTime.value }));
}

export function parseDateTimeValue(text: string): Result<DateTimeValue> {
  if (typeof text !== 'string') {
    return fail('construction', 'invalid-date-time-text', 'Date-time text must be a string.');
  }
  const separator = text.indexOf('T');
  if (separator !== 10 || text.indexOf('T', separator + 1) !== -1) {
    return fail(
      'transition-rejection',
      'invalid-date-time-format',
      'Date-time text must use YYYY-MM-DDTHH:mm, with optional seconds and milliseconds.',
      { text },
    );
  }
  const date = parseDateValue(text.slice(0, separator));
  if (!date.ok) return date;
  const time = parseTimeValue(text.slice(separator + 1));
  return time.ok ? createDateTimeValue(date.value, time.value) : time;
}

export function formatDateTimeValue(value: DateTimeValue): string {
  return `${formatDateValue(value.date)}T${formatTimeValue(value.time)}`;
}

export function compareDateTimeValues(left: DateTimeValue, right: DateTimeValue): -1 | 0 | 1 {
  const dateOrder = compareDateValues(left.date, right.date);
  if (dateOrder !== 0) return dateOrder;
  const leftTime = timeToMilliseconds(left.time);
  const rightTime = timeToMilliseconds(right.time);
  return leftTime < rightTime ? -1 : leftTime > rightTime ? 1 : 0;
}

export function createDateTimeRange(
  start: DateTimeValue,
  end: DateTimeValue,
): Result<DateTimeRange> {
  const validStart = createDateTimeValue(start.date, start.time);
  if (!validStart.ok) return validStart;
  const validEnd = createDateTimeValue(end.date, end.time);
  if (!validEnd.ok) return validEnd;
  if (compareDateTimeValues(validStart.value, validEnd.value) > 0) {
    return fail(
      'construction',
      'inverted-date-time-range',
      'Date-time range start must not follow its end.',
    );
  }
  return ok(Object.freeze({ start: validStart.value, end: validEnd.value }));
}

export function formatDateTimeRange(value: DateTimeRange): string {
  return `${formatDateTimeValue(value.start)}/${formatDateTimeValue(value.end)}`;
}

export function addDateTimeMilliseconds(value: DateTimeValue, amount: number): Result<DateTimeValue> {
  if (!Number.isSafeInteger(amount)) {
    return fail('transition-rejection', 'invalid-date-time-delta', 'Date-time delta must be a safe integer.');
  }
  const total = timeToMilliseconds(value.time) + amount;
  const dayDelta = Math.floor(total / MILLISECONDS_PER_DAY);
  const timeOfDay = ((total % MILLISECONDS_PER_DAY) + MILLISECONDS_PER_DAY) % MILLISECONDS_PER_DAY;
  const date = addDateDays(value.date, dayDelta);
  if (!date.ok) return date;
  const time = millisecondsToTime(timeOfDay);
  return time.ok ? createDateTimeValue(date.value, time.value) : time;
}

export function createDateTimeFieldState(
  value: DateTimeValue | null = null,
  inputState?: TextEditingState,
): Result<DateTimeFieldState> {
  const valid = value === null ? ok(null) : createDateTimeValue(value.date, value.time);
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
): Result<DateTimeFieldUpdate> {
  const valid = createDateTimeFieldState(state.value, state.inputState);
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
): Result<DateTimeValue> {
  if (segment === 'year' || segment === 'month' || segment === 'day') {
    const date = segment === 'year'
      ? addDateYears(value.date, amount)
      : segment === 'month'
        ? addDateMonths(value.date, amount)
        : addDateDays(value.date, amount);
    return date.ok ? createDateTimeValue(date.value, value.time) : date;
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
): Result<DateTimeFieldUpdate> {
  if (value === null) {
    if (policies.required === true) {
      return fail('transition-rejection', 'date-time-field-value-required', 'Date-time field requires a value.');
    }
  } else {
    const valid = createDateTimeValue(value.date, value.time);
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
): Result<TextEditingState> {
  const text = value === null ? '' : formatDateTimeValue(value);
  const range = segment === 'year' ? [0, 4]
    : segment === 'month' ? [5, 7]
      : segment === 'day' ? [8, 10]
        : segment === 'hour' ? [11, 13]
          : segment === 'minute' ? [14, 16]
            : segment === 'second' ? [17, 19]
              : segment === 'millisecond' ? [20, 23]
                : [text.length, text.length];
  return createTextEditingState(text, {
    anchorCodeUnitOffset: Math.min(range[0] ?? 0, text.length),
    focusCodeUnitOffset: Math.min(range[1] ?? 0, text.length),
  });
}

function validatePolicies(policies: DateTimeFieldPolicies): Result<true> {
  if (policies.unavailable !== undefined && typeof policies.unavailable !== 'function') {
    return fail(
      'construction',
      'invalid-date-time-unavailable-policy',
      'Date-time unavailable policy must be a function.',
    );
  }
  if (policies.min !== undefined) {
    const min = createDateTimeValue(policies.min.date, policies.min.time);
    if (!min.ok) return min;
  }
  if (policies.max !== undefined) {
    const max = createDateTimeValue(policies.max.date, policies.max.time);
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

function timeToMilliseconds(value: TimeValue): number {
  return ((value.hour * 60 + value.minute) * 60 + value.second) * 1_000 + value.millisecond;
}

function millisecondsToTime(value: number): Result<TimeValue> {
  const hour = Math.floor(value / 3_600_000);
  const minute = Math.floor((value % 3_600_000) / 60_000);
  const second = Math.floor((value % 60_000) / 1_000);
  return createTimeValue(hour, minute, second, value % 1_000);
}

function invalidTransition<T>(result: Result<T>): Result<never> {
  return result.ok
    ? fail('internal-invariant', 'unexpected-valid-result', 'Expected an invalid result.')
    : { ok: false, error: { ...result.error, class: 'transition-rejection' } };
}
