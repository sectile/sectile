import { unwrap } from '@sectile/core/result';
import type { TextEditingState } from '@sectile/core/text';
import type { TemporalResult } from '../error.js';
import { applyDateFieldEvent, tryCreateDateFieldState, reformatDateFieldState, type DateFieldEvent, type DateFieldGranularity, type DateFieldPolicies, type DateFieldState, type DateFieldFormat } from './date.js';
import { compareDateValues, tryCreateDateRange, type DateRange, type DateValue } from '../values/date.js';
import { fail } from '../internal/foundation.js';
import { applyRangeFieldEvent, tryCreateRangeFieldState, reformatRangeFieldState,
  type RangeFieldConstruction, type RangeFieldTransition, type RangeFieldPresentation } from '../internal/range-field.js';

export type DateRangeFieldEndpoint = 'start' | 'end';
export interface DateRangeFieldState { readonly value: DateRange | null; readonly start: DateFieldState; readonly end: DateFieldState; readonly active: DateRangeFieldEndpoint }
export interface DateRangeFieldStateInput { readonly value?: DateRange | null; readonly startValue?: DateValue | null; readonly endValue?: DateValue | null; readonly startInputState?: TextEditingState; readonly endInputState?: TextEditingState; readonly startFormat?: DateFieldFormat; readonly endFormat?: DateFieldFormat; readonly active?: DateRangeFieldEndpoint; readonly granularity?: DateFieldGranularity }
export type DateRangeFieldEvent = { readonly type: 'field'; readonly endpoint: DateRangeFieldEndpoint; readonly event: DateFieldEvent } | { readonly type: 'focus'; readonly endpoint: DateRangeFieldEndpoint } | 'cancel';
export type DateRangeFieldCommand = { readonly type: 'input-state-changed'; readonly endpoint: DateRangeFieldEndpoint; readonly value: TextEditingState } | { readonly type: 'range-committed'; readonly value: DateRange | null } | { readonly type: 'focus-endpoint'; readonly endpoint: DateRangeFieldEndpoint };
export interface DateRangeFieldPolicies extends DateFieldPolicies {}
export interface DateRangeFieldUpdate { readonly state: DateRangeFieldState; readonly commands: readonly DateRangeFieldCommand[] }

const construction: RangeFieldConstruction<DateValue, DateRange, DateFieldState, DateFieldFormat> = {
  createField: tryCreateDateFieldState, createRange: tryCreateDateRange,
  endpointError: { code: 'invalid-date-range-field-endpoint', message: 'Date range field active endpoint must be start or end.' },
  invertedError: { code: 'inverted-date-range-field', message: 'Date range field start must not be after end.' },
};
// Only private plain data is copied; unused editing/presentation records have no effects.
const transition: RangeFieldTransition<DateValue, DateRange, DateFieldState, DateFieldFormat, DateFieldEvent, DateRangeFieldPolicies> = /* @__PURE__ */ Object.assign({}, construction, {
  applyField: applyDateFieldEvent, compare: compareDateValues,
  requiredError: { code: 'date-range-field-value-required' as const, message: 'Date range field requires a range.' },
});
const presentation: RangeFieldPresentation<DateValue, DateRange, DateFieldState, DateFieldFormat> = /* @__PURE__ */ Object.assign({}, construction, { reformatField: reformatDateFieldState });

function fieldConstructions<Spec extends typeof construction>(spec: Spec): Readonly<Record<DateFieldGranularity, Spec>> {
  const forPeriod = (granularity: 'month' | 'year'): Spec => ({ ...spec,
    createField: (value: DateValue | null, input?: TextEditingState, format?: DateFieldFormat) =>
      tryCreateDateFieldState(value, input, format, granularity) });
  return { day: spec, month: forPeriod('month'), year: forPeriod('year') };
}
const constructions = /* @__PURE__ */ fieldConstructions(construction);
const transitions = /* @__PURE__ */ fieldConstructions(transition);
const presentations = /* @__PURE__ */ fieldConstructions(presentation);

function validGranularity(value: DateFieldGranularity): boolean {
  return value === 'day' || value === 'month' || value === 'year';
}

function invalidGranularity(errorClass: 'construction' | 'transition-rejection' = 'construction'): TemporalResult<never> {
  return fail(errorClass, 'invalid-date-field-format', 'Date field granularity must be day, month or year.');
}

export function createDateRangeFieldState(input: DateRangeFieldStateInput = {}): DateRangeFieldState { return unwrap(tryCreateDateRangeFieldState(input)); }
export function tryCreateDateRangeFieldState(input: DateRangeFieldStateInput = {}): TemporalResult<DateRangeFieldState> {
  const granularity = input.granularity ?? 'day';
  return validGranularity(granularity) ? tryCreateRangeFieldState(constructions[granularity], input) : invalidGranularity();
}
export function applyDateRangeFieldEvent(state: DateRangeFieldState, event: DateRangeFieldEvent, policies: DateRangeFieldPolicies = {}): TemporalResult<DateRangeFieldUpdate> {
  const granularity = state.start.granularity ?? 'day';
  return validGranularity(granularity) ? applyRangeFieldEvent(transitions[granularity], state, event, policies) : invalidGranularity('transition-rejection');
}
export function reformatDateRangeFieldState(state: DateRangeFieldState, format?: DateFieldFormat): TemporalResult<DateRangeFieldState> {
  const granularity = state.start.granularity ?? 'day';
  return validGranularity(granularity) ? reformatRangeFieldState(presentations[granularity], state, format) : invalidGranularity();
}
