import type {
  CalendarMonthValue,
  CalendarPolicies,
  CalendarViewMode,
} from '@sectile/dom/temporal/calendar';
import type { DateValue } from '@sectile/dom/temporal/calendar';
import type { DefineSetupFnComponent, SlotsType, VNodeChild } from 'vue';
import {
  PickerCell,
  PickerContent,
  PickerGrid,
  PickerMonthCell,
  createPickerInput,
  createPickerMove,
  createPickerRoot,
  createPickerViewTrigger,
  type PickerRootPartComponent,
  type PickerCellSlotProps,
  type PickerMonthCellSlotProps,
  type PickerPartProps,
  type PickerRootSlotProps,
} from './picker.js';
import { calendarCapability } from './capabilities/calendar.js';

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

export const CalendarRoot = /* @__PURE__ */ createPickerRoot(calendarCapability, 'SectileCalendarRoot', {
  scope: 'calendar',
  defaultOpen: true,
  defaultView: 'month',
  inline: true,
}) as unknown as DefineSetupFnComponent<CalendarRootProps, {
  'update:modelValue': (value: DateValue | null) => boolean;
  'update:highlightedValue': (value: DateValue) => boolean;
}, SlotsType<{ default: (props: CalendarRootSlotProps) => VNodeChild }>>;
export type CalendarValueChangeHandler = NonNullable<InstanceType<typeof CalendarRoot>['$props']['onUpdate:modelValue']>;
export type CalendarHighlightedValueChangeHandler = NonNullable<InstanceType<typeof CalendarRoot>['$props']['onUpdate:highlightedValue']>;
export const CalendarContent = PickerContent as unknown as PickerRootPartComponent<'calendar'>;
export const CalendarGrid = PickerGrid as unknown as PickerRootPartComponent<'calendar'>;
export const CalendarCell = PickerCell;
export const CalendarMonthCell = PickerMonthCell;
export const CalendarInput = /* @__PURE__ */ createPickerInput('input', 'SectileCalendarInput', 'hidden');
export const CalendarPreviousWeek = /* @__PURE__ */ createPickerMove('week', -1, 'SectileCalendarPreviousWeek') as unknown as PickerRootPartComponent<'calendar'>;
export const CalendarNextWeek = /* @__PURE__ */ createPickerMove('week', 1, 'SectileCalendarNextWeek') as unknown as PickerRootPartComponent<'calendar'>;
export const CalendarPreviousMonth = /* @__PURE__ */ createPickerMove('month', -1, 'SectileCalendarPreviousMonth') as unknown as PickerRootPartComponent<'calendar'>;
export const CalendarNextMonth = /* @__PURE__ */ createPickerMove('month', 1, 'SectileCalendarNextMonth') as unknown as PickerRootPartComponent<'calendar'>;
export const CalendarPreviousYear = /* @__PURE__ */ createPickerMove('year', -1, 'SectileCalendarPreviousYear') as unknown as PickerRootPartComponent<'calendar'>;
export const CalendarNextYear = /* @__PURE__ */ createPickerMove('year', 1, 'SectileCalendarNextYear') as unknown as PickerRootPartComponent<'calendar'>;
export const CalendarWeekViewTrigger = /* @__PURE__ */ createPickerViewTrigger('week', 'SectileCalendarWeekViewTrigger') as unknown as PickerRootPartComponent<'calendar'>;
export const CalendarMonthViewTrigger = /* @__PURE__ */ createPickerViewTrigger('month', 'SectileCalendarMonthViewTrigger') as unknown as PickerRootPartComponent<'calendar'>;
export const CalendarYearViewTrigger = /* @__PURE__ */ createPickerViewTrigger('year', 'SectileCalendarYearViewTrigger') as unknown as PickerRootPartComponent<'calendar'>;

export type {
  CalendarMonthValue,
  CalendarPolicies,
  CalendarViewMode,
  DateValue,
  PickerCellSlotProps as CalendarCellSlotProps,
  PickerMonthCellSlotProps as CalendarMonthCellSlotProps,
  PickerPartProps as CalendarPartProps,
};
