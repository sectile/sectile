import { type PropType } from 'vue';
import {
  createDateTimeField,
  formatDateTimeValue,
  type DateTimeFieldConnection,
  type DateTimeFieldOptions,
} from '@sectile/dom/date-time-field';
import { createNativeFieldComponent, type NativeFieldFactoryOptions } from './internal/native-field.js';

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
}

export const DateTimeField = createNativeFieldComponent<DateTimeValue>({
  name: 'SectileDateTimeField',
  scope: 'date-time-field',
  inputMode: 'text',
  nativeInputType: 'datetime-local',
  placeholder: 'YYYY-MM-DDTHH:mm',
  formatValue: formatDateTimeValue,
  valueType: Object as PropType<DateTimeValue | null>,
  create: (options: NativeFieldFactoryOptions<DateTimeValue>): DateTimeFieldConnection => createDateTimeField({
    ...options,
    ...(options.policies === undefined
      ? {}
      : { policies: options.policies as NonNullable<DateTimeFieldOptions['policies']> }),
  }),
});
