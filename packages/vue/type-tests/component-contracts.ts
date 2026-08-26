import { h } from 'vue';
import type { DatePickerPolicies } from '@sectile/dom/date-picker';
import type { DateFieldOptions } from '@sectile/dom/date-field';
import type { DateTimeFieldOptions } from '@sectile/dom/date-time-field';
import type { NumberFieldOptions } from '@sectile/dom/number-field';
import type { TimeFieldOptions } from '@sectile/dom/time-field';
import { DateField } from '../dist/date-field.js';
import {
  DatePickerContent,
  DatePickerRoot,
  type DatePickerRootSlotProps,
  type DatePickerValueChangeHandler,
} from '../dist/date-picker.js';
import type { DateTimeRange } from '../dist/date-time-range-picker.js';
import { DateTimeField } from '../dist/date-time-field.js';
import type { DateValue } from '../dist/date-field.js';
import { MenuButtonRoot, MenuRoot } from '../dist/menu.js';
import { NumberField, type NumberFieldProps } from '../dist/number-field.js';
import { SelectRoot } from '../dist/select.js';
import {
  SpinButtonInput,
  SpinButtonRoot,
  type SpinButtonInputProps,
} from '../dist/spin-button.js';
import { TimeField } from '../dist/time-field.js';

type Assert<T extends true> = T;
type Equal<Left, Right> =
  (<T>() => T extends Left ? 1 : 2) extends
    (<T>() => T extends Right ? 1 : 2)
    ? (<T>() => T extends Right ? 1 : 2) extends
      (<T>() => T extends Left ? 1 : 2)
      ? true
      : false
    : false;

declare const date: DateValue;
declare const dateTimeRange: DateTimeRange;
declare const datePickerPolicies: DatePickerPolicies;
declare const dateFieldPolicies: NonNullable<DateFieldOptions['policies']>;
declare const dateTimeFieldPolicies: NonNullable<DateTimeFieldOptions['policies']>;
declare const numberFieldPolicies: NonNullable<NumberFieldOptions['policies']>;
declare const timeFieldPolicies: NonNullable<TimeFieldOptions['policies']>;

h(SelectRoot, { items: [], modelValue: null, defaultValue: null });
h(SpinButtonRoot, { min: 0, max: 10, draft: null, defaultDraft: null });
h(SpinButtonInput, { name: 'quantity', form: 'order', required: true });
h(MenuRoot, { items: [] });
h(MenuButtonRoot, { items: [], open: false });
h(DatePickerRoot, { modelValue: date, policies: datePickerPolicies });
h(NumberField, { policies: numberFieldPolicies });
h(DateField, { policies: dateFieldPolicies });
h(TimeField, { policies: timeFieldPolicies });
h(DateTimeField, { policies: dateTimeFieldPolicies });

// @ts-expect-error items is required at runtime.
h(MenuRoot, {});
// @ts-expect-error date pickers do not accept date-time ranges.
h(DatePickerRoot, { modelValue: dateTimeRange });

const spinButtonInputProps: SpinButtonInputProps = {
  name: 'quantity',
  form: 'order',
  required: true,
};
const numberFieldProps: NumberFieldProps = { native: true };
void spinButtonInputProps;
void numberFieldProps;

type DatePickerValue = Parameters<DatePickerValueChangeHandler>[0];
type DatePickerSlotValue = DatePickerRootSlotProps['value'];
type DatePickerContentSlot = NonNullable<InstanceType<typeof DatePickerContent>['$slots']['default']>;
type DatePickerContentSlotValue = Parameters<DatePickerContentSlot>[0]['value'];
type MenuProps = InstanceType<typeof MenuRoot>['$props'];
type MenuButtonProps = InstanceType<typeof MenuButtonRoot>['$props'];
type _datePickerValue = Assert<Equal<DatePickerValue, DateValue | null>>;
type _datePickerSlotValue = Assert<Equal<DatePickerSlotValue, DateValue | null>>;
type _datePickerContentSlotValue = Assert<Equal<DatePickerContentSlotValue, DateValue | null>>;
type _menuDoesNotExposeOpen = Assert<Equal<'open' extends keyof MenuProps ? true : false, false>>;
type _menuButtonExposesOpen = Assert<Equal<'open' extends keyof MenuButtonProps ? true : false, true>>;
