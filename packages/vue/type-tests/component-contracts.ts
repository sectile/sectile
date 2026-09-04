import { h } from 'vue';
import {
  createForm as createDOMForm,
  defineFormSubmission as defineDOMFormSubmission,
} from '@sectile/dom/form';
import type { DatePickerPolicies } from '@sectile/dom/temporal/date-picker';
import type { DateFieldOptions } from '@sectile/dom/temporal/date-field';
import type { DateTimeFieldOptions } from '@sectile/dom/temporal/date-time-field';
import type { NumberFieldOptions } from '@sectile/dom/number-field';
import type { TimeFieldOptions } from '@sectile/dom/temporal/time-field';
import { DateField, type DateValue } from '../.verification-dist/date-field.js';
import {
  defineFormSubmission as defineVueFormSubmission,
} from '../.verification-dist/form.js';
import {
  DatePickerContent,
  DatePickerRoot,
  type DatePickerRootSlotProps,
  type DatePickerValueChangeHandler,
} from '../.verification-dist/date-picker.js';
import { DateTimeField } from '../.verification-dist/date-time-field.js';
import type { DateTimeRange } from '../.verification-dist/date-time-range-picker.js';
import { MenuButtonRoot, MenuRoot } from '../.verification-dist/menu.js';
import {
  MeterGroupRoot,
  MeterGroupSegment,
  type MeterGroupEntry,
  type MeterGroupRootProps,
  type MeterGroupRootSlotProps,
  type MeterGroupSegmentSlotProps,
} from '../.verification-dist/meter-group.js';
import { MeterRoot, type MeterRootProps, type MeterRootSlotProps } from '../.verification-dist/meter.js';
import { NumberField, type NumberFieldProps } from '../.verification-dist/number-field.js';
import { PopoverRoot } from '../.verification-dist/popover.js';
import { SelectRoot } from '../.verification-dist/select.js';
import { ComboboxRoot } from '../.verification-dist/combobox.js';
import { CascadeSelectRoot } from '../.verification-dist/cascade-select.js';
import {
  SpinButtonInput,
  SpinButtonRoot,
  type SpinButtonInputProps,
} from '../.verification-dist/spin-button.js';
import { TimeField } from '../.verification-dist/time-field.js';
import { TooltipRoot } from '../.verification-dist/tooltip.js';
import { useToast, type UseToastReturn } from '../.verification-dist/toast.js';
import { VirtualGrid, type VirtualGridProps, type VirtualGridSlotProps } from '../.verification-dist/virtual-grid.js';
import { VirtualList, type VirtualListProps, type VirtualListSlotProps } from '../.verification-dist/virtual-list.js';
import { VirtualMasonry, type VirtualMasonryProps, type VirtualMasonrySlotProps } from '../.verification-dist/virtual-masonry.js';
import { VirtualSpatial, type VirtualSpatialProps, type VirtualSpatialSlotProps } from '../.verification-dist/virtual-spatial.js';

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
declare const formElement: HTMLFormElement;

const submissionSchema = {
  '~standard': {
    version: 1 as const,
    vendor: 'sectile-type-fixture',
    types: undefined as unknown as {
      readonly input: { readonly profile: { readonly email: string } };
      readonly output: { readonly accountId: number; readonly normalizedEmail: string };
    },
    validate: (_value: unknown) => ({
      value: { accountId: 42, normalizedEmail: 'release@sectile.dev' },
    }),
  },
};

const rawVueSubmission = defineVueFormSubmission({
  onSubmit: ({ values, reinitialize }) => {
    values satisfies Readonly<Record<string, unknown>>;
    reinitialize({ preserve: { touched: true } });
    // @ts-expect-error Raw FormData-derived values remain unknown without a schema.
    values.email.toUpperCase();
  },
});
const schemaVueSubmission = defineVueFormSubmission({
  schema: submissionSchema,
  onSubmit: ({ values }) => {
    values.accountId satisfies number;
    values.normalizedEmail satisfies string;
    // @ts-expect-error Schema output does not expose pre-transform input fields.
    values.profile.email;
  },
});
const rawDOMSubmission = defineDOMFormSubmission({
  onSubmit: ({ values, reinitialize }) => {
    values satisfies Readonly<Record<string, unknown>>;
    reinitialize();
  },
});
const schemaDOMSubmission = defineDOMFormSubmission({
  schema: submissionSchema,
  onSubmit: ({ values }) => {
    values.accountId satisfies number;
    // @ts-expect-error Schema output accountId is numeric.
    values.accountId satisfies string;
  },
});
void rawVueSubmission;
void schemaVueSubmission;
void rawDOMSubmission;
void schemaDOMSubmission;
createDOMForm({ form: formElement, ...rawDOMSubmission });
createDOMForm({ form: formElement, ...schemaDOMSubmission });

