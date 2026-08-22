import { type PropType } from 'vue';
import {
  createNumberField,
  type NumberFieldConnection,
  type NumberFieldOptions,
} from '@sectile/dom/number-field';
import { createNativeFieldComponent, type NativeFieldFactoryOptions } from './internal/native-field.js';

export interface NumberFieldProps {
  readonly modelValue?: string | null;
  readonly defaultValue?: string | null;
  readonly policies?: NumberFieldOptions['policies'];
  readonly disabled?: boolean;
  readonly?: boolean;
  readonly required?: boolean;
  readonly label?: string;
}

export const NumberField = createNativeFieldComponent<string>({
  name: 'SectileNumberField',
  scope: 'number-field',
  inputMode: 'decimal',
  formatValue: (value) => value,
  valueType: String as unknown as PropType<string | null>,
  create: (options: NativeFieldFactoryOptions<string>): NumberFieldConnection => {
    const { onValueChange, policies, ...rest } = options;
    return createNumberField({
      ...rest,
      ...(policies === undefined
        ? {}
        : { policies: policies as NonNullable<NumberFieldOptions['policies']> }),
      onValueChange: ({ value }) => onValueChange(value),
    });
  },
});
