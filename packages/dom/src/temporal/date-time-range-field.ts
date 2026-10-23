import { unwrap } from '@sectile/core/result';
import type { FacadeConnection } from '@sectile/core/adapter-runtime';
import type { RevisionSnapshot } from '@sectile/core/revision';
import type { TextEditingState } from '@sectile/core/text';
import { formatDateTimeFieldValue, type DateTimeFieldFormat, type DateTimeValue } from '@sectile/temporal/date-time-field';
import { applyDateTimeRangeFieldEvent, tryCreateDateTimeRangeFieldState, type DateTimeRange, type DateTimeRangeFieldEvent, type DateTimeRangeFieldPolicies, type DateTimeRangeFieldState } from '@sectile/temporal/date-time-range-field';
import { getDateTimeFieldPlaceholder } from './date-time-field.js';
import { createDOMTemporalFacadeConnection, type DOMTemporalResult } from './internal/result.js';
import { constructRangeField, type RangeFieldAdapter } from './internal/range-field.js';

export type { DateTimeRange, DateTimeValue } from '@sectile/temporal/date-time-range-field';
export interface DateTimeRangeFieldOptions { readonly startInput: HTMLInputElement; readonly endInput: HTMLInputElement; readonly policies?: DateTimeRangeFieldPolicies; readonly value?: DateTimeRange | null; readonly defaultValue?: DateTimeRange | null; readonly defaultState?: DateTimeRangeFieldState; readonly format?: DateTimeFieldFormat; readonly startInputState?: TextEditingState; readonly defaultStartInputState?: TextEditingState; readonly endInputState?: TextEditingState; readonly defaultEndInputState?: TextEditingState; readonly disabled?: boolean; readonly readOnly?: boolean; readonly required?: boolean; readonly startLabel?: string; readonly endLabel?: string; readonly onValueChange?: (value: DateTimeRange | null) => void; readonly onStartInputStateChange?: (value: TextEditingState) => void; readonly onEndInputStateChange?: (value: TextEditingState) => void; readonly onUpdate?: () => void }

export type DateTimeRangeFieldValueChangeHandler = NonNullable<DateTimeRangeFieldOptions['onValueChange']>;
export type DateTimeRangeFieldStartInputStateChangeHandler = NonNullable<DateTimeRangeFieldOptions['onStartInputStateChange']>;
export type DateTimeRangeFieldEndInputStateChangeHandler = NonNullable<DateTimeRangeFieldOptions['onEndInputStateChange']>;
export type DateTimeRangeFieldUpdateHandler = NonNullable<DateTimeRangeFieldOptions['onUpdate']>;
export interface DateTimeRangeFieldControlledValues { readonly value?: DateTimeRange | null; readonly startInputState?: TextEditingState; readonly endInputState?: TextEditingState }
export interface DateTimeRangeFieldConnection { getSnapshot(): RevisionSnapshot<DateTimeRangeFieldState>; getValue(): DateTimeRange | null; syncControlledValues(values: DateTimeRangeFieldControlledValues): DOMTemporalResult<RevisionSnapshot<DateTimeRangeFieldState>>; handleEvent(event: DateTimeRangeFieldEvent): boolean; refresh(): void; disconnect(): void }
export function createDateTimeRangeField(options: DateTimeRangeFieldOptions): FacadeConnection<DateTimeRangeFieldConnection> {
  return unwrap(tryCreateDateTimeRangeField(options));
}
export function tryCreateDateTimeRangeField(options: DateTimeRangeFieldOptions): DOMTemporalResult<FacadeConnection<DateTimeRangeFieldConnection>> {
  return createDOMTemporalFacadeConnection(options, construct);
}

const adapter: RangeFieldAdapter<DateTimeValue, DateTimeRange, DateTimeRangeFieldState, DateTimeFieldFormat, DateTimeRangeFieldPolicies> = {
  initial: tryCreateDateTimeRangeFieldState,
  reduce: (state, event, options) => applyDateTimeRangeFieldEvent(state, event, {
    ...options.policies, ...(options.required === undefined ? {} : { required: options.required }),
  }),
  format: formatDateTimeFieldValue,
  placeholder: getDateTimeFieldPlaceholder,
  inputMode: format => format?.time.dayPeriods === undefined ? 'numeric' : 'text',
  controlledShapeMessage: 'Controlled date-time range field values must preserve their construction-time shape.',
};
function construct(options: DateTimeRangeFieldOptions): DOMTemporalResult<DateTimeRangeFieldConnection> {
  return constructRangeField(adapter, options);
}

export { tryCreateDateTimeRangeFieldState } from '@sectile/temporal/date-time-range-field';
export type { DateTimeRangeFieldPolicies, DateTimeRangeFieldState } from '@sectile/temporal/date-time-range-field';
