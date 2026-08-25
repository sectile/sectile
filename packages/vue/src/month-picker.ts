import type { DatePickerOptions } from '@sectile/dom/date-picker';
import type { DateValue } from '@sectile/dom/date-field';
import {
  PickerContent, PickerGrid, PickerTrigger, createPickerInput, createPickerMonthCell, createPickerMove,
  createPickerRoot, type PickerMonthCellSlotProps, type PickerPartProps, type PickerRootSlotProps,
} from './internal/date-picker.js';

export interface MonthPickerRootProps {
  readonly modelValue?: DateValue | null;
  readonly defaultValue?: DateValue | null;
  readonly highlightedValue?: DateValue;
  readonly defaultHighlightedValue?: DateValue;
  readonly open?: boolean;
  readonly defaultOpen?: boolean;
  readonly disabled?: boolean;
  readonly?: boolean;
  readonly required?: boolean;
  readonly label?: string;
  readonly policies?: DatePickerOptions['policies'];
}

export const MonthPickerRoot = createPickerRoot('date', 'SectileMonthPickerRoot', { scope: 'month-picker', granularity: 'month', defaultView: 'year' });
export type MonthPickerValueChangeHandler = NonNullable<InstanceType<typeof MonthPickerRoot>['$props']['onUpdate:modelValue']>;
export type MonthPickerOpenChangeHandler = NonNullable<InstanceType<typeof MonthPickerRoot>['$props']['onUpdate:open']>;
export type MonthPickerHighlightedValueChangeHandler = NonNullable<InstanceType<typeof MonthPickerRoot>['$props']['onUpdate:highlightedValue']>;
export const MonthPickerTrigger = PickerTrigger;
export const MonthPickerContent = PickerContent;
export const MonthPickerGrid = PickerGrid;
export const MonthPickerCell = createPickerMonthCell('cell', 'SectileMonthPickerCell');
export const MonthPickerInput = createPickerInput('input', 'SectileMonthPickerInput');
export const MonthPickerPreviousYear = createPickerMove('year', -1, 'SectileMonthPickerPreviousYear');
export const MonthPickerNextYear = createPickerMove('year', 1, 'SectileMonthPickerNextYear');

export type {
  DateValue as MonthPickerValue,
  PickerMonthCellSlotProps as MonthPickerCellSlotProps,
  PickerPartProps as MonthPickerPartProps,
  PickerRootSlotProps as MonthPickerRootSlotProps,
};
