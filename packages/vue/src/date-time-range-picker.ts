import type { DateTimeRangePickerOptions } from '@sectile/dom/date-time-range-picker';
import type { DateValue } from '@sectile/dom/date-field';
import type { DateTimeRange } from '@sectile/dom/date-time-field';
import {
  PickerCell, PickerContent, PickerGrid, PickerTrigger, createPickerInput, createPickerMove,
  createPickerRoot, type PickerCellSlotProps, type PickerPartProps, type PickerRootSlotProps,
} from './internal/date-picker.js';

export interface DateTimeRangePickerRootProps {
  readonly modelValue?: DateTimeRange | null; readonly defaultValue?: DateTimeRange | null;
  readonly highlightedValue?: DateValue; readonly defaultHighlightedValue?: DateValue;
  readonly open?: boolean; readonly defaultOpen?: boolean; readonly disabled?: boolean; readonly?: boolean;
  readonly required?: boolean; readonly label?: string; readonly policies?: DateTimeRangePickerOptions['policies'];
}
export const DateTimeRangePickerRoot = createPickerRoot('date-time-range', 'SectileDateTimeRangePickerRoot');
export const DateTimeRangePickerTrigger = PickerTrigger;
export const DateTimeRangePickerContent = PickerContent;
export const DateTimeRangePickerGrid = PickerGrid;
export const DateTimeRangePickerCell = PickerCell;
export const DateTimeRangePickerStartInput = createPickerInput('start-input', 'SectileDateTimeRangePickerStartInput');
export const DateTimeRangePickerEndInput = createPickerInput('end-input', 'SectileDateTimeRangePickerEndInput');
export const DateTimeRangePickerStartTimeInput = createPickerInput('start-time-input', 'SectileDateTimeRangePickerStartTimeInput');
export const DateTimeRangePickerEndTimeInput = createPickerInput('end-time-input', 'SectileDateTimeRangePickerEndTimeInput');
export const DateTimeRangePickerPrevious = createPickerMove(-1, 'SectileDateTimeRangePickerPrevious');
export const DateTimeRangePickerNext = createPickerMove(1, 'SectileDateTimeRangePickerNext');
export type { DateTimeRange, DateValue, PickerCellSlotProps as DateTimeRangePickerCellSlotProps, PickerPartProps as DateTimeRangePickerPartProps, PickerRootSlotProps as DateTimeRangePickerRootSlotProps };
