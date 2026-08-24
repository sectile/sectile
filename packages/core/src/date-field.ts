import type { Result } from './shared.js';
import { fail, ok } from './internal/kernel/foundation.js';
import { createMachineUpdate } from './internal/kernel/machine.js';
import {
  applyTextEvent,
  createTextEditingState,
  normalizeTextEditingState,
  type TextEditingState,
  type TextEvent,
} from './text.js';

export interface DateValue {
  readonly year: number;
  readonly month: number;
  readonly day: number;
}

export interface DateRange {
  readonly start: DateValue;
  readonly end: DateValue;
}

export type DateSegment = 'year' | 'month' | 'day';

export interface DateFieldState {
  readonly value: DateValue | null;
  readonly inputState: TextEditingState;
}

export type DateFieldEvent =
  | { readonly type: 'text'; readonly event: TextEvent }
  | { readonly type: 'set-value'; readonly value: DateValue | null }
  | 'increment-segment'
  | 'decrement-segment'
  | 'commit'
  | 'cancel';

export type DateFieldCommand =
  | { readonly type: 'input-state-changed'; readonly value: TextEditingState }
  | { readonly type: 'value-committed'; readonly value: DateValue | null };

export interface DateFieldPolicies {
  readonly min?: DateValue;
  readonly max?: DateValue;
  readonly required?: boolean;
  readonly unavailable?: (value: DateValue) => boolean;
}

export interface DateFieldUpdate {
  readonly state: DateFieldState;
  readonly commands: readonly DateFieldCommand[];
}

const DATE_FIELD_MAX_CODE_UNITS = 10;

export function createDateValue(year: number, month: number, day: number): Result<DateValue> {
  if (!Number.isSafeInteger(year) || year < 1 || year > 9_999) {
    return fail('construction', 'invalid-date-year', 'Date year must be an integer from 1 through 9999.', { year });
  }
  if (!Number.isSafeInteger(month) || month < 1 || month > 12) {
    return fail('construction', 'invalid-date-month', 'Date month must be an integer from 1 through 12.', { month });
  }
  const maximum = daysInMonth(year, month);
  if (!Number.isSafeInteger(day) || day < 1 || day > maximum) {
    return fail('construction', 'invalid-date-day', 'Date day must exist in its Gregorian month.', { year, month, day });
  }
  return ok(Object.freeze({ year, month, day }));
}

export function parseDateValue(text: string): Result<DateValue> {
  if (typeof text !== 'string') return fail('construction', 'invalid-date-text', 'Date text must be a string.');
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  return match === null
    ? fail('transition-rejection', 'invalid-date-format', 'Date text must use YYYY-MM-DD.', { text })
    : createDateValue(Number(match[1]), Number(match[2]), Number(match[3]));
}

export function formatDateValue(value: DateValue): string {
  return `${String(value.year).padStart(4, '0')}-${String(value.month).padStart(2, '0')}-${String(value.day).padStart(2, '0')}`;
}

export function compareDateValues(left: DateValue, right: DateValue): -1 | 0 | 1 {
  const leftDay = dateToOrdinal(left);
  const rightDay = dateToOrdinal(right);
  return leftDay < rightDay ? -1 : leftDay > rightDay ? 1 : 0;
}

export function differenceInDateDays(left: DateValue, right: DateValue): number {
  return dateToOrdinal(left) - dateToOrdinal(right);
}

/** ISO weekday: Monday is 1 and Sunday is 7. */
export function dateDayOfWeek(value: DateValue): 1 | 2 | 3 | 4 | 5 | 6 | 7 {
  const thursday = dateToOrdinal(Object.freeze({ year: 1970, month: 1, day: 1 }));
  return (((dateToOrdinal(value) - thursday + 3) % 7 + 7) % 7 + 1) as 1 | 2 | 3 | 4 | 5 | 6 | 7;
}

export function addDateDays(value: DateValue, amount: number): Result<DateValue> {
  if (!Number.isSafeInteger(amount)) return fail('transition-rejection', 'invalid-date-day-delta', 'Date day delta must be a safe integer.');
  const result = ordinalToDate(dateToOrdinal(value) + amount);
  return result.year < 1 || result.year > 9_999
    ? fail('transition-rejection', 'date-outside-supported-range', 'Date arithmetic must remain between years 1 and 9999.')
    : ok(result);
}

export function addDateMonths(value: DateValue, amount: number): Result<DateValue> {
  if (!Number.isSafeInteger(amount)) return fail('transition-rejection', 'invalid-date-month-delta', 'Date month delta must be a safe integer.');
  const absolute = value.year * 12 + value.month - 1 + amount;
  const year = Math.floor(absolute / 12);
  const month = absolute - year * 12 + 1;
  if (year < 1 || year > 9_999) return fail('transition-rejection', 'date-outside-supported-range', 'Date arithmetic must remain between years 1 and 9999.');
  return createDateValue(year, month, Math.min(value.day, daysInMonth(year, month)));
}

