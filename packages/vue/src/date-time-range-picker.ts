import type { DateTimeRangePickerOptions } from '@sectile/dom/temporal/date-time-range-picker';
import type { DateValue } from '@sectile/dom/temporal/date-field';
import type { DateTimeRange } from '@sectile/dom/temporal/date-time-field';
import {
  PickerAnchor, PickerCell, PickerContent, PickerGrid, PickerMonthCell, PickerPortal, PickerTrigger, createPickerInput, createPickerMove, createPickerViewTrigger, specializePickerRootPart,
  createPickerRoot, type PickerCellSlotProps, type PickerMonthCellSlotProps, type PickerPartProps, type PickerPortalProps, type PickerPositionProps, type PickerRootSlotProps,
} from './internal/date-picker.js';
import { dateTimeRangePickerCapability } from './internal/date-time-range-picker-capability.js';

export interface DateTimeRangePickerRootProps extends PickerPartProps, PickerPositionProps {
  readonly modelValue?: DateTimeRange | null; readonly defaultValue?: DateTimeRange | null;
  readonly highlightedValue?: DateValue; readonly defaultHighlightedValue?: DateValue; readonly referenceDate?: DateValue;
  readonly defaultView?: PickerRootSlotProps['viewMode'];
  readonly open?: boolean; readonly defaultOpen?: boolean; readonly disabled?: boolean; readonly?: boolean;
  readonly required?: boolean; readonly label?: string; readonly policies?: DateTimeRangePickerOptions['policies'];
}
export const DateTimeRangePickerRoot = createPickerRoot(dateTimeRangePickerCapability, 'SectileDateTimeRangePickerRoot');
export type DateTimeRangePickerRootSlotProps = PickerRootSlotProps<DateTimeRange | null>;
export type DateTimeRangePickerValueChangeHandler = NonNullable<InstanceType<typeof DateTimeRangePickerRoot>['$props']['onUpdate:modelValue']>;
export type DateTimeRangePickerOpenChangeHandler = NonNullable<InstanceType<typeof DateTimeRangePickerRoot>['$props']['onUpdate:open']>;
export type DateTimeRangePickerHighlightedValueChangeHandler = NonNullable<InstanceType<typeof DateTimeRangePickerRoot>['$props']['onUpdate:highlightedValue']>;
export const DateTimeRangePickerTrigger = specializePickerRootPart('date-time-range', PickerTrigger);
export const DateTimeRangePickerAnchor = specializePickerRootPart('date-time-range', PickerAnchor);
export const DateTimeRangePickerPortal = PickerPortal;
export const DateTimeRangePickerContent = specializePickerRootPart('date-time-range', PickerContent);
export const DateTimeRangePickerGrid = specializePickerRootPart('date-time-range', PickerGrid);
export const DateTimeRangePickerCell = PickerCell;
export const DateTimeRangePickerMonthCell = PickerMonthCell;
export const DateTimeRangePickerStartDateTimeInput = createPickerInput('start-date-time-input', 'SectileDateTimeRangePickerStartDateTimeInput');
export const DateTimeRangePickerEndDateTimeInput = createPickerInput('end-date-time-input', 'SectileDateTimeRangePickerEndDateTimeInput');
export const DateTimeRangePickerStartDateInput = createPickerInput('start-date-input', 'SectileDateTimeRangePickerStartDateInput');
export const DateTimeRangePickerEndDateInput = createPickerInput('end-date-input', 'SectileDateTimeRangePickerEndDateInput');
export const DateTimeRangePickerStartTimeInput = createPickerInput('start-time-input', 'SectileDateTimeRangePickerStartTimeInput');
export const DateTimeRangePickerEndTimeInput = createPickerInput('end-time-input', 'SectileDateTimeRangePickerEndTimeInput');
export const DateTimeRangePickerPreviousWeek = specializePickerRootPart('date-time-range', createPickerMove('week', -1, 'SectileDateTimeRangePickerPreviousWeek'));
export const DateTimeRangePickerNextWeek = specializePickerRootPart('date-time-range', createPickerMove('week', 1, 'SectileDateTimeRangePickerNextWeek'));
export const DateTimeRangePickerPreviousMonth = specializePickerRootPart('date-time-range', createPickerMove('month', -1, 'SectileDateTimeRangePickerPreviousMonth'));
export const DateTimeRangePickerNextMonth = specializePickerRootPart('date-time-range', createPickerMove('month', 1, 'SectileDateTimeRangePickerNextMonth'));
export const DateTimeRangePickerPreviousYear = specializePickerRootPart('date-time-range', createPickerMove('year', -1, 'SectileDateTimeRangePickerPreviousYear'));
export const DateTimeRangePickerNextYear = specializePickerRootPart('date-time-range', createPickerMove('year', 1, 'SectileDateTimeRangePickerNextYear'));
export const DateTimeRangePickerWeekViewTrigger = specializePickerRootPart('date-time-range', createPickerViewTrigger('week', 'SectileDateTimeRangePickerWeekViewTrigger'));
export const DateTimeRangePickerMonthViewTrigger = specializePickerRootPart('date-time-range', createPickerViewTrigger('month', 'SectileDateTimeRangePickerMonthViewTrigger'));
export const DateTimeRangePickerYearViewTrigger = specializePickerRootPart('date-time-range', createPickerViewTrigger('year', 'SectileDateTimeRangePickerYearViewTrigger'));
export type { DateTimeRange, DateValue, PickerCellSlotProps as DateTimeRangePickerCellSlotProps, PickerMonthCellSlotProps as DateTimeRangePickerMonthCellSlotProps, PickerPartProps as DateTimeRangePickerPartProps, PickerPortalProps as DateTimeRangePickerPortalProps };
