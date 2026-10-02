import { type PropType } from 'vue';
import {
  createDateTimeField,
  formatDateTimeValue,
  type DateTimeFieldOptions,
} from '@sectile/dom/temporal/date-time-field';
import { createNativeFieldComponent } from '../input/native-field.js';

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

type DateTimeFieldPolicies = NonNullable<DateTimeFieldOptions['policies']>;

export const DateTimeField = createNativeFieldComponent<DateTimeValue, DateTimeFieldPolicies>({
  name: 'SectileDateTimeField',
  scope: 'date-time-field',
  inputMode: 'text',
  nativeInputType: 'datetime-local',
  placeholder: 'YYYY-MM-DDTHH:mm',
  formatValue: formatDateTimeValue,
  valueType: Object as PropType<DateTimeValue | null>,
  create: createDateTimeField,
});
export type DateTimeFieldValueChangeHandler = (value: DateTimeValue | null) => void;
