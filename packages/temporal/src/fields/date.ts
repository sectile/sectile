import {
  type DateValue,
  tryCreateDateValue,
  addDateYears,
  addDateMonths,
  addDateDays,
  compareDateValues,
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
import { transitionFailure, ok, fail } from '../internal/foundation.js';
import { createMachineUpdate } from '../internal/machine.js';
import { projectFieldSelection } from '../internal/field-format.js';
import { dateFieldFormatLayout, invalidDateFieldFormat as invalidFormat, formatDateFieldValue, parseDateFieldValue, type DateFieldFormat, type DateSegment } from './date-format.js';
export { createDateFieldFormat, tryCreateDateFieldFormat, formatDateFieldValue, parseDateFieldValue } from './date-format.js';
export type { DateFieldFormatOptions, DateFieldFormat, DateSegment } from './date-format.js';

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

export interface DateFieldState {
  readonly value: DateValue | null;
  readonly inputState: TextEditingState;
  readonly format?: DateFieldFormat;
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
  format?: DateFieldFormat,
): DateFieldState {
  return unwrap(tryCreateDateFieldState(value, inputState, format));
}

export function tryCreateDateFieldState(
  value: DateValue | null = null,
  inputState?: TextEditingState,
  format?: DateFieldFormat,
): TemporalResult<DateFieldState> {
  if (format !== undefined && dateFieldFormatLayout(format) === undefined) return invalidFormat();
  const valid = value === null ? ok(null) : tryCreateDateValue(value.year, value.month, value.day);
  if (!valid.ok) return valid;
  const input = inputState === undefined
    ? committedInput(valid.value, undefined, format)
    : normalizeTextEditingState(inputState);
  if (!input.ok) return input;
  if (input.value.snapshot.text.length > fieldMaximum(format)) {
    return fail('construction', 'date-field-draft-too-long', format === undefined ? 'Date field drafts must fit YYYY-MM-DD.' : 'Date field draft exceeds its format length.');
  }
  return ok(fieldState(valid.value, input.value, format));
}

export function applyDateFieldEvent(
  state: DateFieldState,
  event: DateFieldEvent,
  policies: DateFieldPolicies = {},
): TemporalResult<DateFieldUpdate> {
  const valid = tryCreateDateFieldState(state.value, state.inputState, state.format);
  if (!valid.ok) return transitionFailure(valid);
  const bounds = validatePolicies(policies);
  if (!bounds.ok) return bounds;
  const accepted = bounds.value;
  if (typeof event === 'object' && event.type === 'text') {
    const edited = applyTextEvent(valid.value.inputState, event.event);
    if (!edited.ok) return edited;
    if (edited.value.state.snapshot.text.length > fieldMaximum(valid.value.format)) {
      return fail('transition-rejection', 'date-field-draft-too-long', valid.value.format === undefined ? 'Date field drafts must fit YYYY-MM-DD.' : 'Date field draft exceeds its format length.');
    }
    return createMachineUpdate(fieldState(valid.value.value, edited.value.state, valid.value.format), [
      { type: 'input-state-changed', value: edited.value.state },
    ]);
  }
  if (typeof event === 'object' && event.type === 'set-value') {
    return commitValue(event.value, accepted, undefined, valid.value.format);
  }
  if (event === 'cancel') {
    const input = committedInput(valid.value.value, undefined, valid.value.format);
    if (!input.ok) return input;
    return createMachineUpdate(fieldState(valid.value.value, input.value, valid.value.format), [
      { type: 'input-state-changed', value: input.value },
    ]);
  }
  if (event === 'increment-segment' || event === 'decrement-segment') {
    const draft = parseDateFieldValue(valid.value.inputState.snapshot.text, valid.value.format);
    if (!draft.ok && valid.value.value === null) return draft;
    const base = draft.ok ? draft.value : valid.value.value;
    if (base === null) return fail('transition-rejection', 'date-field-value-missing', 'Date field has no value to adjust.');
    const amount = event === 'increment-segment' ? 1 : -1;
    const segment = dateSegmentAt(valid.value.inputState.snapshot.selection.focusCodeUnitOffset, valid.value.format);
    const adjusted = segment === 'year' ? addDateYears(base, amount)
      : segment === 'month' ? addDateMonths(base, amount)
        : addDateDays(base, amount);
    return adjusted.ok ? commitValue(adjusted.value, accepted, segment, valid.value.format) : adjusted;
  }
  if (event !== 'commit') return fail('transition-rejection', 'unsupported-date-field-event', 'Date field event is unsupported.');
  if (valid.value.inputState.composition !== null) return fail('transition-rejection', 'date-field-composition-active', 'Date field cannot commit while text composition is active.');
  const draft = valid.value.inputState.snapshot.text;
  const text = valid.value.format === undefined ? draft.trim() : draft;
  if (text.trim().length === 0) return commitValue(null, accepted, undefined, valid.value.format);
  const parsed = parseDateFieldValue(text, valid.value.format);
  return parsed.ok ? commitValue(parsed.value, accepted, undefined, valid.value.format) : parsed;
}

export function dateSegmentAt(offset: number, format?: DateFieldFormat): DateSegment {
  if (format === undefined) return offset <= 4 ? 'year' : offset <= 7 ? 'month' : 'day';
  const layout = dateFieldFormatLayout(format); if (layout === undefined) return unwrap(invalidFormat());
  return format.order[offset <= layout.ends[0]! ? 0 : offset <= layout.ends[1]! ? 1 : 2];
}

function fieldMaximum(format?: DateFieldFormat): number { return format === undefined ? DATE_FIELD_MAX_CODE_UNITS : dateFieldFormatLayout(format)!.length; }
export function reformatDateFieldState(state: DateFieldState, format?: DateFieldFormat): TemporalResult<DateFieldState> {
  const valid = tryCreateDateFieldState(state.value, state.inputState, state.format); if (!valid.ok) return valid;
  if (format !== undefined && dateFieldFormatLayout(format) === undefined) return invalidFormat();
  const current = valid.value;
  if (current.inputState.composition !== null || current.inputState.snapshot.text !== (current.value === null ? '' : formatDateFieldValue(current.value, current.format))) {
    return fail('transition-rejection', 'date-field-format-draft-active', 'Date field format changes require a settled draft.');
  }
  if (current.format === format) return ok(current);
  if (current.value === null) return tryCreateDateFieldState(null, undefined, format);
  const previous = current.inputState.snapshot.selection;
  const projected = committedInput(current.value, dateSegmentAt(previous.focusCodeUnitOffset, current.format), format); if (!projected.ok) return projected;
  const range = projected.value.snapshot.selection;
  const selection = projectFieldSelection(previous, current.inputState.snapshot.text.length, range.anchorCodeUnitOffset, range.focusCodeUnitOffset, projected.value.snapshot.text.length);
  const input = tryCreateTextEditingState(projected.value.snapshot.text, selection);
  return input.ok ? ok(fieldState(current.value, input.value, format)) : input;
}
function fieldState(value: DateValue | null, inputState: TextEditingState, format?: DateFieldFormat): DateFieldState {
  return Object.freeze(format === undefined ? { value, inputState } : { value, inputState, format });
}

type CapturedPolicies = { [Key in keyof DateFieldPolicies]-?: DateFieldPolicies[Key] | undefined };

function commitValue(value: DateValue | null, policies: CapturedPolicies, segment?: DateSegment, format?: DateFieldFormat): TemporalResult<DateFieldUpdate> {
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
  const input = committedInput(value, segment, format);
  if (!input.ok) return input;
  return createMachineUpdate(fieldState(value, input.value, format), [
    { type: 'input-state-changed', value: input.value },
    { type: 'value-committed', value },
  ]);
}

function committedInput(value: DateValue | null, segment?: DateSegment, format?: DateFieldFormat): TemporalResult<TextEditingState> {
  const text = value === null ? '' : formatDateFieldValue(value, format);
  if (segment !== undefined && format !== undefined) {
    const index = format.order.indexOf(segment), layout = dateFieldFormatLayout(format)!;
    return tryCreateTextEditingState(text, { anchorCodeUnitOffset: layout.starts[index]!, focusCodeUnitOffset: layout.ends[index]! });
  }
  const selection = segment === undefined ? { anchorCodeUnitOffset: text.length, focusCodeUnitOffset: text.length }
    : segment === 'year' ? { anchorCodeUnitOffset: 0, focusCodeUnitOffset: 4 }
      : segment === 'month' ? { anchorCodeUnitOffset: 5, focusCodeUnitOffset: 7 }
        : { anchorCodeUnitOffset: 8, focusCodeUnitOffset: 10 };
  return tryCreateTextEditingState(text, selection);
}

function validatePolicies(policies: DateFieldPolicies): TemporalResult<CapturedPolicies> {
  let { min, max, required, unavailable } = policies;
  if (min !== undefined) {
    const valid = tryCreateDateValue(min.year, min.month, min.day);
    if (!valid.ok) return valid;
    min = valid.value;
  }
  if (max !== undefined) {
    const valid = tryCreateDateValue(max.year, max.month, max.day);
    if (!valid.ok) return valid;
    max = valid.value;
  }
  if (unavailable !== undefined && typeof unavailable !== 'function') {
    return fail('construction', 'invalid-date-unavailable-policy', 'Date unavailable policy must be a function.');
  }
  if (min !== undefined && max !== undefined && compareDateValues(min, max) > 0) {
    return fail('construction', 'inverted-date-field-bounds', 'Date field minimum exceeds its maximum.');
  }
  return ok({ min, max, required, unavailable });
}
