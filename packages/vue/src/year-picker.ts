import type { DatePickerOptions } from '@sectile/dom/date-picker';
import type { DateValue } from '@sectile/dom/date-field';
import {
  PickerContent, PickerGrid, PickerTrigger, createPickerInput, createPickerMove, createPickerYearCell,
  createPickerRoot, type PickerPartProps, type PickerRootSlotProps, type PickerYearCellSlotProps,
} from './internal/date-picker.js';

export interface YearPickerRootProps {
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

export const YearPickerRoot = createPickerRoot('date', 'SectileYearPickerRoot', { scope: 'year-picker', granularity: 'year', defaultView: 'year' });
export type YearPickerValueChangeHandler = NonNullable<InstanceType<typeof YearPickerRoot>['$props']['onUpdate:modelValue']>;
export type YearPickerOpenChangeHandler = NonNullable<InstanceType<typeof YearPickerRoot>['$props']['onUpdate:open']>;
export type YearPickerHighlightedValueChangeHandler = NonNullable<InstanceType<typeof YearPickerRoot>['$props']['onUpdate:highlightedValue']>;
export const YearPickerTrigger = PickerTrigger;
export const YearPickerContent = PickerContent;
export const YearPickerGrid = PickerGrid;
export const YearPickerCell = createPickerYearCell('cell', 'SectileYearPickerCell');
export const YearPickerInput = createPickerInput('input', 'SectileYearPickerInput');
export const YearPickerPreviousPage = createPickerMove('year', -1, 'SectileYearPickerPreviousPage', 'previous-page');
export const YearPickerNextPage = createPickerMove('year', 1, 'SectileYearPickerNextPage', 'next-page');

export type {
  DateValue as YearPickerValue,
  PickerPartProps as YearPickerPartProps,
  PickerRootSlotProps as YearPickerRootSlotProps,
  PickerYearCellSlotProps as YearPickerCellSlotProps,
};
