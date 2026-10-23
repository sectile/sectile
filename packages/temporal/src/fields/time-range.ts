import { unwrap } from '@sectile/core/result';
import type { TextEditingState } from '@sectile/core/text';
import type { TemporalResult } from '../error.js';
import { applyTimeFieldEvent, tryCreateTimeFieldState, reformatTimeFieldState, type TimeFieldEvent, type TimeFieldPolicies, type TimeFieldState, type TimeFieldFormat } from './time.js';
import { compareTimeValues, tryCreateTimeRange, type TimeRange, type TimeValue } from '../values/time.js';
import { applyRangeFieldEvent, tryCreateRangeFieldState, reformatRangeFieldState,
  type RangeFieldConstruction, type RangeFieldTransition, type RangeFieldPresentation } from '../internal/range-field.js';
export type { TimeRange } from '../values/time.js';
export { createTimeRange, tryCreateTimeRange } from '../values/time.js';

export type TimeRangeFieldEndpoint = 'start' | 'end';
export interface TimeRangeFieldState { readonly value: TimeRange | null; readonly start: TimeFieldState; readonly end: TimeFieldState; readonly active: TimeRangeFieldEndpoint }
export interface TimeRangeFieldStateInput { readonly value?: TimeRange | null; readonly startValue?: TimeValue | null; readonly endValue?: TimeValue | null; readonly startInputState?: TextEditingState; readonly endInputState?: TextEditingState; readonly startFormat?: TimeFieldFormat; readonly endFormat?: TimeFieldFormat; readonly active?: TimeRangeFieldEndpoint }
export type TimeRangeFieldEvent = { readonly type: 'field'; readonly endpoint: TimeRangeFieldEndpoint; readonly event: TimeFieldEvent } | { readonly type: 'focus'; readonly endpoint: TimeRangeFieldEndpoint } | 'cancel';
export type TimeRangeFieldCommand = { readonly type: 'input-state-changed'; readonly endpoint: TimeRangeFieldEndpoint; readonly value: TextEditingState } | { readonly type: 'range-committed'; readonly value: TimeRange | null } | { readonly type: 'focus-endpoint'; readonly endpoint: TimeRangeFieldEndpoint };
export interface TimeRangeFieldPolicies extends TimeFieldPolicies {}
export interface TimeRangeFieldUpdate { readonly state: TimeRangeFieldState; readonly commands: readonly TimeRangeFieldCommand[] }

const construction: RangeFieldConstruction<TimeValue, TimeRange, TimeFieldState, TimeFieldFormat> = {
  createField: tryCreateTimeFieldState, createRange: tryCreateTimeRange,
  endpointError: { code: 'invalid-time-range-field-endpoint', message: 'Time range field active endpoint must be start or end.' },
  invertedError: { code: 'inverted-time-range-field', message: 'Time range field start must not be after end.' },
};
// Only private plain data is copied; unused editing/presentation records have no effects.
const transition: RangeFieldTransition<TimeValue, TimeRange, TimeFieldState, TimeFieldFormat, TimeFieldEvent, TimeRangeFieldPolicies> = /* @__PURE__ */ Object.assign({}, construction, {
  applyField: applyTimeFieldEvent, compare: compareTimeValues,
  requiredError: { code: 'time-range-field-value-required' as const, message: 'Time range field requires a range.' },
});
const presentation: RangeFieldPresentation<TimeValue, TimeRange, TimeFieldState, TimeFieldFormat> = /* @__PURE__ */ Object.assign({}, construction, { reformatField: reformatTimeFieldState });

export function createTimeRangeFieldState(input: TimeRangeFieldStateInput = {}): TimeRangeFieldState { return unwrap(tryCreateTimeRangeFieldState(input)); }
export function tryCreateTimeRangeFieldState(input: TimeRangeFieldStateInput = {}): TemporalResult<TimeRangeFieldState> { return tryCreateRangeFieldState(construction, input); }
export function applyTimeRangeFieldEvent(state: TimeRangeFieldState, event: TimeRangeFieldEvent, policies: TimeRangeFieldPolicies = {}): TemporalResult<TimeRangeFieldUpdate> { return applyRangeFieldEvent(transition, state, event, policies); }
export function reformatTimeRangeFieldState(state: TimeRangeFieldState, format?: TimeFieldFormat): TemporalResult<TimeRangeFieldState> { return reformatRangeFieldState(presentation, state, format); }
