import { type PropType } from 'vue';
import { unwrap } from '@sectile/core/result';
import { createTimeFieldState, formatTimeFieldValue, reformatTimeFieldState, type TimeFieldFormat, type TimeFieldPrecision } from '@sectile/temporal/time-field';
import {
  createTimeField,
  formatTimeValue,
  getTimeFieldPlaceholder,
  type TimeFieldOptions,
  type TimeFieldConnection,
} from '@sectile/dom/temporal/time-field';
import { createNativeFieldComponent, type NativeFieldPresentation } from '../input/native-field.js';
import { useTimePresentation } from './internal/time-presentation.js';

export type TimeValue = NonNullable<TimeFieldOptions['value']>;
export interface TimeFieldProps {
  readonly modelValue?: TimeValue | null;
  readonly defaultValue?: TimeValue | null;
  readonly policies?: TimeFieldOptions['policies'];
  readonly disabled?: boolean;
  readonly?: boolean;
  readonly required?: boolean;
  readonly label?: string;
  readonly native?: boolean;
  /** Custom editing precision; Provider defaults to lossless milliseconds. Native mode retains ISO behavior. */
  readonly precision?: TimeFieldPrecision;
}

type TimeFieldPolicies = NonNullable<TimeFieldOptions['policies']>;

function rebase(value: TimeValue | null, inputState: Parameters<typeof createTimeFieldState>[1], previousFormat: TimeFieldFormat | undefined, format?: TimeFieldFormat) {
  return unwrap(reformatTimeFieldState(createTimeFieldState(value, inputState, previousFormat), format)).inputState;
}

export const TimeField = /* @__PURE__ */ createNativeFieldComponent<TimeValue, TimeFieldPolicies, TimeFieldFormat, Pick<TimeFieldProps, 'precision'>>({
  name: 'SectileTimeField',
  scope: 'time-field',
  inputMode: 'numeric',
  nativeInputType: 'time',
  placeholder: 'HH:mm',
  formatValue: formatTimeValue,
  valueType: Object as PropType<TimeValue | null>,
  create: createTimeField,
  commitValue: (connection, value) => (connection as TimeFieldConnection).handleEvent({ type: 'set-value', value }),
  presentationProps: { precision: { type: String as PropType<TimeFieldPrecision>, default: undefined } },
  rebase: (value, inputState, previousFormat) => rebase(value, inputState, previousFormat),
  usePresentation(props) {
    return useTimePresentation<NativeFieldPresentation<TimeValue, TimeFieldPolicies, TimeFieldFormat>>(props, format => {
      return { format, inputMode: format.dayPeriods === undefined ? 'numeric' : 'text', placeholder: getTimeFieldPlaceholder(format),
        formatValue: (value: TimeValue) => formatTimeFieldValue(value, format), create: options => createTimeField({ ...options, format }),
        rebase: (value, inputState, previousFormat) => rebase(value, inputState, previousFormat, format) };
    });
  },
});
export type TimeFieldValueChangeHandler = (value: TimeValue | null) => void;
