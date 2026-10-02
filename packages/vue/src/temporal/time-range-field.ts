import { defineComponent, type PropType, type SlotsType, type VNodeChild } from 'vue';
import { createTimeRangeField, tryCreateTimeRangeFieldState, type TimeRangeFieldPolicies, type TimeRangeFieldState } from '@sectile/dom/temporal/time-range-field';
import type { TimeRange } from '@sectile/temporal/time-range-field';
import { setupNativeRangeField, createNativeRangeFieldInput, type NativeRangeFieldConfig } from '../input/native-range-field.js';
import type { PrimitiveAs } from '../primitive.js';

export interface TimeRangeFieldRootProps { readonly modelValue?: TimeRange | null; readonly defaultValue?: TimeRange | null; readonly policies?: TimeRangeFieldPolicies; readonly disabled?: boolean; readonly?: boolean; readonly required?: boolean; readonly startLabel?: string; readonly endLabel?: string; readonly as?: PrimitiveAs; readonly asChild?: boolean }
export interface TimeRangeFieldRootSlotProps { readonly value: TimeRange | null; readonly startText: string; readonly endText: string; readonly active: 'start' | 'end'; readonly disabled: boolean; readonly: boolean }
const contextKey = Symbol('SectileTimeRangeField');

const config: NativeRangeFieldConfig<TimeRange, TimeRangeFieldPolicies, TimeRangeFieldState> = {
  name: 'TimeRangeFieldRoot', scope: 'time-range-field', contextKey,
  initial: tryCreateTimeRangeFieldState, create: createTimeRangeField,
};

export const TimeRangeFieldRoot = /* @__PURE__ */ defineComponent({
  name: 'SectileTimeRangeFieldRoot', inheritAttrs: false,
  props: { modelValue: { type: Object as PropType<TimeRange | null>, default: undefined }, defaultValue: { type: Object as PropType<TimeRange | null>, default: null }, policies: { type: Object as PropType<TimeRangeFieldPolicies>, default: undefined }, disabled: { type: Boolean, default: false }, readonly: { type: Boolean, default: false }, required: { type: Boolean, default: false }, startLabel: { type: String, default: undefined }, endLabel: { type: String, default: undefined }, as: { type: [String, Object, Function] as PropType<PrimitiveAs>, default: 'div' }, asChild: { type: Boolean, default: false } },
  emits: { 'update:modelValue': (_value: TimeRange | null): boolean => true }, slots: Object as SlotsType<{ default: (props: TimeRangeFieldRootSlotProps) => VNodeChild }>,
  setup(props, context) { return setupNativeRangeField(config, props, context); },
});

export type TimeRangeFieldValueChangeHandler = (value: TimeRange | null) => void;
export const TimeRangeFieldStartInput = /* @__PURE__ */ createNativeRangeFieldInput(contextKey, 'time-range-field', 'HH:mm', 'start', 'SectileTimeRangeFieldStartInput', 'TimeRangeFieldRoot');
export const TimeRangeFieldEndInput = /* @__PURE__ */ createNativeRangeFieldInput(contextKey, 'time-range-field', 'HH:mm', 'end', 'SectileTimeRangeFieldEndInput', 'TimeRangeFieldRoot');

export type { TimeRange };
