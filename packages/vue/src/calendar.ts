import type { CalendarOptions } from '@sectile/dom/calendar';
import type { DateValue } from '@sectile/dom/date-field';
import {
  defineComponent,
  h,
  mergeProps,
  type PropType,
  type SlotsType,
  type VNodeChild,
} from 'vue';
import {
  PickerCell,
  PickerContent,
  PickerGrid,
  createPickerInput,
  createPickerMove,
  createPickerRoot,
  createPickerViewTrigger,
  type PickerCellSlotProps,
  type PickerPartProps,
  type PickerRootSlotProps,
} from './internal/date-picker.js';
import type { PrimitiveAs } from './primitive.js';

export interface CalendarRootProps {
  readonly modelValue?: DateValue | null;
  readonly defaultValue?: DateValue | null;
  readonly highlightedValue?: DateValue;
  readonly defaultHighlightedValue?: DateValue;
  readonly defaultView?: PickerRootSlotProps['viewMode'];
  readonly disabled?: boolean;
  readonly?: boolean;
  readonly required?: boolean;
  readonly label?: string;
  readonly policies?: CalendarOptions['policies'];
  readonly as?: PrimitiveAs;
  readonly asChild?: boolean;
}

export interface CalendarRootSlotProps extends Omit<PickerRootSlotProps, 'value' | 'open'> {
  readonly value: DateValue | null;
}

const CalendarProviderRoot = createPickerRoot('calendar', 'SectileCalendarProviderRoot', {
  scope: 'calendar',
  defaultOpen: true,
  defaultView: 'month',
  inline: true,
});

export const CalendarRoot = defineComponent({
  name: 'SectileCalendarRoot',
  inheritAttrs: false,
  props: {
    modelValue: { type: Object as PropType<DateValue | null>, default: undefined },
    defaultValue: { type: Object as PropType<DateValue | null>, default: null },
    highlightedValue: { type: Object as PropType<DateValue>, default: undefined },
    defaultHighlightedValue: { type: Object as PropType<DateValue>, default: undefined },
    defaultView: { type: String as PropType<PickerRootSlotProps['viewMode']>, default: 'month' },
    disabled: { type: Boolean, default: false },
    readonly: { type: Boolean, default: false },
    required: { type: Boolean, default: false },
    label: { type: String, default: undefined },
    policies: { type: Object as PropType<CalendarOptions['policies']>, default: undefined },
    as: { type: [String, Object, Function] as PropType<PrimitiveAs>, default: 'div' },
    asChild: { type: Boolean, default: false },
  },
  emits: {
    'update:modelValue': (_value: DateValue | null): boolean => true,
    'update:highlightedValue': (_value: DateValue): boolean => true,
  },
  slots: Object as SlotsType<{ default: (props: CalendarRootSlotProps) => VNodeChild }>,
  setup(props, { attrs, emit, slots }) {
    return (): VNodeChild => h(CalendarProviderRoot, mergeProps(attrs, props, {
      'onUpdate:modelValue': (value: PickerRootSlotProps['value']) => emit('update:modelValue', value as DateValue | null),
      'onUpdate:highlightedValue': (value: DateValue) => emit('update:highlightedValue', value),
    }), slots);
  },
});
export type CalendarValueChangeHandler = NonNullable<InstanceType<typeof CalendarRoot>['$props']['onUpdate:modelValue']>;
export type CalendarHighlightedValueChangeHandler = NonNullable<InstanceType<typeof CalendarRoot>['$props']['onUpdate:highlightedValue']>;
export const CalendarContent = PickerContent;
export const CalendarGrid = PickerGrid;
export const CalendarCell = PickerCell;
export const CalendarInput = createPickerInput('input', 'SectileCalendarInput', 'hidden');
export const CalendarPreviousWeek = createPickerMove('week', -1, 'SectileCalendarPreviousWeek');
export const CalendarNextWeek = createPickerMove('week', 1, 'SectileCalendarNextWeek');
export const CalendarPreviousMonth = createPickerMove('month', -1, 'SectileCalendarPreviousMonth');
export const CalendarNextMonth = createPickerMove('month', 1, 'SectileCalendarNextMonth');
export const CalendarPreviousYear = createPickerMove('year', -1, 'SectileCalendarPreviousYear');
export const CalendarNextYear = createPickerMove('year', 1, 'SectileCalendarNextYear');
export const CalendarWeekViewTrigger = createPickerViewTrigger('week', 'SectileCalendarWeekViewTrigger');
export const CalendarMonthViewTrigger = createPickerViewTrigger('month', 'SectileCalendarMonthViewTrigger');
export const CalendarYearViewTrigger = createPickerViewTrigger('year', 'SectileCalendarYearViewTrigger');

export type {
  DateValue,
  PickerCellSlotProps as CalendarCellSlotProps,
  PickerPartProps as CalendarPartProps,
};
