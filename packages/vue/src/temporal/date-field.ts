import { computed, type PropType } from 'vue';
import { unwrap } from '@sectile/core/result';
import { createDateFieldState, formatDateFieldValue, reformatDateFieldState, type DateFieldFormat, type DateFieldGranularity } from '@sectile/temporal/date-field';
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
  readonly format?: DateFieldFormat;
  readonly granularity?: DateFieldGranularity;
}

type DateFieldPolicies = NonNullable<DateFieldOptions['policies']>;

function rebase(value: DateValue | null, inputState: Parameters<typeof createDateFieldState>[1], previousFormat: DateFieldFormat | undefined, format?: DateFieldFormat) {
  return unwrap(reformatDateFieldState(createDateFieldState(value, inputState, previousFormat), format)).inputState;
}

export const DateField = /* @__PURE__ */ createNativeFieldComponent<DateValue, DateFieldPolicies, DateFieldFormat, { format?: DateFieldFormat; granularity?: DateFieldGranularity }>({
  name: 'SectileDateField',
  scope: 'date-field',
  inputMode: 'numeric',
  nativeInputType: 'date',
  placeholder: 'YYYY-MM-DD',
  formatValue: formatDateValue,
  valueType: Object as PropType<DateValue | null>,
  presentationProps: {
    format: { type: Object as PropType<DateFieldFormat>, default: undefined },
    granularity: { type: String as PropType<DateFieldGranularity>, default: 'day' },
  },
  create: createDateField,
  rebase: (value, inputState, previousFormat) => rebase(value, inputState, previousFormat),
  usePresentation(props) {
    const formatter = useTemporalFormatter();
    return computed<NativeFieldPresentation<DateValue, DateFieldPolicies, DateFieldFormat> | undefined>(() => {
      if (props.native === true) return undefined;
      if (props.granularity === 'month' || props.granularity === 'year') {
        const granularity = props.granularity;
        return {
          placeholder: getDateFieldPlaceholder(undefined, granularity),
          formatValue: value => formatDateFieldValue(value, undefined, granularity),
          create: options => createDateField({ ...options, granularity }),
          rebase: value => createDateFieldState(value, undefined, undefined, granularity).inputState,
        };
      }
      const format = props.format ?? (formatter.value === undefined ? undefined : unwrap(formatter.value.dateFieldFormat()));
      if (format === undefined) return undefined;
      return { format, placeholder: getDateFieldPlaceholder(format), formatValue: (value: DateValue) => formatDateFieldValue(value, format),
        create: options => createDateField({ ...options, format }),
        rebase: (value, inputState, previousFormat) => rebase(value, inputState, previousFormat, format) };
    });
  },
});
export type DateFieldValueChangeHandler = (value: DateValue | null) => void;
