import type { DateRangePickerOptions } from '@sectile/dom/temporal';
import type { DateRange, DateValue } from '@sectile/dom/temporal';
import {
  PickerAnchor, PickerCell, PickerContent, PickerGrid, PickerMonthCell, PickerPortal, PickerTrigger, createPickerInput, createPickerMove, createPickerViewTrigger, specializePickerRootPart,
  createPickerRoot, type PickerCellSlotProps, type PickerMonthCellSlotProps, type PickerPartProps, type PickerPortalProps, type PickerPositionProps, type PickerRootSlotProps,
} from './internal/date-picker.js';

export interface DateRangePickerRootProps extends PickerPartProps, PickerPositionProps {
  readonly modelValue?: DateRange | null; readonly defaultValue?: DateRange | null;
  readonly highlightedValue?: DateValue; readonly defaultHighlightedValue?: DateValue; readonly referenceDate?: DateValue;
  readonly defaultView?: PickerRootSlotProps['viewMode'];
  readonly open?: boolean; readonly defaultOpen?: boolean; readonly disabled?: boolean; readonly?: boolean;
  readonly required?: boolean; readonly label?: string; readonly policies?: DateRangePickerOptions['policies'];
}
export const DateRangePickerRoot = createPickerRoot('date-range', 'SectileDateRangePickerRoot');
export type DateRangePickerRootSlotProps = PickerRootSlotProps<DateRange | null>;
export type DateRangePickerValueChangeHandler = NonNullable<InstanceType<typeof DateRangePickerRoot>['$props']['onUpdate:modelValue']>;
export type DateRangePickerOpenChangeHandler = NonNullable<InstanceType<typeof DateRangePickerRoot>['$props']['onUpdate:open']>;
export type DateRangePickerHighlightedValueChangeHandler = NonNullable<InstanceType<typeof DateRangePickerRoot>['$props']['onUpdate:highlightedValue']>;
export type DateRangePickerPositionChangeHandler = NonNullable<InstanceType<typeof DateRangePickerRoot>['$props']['onPositionChange']>;
export const DateRangePickerTrigger = specializePickerRootPart('date-range', PickerTrigger);
export const DateRangePickerAnchor = specializePickerRootPart('date-range', PickerAnchor);
export const DateRangePickerPortal = PickerPortal;
export const DateRangePickerContent = specializePickerRootPart('date-range', PickerContent);
export const DateRangePickerGrid = specializePickerRootPart('date-range', PickerGrid);
export const DateRangePickerCell = PickerCell;
export const DateRangePickerMonthCell = PickerMonthCell;
export const DateRangePickerStartInput = createPickerInput('start-input', 'SectileDateRangePickerStartInput');
export const DateRangePickerEndInput = createPickerInput('end-input', 'SectileDateRangePickerEndInput');
export const DateRangePickerPreviousWeek = specializePickerRootPart('date-range', createPickerMove('week', -1, 'SectileDateRangePickerPreviousWeek'));
export const DateRangePickerNextWeek = specializePickerRootPart('date-range', createPickerMove('week', 1, 'SectileDateRangePickerNextWeek'));
export const DateRangePickerPreviousMonth = specializePickerRootPart('date-range', createPickerMove('month', -1, 'SectileDateRangePickerPreviousMonth'));
export const DateRangePickerNextMonth = specializePickerRootPart('date-range', createPickerMove('month', 1, 'SectileDateRangePickerNextMonth'));
export const DateRangePickerPreviousYear = specializePickerRootPart('date-range', createPickerMove('year', -1, 'SectileDateRangePickerPreviousYear'));
export const DateRangePickerNextYear = specializePickerRootPart('date-range', createPickerMove('year', 1, 'SectileDateRangePickerNextYear'));
export const DateRangePickerWeekViewTrigger = specializePickerRootPart('date-range', createPickerViewTrigger('week', 'SectileDateRangePickerWeekViewTrigger'));
export const DateRangePickerMonthViewTrigger = specializePickerRootPart('date-range', createPickerViewTrigger('month', 'SectileDateRangePickerMonthViewTrigger'));
export const DateRangePickerYearViewTrigger = specializePickerRootPart('date-range', createPickerViewTrigger('year', 'SectileDateRangePickerYearViewTrigger'));
export type { DateRange, DateValue, PickerCellSlotProps as DateRangePickerCellSlotProps, PickerMonthCellSlotProps as DateRangePickerMonthCellSlotProps, PickerPartProps as DateRangePickerPartProps, PickerPortalProps as DateRangePickerPortalProps };
