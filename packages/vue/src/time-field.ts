import { type PropType } from 'vue';
import {
  createTimeField,
  formatTimeValue,
  type TimeFieldConnection,
  type TimeFieldOptions,
} from '@sectile/dom/time-field';
import { createNativeFieldComponent, type NativeFieldFactoryOptions } from './internal/native-field.js';

export type TimeValue = NonNullable<TimeFieldOptions['value']>;
export interface TimeFieldProps {
  readonly modelValue?: TimeValue | null;
  readonly defaultValue?: TimeValue | null;
  readonly policies?: TimeFieldOptions['policies'];
  readonly disabled?: boolean;
  readonly?: boolean;
  readonly required?: boolean;
  readonly label?: string;
}

export const TimeField = createNativeFieldComponent<TimeValue>({
  name: 'SectileTimeField',
  scope: 'time-field',
  inputMode: 'numeric',
  placeholder: 'HH:mm',
  formatValue: formatTimeValue,
  valueType: Object as PropType<TimeValue | null>,
  create: (options: NativeFieldFactoryOptions<TimeValue>): TimeFieldConnection => createTimeField({
    ...options,
    ...(options.policies === undefined
      ? {}
      : { policies: options.policies as NonNullable<TimeFieldOptions['policies']> }),
  }),
});
