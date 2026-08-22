import type { DatePickerOptions } from '@sectile/dom/date-picker';
import type { DateValue } from '@sectile/dom/date-field';
import {
  PickerCell, PickerContent, PickerGrid, PickerTrigger, createPickerInput, createPickerMove,
  createPickerRoot, type PickerCellSlotProps, type PickerPartProps, type PickerRootSlotProps,
} from './internal/date-picker.js';

export interface DatePickerRootProps {
  readonly modelValue?: DateValue | null; readonly defaultValue?: DateValue | null;
  readonly highlightedValue?: DateValue; readonly defaultHighlightedValue?: DateValue;
  readonly open?: boolean; readonly defaultOpen?: boolean; readonly disabled?: boolean; readonly?: boolean;
  readonly required?: boolean; readonly label?: string; readonly policies?: DatePickerOptions['policies'];
}
export const DatePickerRoot = createPickerRoot('date', 'SectileDatePickerRoot');
export const DatePickerTrigger = PickerTrigger;
export const DatePickerContent = PickerContent;
export const DatePickerGrid = PickerGrid;
export const DatePickerCell = PickerCell;
export const DatePickerInput = createPickerInput('input', 'SectileDatePickerInput');
export const DatePickerPrevious = createPickerMove(-1, 'SectileDatePickerPrevious');
export const DatePickerNext = createPickerMove(1, 'SectileDatePickerNext');
export type { DateValue, PickerCellSlotProps as DatePickerCellSlotProps, PickerPartProps as DatePickerPartProps, PickerRootSlotProps as DatePickerRootSlotProps };
