import type { DateTimeRangePickerOptions } from '@sectile/dom/temporal/date-time-range-picker';
import type { DateValue } from '@sectile/dom/temporal/date-field';
import type { DateTimeRange } from '@sectile/dom/temporal/date-time-field';
import {
  PickerAnchor, PickerCell, PickerContent, PickerGrid, PickerMonthCell, PickerPortal, PickerTrigger, createPickerInput, createPickerMove, createPickerViewTrigger, type PickerRootPartComponent,
  createPickerRoot, type PickerCellSlotProps, type PickerMonthCellSlotProps, type PickerPartProps, type PickerPortalProps, type PickerPositionProps, type PickerRootSlotProps,
} from './picker.js';
import { dateTimeRangePickerCapability } from './capabilities/date-time-range-picker.js';

export interface DateTimeRangePickerRootProps extends PickerPartProps, PickerPositionProps {
  readonly modelValue?: DateTimeRange | null; readonly defaultValue?: DateTimeRange | null;
  readonly highlightedValue?: DateValue; readonly defaultHighlightedValue?: DateValue; readonly referenceDate?: DateValue;
  readonly defaultView?: PickerRootSlotProps['viewMode'];
  readonly open?: boolean; readonly defaultOpen?: boolean; readonly disabled?: boolean; readonly?: boolean;
  readonly required?: boolean; readonly label?: string; readonly policies?: DateTimeRangePickerOptions['policies'];
}
export const DateTimeRangePickerRoot = /* @__PURE__ */ createPickerRoot(dateTimeRangePickerCapability, 'SectileDateTimeRangePickerRoot');
export type DateTimeRangePickerRootSlotProps = PickerRootSlotProps<DateTimeRange | null>;
export type DateTimeRangePickerValueChangeHandler = NonNullable<InstanceType<typeof DateTimeRangePickerRoot>['$props']['onUpdate:modelValue']>;
export type DateTimeRangePickerOpenChangeHandler = NonNullable<InstanceType<typeof DateTimeRangePickerRoot>['$props']['onUpdate:open']>;
export type DateTimeRangePickerHighlightedValueChangeHandler = NonNullable<InstanceType<typeof DateTimeRangePickerRoot>['$props']['onUpdate:highlightedValue']>;
export const DateTimeRangePickerTrigger = PickerTrigger as unknown as PickerRootPartComponent<'date-time-range'>;
export const DateTimeRangePickerAnchor = PickerAnchor as unknown as PickerRootPartComponent<'date-time-range'>;
export const DateTimeRangePickerPortal = PickerPortal;
export const DateTimeRangePickerContent = PickerContent as unknown as PickerRootPartComponent<'date-time-range'>;
export const DateTimeRangePickerGrid = PickerGrid as unknown as PickerRootPartComponent<'date-time-range'>;
export const DateTimeRangePickerCell = PickerCell;
export const DateTimeRangePickerMonthCell = PickerMonthCell;
export const DateTimeRangePickerStartDateTimeInput = /* @__PURE__ */ createPickerInput('start-date-time-input', 'SectileDateTimeRangePickerStartDateTimeInput');
export const DateTimeRangePickerEndDateTimeInput = /* @__PURE__ */ createPickerInput('end-date-time-input', 'SectileDateTimeRangePickerEndDateTimeInput');
export const DateTimeRangePickerStartDateInput = /* @__PURE__ */ createPickerInput('start-date-input', 'SectileDateTimeRangePickerStartDateInput');
export const DateTimeRangePickerEndDateInput = /* @__PURE__ */ createPickerInput('end-date-input', 'SectileDateTimeRangePickerEndDateInput');
export const DateTimeRangePickerStartTimeInput = /* @__PURE__ */ createPickerInput('start-time-input', 'SectileDateTimeRangePickerStartTimeInput');
export const DateTimeRangePickerEndTimeInput = /* @__PURE__ */ createPickerInput('end-time-input', 'SectileDateTimeRangePickerEndTimeInput');
export const DateTimeRangePickerPreviousWeek = /* @__PURE__ */ createPickerMove('week', -1, 'SectileDateTimeRangePickerPreviousWeek') as unknown as PickerRootPartComponent<'date-time-range'>;
export const DateTimeRangePickerNextWeek = /* @__PURE__ */ createPickerMove('week', 1, 'SectileDateTimeRangePickerNextWeek') as unknown as PickerRootPartComponent<'date-time-range'>;
export const DateTimeRangePickerPreviousMonth = /* @__PURE__ */ createPickerMove('month', -1, 'SectileDateTimeRangePickerPreviousMonth') as unknown as PickerRootPartComponent<'date-time-range'>;
export const DateTimeRangePickerNextMonth = /* @__PURE__ */ createPickerMove('month', 1, 'SectileDateTimeRangePickerNextMonth') as unknown as PickerRootPartComponent<'date-time-range'>;
export const DateTimeRangePickerPreviousYear = /* @__PURE__ */ createPickerMove('year', -1, 'SectileDateTimeRangePickerPreviousYear') as unknown as PickerRootPartComponent<'date-time-range'>;
export const DateTimeRangePickerNextYear = /* @__PURE__ */ createPickerMove('year', 1, 'SectileDateTimeRangePickerNextYear') as unknown as PickerRootPartComponent<'date-time-range'>;
export const DateTimeRangePickerWeekViewTrigger = /* @__PURE__ */ createPickerViewTrigger('week', 'SectileDateTimeRangePickerWeekViewTrigger') as unknown as PickerRootPartComponent<'date-time-range'>;
export const DateTimeRangePickerMonthViewTrigger = /* @__PURE__ */ createPickerViewTrigger('month', 'SectileDateTimeRangePickerMonthViewTrigger') as unknown as PickerRootPartComponent<'date-time-range'>;
export const DateTimeRangePickerYearViewTrigger = /* @__PURE__ */ createPickerViewTrigger('year', 'SectileDateTimeRangePickerYearViewTrigger') as unknown as PickerRootPartComponent<'date-time-range'>;
export type { DateTimeRange, DateValue, PickerCellSlotProps as DateTimeRangePickerCellSlotProps, PickerMonthCellSlotProps as DateTimeRangePickerMonthCellSlotProps, PickerPartProps as DateTimeRangePickerPartProps, PickerPortalProps as DateTimeRangePickerPortalProps };
