import type { DateTimeRangePickerOptions } from '@sectile/dom/date-time-range-picker';
import type { DateValue } from '@sectile/dom/date-field';
import type { DateTimeRange } from '@sectile/dom/date-time-field';
import {
  PickerCell, PickerContent, PickerGrid, PickerMonthCell, PickerTrigger, createPickerInput, createPickerMove, createPickerViewTrigger,
  createPickerRoot, type PickerCellSlotProps, type PickerMonthCellSlotProps, type PickerPartProps, type PickerRootSlotProps,
} from './internal/date-picker.js';

export interface DateTimeRangePickerRootProps {
  readonly modelValue?: DateTimeRange | null; readonly defaultValue?: DateTimeRange | null;
  readonly highlightedValue?: DateValue; readonly defaultHighlightedValue?: DateValue;
  readonly defaultView?: PickerRootSlotProps['viewMode'];
  readonly open?: boolean; readonly defaultOpen?: boolean; readonly disabled?: boolean; readonly?: boolean;
  readonly required?: boolean; readonly label?: string; readonly policies?: DateTimeRangePickerOptions['policies'];
}
export const DateTimeRangePickerRoot = createPickerRoot('date-time-range', 'SectileDateTimeRangePickerRoot');
export const DateTimeRangePickerTrigger = PickerTrigger;
export const DateTimeRangePickerContent = PickerContent;
export const DateTimeRangePickerGrid = PickerGrid;
export const DateTimeRangePickerCell = PickerCell;
export const DateTimeRangePickerMonthCell = PickerMonthCell;
export const DateTimeRangePickerStartDateTimeInput = createPickerInput('start-date-time-input', 'SectileDateTimeRangePickerStartDateTimeInput');
export const DateTimeRangePickerEndDateTimeInput = createPickerInput('end-date-time-input', 'SectileDateTimeRangePickerEndDateTimeInput');
export const DateTimeRangePickerStartDateInput = createPickerInput('start-date-input', 'SectileDateTimeRangePickerStartDateInput');
export const DateTimeRangePickerEndDateInput = createPickerInput('end-date-input', 'SectileDateTimeRangePickerEndDateInput');
export const DateTimeRangePickerStartTimeInput = createPickerInput('start-time-input', 'SectileDateTimeRangePickerStartTimeInput');
export const DateTimeRangePickerEndTimeInput = createPickerInput('end-time-input', 'SectileDateTimeRangePickerEndTimeInput');
export const DateTimeRangePickerPreviousWeek = createPickerMove('week', -1, 'SectileDateTimeRangePickerPreviousWeek');
export const DateTimeRangePickerNextWeek = createPickerMove('week', 1, 'SectileDateTimeRangePickerNextWeek');
export const DateTimeRangePickerPreviousMonth = createPickerMove('month', -1, 'SectileDateTimeRangePickerPreviousMonth');
export const DateTimeRangePickerNextMonth = createPickerMove('month', 1, 'SectileDateTimeRangePickerNextMonth');
export const DateTimeRangePickerPreviousYear = createPickerMove('year', -1, 'SectileDateTimeRangePickerPreviousYear');
export const DateTimeRangePickerNextYear = createPickerMove('year', 1, 'SectileDateTimeRangePickerNextYear');
export const DateTimeRangePickerWeekViewTrigger = createPickerViewTrigger('week', 'SectileDateTimeRangePickerWeekViewTrigger');
export const DateTimeRangePickerMonthViewTrigger = createPickerViewTrigger('month', 'SectileDateTimeRangePickerMonthViewTrigger');
export const DateTimeRangePickerYearViewTrigger = createPickerViewTrigger('year', 'SectileDateTimeRangePickerYearViewTrigger');
export type { DateTimeRange, DateValue, PickerCellSlotProps as DateTimeRangePickerCellSlotProps, PickerMonthCellSlotProps as DateTimeRangePickerMonthCellSlotProps, PickerPartProps as DateTimeRangePickerPartProps, PickerRootSlotProps as DateTimeRangePickerRootSlotProps };
