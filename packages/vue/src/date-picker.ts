import type { DatePickerOptions } from '@sectile/dom/date-picker';
import type { DateValue } from '@sectile/dom/date-field';
import {
  PickerCell, PickerContent, PickerGrid, PickerMonthCell, PickerTrigger, createPickerInput, createPickerMove, createPickerViewTrigger,
  createPickerRoot, type PickerCellSlotProps, type PickerMonthCellSlotProps, type PickerPartProps, type PickerRootSlotProps,
} from './internal/date-picker.js';

export interface DatePickerRootProps {
  readonly modelValue?: DateValue | null; readonly defaultValue?: DateValue | null;
  readonly highlightedValue?: DateValue; readonly defaultHighlightedValue?: DateValue; readonly referenceDate?: DateValue;
  readonly defaultView?: PickerRootSlotProps['viewMode'];
  readonly open?: boolean; readonly defaultOpen?: boolean; readonly disabled?: boolean; readonly?: boolean;
  readonly required?: boolean; readonly label?: string; readonly policies?: DatePickerOptions['policies'];
}
export const DatePickerRoot = createPickerRoot('date', 'SectileDatePickerRoot');
export type DatePickerValueChangeHandler = NonNullable<InstanceType<typeof DatePickerRoot>['$props']['onUpdate:modelValue']>;
export type DatePickerOpenChangeHandler = NonNullable<InstanceType<typeof DatePickerRoot>['$props']['onUpdate:open']>;
export type DatePickerHighlightedValueChangeHandler = NonNullable<InstanceType<typeof DatePickerRoot>['$props']['onUpdate:highlightedValue']>;
export const DatePickerTrigger = PickerTrigger;
export const DatePickerContent = PickerContent;
export const DatePickerGrid = PickerGrid;
export const DatePickerCell = PickerCell;
export const DatePickerMonthCell = PickerMonthCell;
export const DatePickerInput = createPickerInput('input', 'SectileDatePickerInput');
export const DatePickerPreviousWeek = createPickerMove('week', -1, 'SectileDatePickerPreviousWeek');
export const DatePickerNextWeek = createPickerMove('week', 1, 'SectileDatePickerNextWeek');
export const DatePickerPreviousMonth = createPickerMove('month', -1, 'SectileDatePickerPreviousMonth');
export const DatePickerNextMonth = createPickerMove('month', 1, 'SectileDatePickerNextMonth');
export const DatePickerPreviousYear = createPickerMove('year', -1, 'SectileDatePickerPreviousYear');
export const DatePickerNextYear = createPickerMove('year', 1, 'SectileDatePickerNextYear');
export const DatePickerWeekViewTrigger = createPickerViewTrigger('week', 'SectileDatePickerWeekViewTrigger');
export const DatePickerMonthViewTrigger = createPickerViewTrigger('month', 'SectileDatePickerMonthViewTrigger');
export const DatePickerYearViewTrigger = createPickerViewTrigger('year', 'SectileDatePickerYearViewTrigger');
export type { DateValue, PickerCellSlotProps as DatePickerCellSlotProps, PickerMonthCellSlotProps as DatePickerMonthCellSlotProps, PickerPartProps as DatePickerPartProps, PickerRootSlotProps as DatePickerRootSlotProps };
