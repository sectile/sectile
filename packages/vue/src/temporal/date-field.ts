import { computed, type PropType } from 'vue';
import { unwrap } from '@sectile/core/result';
import { createDateFieldState, formatDateFieldValue, reformatDateFieldState, type DateFieldFormat } from '@sectile/temporal/date-field';
import {
  createDateField,
  formatDateValue,
  getDateFieldPlaceholder,
  type DateFieldOptions,
} from '@sectile/dom/temporal/date-field';
import { createNativeFieldComponent, type NativeFieldPresentation } from '../input/native-field.js';
import { useTemporalFormatter } from './temporal-provider.js';

export type DateValue = NonNullable<DateFieldOptions['value']>;
export interface DateFieldProps {
  readonly modelValue?: DateValue | null;
  readonly defaultValue?: DateValue | null;
  readonly policies?: DateFieldOptions['policies'];
  readonly disabled?: boolean;
  readonly?: boolean;
  readonly required?: boolean;
  readonly label?: string;
  readonly native?: boolean;
}

type DateFieldPolicies = NonNullable<DateFieldOptions['policies']>;

function rebase(value: DateValue | null, inputState: Parameters<typeof createDateFieldState>[1], previousFormat: DateFieldFormat | undefined, format?: DateFieldFormat) {
  return unwrap(reformatDateFieldState(createDateFieldState(value, inputState, previousFormat), format)).inputState;
}

export const DateField = /* @__PURE__ */ createNativeFieldComponent<DateValue, DateFieldPolicies, DateFieldFormat>({
  name: 'SectileDateField',
  scope: 'date-field',
  inputMode: 'numeric',
  nativeInputType: 'date',
  placeholder: 'YYYY-MM-DD',
  formatValue: formatDateValue,
  valueType: Object as PropType<DateValue | null>,
  create: createDateField,
  rebase: (value, inputState, previousFormat) => rebase(value, inputState, previousFormat),
  usePresentation(props) {
    const formatter = useTemporalFormatter();
    return computed<NativeFieldPresentation<DateValue, DateFieldPolicies, DateFieldFormat> | undefined>(() => {
      if (props.native === true || formatter.value === undefined) return undefined;
      const format = unwrap(formatter.value.dateFieldFormat());
      return { format, placeholder: getDateFieldPlaceholder(format), formatValue: (value: DateValue) => formatDateFieldValue(value, format),
        create: options => createDateField({ ...options, format }),
        rebase: (value, inputState, previousFormat) => rebase(value, inputState, previousFormat, format) };
    });
  },
});
export type DateFieldValueChangeHandler = (value: DateValue | null) => void;
