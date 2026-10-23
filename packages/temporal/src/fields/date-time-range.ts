import { unwrap } from '@sectile/core/result';
import type { TextEditingState } from '@sectile/core/text';
import type { TemporalResult } from '../error.js';
import { applyDateTimeFieldEvent, tryCreateDateTimeFieldState, reformatDateTimeFieldState, type DateTimeFieldEvent,
  type DateTimeFieldPolicies, type DateTimeFieldState, type DateTimeFieldFormat } from './date-time.js';
import { compareDateTimeValues, tryCreateDateTimeRange, type DateTimeRange, type DateTimeValue } from '../values/date-time.js';
import { applyRangeFieldEvent, tryCreateRangeFieldState, reformatRangeFieldState,
  type RangeFieldConstruction, type RangeFieldTransition, type RangeFieldPresentation } from '../internal/range-field.js';
export type { DateTimeRange, DateTimeValue } from '../values/date-time.js';
export { createDateTimeRange, tryCreateDateTimeRange } from '../values/date-time.js';

export type DateTimeRangeFieldEndpoint = 'start' | 'end';
export interface DateTimeRangeFieldState { readonly value: DateTimeRange | null; readonly start: DateTimeFieldState; readonly end: DateTimeFieldState; readonly active: DateTimeRangeFieldEndpoint }
export interface DateTimeRangeFieldStateInput {
  readonly value?: DateTimeRange | null; readonly startValue?: DateTimeValue | null; readonly endValue?: DateTimeValue | null;
  readonly startInputState?: TextEditingState; readonly endInputState?: TextEditingState;
  readonly startFormat?: DateTimeFieldFormat; readonly endFormat?: DateTimeFieldFormat; readonly active?: DateTimeRangeFieldEndpoint;
}
export type DateTimeRangeFieldEvent = { readonly type: 'field'; readonly endpoint: DateTimeRangeFieldEndpoint; readonly event: DateTimeFieldEvent }
  | { readonly type: 'focus'; readonly endpoint: DateTimeRangeFieldEndpoint } | 'cancel';
export type DateTimeRangeFieldCommand = { readonly type: 'input-state-changed'; readonly endpoint: DateTimeRangeFieldEndpoint; readonly value: TextEditingState }
  | { readonly type: 'range-committed'; readonly value: DateTimeRange | null } | { readonly type: 'focus-endpoint'; readonly endpoint: DateTimeRangeFieldEndpoint };
export interface DateTimeRangeFieldPolicies extends DateTimeFieldPolicies {}
export interface DateTimeRangeFieldUpdate { readonly state: DateTimeRangeFieldState; readonly commands: readonly DateTimeRangeFieldCommand[] }

const construction: RangeFieldConstruction<DateTimeValue, DateTimeRange, DateTimeFieldState, DateTimeFieldFormat> = {
  createField: tryCreateDateTimeFieldState, createRange: tryCreateDateTimeRange,
  endpointError: { code: 'invalid-date-time-range-field-endpoint', message: 'Date-time range field active endpoint must be start or end.' },
  invertedError: { code: 'inverted-date-time-range-field', message: 'Date-time range field start must not be after end.' },
};
// Only private plain data is copied; unused editing/presentation records have no effects.
const transition: RangeFieldTransition<DateTimeValue, DateTimeRange, DateTimeFieldState, DateTimeFieldFormat, DateTimeFieldEvent, DateTimeRangeFieldPolicies> = /* @__PURE__ */ Object.assign({}, construction, {
  applyField: applyDateTimeFieldEvent, compare: compareDateTimeValues,
  requiredError: { code: 'date-time-range-field-value-required' as const, message: 'Date-time range field requires a range.' },
});
const presentation: RangeFieldPresentation<DateTimeValue, DateTimeRange, DateTimeFieldState, DateTimeFieldFormat> = /* @__PURE__ */ Object.assign({}, construction, { reformatField: reformatDateTimeFieldState });

export function createDateTimeRangeFieldState(input: DateTimeRangeFieldStateInput = {}): DateTimeRangeFieldState { return unwrap(tryCreateDateTimeRangeFieldState(input)); }
export function tryCreateDateTimeRangeFieldState(input: DateTimeRangeFieldStateInput = {}): TemporalResult<DateTimeRangeFieldState> { return tryCreateRangeFieldState(construction, input); }
export function applyDateTimeRangeFieldEvent(state: DateTimeRangeFieldState, event: DateTimeRangeFieldEvent, policies: DateTimeRangeFieldPolicies = {}): TemporalResult<DateTimeRangeFieldUpdate> { return applyRangeFieldEvent(transition, state, event, policies); }
export function reformatDateTimeRangeFieldState(state: DateTimeRangeFieldState, format?: DateTimeFieldFormat): TemporalResult<DateTimeRangeFieldState> { return reformatRangeFieldState(presentation, state, format); }
