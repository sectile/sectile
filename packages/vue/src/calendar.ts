import type {
  CalendarMonthValue,
  CalendarPolicies,
  CalendarViewMode,
} from '@sectile/dom/temporal';
import type { DateValue } from '@sectile/dom/temporal';
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
  PickerMonthCell,
  createPickerInput,
  createPickerMove,
  createPickerRoot,
  createPickerViewTrigger,
  specializePickerRootPart,
  type PickerCellSlotProps,
  type PickerMonthCellSlotProps,
  type PickerPartProps,
  type PickerRootSlotProps,
} from './internal/date-picker.js';

export interface CalendarRootProps {
  readonly modelValue?: DateValue | null;
  readonly defaultValue?: DateValue | null;
  readonly highlightedValue?: DateValue;
  readonly defaultHighlightedValue?: DateValue; readonly referenceDate?: DateValue;
  readonly defaultView?: CalendarViewMode;
  readonly disabled?: boolean;
  readonly?: boolean;
  readonly required?: boolean;
  readonly label?: string;
  readonly policies?: CalendarPolicies;
}

export interface CalendarRootSlotProps extends Omit<PickerRootSlotProps<DateValue | null>, 'open' | 'years'> {
  readonly value: DateValue | null;
}

export interface CalendarCellProps extends PickerPartProps {
  readonly value: DateValue;
}

export interface CalendarMonthCellProps extends PickerPartProps {
  readonly value: CalendarMonthValue;
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
    defaultView: { type: String as PropType<CalendarViewMode>, default: 'month' },
    disabled: { type: Boolean, default: false },
    readonly: { type: Boolean, default: false },
    required: { type: Boolean, default: false },
    label: { type: String, default: undefined },
    policies: { type: Object as PropType<CalendarPolicies>, default: undefined },
  },
  emits: {
    'update:modelValue': (_value: DateValue | null): boolean => true,
    'update:highlightedValue': (_value: DateValue): boolean => true,
  },
  slots: Object as SlotsType<{ default: (props: CalendarRootSlotProps) => VNodeChild }>,
  setup(props, { attrs, emit, slots }) {
    return (): VNodeChild => h(CalendarProviderRoot, mergeProps(attrs, props, {
      'onUpdate:modelValue': (value: PickerRootSlotProps<DateValue | null>['value']) => emit('update:modelValue', value),
      'onUpdate:highlightedValue': (value: DateValue) => emit('update:highlightedValue', value),
    }), slots);
  },
});
export type CalendarValueChangeHandler = NonNullable<InstanceType<typeof CalendarRoot>['$props']['onUpdate:modelValue']>;
export type CalendarHighlightedValueChangeHandler = NonNullable<InstanceType<typeof CalendarRoot>['$props']['onUpdate:highlightedValue']>;
export const CalendarContent = specializePickerRootPart('calendar', PickerContent);
export const CalendarGrid = specializePickerRootPart('calendar', PickerGrid);
export const CalendarCell = PickerCell;
export const CalendarMonthCell = PickerMonthCell;
export const CalendarInput = createPickerInput('input', 'SectileCalendarInput', 'hidden');
export const CalendarPreviousWeek = specializePickerRootPart('calendar', createPickerMove('week', -1, 'SectileCalendarPreviousWeek'));
export const CalendarNextWeek = specializePickerRootPart('calendar', createPickerMove('week', 1, 'SectileCalendarNextWeek'));
export const CalendarPreviousMonth = specializePickerRootPart('calendar', createPickerMove('month', -1, 'SectileCalendarPreviousMonth'));
export const CalendarNextMonth = specializePickerRootPart('calendar', createPickerMove('month', 1, 'SectileCalendarNextMonth'));
export const CalendarPreviousYear = specializePickerRootPart('calendar', createPickerMove('year', -1, 'SectileCalendarPreviousYear'));
export const CalendarNextYear = specializePickerRootPart('calendar', createPickerMove('year', 1, 'SectileCalendarNextYear'));
export const CalendarWeekViewTrigger = specializePickerRootPart('calendar', createPickerViewTrigger('week', 'SectileCalendarWeekViewTrigger'));
export const CalendarMonthViewTrigger = specializePickerRootPart('calendar', createPickerViewTrigger('month', 'SectileCalendarMonthViewTrigger'));
export const CalendarYearViewTrigger = specializePickerRootPart('calendar', createPickerViewTrigger('year', 'SectileCalendarYearViewTrigger'));

export type {
  CalendarMonthValue,
  CalendarPolicies,
  CalendarViewMode,
  DateValue,
  PickerCellSlotProps as CalendarCellSlotProps,
  PickerMonthCellSlotProps as CalendarMonthCellSlotProps,
  PickerPartProps as CalendarPartProps,
};
