import { defineComponent, type PropType, type SlotsType, type VNodeChild } from 'vue';
import { createTimeRangeField, tryCreateTimeRangeFieldState, type TimeRangeFieldPolicies, type TimeRangeFieldState } from '@sectile/dom/temporal/time-range-field';
import { reformatTimeRangeFieldState, type TimeRange } from '@sectile/temporal/time-range-field';
import type { TimeFieldPrecision } from '@sectile/temporal/time-field';
import { getTimeFieldPlaceholder } from '@sectile/dom/temporal/time-field';
import { setupNativeRangeField, createNativeRangeFieldInput, type NativeRangeFieldConfig, type NativeRangePresentation } from '../input/native-range-field.js';
import { useTimePresentation } from './internal/time-presentation.js';
import type { PrimitiveAs } from '../primitive.js';

export interface TimeRangeFieldRootProps { readonly name?: string | undefined; readonly form?: string | undefined; readonly modelValue?: TimeRange | null; readonly defaultValue?: TimeRange | null; readonly policies?: TimeRangeFieldPolicies; readonly precision?: TimeFieldPrecision; readonly disabled?: boolean; readonly?: boolean; readonly required?: boolean; readonly startLabel?: string; readonly endLabel?: string; readonly as?: PrimitiveAs; readonly asChild?: boolean }
export interface TimeRangeFieldRootSlotProps { readonly value: TimeRange | null; readonly startText: string; readonly endText: string; readonly active: 'start' | 'end'; readonly disabled: boolean; readonly: boolean }
const contextKey = Symbol('SectileTimeRangeField');

const config: NativeRangeFieldConfig<TimeRange, TimeRangeFieldPolicies, TimeRangeFieldState> = {
  name: 'TimeRangeFieldRoot', scope: 'time-range-field', contextKey,
  reset: true,
  initial: tryCreateTimeRangeFieldState, create: createTimeRangeField,
  rebase: (state, start, end) => reformatTimeRangeFieldState({ ...state, start: { ...state.start, inputState: start }, end: { ...state.end, inputState: end } }),
};

export const TimeRangeFieldRoot = /* @__PURE__ */ defineComponent({
  __sectileFormLabelMode: 'labelledby',
  name: 'SectileTimeRangeFieldRoot', inheritAttrs: false,
  props: { name: { type: String as PropType<string | undefined>, default: undefined }, form: { type: String as PropType<string | undefined>, default: undefined }, precision: { type: String as PropType<TimeFieldPrecision>, default: undefined }, modelValue: { type: Object as PropType<TimeRange | null>, default: undefined }, defaultValue: { type: Object as PropType<TimeRange | null>, default: null }, policies: { type: Object as PropType<TimeRangeFieldPolicies>, default: undefined }, disabled: { type: Boolean, default: false }, readonly: { type: Boolean, default: false }, required: { type: Boolean, default: false }, startLabel: { type: String, default: undefined }, endLabel: { type: String, default: undefined }, as: { type: [String, Object, Function] as PropType<PrimitiveAs>, default: 'div' }, asChild: { type: Boolean, default: false } },
  emits: { 'update:modelValue': (_value: TimeRange | null): boolean => true }, slots: Object as SlotsType<{ default: (props: TimeRangeFieldRootSlotProps) => VNodeChild }>,
  setup(props, context) {
    const presentation = useTimePresentation<NativeRangePresentation<TimeRange, TimeRangeFieldPolicies, TimeRangeFieldState>>(props, format => ({
      inputMode: format.dayPeriods === undefined ? 'numeric' : 'text', placeholder: getTimeFieldPlaceholder(format),
      initial: options => tryCreateTimeRangeFieldState({ ...options, startFormat: format, endFormat: format }),
      create: options => createTimeRangeField({ ...options, format }),
      rebase: (state, start, end) => reformatTimeRangeFieldState({ ...state, start: { ...state.start, inputState: start }, end: { ...state.end, inputState: end } }, format),
    }));
    return setupNativeRangeField({ ...config, usePresentation: () => presentation }, props, context);
  },
});

export type TimeRangeFieldValueChangeHandler = (value: TimeRange | null) => void;
export const TimeRangeFieldStartInput = /* @__PURE__ */ createNativeRangeFieldInput(contextKey, 'time-range-field', 'HH:mm', 'start', 'SectileTimeRangeFieldStartInput', 'TimeRangeFieldRoot');
export const TimeRangeFieldEndInput = /* @__PURE__ */ createNativeRangeFieldInput(contextKey, 'time-range-field', 'HH:mm', 'end', 'SectileTimeRangeFieldEndInput', 'TimeRangeFieldRoot');

export type { TimeRange };
