import { type PropType } from 'vue';
import { unwrap } from '@sectile/core/result';
import type { TimeFieldPrecision } from '@sectile/temporal/time-field';
import { createDateTimeFieldState, reformatDateTimeFieldState, formatDateTimeFieldValue, type DateTimeFieldFormat } from '@sectile/temporal/date-time-field';
import {
  createDateTimeField,
  formatDateTimeValue,
  getDateTimeFieldPlaceholder,
  type DateTimeFieldOptions,
} from '@sectile/dom/temporal/date-time-field';
import { createNativeFieldComponent, type NativeFieldPresentation } from '../input/native-field.js';
import { useDateTimePresentation } from './internal/time-presentation.js';

export type DateTimeValue = NonNullable<DateTimeFieldOptions['value']>;
export interface DateTimeFieldProps {
  readonly modelValue?: DateTimeValue | null;
  readonly defaultValue?: DateTimeValue | null;
  readonly policies?: DateTimeFieldOptions['policies'];
  readonly disabled?: boolean;
  readonly?: boolean;
  readonly required?: boolean;
  readonly label?: string;
  readonly native?: boolean;
  /** Custom editing precision; Provider defaults to lossless milliseconds. Native mode retains ISO behavior. */
  readonly precision?: TimeFieldPrecision;
}

type DateTimeFieldPolicies = NonNullable<DateTimeFieldOptions['policies']>;

function rebase(value: DateTimeValue | null, inputState: Parameters<typeof createDateTimeFieldState>[1], previousFormat: DateTimeFieldFormat | undefined, format?: DateTimeFieldFormat) {
  return unwrap(reformatDateTimeFieldState(createDateTimeFieldState(value, inputState, previousFormat), format)).inputState;
}

export const DateTimeField = /* @__PURE__ */ createNativeFieldComponent<DateTimeValue, DateTimeFieldPolicies, DateTimeFieldFormat, Pick<DateTimeFieldProps, 'precision'>>({
  name: 'SectileDateTimeField',
  scope: 'date-time-field',
  inputMode: 'text',
  nativeInputType: 'datetime-local',
  placeholder: 'YYYY-MM-DDTHH:mm',
  formatValue: formatDateTimeValue,
  valueType: Object as PropType<DateTimeValue | null>,
  create: createDateTimeField,
  presentationProps: { precision: { type: String as PropType<TimeFieldPrecision>, default: undefined } },
  rebase: (value, inputState, previousFormat) => rebase(value, inputState, previousFormat),
  usePresentation(props) {
    return useDateTimePresentation<NativeFieldPresentation<DateTimeValue, DateTimeFieldPolicies, DateTimeFieldFormat>>(props,
      format => ({ format, inputMode: 'text', placeholder: getDateTimeFieldPlaceholder(format),
        formatValue: value => formatDateTimeFieldValue(value, format), create: options => createDateTimeField({ ...options, format }),
        rebase: (value, inputState, previousFormat) => rebase(value, inputState, previousFormat, format) }));
  },
});
export type DateTimeFieldValueChangeHandler = (value: DateTimeValue | null) => void;
