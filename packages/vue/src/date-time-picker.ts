import type { DateTimePickerOptions } from '@sectile/dom/date-time-picker';
import type { DateValue } from '@sectile/dom/date-field';
import type { DateTimeValue } from '@sectile/dom/date-time-field';
import {
  PickerCell, PickerContent, PickerGrid, PickerMonthCell, PickerTrigger, createPickerInput, createPickerMove, createPickerViewTrigger,
  createPickerRoot, type PickerCellSlotProps, type PickerMonthCellSlotProps, type PickerPartProps, type PickerRootSlotProps,
} from './internal/date-picker.js';

export interface DateTimePickerRootProps {
  readonly modelValue?: DateTimeValue | null; readonly defaultValue?: DateTimeValue | null;
  readonly highlightedValue?: DateValue; readonly defaultHighlightedValue?: DateValue;
  readonly defaultView?: PickerRootSlotProps['viewMode'];
  readonly open?: boolean; readonly defaultOpen?: boolean; readonly disabled?: boolean; readonly?: boolean;
  readonly required?: boolean; readonly label?: string; readonly policies?: DateTimePickerOptions['policies'];
}
export const DateTimePickerRoot = createPickerRoot('date-time', 'SectileDateTimePickerRoot');
export const DateTimePickerTrigger = PickerTrigger;
export const DateTimePickerContent = PickerContent;
export const DateTimePickerGrid = PickerGrid;
export const DateTimePickerCell = PickerCell;
export const DateTimePickerMonthCell = PickerMonthCell;
export const DateTimePickerDateTimeInput = createPickerInput('date-time-input', 'SectileDateTimePickerDateTimeInput');
export const DateTimePickerDateInput = createPickerInput('date-input', 'SectileDateTimePickerDateInput');
export const DateTimePickerTimeInput = createPickerInput('time-input', 'SectileDateTimePickerTimeInput');
export const DateTimePickerPreviousWeek = createPickerMove('week', -1, 'SectileDateTimePickerPreviousWeek');
export const DateTimePickerNextWeek = createPickerMove('week', 1, 'SectileDateTimePickerNextWeek');
export const DateTimePickerPreviousMonth = createPickerMove('month', -1, 'SectileDateTimePickerPreviousMonth');
export const DateTimePickerNextMonth = createPickerMove('month', 1, 'SectileDateTimePickerNextMonth');
export const DateTimePickerPreviousYear = createPickerMove('year', -1, 'SectileDateTimePickerPreviousYear');
export const DateTimePickerNextYear = createPickerMove('year', 1, 'SectileDateTimePickerNextYear');
export const DateTimePickerWeekViewTrigger = createPickerViewTrigger('week', 'SectileDateTimePickerWeekViewTrigger');
export const DateTimePickerMonthViewTrigger = createPickerViewTrigger('month', 'SectileDateTimePickerMonthViewTrigger');
export const DateTimePickerYearViewTrigger = createPickerViewTrigger('year', 'SectileDateTimePickerYearViewTrigger');
export type { DateTimeValue, DateValue, PickerCellSlotProps as DateTimePickerCellSlotProps, PickerMonthCellSlotProps as DateTimePickerMonthCellSlotProps, PickerPartProps as DateTimePickerPartProps, PickerRootSlotProps as DateTimePickerRootSlotProps };
