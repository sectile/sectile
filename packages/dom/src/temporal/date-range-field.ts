import { unwrap } from '@sectile/core/result';
import type { FacadeConnection } from '@sectile/core/adapter-runtime';
import type { RevisionSnapshot } from '@sectile/core/revision';
import type { TextEditingState } from '@sectile/core/text';
import { formatDateFieldValue, type DateFieldFormat, type DateValue, type DateRange } from '@sectile/temporal/date-field';
import { applyDateRangeFieldEvent, tryCreateDateRangeFieldState, type DateRangeFieldEvent, type DateRangeFieldPolicies, type DateRangeFieldState } from '@sectile/temporal/date-range-field';
import { getDateFieldPlaceholder } from './date-field.js';
import { createDOMTemporalFacadeConnection, type DOMTemporalResult } from './internal/result.js';
import { constructRangeField, type RangeFieldAdapter } from './internal/range-field.js';

export interface DateRangeFieldOptions {
  readonly startInput: HTMLInputElement; readonly endInput: HTMLInputElement;
  readonly policies?: DateRangeFieldPolicies; readonly value?: DateRange | null; readonly defaultValue?: DateRange | null;
  readonly startInputState?: TextEditingState; readonly defaultStartInputState?: TextEditingState; readonly endInputState?: TextEditingState; readonly defaultEndInputState?: TextEditingState;
  readonly disabled?: boolean; readonly readOnly?: boolean; readonly required?: boolean; readonly startLabel?: string; readonly endLabel?: string;
  readonly format?: DateFieldFormat;
  readonly defaultState?: DateRangeFieldState;
  readonly onValueChange?: (value: DateRange | null) => void; readonly onStartInputStateChange?: (value: TextEditingState) => void; readonly onEndInputStateChange?: (value: TextEditingState) => void; readonly onUpdate?: () => void;
}

export type DateRangeFieldValueChangeHandler = NonNullable<DateRangeFieldOptions['onValueChange']>;
export type DateRangeFieldStartInputStateChangeHandler = NonNullable<DateRangeFieldOptions['onStartInputStateChange']>;
export type DateRangeFieldEndInputStateChangeHandler = NonNullable<DateRangeFieldOptions['onEndInputStateChange']>;
export type DateRangeFieldUpdateHandler = NonNullable<DateRangeFieldOptions['onUpdate']>;
export interface DateRangeFieldControlledValues { readonly value?: DateRange | null; readonly startInputState?: TextEditingState; readonly endInputState?: TextEditingState }
export interface DateRangeFieldConnection { getSnapshot(): RevisionSnapshot<DateRangeFieldState>; getValue(): DateRange | null; syncControlledValues(values: DateRangeFieldControlledValues): DOMTemporalResult<RevisionSnapshot<DateRangeFieldState>>; handleEvent(event: DateRangeFieldEvent): boolean; refresh(): void; disconnect(): void }

export function createDateRangeField(options: DateRangeFieldOptions): FacadeConnection<DateRangeFieldConnection> {
  return unwrap(tryCreateDateRangeField(options));
}
export function tryCreateDateRangeField(options: DateRangeFieldOptions): DOMTemporalResult<FacadeConnection<DateRangeFieldConnection>> {
  return createDOMTemporalFacadeConnection(options, construct);
}

const adapter: RangeFieldAdapter<DateValue, DateRange, DateRangeFieldState, DateFieldFormat, DateRangeFieldPolicies> = {
  initial: tryCreateDateRangeFieldState,
  reduce: (state, event, options) => applyDateRangeFieldEvent(state, event, {
    ...options.policies, ...(options.required === undefined ? {} : { required: options.required }),
  }),
  format: formatDateFieldValue,
  placeholder: getDateFieldPlaceholder,
  inputMode: () => 'numeric',
  controlledShapeMessage: 'Controlled date range field values must preserve their construction-time shape.',
};
function construct(options: DateRangeFieldOptions): DOMTemporalResult<DateRangeFieldConnection> {
  return constructRangeField(adapter, options);
}

export { tryCreateDateRangeFieldState } from '@sectile/temporal/date-range-field';
export type { DateRangeFieldPolicies, DateRangeFieldState } from '@sectile/temporal/date-range-field';
