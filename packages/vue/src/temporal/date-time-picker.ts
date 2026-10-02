import type { DateTimePickerOptions } from '@sectile/dom/temporal/date-time-picker';
import type { DateValue } from '@sectile/dom/temporal/date-field';
import type { DateTimeValue } from '@sectile/dom/temporal/date-time-field';
import {
  PickerAnchor, PickerCell, PickerContent, PickerGrid, PickerMonthCell, PickerPortal, PickerTrigger, createPickerInput, createPickerMove, createPickerViewTrigger, type PickerRootPartComponent,
  createPickerRoot, type PickerCellSlotProps, type PickerMonthCellSlotProps, type PickerPartProps, type PickerPortalProps, type PickerPositionProps, type PickerRootSlotProps,
} from './picker.js';
import { dateTimePickerCapability } from './capabilities/date-time-picker.js';

export interface DateTimePickerRootProps extends PickerPartProps, PickerPositionProps {
  readonly modelValue?: DateTimeValue | null; readonly defaultValue?: DateTimeValue | null;
  readonly highlightedValue?: DateValue; readonly defaultHighlightedValue?: DateValue; readonly referenceDate?: DateValue;
  readonly defaultView?: PickerRootSlotProps['viewMode'];
  readonly open?: boolean; readonly defaultOpen?: boolean; readonly disabled?: boolean; readonly?: boolean;
  readonly required?: boolean; readonly label?: string; readonly policies?: DateTimePickerOptions['policies'];
}
export const DateTimePickerRoot = /* @__PURE__ */ createPickerRoot(dateTimePickerCapability, 'SectileDateTimePickerRoot');
export type DateTimePickerRootSlotProps = PickerRootSlotProps<DateTimeValue | null>;
export type DateTimePickerValueChangeHandler = NonNullable<InstanceType<typeof DateTimePickerRoot>['$props']['onUpdate:modelValue']>;
export type DateTimePickerOpenChangeHandler = NonNullable<InstanceType<typeof DateTimePickerRoot>['$props']['onUpdate:open']>;
export type DateTimePickerHighlightedValueChangeHandler = NonNullable<InstanceType<typeof DateTimePickerRoot>['$props']['onUpdate:highlightedValue']>;
export const DateTimePickerTrigger = PickerTrigger as unknown as PickerRootPartComponent<'date-time'>;
export const DateTimePickerAnchor = PickerAnchor as unknown as PickerRootPartComponent<'date-time'>;
export const DateTimePickerPortal = PickerPortal;
export const DateTimePickerContent = PickerContent as unknown as PickerRootPartComponent<'date-time'>;
export const DateTimePickerGrid = PickerGrid as unknown as PickerRootPartComponent<'date-time'>;
export const DateTimePickerCell = PickerCell;
export const DateTimePickerMonthCell = PickerMonthCell;
export const DateTimePickerDateTimeInput = /* @__PURE__ */ createPickerInput('date-time-input', 'SectileDateTimePickerDateTimeInput');
export const DateTimePickerDateInput = /* @__PURE__ */ createPickerInput('date-input', 'SectileDateTimePickerDateInput');
export const DateTimePickerTimeInput = /* @__PURE__ */ createPickerInput('time-input', 'SectileDateTimePickerTimeInput');
export const DateTimePickerPreviousWeek = /* @__PURE__ */ createPickerMove('week', -1, 'SectileDateTimePickerPreviousWeek') as unknown as PickerRootPartComponent<'date-time'>;
export const DateTimePickerNextWeek = /* @__PURE__ */ createPickerMove('week', 1, 'SectileDateTimePickerNextWeek') as unknown as PickerRootPartComponent<'date-time'>;
export const DateTimePickerPreviousMonth = /* @__PURE__ */ createPickerMove('month', -1, 'SectileDateTimePickerPreviousMonth') as unknown as PickerRootPartComponent<'date-time'>;
export const DateTimePickerNextMonth = /* @__PURE__ */ createPickerMove('month', 1, 'SectileDateTimePickerNextMonth') as unknown as PickerRootPartComponent<'date-time'>;
export const DateTimePickerPreviousYear = /* @__PURE__ */ createPickerMove('year', -1, 'SectileDateTimePickerPreviousYear') as unknown as PickerRootPartComponent<'date-time'>;
export const DateTimePickerNextYear = /* @__PURE__ */ createPickerMove('year', 1, 'SectileDateTimePickerNextYear') as unknown as PickerRootPartComponent<'date-time'>;
export const DateTimePickerWeekViewTrigger = /* @__PURE__ */ createPickerViewTrigger('week', 'SectileDateTimePickerWeekViewTrigger') as unknown as PickerRootPartComponent<'date-time'>;
export const DateTimePickerMonthViewTrigger = /* @__PURE__ */ createPickerViewTrigger('month', 'SectileDateTimePickerMonthViewTrigger') as unknown as PickerRootPartComponent<'date-time'>;
export const DateTimePickerYearViewTrigger = /* @__PURE__ */ createPickerViewTrigger('year', 'SectileDateTimePickerYearViewTrigger') as unknown as PickerRootPartComponent<'date-time'>;
export type { DateTimeValue, DateValue, PickerCellSlotProps as DateTimePickerCellSlotProps, PickerMonthCellSlotProps as DateTimePickerMonthCellSlotProps, PickerPartProps as DateTimePickerPartProps, PickerPortalProps as DateTimePickerPortalProps };
