import { defineComponent, type PropType, type SlotsType, type VNodeChild } from 'vue';
import { createDateRangeField, tryCreateDateRangeFieldState, type DateRangeFieldPolicies, type DateRangeFieldState } from '@sectile/dom/temporal/date-range-field';
import type { DateRange } from '@sectile/dom/temporal/date-field';
import { setupNativeRangeField, createNativeRangeFieldInput, type NativeRangeFieldConfig } from '../input/native-range-field.js';
import type { PrimitiveAs } from '../primitive.js';

export interface DateRangeFieldRootProps {
  readonly modelValue?: DateRange | null;
  readonly defaultValue?: DateRange | null;
  readonly policies?: DateRangeFieldPolicies;
  readonly disabled?: boolean;
  readonly?: boolean;
  readonly required?: boolean;
  readonly startLabel?: string;
  readonly endLabel?: string;
  readonly as?: PrimitiveAs;
  readonly asChild?: boolean;
}

export interface DateRangeFieldRootSlotProps {
  readonly value: DateRange | null;
  readonly startText: string;
  readonly endText: string;
  readonly active: 'start' | 'end';
  readonly disabled: boolean;
  readonly: boolean;
}

const contextKey = Symbol('SectileDateRangeField');

const config: NativeRangeFieldConfig<DateRange, DateRangeFieldPolicies, DateRangeFieldState> = {
  name: 'DateRangeFieldRoot', scope: 'date-range-field', contextKey,
  reset: true,
  initial: tryCreateDateRangeFieldState, create: createDateRangeField,
};

export const DateRangeFieldRoot = /* @__PURE__ */ defineComponent({
  name: 'SectileDateRangeFieldRoot',
  inheritAttrs: false,
  props: {
    modelValue: { type: Object as PropType<DateRange | null>, default: undefined },
    defaultValue: { type: Object as PropType<DateRange | null>, default: null },
    policies: { type: Object as PropType<DateRangeFieldPolicies>, default: undefined },
    disabled: { type: Boolean, default: false },
    readonly: { type: Boolean, default: false },
    required: { type: Boolean, default: false },
    startLabel: { type: String, default: undefined },
    endLabel: { type: String, default: undefined },
    as: { type: [String, Object, Function] as PropType<PrimitiveAs>, default: 'div' },
    asChild: { type: Boolean, default: false },
  },
  emits: { 'update:modelValue': (_value: DateRange | null): boolean => true },
  slots: Object as SlotsType<{ default: (props: DateRangeFieldRootSlotProps) => VNodeChild }>,
  setup(props, context) { return setupNativeRangeField(config, props, context); },
});

export type DateRangeFieldValueChangeHandler = (value: DateRange | null) => void;

export const DateRangeFieldStartInput = /* @__PURE__ */ createNativeRangeFieldInput(contextKey, 'date-range-field', 'YYYY-MM-DD', 'start', 'SectileDateRangeFieldStartInput', 'DateRangeFieldRoot');
export const DateRangeFieldEndInput = /* @__PURE__ */ createNativeRangeFieldInput(contextKey, 'date-range-field', 'YYYY-MM-DD', 'end', 'SectileDateRangeFieldEndInput', 'DateRangeFieldRoot');

export type { DateRange };
