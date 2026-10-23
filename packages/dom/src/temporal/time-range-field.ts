import { unwrap } from '@sectile/core/result';
import type { FacadeConnection } from '@sectile/core/adapter-runtime';
import type { RevisionSnapshot } from '@sectile/core/revision';
import type { TextEditingState } from '@sectile/core/text';
import { formatTimeFieldValue, type TimeFieldFormat, type TimeValue } from '@sectile/temporal/time-field';
import { applyTimeRangeFieldEvent, tryCreateTimeRangeFieldState, type TimeRange, type TimeRangeFieldEvent, type TimeRangeFieldPolicies, type TimeRangeFieldState } from '@sectile/temporal/time-range-field';
import { getTimeFieldPlaceholder } from './time-field.js';
import { createDOMTemporalFacadeConnection, type DOMTemporalResult } from './internal/result.js';
import { constructRangeField, type RangeFieldAdapter } from './internal/range-field.js';

export type { TimeRange } from '@sectile/temporal/time-range-field';
export interface TimeRangeFieldOptions { readonly startInput: HTMLInputElement; readonly endInput: HTMLInputElement; readonly policies?: TimeRangeFieldPolicies; readonly value?: TimeRange | null; readonly defaultValue?: TimeRange | null; readonly defaultState?: TimeRangeFieldState; readonly format?: TimeFieldFormat; readonly startInputState?: TextEditingState; readonly defaultStartInputState?: TextEditingState; readonly endInputState?: TextEditingState; readonly defaultEndInputState?: TextEditingState; readonly disabled?: boolean; readonly readOnly?: boolean; readonly required?: boolean; readonly startLabel?: string; readonly endLabel?: string; readonly onValueChange?: (value: TimeRange | null) => void; readonly onStartInputStateChange?: (value: TextEditingState) => void; readonly onEndInputStateChange?: (value: TextEditingState) => void; readonly onUpdate?: () => void }

export type TimeRangeFieldValueChangeHandler = NonNullable<TimeRangeFieldOptions['onValueChange']>;
export type TimeRangeFieldStartInputStateChangeHandler = NonNullable<TimeRangeFieldOptions['onStartInputStateChange']>;
export type TimeRangeFieldEndInputStateChangeHandler = NonNullable<TimeRangeFieldOptions['onEndInputStateChange']>;
export type TimeRangeFieldUpdateHandler = NonNullable<TimeRangeFieldOptions['onUpdate']>;
export interface TimeRangeFieldControlledValues { readonly value?: TimeRange | null; readonly startInputState?: TextEditingState; readonly endInputState?: TextEditingState }
export interface TimeRangeFieldConnection { getSnapshot(): RevisionSnapshot<TimeRangeFieldState>; getValue(): TimeRange | null; syncControlledValues(values: TimeRangeFieldControlledValues): DOMTemporalResult<RevisionSnapshot<TimeRangeFieldState>>; handleEvent(event: TimeRangeFieldEvent): boolean; refresh(): void; disconnect(): void }
export function createTimeRangeField(options: TimeRangeFieldOptions): FacadeConnection<TimeRangeFieldConnection> {
  return unwrap(tryCreateTimeRangeField(options));
}
export function tryCreateTimeRangeField(options: TimeRangeFieldOptions): DOMTemporalResult<FacadeConnection<TimeRangeFieldConnection>> {
  return createDOMTemporalFacadeConnection(options, construct);
}

const adapter: RangeFieldAdapter<TimeValue, TimeRange, TimeRangeFieldState, TimeFieldFormat, TimeRangeFieldPolicies> = {
  initial: tryCreateTimeRangeFieldState,
  reduce: (state, event, options) => applyTimeRangeFieldEvent(state, event, {
    ...options.policies, ...(options.required === undefined ? {} : { required: options.required }),
  }),
  format: formatTimeFieldValue,
  placeholder: getTimeFieldPlaceholder,
  inputMode: format => format?.dayPeriods === undefined ? 'numeric' : 'text',
  controlledShapeMessage: 'Controlled time range field values must preserve their construction-time shape.',
};
function construct(options: TimeRangeFieldOptions): DOMTemporalResult<TimeRangeFieldConnection> {
  return constructRangeField(adapter, options);
}

export { tryCreateTimeRangeFieldState } from '@sectile/temporal/time-range-field';
export type { TimeRangeFieldPolicies, TimeRangeFieldState } from '@sectile/temporal/time-range-field';