export function addDateYears(value: DateValue, amount: number): Result<DateValue> {
  if (!Number.isSafeInteger(amount)) return fail('transition-rejection', 'invalid-date-year-delta', 'Date year delta must be a safe integer.');
  const year = value.year + amount;
  if (year < 1 || year > 9_999) return fail('transition-rejection', 'date-outside-supported-range', 'Date arithmetic must remain between years 1 and 9999.');
  return createDateValue(year, value.month, Math.min(value.day, daysInMonth(year, value.month)));
}

export function createDateRange(start: DateValue, end: DateValue): Result<DateRange> {
  const validStart = createDateValue(start.year, start.month, start.day);
  if (!validStart.ok) return validStart;
  const validEnd = createDateValue(end.year, end.month, end.day);
  if (!validEnd.ok) return validEnd;
  if (compareDateValues(validStart.value, validEnd.value) > 0) {
    return fail('construction', 'inverted-date-range', 'Date range start must not follow its end.');
  }
  return ok(Object.freeze({ start: validStart.value, end: validEnd.value }));
}

export function dateRangeContains(range: DateRange, value: DateValue): boolean {
  return compareDateValues(range.start, value) <= 0 && compareDateValues(value, range.end) <= 0;
}

export function createDateFieldState(
  value: DateValue | null = null,
  inputState?: TextEditingState,
): Result<DateFieldState> {
  const valid = value === null ? ok(null) : createDateValue(value.year, value.month, value.day);
  if (!valid.ok) return valid;
  const input = inputState === undefined
    ? committedInput(valid.value)
    : normalizeTextEditingState(inputState);
  if (!input.ok) return input;
  if (input.value.snapshot.text.length > DATE_FIELD_MAX_CODE_UNITS) {
    return fail('construction', 'date-field-draft-too-long', 'Date field drafts must fit YYYY-MM-DD.');
  }
  return ok(Object.freeze({ value: valid.value, inputState: input.value }));
}

export function applyDateFieldEvent(
  state: DateFieldState,
  event: DateFieldEvent,
  policies: DateFieldPolicies = {},
): Result<DateFieldUpdate> {
  const valid = createDateFieldState(state.value, state.inputState);
  if (!valid.ok) return transitionFailure(valid);
  const bounds = validatePolicies(policies);
  if (!bounds.ok) return bounds;
  if (typeof event === 'object' && event.type === 'text') {
    const edited = applyTextEvent(valid.value.inputState, event.event);
    if (!edited.ok) return edited;
    if (edited.value.state.snapshot.text.length > DATE_FIELD_MAX_CODE_UNITS) {
      return fail('transition-rejection', 'date-field-draft-too-long', 'Date field drafts must fit YYYY-MM-DD.');
    }
    return createMachineUpdate(Object.freeze({ value: valid.value.value, inputState: edited.value.state }), [
      { type: 'input-state-changed', value: edited.value.state },
    ]);
  }
  if (typeof event === 'object' && event.type === 'set-value') {
    return commitValue(event.value, policies);
  }
  if (event === 'cancel') {
    const input = committedInput(valid.value.value);
    if (!input.ok) return input;
    return createMachineUpdate(Object.freeze({ value: valid.value.value, inputState: input.value }), [
      { type: 'input-state-changed', value: input.value },
    ]);
  }
  if (event === 'increment-segment' || event === 'decrement-segment') {
    const draft = parseDateValue(valid.value.inputState.snapshot.text);
    if (!draft.ok && valid.value.value === null) return draft;
    const base = draft.ok ? draft.value : valid.value.value;
    if (base === null) return fail('transition-rejection', 'date-field-value-missing', 'Date field has no value to adjust.');
    const amount = event === 'increment-segment' ? 1 : -1;
    const segment = dateSegmentAt(valid.value.inputState.snapshot.selection.focusCodeUnitOffset);
    const adjusted = segment === 'year' ? addDateYears(base, amount)
      : segment === 'month' ? addDateMonths(base, amount)
        : addDateDays(base, amount);
    return adjusted.ok ? commitValue(adjusted.value, policies, segment) : adjusted;
  }
  if (event !== 'commit') return fail('transition-rejection', 'unsupported-date-field-event', 'Date field event is unsupported.');
  if (valid.value.inputState.composition !== null) return fail('transition-rejection', 'date-field-composition-active', 'Date field cannot commit while text composition is active.');
  const text = valid.value.inputState.snapshot.text.trim();
  if (text.length === 0) return commitValue(null, policies);
  const parsed = parseDateValue(text);
  return parsed.ok ? commitValue(parsed.value, policies) : parsed;
}

