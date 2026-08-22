import type { DateRangePickerOptions } from '@sectile/dom/date-range-picker';
import type { DateRange, DateValue } from '@sectile/dom/date-field';
import {
  PickerCell, PickerContent, PickerGrid, PickerTrigger, createPickerInput, createPickerMove,
  createPickerRoot, type PickerCellSlotProps, type PickerPartProps, type PickerRootSlotProps,
} from './internal/date-picker.js';

export interface DateRangePickerRootProps {
  readonly modelValue?: DateRange | null; readonly defaultValue?: DateRange | null;
  readonly highlightedValue?: DateValue; readonly defaultHighlightedValue?: DateValue;
  readonly open?: boolean; readonly defaultOpen?: boolean; readonly disabled?: boolean; readonly?: boolean;
  readonly required?: boolean; readonly label?: string; readonly policies?: DateRangePickerOptions['policies'];
}
export const DateRangePickerRoot = createPickerRoot('date-range', 'SectileDateRangePickerRoot');
export const DateRangePickerTrigger = PickerTrigger;
export const DateRangePickerContent = PickerContent;
export const DateRangePickerGrid = PickerGrid;
export const DateRangePickerCell = PickerCell;
export const DateRangePickerStartInput = createPickerInput('start-input', 'SectileDateRangePickerStartInput');
export const DateRangePickerEndInput = createPickerInput('end-input', 'SectileDateRangePickerEndInput');
export const DateRangePickerPrevious = createPickerMove(-1, 'SectileDateRangePickerPrevious');
export const DateRangePickerNext = createPickerMove(1, 'SectileDateRangePickerNext');
export type { DateRange, DateValue, PickerCellSlotProps as DateRangePickerCellSlotProps, PickerPartProps as DateRangePickerPartProps, PickerRootSlotProps as DateRangePickerRootSlotProps };
