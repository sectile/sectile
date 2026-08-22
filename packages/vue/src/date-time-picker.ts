import type { DateTimePickerOptions } from '@sectile/dom/date-time-picker';
import type { DateValue } from '@sectile/dom/date-field';
import type { DateTimeValue } from '@sectile/dom/date-time-field';
import {
  PickerCell, PickerContent, PickerGrid, PickerTrigger, createPickerInput, createPickerMove,
  createPickerRoot, type PickerCellSlotProps, type PickerPartProps, type PickerRootSlotProps,
} from './internal/date-picker.js';

export interface DateTimePickerRootProps {
  readonly modelValue?: DateTimeValue | null; readonly defaultValue?: DateTimeValue | null;
  readonly highlightedValue?: DateValue; readonly defaultHighlightedValue?: DateValue;
  readonly open?: boolean; readonly defaultOpen?: boolean; readonly disabled?: boolean; readonly?: boolean;
  readonly required?: boolean; readonly label?: string; readonly policies?: DateTimePickerOptions['policies'];
}
export const DateTimePickerRoot = createPickerRoot('date-time', 'SectileDateTimePickerRoot');
export const DateTimePickerTrigger = PickerTrigger;
export const DateTimePickerContent = PickerContent;
export const DateTimePickerGrid = PickerGrid;
export const DateTimePickerCell = PickerCell;
export const DateTimePickerInput = createPickerInput('input', 'SectileDateTimePickerInput');
export const DateTimePickerTimeInput = createPickerInput('time-input', 'SectileDateTimePickerTimeInput');
export const DateTimePickerPrevious = createPickerMove(-1, 'SectileDateTimePickerPrevious');
export const DateTimePickerNext = createPickerMove(1, 'SectileDateTimePickerNext');
export type { DateTimeValue, DateValue, PickerCellSlotProps as DateTimePickerCellSlotProps, PickerPartProps as DateTimePickerPartProps, PickerRootSlotProps as DateTimePickerRootSlotProps };