export function dateSegmentAt(offset: number): DateSegment {
  return offset <= 4 ? 'year' : offset <= 7 ? 'month' : 'day';
}

export function daysInMonth(year: number, month: number): number {
  return month === 2 ? (isLeapYear(year) ? 29 : 28) : (month === 4 || month === 6 || month === 9 || month === 11 ? 30 : 31);
}

export function isLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

function commitValue(value: DateValue | null, policies: DateFieldPolicies, segment?: DateSegment): Result<DateFieldUpdate> {
  if (value === null) {
    if (policies.required === true) return fail('transition-rejection', 'date-field-value-required', 'Date field requires a value.');
  } else {
    const valid = createDateValue(value.year, value.month, value.day);
    if (!valid.ok) return transitionFailure(valid);
    value = valid.value;
    if (policies.min !== undefined && compareDateValues(value, policies.min) < 0) return fail('transition-rejection', 'date-field-value-below-minimum', 'Date field value is below its minimum.');
    if (policies.max !== undefined && compareDateValues(value, policies.max) > 0) return fail('transition-rejection', 'date-field-value-above-maximum', 'Date field value is above its maximum.');
    if (policies.unavailable?.(value) === true) return fail('transition-rejection', 'date-field-value-unavailable', 'Date field value is unavailable.');
  }
  const input = committedInput(value, segment);
  if (!input.ok) return input;
  return createMachineUpdate(Object.freeze({ value, inputState: input.value }), [
    { type: 'input-state-changed', value: input.value },
    { type: 'value-committed', value },
  ]);
}

function committedInput(value: DateValue | null, segment?: DateSegment): Result<TextEditingState> {
  const text = value === null ? '' : formatDateValue(value);
  const selection = segment === undefined ? { anchorCodeUnitOffset: text.length, focusCodeUnitOffset: text.length }
    : segment === 'year' ? { anchorCodeUnitOffset: 0, focusCodeUnitOffset: 4 }
      : segment === 'month' ? { anchorCodeUnitOffset: 5, focusCodeUnitOffset: 7 }
        : { anchorCodeUnitOffset: 8, focusCodeUnitOffset: 10 };
  return createTextEditingState(text, selection);
}

function validatePolicies(policies: DateFieldPolicies): Result<true> {
  if (policies.unavailable !== undefined && typeof policies.unavailable !== 'function') return fail('construction', 'invalid-date-unavailable-policy', 'Date unavailable policy must be a function.');
  if (policies.min !== undefined) {
    const min = createDateValue(policies.min.year, policies.min.month, policies.min.day);
    if (!min.ok) return min;
  }
  if (policies.max !== undefined) {
    const max = createDateValue(policies.max.year, policies.max.month, policies.max.day);
    if (!max.ok) return max;
  }
  if (policies.min !== undefined && policies.max !== undefined && compareDateValues(policies.min, policies.max) > 0) return fail('construction', 'inverted-date-field-bounds', 'Date field minimum must not follow its maximum.');
  return ok(true);
}

function transitionFailure<T>(result: Result<T>): Result<never> {
  return result.ok ? fail('internal-invariant', 'unexpected-valid-result', 'Expected an invalid result.') : { ok: false, error: { ...result.error, class: 'transition-rejection' } };
}

function dateToOrdinal(value: DateValue): number {
  let year = value.year;
  const month = value.month;
  year -= month <= 2 ? 1 : 0;
  const era = Math.floor(year / 400);
  const yearOfEra = year - era * 400;
  const monthPrime = month + (month > 2 ? -3 : 9);
  const dayOfYear = Math.floor((153 * monthPrime + 2) / 5) + value.day - 1;
  const dayOfEra = yearOfEra * 365 + Math.floor(yearOfEra / 4) - Math.floor(yearOfEra / 100) + dayOfYear;
  return era * 146097 + dayOfEra;
}

function ordinalToDate(ordinal: number): DateValue {
  const era = Math.floor(ordinal / 146097);
  const dayOfEra = ordinal - era * 146097;
  const yearOfEra = Math.floor((dayOfEra - Math.floor(dayOfEra / 1460) + Math.floor(dayOfEra / 36524) - Math.floor(dayOfEra / 146096)) / 365);
  let year = yearOfEra + era * 400;
  const dayOfYear = dayOfEra - (365 * yearOfEra + Math.floor(yearOfEra / 4) - Math.floor(yearOfEra / 100));
  const monthPrime = Math.floor((5 * dayOfYear + 2) / 153);
  const day = dayOfYear - Math.floor((153 * monthPrime + 2) / 5) + 1;
  const month = monthPrime + (monthPrime < 10 ? 3 : -9);
  year += month <= 2 ? 1 : 0;
  return Object.freeze({ year, month, day });
}
