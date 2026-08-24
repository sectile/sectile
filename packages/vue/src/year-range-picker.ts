import type { DateRangePickerOptions } from '@sectile/dom/date-range-picker';
import type { DateRange, DateValue } from '@sectile/dom/date-field';
import {
  PickerContent, PickerGrid, PickerTrigger, createPickerInput, createPickerMove, createPickerYearCell,
  createPickerRoot, type PickerPartProps, type PickerRootSlotProps, type PickerYearCellSlotProps,
} from './internal/date-picker.js';

export interface YearRangePickerRootProps {
  readonly modelValue?: DateRange | null;
  readonly defaultValue?: DateRange | null;
  readonly highlightedValue?: DateValue;
  readonly defaultHighlightedValue?: DateValue;
  readonly open?: boolean;
  readonly defaultOpen?: boolean;
  readonly disabled?: boolean;
  readonly?: boolean;
  readonly required?: boolean;
  readonly label?: string;
  readonly policies?: DateRangePickerOptions['policies'];
}

export const YearRangePickerRoot = createPickerRoot('date-range', 'SectileYearRangePickerRoot', { scope: 'year-range-picker', granularity: 'year', defaultView: 'year' });
export const YearRangePickerTrigger = PickerTrigger;
export const YearRangePickerContent = PickerContent;
export const YearRangePickerGrid = PickerGrid;
export const YearRangePickerCell = createPickerYearCell('cell', 'SectileYearRangePickerCell');
export const YearRangePickerStartInput = createPickerInput('start-input', 'SectileYearRangePickerStartInput');
export const YearRangePickerEndInput = createPickerInput('end-input', 'SectileYearRangePickerEndInput');
export const YearRangePickerPreviousPage = createPickerMove('year', -1, 'SectileYearRangePickerPreviousPage', 'previous-page');
export const YearRangePickerNextPage = createPickerMove('year', 1, 'SectileYearRangePickerNextPage', 'next-page');

export type {
  DateRange as YearRangePickerValue,
  DateValue as YearPickerValue,
  PickerPartProps as YearRangePickerPartProps,
  PickerRootSlotProps as YearRangePickerRootSlotProps,
  PickerYearCellSlotProps as YearRangePickerCellSlotProps,
};
