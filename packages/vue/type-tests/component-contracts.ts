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
import { MeterRoot, type MeterRootProps, type MeterRootSlotProps } from '../dist/meter.js';
import { NumberField, type NumberFieldProps } from '../dist/number-field.js';
import { SelectRoot } from '../dist/select.js';
import {
  SpinButtonInput,
  SpinButtonRoot,
  type SpinButtonInputProps,
} from '../dist/spin-button.js';
import { TimeField } from '../dist/time-field.js';
import { useToast, type UseToastReturn } from '../dist/toast.js';
import {
  VirtualGrid,
  VirtualList,
  VirtualMasonry,
  VirtualSpatial,
  type VirtualGridProps,
  type VirtualGridSlotProps,
  type VirtualListProps,
  type VirtualListSlotProps,
  type VirtualMasonryProps,
  type VirtualMasonrySlotProps,
  type VirtualSpatialProps,
  type VirtualSpatialSlotProps,
} from '../dist/virtual.js';

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
h(MeterRoot, { value: '25', min: 0, max: '100', label: 'Quota' });
// @ts-expect-error Meter value is required.
h(MeterRoot, {});
h(DatePickerRoot, { modelValue: date, policies: datePickerPolicies });
h(NumberField, { policies: numberFieldPolicies });
h(DateField, { policies: dateFieldPolicies });
h(TimeField, { policies: timeFieldPolicies });
h(DateTimeField, { policies: dateTimeFieldPolicies });
h(VirtualList, {
  items: [{ id: 'row-1', title: 'First row' }],
  getKey: (value: { id: string }) => value.id,
});
h(VirtualGrid, {
  items: [{ id: 'cell-1' }],
  getKey: (value: { id: string }) => value.id,
  minLaneSize: 180,
});
h(VirtualMasonry, {
  items: [{ id: 'card-1' }],
  getKey: (value: { id: string }) => value.id,
  estimateSize: 240,
});
h(VirtualSpatial, {
  items: [{ id: 'node-1', x: 10, y: 20 }],
  getKey: (value: { id: string }) => value.id,
  getRect: (value: { x: number; y: number }) => ({
    x: value.x,
    y: value.y,
    width: 120,
    height: 80,
  }),
});

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
const meterProps: MeterRootProps = { value: '25' };
const invalidMeterProps: MeterRootProps = {
  value: '25',
  // @ts-expect-error Meter has no model ownership API.
  modelValue: '30',
};
const meterSlot: MeterRootSlotProps = {
  value: '25', min: '0', max: '100', low: '0', high: '100', optimum: '50',
  valueText: '25', percentage: 25, zone: 'optimum',
};
void spinButtonInputProps;
void numberFieldProps;
void meterProps;
void invalidMeterProps;
void meterSlot;
void useToast;

declare const toast: UseToastReturn;
toast.toast({ id: 'request', title: 'Request pending', durationMs: null });
toast.toast({ id: 'custom', title: 'Custom category', kind: 'product-specific' });
toast.update('request', { title: 'Request complete', kind: 'success', durationMs: 3_000 });
toast.dismiss('request');
toast.dismissAll();
toast.toasts.value satisfies readonly { readonly id: string }[];
toast.paused.value satisfies boolean;

// @ts-expect-error toast identifiers are required.
toast.toast({ title: 'Missing identifier' });
// @ts-expect-error updates cannot replace a toast identifier.
toast.update('request', { id: 'other' });

type DatePickerValue = Parameters<DatePickerValueChangeHandler>[0];
type DatePickerSlotValue = DatePickerRootSlotProps['value'];
type DatePickerContentSlot = NonNullable<InstanceType<typeof DatePickerContent>['$slots']['default']>;
type DatePickerContentSlotValue = Parameters<DatePickerContentSlot>[0]['value'];
type MenuProps = InstanceType<typeof MenuRoot>['$props'];
type MenuButtonProps = InstanceType<typeof MenuButtonRoot>['$props'];
interface VirtualRow { readonly id: string; readonly title: string; }
type VirtualRowValue = VirtualListSlotProps<VirtualRow>['value'];
type VirtualGridValue = VirtualGridSlotProps<VirtualRow>['value'];
type VirtualMasonryValue = VirtualMasonrySlotProps<VirtualRow>['value'];
type VirtualSpatialValue = VirtualSpatialSlotProps<VirtualRow>['value'];
const virtualListProps: VirtualListProps<VirtualRow> = {
  items: [{ id: 'row-1', title: 'First row' }],
  getKey: (value) => value.id,
};
const virtualGridProps: VirtualGridProps<VirtualRow> = virtualListProps;
const virtualMasonryProps: VirtualMasonryProps<VirtualRow> = virtualListProps;
const virtualSpatialProps: VirtualSpatialProps<VirtualRow> = {
  ...virtualListProps,
  getRect: (_value) => ({ x: 0, y: 0, width: 1, height: 1 }),
};
void virtualListProps;
void virtualGridProps;
void virtualMasonryProps;
void virtualSpatialProps;
type _datePickerValue = Assert<Equal<DatePickerValue, DateValue | null>>;
type _datePickerSlotValue = Assert<Equal<DatePickerSlotValue, DateValue | null>>;
type _datePickerContentSlotValue = Assert<Equal<DatePickerContentSlotValue, DateValue | null>>;
type _menuDoesNotExposeOpen = Assert<Equal<'open' extends keyof MenuProps ? true : false, false>>;
type _menuButtonExposesOpen = Assert<Equal<'open' extends keyof MenuButtonProps ? true : false, true>>;
type _virtualRowValue = Assert<Equal<VirtualRowValue, VirtualRow>>;
type _virtualGridValue = Assert<Equal<VirtualGridValue, VirtualRow>>;
type _virtualMasonryValue = Assert<Equal<VirtualMasonryValue, VirtualRow>>;
type _virtualSpatialValue = Assert<Equal<VirtualSpatialValue, VirtualRow>>;
