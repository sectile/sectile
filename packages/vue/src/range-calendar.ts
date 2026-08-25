import type { DateRangePickerOptions } from '@sectile/dom/date-range-picker';
import type { DateRange, DateValue } from '@sectile/dom/date-field';
import {
  PickerCell, PickerContent, PickerGrid, createPickerMove, createPickerRoot,
  type PickerCellSlotProps, type PickerPartProps, type PickerRootSlotProps,
} from './internal/date-picker.js';

export interface RangeCalendarRootProps {
  readonly modelValue?: DateRange | null;
  readonly defaultValue?: DateRange | null;
  readonly highlightedValue?: DateValue;
  readonly defaultHighlightedValue?: DateValue;
  readonly defaultView?: PickerRootSlotProps['viewMode'];
  readonly disabled?: boolean;
  readonly?: boolean;
  readonly required?: boolean;
  readonly label?: string;
  readonly policies?: DateRangePickerOptions['policies'];
}

export const RangeCalendarRoot = createPickerRoot('date-range', 'SectileRangeCalendarRoot', {
  scope: 'range-calendar',
  defaultOpen: true,
  defaultView: 'month',
  inline: true,
});
export type RangeCalendarValueChangeHandler = NonNullable<InstanceType<typeof RangeCalendarRoot>['$props']['onUpdate:modelValue']>;
export type RangeCalendarOpenChangeHandler = NonNullable<InstanceType<typeof RangeCalendarRoot>['$props']['onUpdate:open']>;
export type RangeCalendarHighlightedValueChangeHandler = NonNullable<InstanceType<typeof RangeCalendarRoot>['$props']['onUpdate:highlightedValue']>;
export const RangeCalendarContent = PickerContent;
export const RangeCalendarGrid = PickerGrid;
export const RangeCalendarCell = PickerCell;
export const RangeCalendarPreviousMonth = createPickerMove('month', -1, 'SectileRangeCalendarPreviousMonth');
export const RangeCalendarNextMonth = createPickerMove('month', 1, 'SectileRangeCalendarNextMonth');
export const RangeCalendarPreviousYear = createPickerMove('year', -1, 'SectileRangeCalendarPreviousYear');
export const RangeCalendarNextYear = createPickerMove('year', 1, 'SectileRangeCalendarNextYear');

export type {
  DateRange,
  DateValue,
  PickerCellSlotProps as RangeCalendarCellSlotProps,
  PickerPartProps as RangeCalendarPartProps,
  PickerRootSlotProps as RangeCalendarRootSlotProps,
};
