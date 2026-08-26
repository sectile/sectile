import type { DateRangePickerOptions } from '@sectile/dom/date-range-picker';
import type { DateRange, DateValue } from '@sectile/dom/date-field';
import {
  PickerContent, PickerGrid, PickerTrigger, createPickerInput, createPickerMonthCell, createPickerMove,
  createPickerRoot, type PickerMonthCellSlotProps, type PickerPartProps, type PickerRootSlotProps,
} from './internal/date-picker.js';

export interface MonthRangePickerRootProps {
  readonly modelValue?: DateRange | null;
  readonly defaultValue?: DateRange | null;
  readonly highlightedValue?: DateValue;
  readonly defaultHighlightedValue?: DateValue; readonly referenceDate?: DateValue;
  readonly open?: boolean;
  readonly defaultOpen?: boolean;
  readonly disabled?: boolean;
  readonly?: boolean;
  readonly required?: boolean;
  readonly label?: string;
  readonly policies?: DateRangePickerOptions['policies'];
}

export const MonthRangePickerRoot = createPickerRoot('date-range', 'SectileMonthRangePickerRoot', { scope: 'month-range-picker', granularity: 'month', defaultView: 'year' });
export type MonthRangePickerValueChangeHandler = NonNullable<InstanceType<typeof MonthRangePickerRoot>['$props']['onUpdate:modelValue']>;
export type MonthRangePickerOpenChangeHandler = NonNullable<InstanceType<typeof MonthRangePickerRoot>['$props']['onUpdate:open']>;
export type MonthRangePickerHighlightedValueChangeHandler = NonNullable<InstanceType<typeof MonthRangePickerRoot>['$props']['onUpdate:highlightedValue']>;
export const MonthRangePickerTrigger = PickerTrigger;
export const MonthRangePickerContent = PickerContent;
export const MonthRangePickerGrid = PickerGrid;
export const MonthRangePickerCell = createPickerMonthCell('cell', 'SectileMonthRangePickerCell');
export const MonthRangePickerStartInput = createPickerInput('start-input', 'SectileMonthRangePickerStartInput');
export const MonthRangePickerEndInput = createPickerInput('end-input', 'SectileMonthRangePickerEndInput');
export const MonthRangePickerPreviousYear = createPickerMove('year', -1, 'SectileMonthRangePickerPreviousYear');
export const MonthRangePickerNextYear = createPickerMove('year', 1, 'SectileMonthRangePickerNextYear');

export type {
  DateRange as MonthRangePickerValue,
  DateValue as MonthPickerValue,
  PickerMonthCellSlotProps as MonthRangePickerCellSlotProps,
  PickerPartProps as MonthRangePickerPartProps,
  PickerRootSlotProps as MonthRangePickerRootSlotProps,
};
