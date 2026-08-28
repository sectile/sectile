import { type PropType } from 'vue';
import {
  createTimeField,
  formatTimeValue,
  type TimeFieldConnection,
  type TimeFieldOptions,
} from '@sectile/dom/temporal';
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
  readonly native?: boolean;
}

type TimeFieldPolicies = NonNullable<TimeFieldOptions['policies']>;

export const TimeField = createNativeFieldComponent<TimeValue, TimeFieldPolicies>({
  name: 'SectileTimeField',
  scope: 'time-field',
  inputMode: 'numeric',
  nativeInputType: 'time',
  placeholder: 'HH:mm',
  formatValue: formatTimeValue,
  valueType: Object as PropType<TimeValue | null>,
  create: (options: NativeFieldFactoryOptions<TimeValue, TimeFieldPolicies>): TimeFieldConnection => createTimeField({
    ...options,
    ...(options.policies === undefined
      ? {}
      : { policies: options.policies }),
  }),
});
export type TimeFieldValueChangeHandler = (value: TimeValue | null) => void;
