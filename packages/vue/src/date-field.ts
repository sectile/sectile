import { type PropType } from 'vue';
import {
  createDateField,
  formatDateValue,
  type DateFieldConnection,
  type DateFieldOptions,
} from '@sectile/dom/temporal';
import { createNativeFieldComponent, type NativeFieldFactoryOptions } from './internal/native-field.js';

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

export const DateField = createNativeFieldComponent<DateValue, DateFieldPolicies>({
  name: 'SectileDateField',
  scope: 'date-field',
  inputMode: 'numeric',
  nativeInputType: 'date',
  placeholder: 'YYYY-MM-DD',
  formatValue: formatDateValue,
  valueType: Object as PropType<DateValue | null>,
  create: (options: NativeFieldFactoryOptions<DateValue, DateFieldPolicies>): DateFieldConnection => createDateField({
    ...options,
    ...(options.policies === undefined
      ? {}
      : { policies: options.policies }),
  }),
});
export type DateFieldValueChangeHandler = (value: DateValue | null) => void;
