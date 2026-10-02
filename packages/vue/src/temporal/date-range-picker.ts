import type { DateRangePickerOptions } from '@sectile/dom/temporal/date-range-picker';
import type { DateRange, DateValue } from '@sectile/dom/temporal/date-field';
import {
  PickerAnchor, PickerCell, PickerContent, PickerGrid, PickerMonthCell, PickerPortal, PickerTrigger, createPickerInput, createPickerMove, createPickerViewTrigger, type PickerRootPartComponent,
  createPickerRoot, type PickerCellSlotProps, type PickerMonthCellSlotProps, type PickerPartProps, type PickerPortalProps, type PickerPositionProps, type PickerRootSlotProps,
} from './picker.js';
import { dateRangePickerCapability } from './capabilities/date-range-picker.js';

export interface DateRangePickerRootProps extends PickerPartProps, PickerPositionProps {
  readonly modelValue?: DateRange | null; readonly defaultValue?: DateRange | null;
  readonly highlightedValue?: DateValue; readonly defaultHighlightedValue?: DateValue; readonly referenceDate?: DateValue;
  readonly defaultView?: PickerRootSlotProps['viewMode'];
  readonly open?: boolean; readonly defaultOpen?: boolean; readonly disabled?: boolean; readonly?: boolean;
  readonly required?: boolean; readonly label?: string; readonly policies?: DateRangePickerOptions['policies'];
}
export const DateRangePickerRoot = /* @__PURE__ */ createPickerRoot(dateRangePickerCapability, 'SectileDateRangePickerRoot');
export type DateRangePickerRootSlotProps = PickerRootSlotProps<DateRange | null>;
export type DateRangePickerValueChangeHandler = NonNullable<InstanceType<typeof DateRangePickerRoot>['$props']['onUpdate:modelValue']>;
export type DateRangePickerOpenChangeHandler = NonNullable<InstanceType<typeof DateRangePickerRoot>['$props']['onUpdate:open']>;
export type DateRangePickerHighlightedValueChangeHandler = NonNullable<InstanceType<typeof DateRangePickerRoot>['$props']['onUpdate:highlightedValue']>;
export const DateRangePickerTrigger = PickerTrigger as unknown as PickerRootPartComponent<'date-range'>;
export const DateRangePickerAnchor = PickerAnchor as unknown as PickerRootPartComponent<'date-range'>;
export const DateRangePickerPortal = PickerPortal;
export const DateRangePickerContent = PickerContent as unknown as PickerRootPartComponent<'date-range'>;
export const DateRangePickerGrid = PickerGrid as unknown as PickerRootPartComponent<'date-range'>;
export const DateRangePickerCell = PickerCell;
export const DateRangePickerMonthCell = PickerMonthCell;
export const DateRangePickerStartInput = /* @__PURE__ */ createPickerInput('start-input', 'SectileDateRangePickerStartInput');
export const DateRangePickerEndInput = /* @__PURE__ */ createPickerInput('end-input', 'SectileDateRangePickerEndInput');
export const DateRangePickerPreviousWeek = /* @__PURE__ */ createPickerMove('week', -1, 'SectileDateRangePickerPreviousWeek') as unknown as PickerRootPartComponent<'date-range'>;
export const DateRangePickerNextWeek = /* @__PURE__ */ createPickerMove('week', 1, 'SectileDateRangePickerNextWeek') as unknown as PickerRootPartComponent<'date-range'>;
export const DateRangePickerPreviousMonth = /* @__PURE__ */ createPickerMove('month', -1, 'SectileDateRangePickerPreviousMonth') as unknown as PickerRootPartComponent<'date-range'>;
export const DateRangePickerNextMonth = /* @__PURE__ */ createPickerMove('month', 1, 'SectileDateRangePickerNextMonth') as unknown as PickerRootPartComponent<'date-range'>;
export const DateRangePickerPreviousYear = /* @__PURE__ */ createPickerMove('year', -1, 'SectileDateRangePickerPreviousYear') as unknown as PickerRootPartComponent<'date-range'>;
export const DateRangePickerNextYear = /* @__PURE__ */ createPickerMove('year', 1, 'SectileDateRangePickerNextYear') as unknown as PickerRootPartComponent<'date-range'>;
export const DateRangePickerWeekViewTrigger = /* @__PURE__ */ createPickerViewTrigger('week', 'SectileDateRangePickerWeekViewTrigger') as unknown as PickerRootPartComponent<'date-range'>;
export const DateRangePickerMonthViewTrigger = /* @__PURE__ */ createPickerViewTrigger('month', 'SectileDateRangePickerMonthViewTrigger') as unknown as PickerRootPartComponent<'date-range'>;
export const DateRangePickerYearViewTrigger = /* @__PURE__ */ createPickerViewTrigger('year', 'SectileDateRangePickerYearViewTrigger') as unknown as PickerRootPartComponent<'date-range'>;
export type { DateRange, DateValue, PickerCellSlotProps as DateRangePickerCellSlotProps, PickerMonthCellSlotProps as DateRangePickerMonthCellSlotProps, PickerPartProps as DateRangePickerPartProps, PickerPortalProps as DateRangePickerPortalProps };