h(SelectRoot, { items: [], modelValue: null, defaultValue: null });
h(ComboboxRoot, {
  items: [],
  position: true,
  side: 'bottom',
  align: 'start',
  sideOffset: 8,
  collisionPadding: 8,
  collisionBoundary: 'viewport',
  avoidCollisions: true,
  hideWhenDetached: false,
  strategy: 'absolute',
  tracking: 'events',
});
h(CascadeSelectRoot, {
  nodes: [],
  position: true,
  side: 'bottom',
  align: 'start',
  sideOffset: 8,
  collisionPadding: 8,
  collisionBoundary: 'viewport',
  avoidCollisions: true,
  hideWhenDetached: false,
  strategy: 'absolute',
  tracking: 'events',
});
h(SpinButtonRoot, { min: 0, max: 10, draft: null, defaultDraft: null });
h(SpinButtonInput, { name: 'quantity', form: 'order', required: true });
h(MenuRoot, { items: [] });
h(MenuButtonRoot, {
  items: [], open: false, position: true, side: 'bottom', align: 'start', sideOffset: 8,
  collisionPadding: 8, collisionBoundary: 'viewport', avoidCollisions: true,
  hideWhenDetached: false, strategy: 'absolute', tracking: 'events',
});
h(PopoverRoot, { position: false });
h(TooltipRoot, { position: false });
h(MeterRoot, { value: '25', min: 0, max: '100', label: 'Quota' });
// @ts-expect-error Meter value is required.
h(MeterRoot, {});
h(MeterGroupRoot, { items: [{ id: 'used', value: '25', label: 'Used' }], max: 100, label: 'Capacity' });
// @ts-expect-error MeterGroup items are required.
h(MeterGroupRoot, {});
h(MeterGroupSegment, { id: 'used' });
// @ts-expect-error MeterGroup segment id is required.
h(MeterGroupSegment, {});
h(DatePickerRoot, { modelValue: date, policies: datePickerPolicies });
h(NumberField, { policies: numberFieldPolicies });
h(DateField, { policies: dateFieldPolicies });
h(TimeField, { policies: timeFieldPolicies });
h(DateTimeField, { policies: dateTimeFieldPolicies });
h(VirtualList, {
  items: [{ id: 'row-1', title: 'First row' }],
  getID: (value: { id: string }) => value.id,
  sizePolicy: { kind: 'fixed', extent: 24 },
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
const meterGroupEntries: readonly MeterGroupEntry[] = [{ id: 'used', value: 25, label: 'Used' }];
const meterGroupProps: MeterGroupRootProps = { items: meterGroupEntries, max: '100' };
const invalidMeterGroupProps: MeterGroupRootProps = {
  items: meterGroupEntries,
  // @ts-expect-error MeterGroup has no model ownership API.
  modelValue: meterGroupEntries,
};
const meterGroupSegment: MeterGroupSegmentSlotProps = {
  id: 'used', label: 'Used', value: '25', valueText: '25 GB', start: '0', end: '25',
  percentage: 25, startPercentage: 0, endPercentage: 25,
};
const meterGroupSlot: MeterGroupRootSlotProps = {
  segments: [meterGroupSegment], max: '100', total: '25', remaining: '75', percentage: 25,
  zone: 'optimum', valueText: '25 / 100',
};
void spinButtonInputProps;
void numberFieldProps;
void meterProps;
void invalidMeterProps;
void meterSlot;
void meterGroupProps;
void invalidMeterGroupProps;
void meterGroupSlot;
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
