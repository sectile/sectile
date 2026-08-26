import type { DateRangePickerOptions } from '@sectile/dom/date-range-picker';
import type { DateRange, DateValue } from '@sectile/dom/date-field';
import {
  PickerCell, PickerContent, PickerGrid, PickerMonthCell, PickerTrigger, createPickerInput, createPickerMove, createPickerViewTrigger,
  createPickerRoot, type PickerCellSlotProps, type PickerMonthCellSlotProps, type PickerPartProps, type PickerRootSlotProps,
} from './internal/date-picker.js';

export interface DateRangePickerRootProps {
  readonly modelValue?: DateRange | null; readonly defaultValue?: DateRange | null;
  readonly highlightedValue?: DateValue; readonly defaultHighlightedValue?: DateValue; readonly referenceDate?: DateValue;
  readonly defaultView?: PickerRootSlotProps['viewMode'];
  readonly open?: boolean; readonly defaultOpen?: boolean; readonly disabled?: boolean; readonly?: boolean;
  readonly required?: boolean; readonly label?: string; readonly policies?: DateRangePickerOptions['policies'];
}
export const DateRangePickerRoot = createPickerRoot('date-range', 'SectileDateRangePickerRoot');
export type DateRangePickerValueChangeHandler = NonNullable<InstanceType<typeof DateRangePickerRoot>['$props']['onUpdate:modelValue']>;
export type DateRangePickerOpenChangeHandler = NonNullable<InstanceType<typeof DateRangePickerRoot>['$props']['onUpdate:open']>;
export type DateRangePickerHighlightedValueChangeHandler = NonNullable<InstanceType<typeof DateRangePickerRoot>['$props']['onUpdate:highlightedValue']>;
export const DateRangePickerTrigger = PickerTrigger;
export const DateRangePickerContent = PickerContent;
export const DateRangePickerGrid = PickerGrid;
export const DateRangePickerCell = PickerCell;
export const DateRangePickerMonthCell = PickerMonthCell;
export const DateRangePickerStartInput = createPickerInput('start-input', 'SectileDateRangePickerStartInput');
export const DateRangePickerEndInput = createPickerInput('end-input', 'SectileDateRangePickerEndInput');
export const DateRangePickerPreviousWeek = createPickerMove('week', -1, 'SectileDateRangePickerPreviousWeek');
export const DateRangePickerNextWeek = createPickerMove('week', 1, 'SectileDateRangePickerNextWeek');
export const DateRangePickerPreviousMonth = createPickerMove('month', -1, 'SectileDateRangePickerPreviousMonth');
export const DateRangePickerNextMonth = createPickerMove('month', 1, 'SectileDateRangePickerNextMonth');
export const DateRangePickerPreviousYear = createPickerMove('year', -1, 'SectileDateRangePickerPreviousYear');
export const DateRangePickerNextYear = createPickerMove('year', 1, 'SectileDateRangePickerNextYear');
export const DateRangePickerWeekViewTrigger = createPickerViewTrigger('week', 'SectileDateRangePickerWeekViewTrigger');
export const DateRangePickerMonthViewTrigger = createPickerViewTrigger('month', 'SectileDateRangePickerMonthViewTrigger');
export const DateRangePickerYearViewTrigger = createPickerViewTrigger('year', 'SectileDateRangePickerYearViewTrigger');
export type { DateRange, DateValue, PickerCellSlotProps as DateRangePickerCellSlotProps, PickerMonthCellSlotProps as DateRangePickerMonthCellSlotProps, PickerPartProps as DateRangePickerPartProps, PickerRootSlotProps as DateRangePickerRootSlotProps };
