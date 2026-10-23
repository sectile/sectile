import { defineComponent, type PropType, type SlotsType, type VNodeChild } from 'vue';
import { createDateTimeRangeField, tryCreateDateTimeRangeFieldState, type DateTimeRangeFieldPolicies, type DateTimeRangeFieldState, type DateTimeRange } from '@sectile/dom/temporal/date-time-range-field';
import { reformatDateTimeRangeFieldState } from '@sectile/temporal/date-time-range-field';
import type { TimeFieldPrecision } from '@sectile/temporal/time-field';
import { getDateTimeFieldPlaceholder } from '@sectile/dom/temporal/date-time-field';
import { setupNativeRangeField, createNativeRangeFieldInput, type NativeRangeFieldConfig, type NativeRangePresentation } from '../input/native-range-field.js';
import { useDateTimePresentation } from './internal/time-presentation.js';
import type { PrimitiveAs } from '../primitive.js';

export interface DateTimeRangeFieldRootProps {
  readonly name?: string | undefined;
  readonly form?: string | undefined;
  readonly modelValue?: DateTimeRange | null;
  readonly defaultValue?: DateTimeRange | null;
  readonly policies?: DateTimeRangeFieldPolicies;
  readonly precision?: TimeFieldPrecision;
  readonly disabled?: boolean;
  readonly?: boolean;
  readonly required?: boolean;
  readonly startLabel?: string;
  readonly endLabel?: string;
  readonly as?: PrimitiveAs;
  readonly asChild?: boolean;
}
export interface DateTimeRangeFieldRootSlotProps {
  readonly value: DateTimeRange | null;
  readonly startText: string;
  readonly endText: string;
  readonly active: 'start' | 'end';
  readonly disabled: boolean;
  readonly: boolean;
}
const contextKey = Symbol('SectileDateTimeRangeField');
const config: NativeRangeFieldConfig<DateTimeRange, DateTimeRangeFieldPolicies, DateTimeRangeFieldState> = {
  name: 'DateTimeRangeFieldRoot', scope: 'date-time-range-field', contextKey, reset: true,
  initial: tryCreateDateTimeRangeFieldState, create: createDateTimeRangeField,
  rebase: (state, start, end) => reformatDateTimeRangeFieldState({ ...state, start: { ...state.start, inputState: start }, end: { ...state.end, inputState: end } }),
};
export const DateTimeRangeFieldRoot = /* @__PURE__ */ defineComponent({
  name: 'SectileDateTimeRangeFieldRoot', inheritAttrs: false,
  props: {
    name: { type: String as PropType<string | undefined>, default: undefined }, form: { type: String as PropType<string | undefined>, default: undefined },
    modelValue: { type: Object as PropType<DateTimeRange | null>, default: undefined },
    defaultValue: { type: Object as PropType<DateTimeRange | null>, default: null },
    policies: { type: Object as PropType<DateTimeRangeFieldPolicies>, default: undefined },
    precision: { type: String as PropType<TimeFieldPrecision>, default: undefined },
    disabled: { type: Boolean, default: false }, readonly: { type: Boolean, default: false },
    required: { type: Boolean, default: false },
    startLabel: { type: String, default: undefined }, endLabel: { type: String, default: undefined },
    as: { type: [String, Object, Function] as PropType<PrimitiveAs>, default: 'div' },
    asChild: { type: Boolean, default: false },
  },
  emits: { 'update:modelValue': (_value: DateTimeRange | null): boolean => true },
  slots: Object as SlotsType<{ default: (props: DateTimeRangeFieldRootSlotProps) => VNodeChild }>,
  setup(props, context) {
    const presentation = useDateTimePresentation<NativeRangePresentation<DateTimeRange, DateTimeRangeFieldPolicies, DateTimeRangeFieldState>>(props, format => ({
      inputMode: format.time.dayPeriods === undefined ? 'numeric' : 'text', placeholder: getDateTimeFieldPlaceholder(format),
      initial: options => tryCreateDateTimeRangeFieldState({ ...options, startFormat: format, endFormat: format }),
      create: options => createDateTimeRangeField({ ...options, format }),
      rebase: (state, start, end) => reformatDateTimeRangeFieldState({ ...state, start: { ...state.start, inputState: start }, end: { ...state.end, inputState: end } }, format),
    }));
    return setupNativeRangeField({ ...config, usePresentation: () => presentation }, props, context);
  },
});
export type DateTimeRangeFieldValueChangeHandler = (value: DateTimeRange | null) => void;
export const DateTimeRangeFieldStartInput = /* @__PURE__ */ createNativeRangeFieldInput(contextKey, 'date-time-range-field', 'YYYY-MM-DDTHH:mm', 'start', 'SectileDateTimeRangeFieldStartInput', 'DateTimeRangeFieldRoot');
export const DateTimeRangeFieldEndInput = /* @__PURE__ */ createNativeRangeFieldInput(contextKey, 'date-time-range-field', 'YYYY-MM-DDTHH:mm', 'end', 'SectileDateTimeRangeFieldEndInput', 'DateTimeRangeFieldRoot');
export type { DateTimeRange };
