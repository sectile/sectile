import {
  type DateValue,
  tryCreateDateValue,
  parseDateValue,
  addDateYears,
  addDateMonths,
  addDateDays,
  compareDateValues,
  formatDateValue,
} from '../values/date.js';
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

export type {
  DateValue,
  DateRange,
} from '../values/date.js';
export {
  createDateValue,
  tryCreateDateValue,
  parseDateValue,
  formatDateValue,
  compareDateValues,
  differenceInDateDays,
  dateDayOfWeek,
  addDateDays,
  addDateMonths,
  addDateYears,
  createDateRange,
  tryCreateDateRange,
  dateRangeContains,
  daysInMonth,
  isLeapYear,
} from '../values/date.js';

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

export type DateFieldUnavailablePredicate = NonNullable<DateFieldPolicies['unavailable']>;

export interface DateFieldUpdate {
  readonly state: DateFieldState;
  readonly commands: readonly DateFieldCommand[];
}

const DATE_FIELD_MAX_CODE_UNITS = 10;

export function createDateFieldState(
  value: DateValue | null = null,
  inputState?: TextEditingState,
): DateFieldState {
  return unwrap(tryCreateDateFieldState(value, inputState));
}

export function tryCreateDateFieldState(
  value: DateValue | null = null,
  inputState?: TextEditingState,
): TemporalResult<DateFieldState> {
  const valid = value === null ? ok(null) : tryCreateDateValue(value.year, value.month, value.day);
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
): TemporalResult<DateFieldUpdate> {
  const valid = tryCreateDateFieldState(state.value, state.inputState);
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

function commitValue(value: DateValue | null, policies: DateFieldPolicies, segment?: DateSegment): TemporalResult<DateFieldUpdate> {
  if (value === null) {
    if (policies.required === true) return fail('transition-rejection', 'date-field-value-required', 'Date field requires a value.');
  } else {
    const valid = tryCreateDateValue(value.year, value.month, value.day);
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

function committedInput(value: DateValue | null, segment?: DateSegment): TemporalResult<TextEditingState> {
  const text = value === null ? '' : formatDateValue(value);
  const selection = segment === undefined ? { anchorCodeUnitOffset: text.length, focusCodeUnitOffset: text.length }
    : segment === 'year' ? { anchorCodeUnitOffset: 0, focusCodeUnitOffset: 4 }
      : segment === 'month' ? { anchorCodeUnitOffset: 5, focusCodeUnitOffset: 7 }
        : { anchorCodeUnitOffset: 8, focusCodeUnitOffset: 10 };
  return tryCreateTextEditingState(text, selection);
}

function validatePolicies(policies: DateFieldPolicies): TemporalResult<true> {
  if (policies.unavailable !== undefined && typeof policies.unavailable !== 'function') return fail('construction', 'invalid-date-unavailable-policy', 'Date unavailable policy must be a function.');
  if (policies.min !== undefined) {
    const min = tryCreateDateValue(policies.min.year, policies.min.month, policies.min.day);
    if (!min.ok) return min;
  }
  if (policies.max !== undefined) {
    const max = tryCreateDateValue(policies.max.year, policies.max.month, policies.max.day);
    if (!max.ok) return max;
  }
  if (policies.min !== undefined && policies.max !== undefined && compareDateValues(policies.min, policies.max) > 0) return fail('construction', 'inverted-date-field-bounds', 'Date field minimum must not follow its maximum.');
  return ok(true);
}

function transitionFailure<T>(result: TemporalResult<T>): TemporalResult<never> {
  return result.ok ? fail('internal-invariant', 'unexpected-valid-result', 'Expected an invalid result.') : { ok: false, error: { ...result.error, class: 'transition-rejection' } };
}
