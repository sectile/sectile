import type { DateTimePickerOptions } from '@sectile/dom/temporal/date-time-picker';
import type { DateValue } from '@sectile/dom/temporal/date-field';
import type { DateTimeValue } from '@sectile/dom/temporal/date-time-field';
import {
  PickerAnchor, PickerCell, PickerContent, PickerGrid, PickerMonthCell, PickerPortal, PickerTrigger, createPickerInput, createPickerMove, createPickerViewTrigger, specializePickerRootPart,
  createPickerRoot, type PickerCellSlotProps, type PickerMonthCellSlotProps, type PickerPartProps, type PickerPortalProps, type PickerPositionProps, type PickerRootSlotProps,
} from './internal/date-picker.js';
import { dateTimePickerCapability } from './internal/date-time-picker-capability.js';

export interface DateTimePickerRootProps extends PickerPartProps, PickerPositionProps {
  readonly modelValue?: DateTimeValue | null; readonly defaultValue?: DateTimeValue | null;
  readonly highlightedValue?: DateValue; readonly defaultHighlightedValue?: DateValue; readonly referenceDate?: DateValue;
  readonly defaultView?: PickerRootSlotProps['viewMode'];
  readonly open?: boolean; readonly defaultOpen?: boolean; readonly disabled?: boolean; readonly?: boolean;
  readonly required?: boolean; readonly label?: string; readonly policies?: DateTimePickerOptions['policies'];
}
export const DateTimePickerRoot = createPickerRoot(dateTimePickerCapability, 'SectileDateTimePickerRoot');
export type DateTimePickerRootSlotProps = PickerRootSlotProps<DateTimeValue | null>;
export type DateTimePickerValueChangeHandler = NonNullable<InstanceType<typeof DateTimePickerRoot>['$props']['onUpdate:modelValue']>;
export type DateTimePickerOpenChangeHandler = NonNullable<InstanceType<typeof DateTimePickerRoot>['$props']['onUpdate:open']>;
export type DateTimePickerHighlightedValueChangeHandler = NonNullable<InstanceType<typeof DateTimePickerRoot>['$props']['onUpdate:highlightedValue']>;
export const DateTimePickerTrigger = specializePickerRootPart('date-time', PickerTrigger);
export const DateTimePickerAnchor = specializePickerRootPart('date-time', PickerAnchor);
export const DateTimePickerPortal = PickerPortal;
export const DateTimePickerContent = /* @__PURE__ */ specializePickerRootPart('date-time', PickerContent);
export const DateTimePickerGrid = specializePickerRootPart('date-time', PickerGrid);
export const DateTimePickerCell = PickerCell;
export const DateTimePickerMonthCell = PickerMonthCell;
export const DateTimePickerDateTimeInput = createPickerInput('date-time-input', 'SectileDateTimePickerDateTimeInput');
export const DateTimePickerDateInput = createPickerInput('date-input', 'SectileDateTimePickerDateInput');
export const DateTimePickerTimeInput = createPickerInput('time-input', 'SectileDateTimePickerTimeInput');
export const DateTimePickerPreviousWeek = specializePickerRootPart('date-time', createPickerMove('week', -1, 'SectileDateTimePickerPreviousWeek'));
export const DateTimePickerNextWeek = specializePickerRootPart('date-time', createPickerMove('week', 1, 'SectileDateTimePickerNextWeek'));
export const DateTimePickerPreviousMonth = specializePickerRootPart('date-time', createPickerMove('month', -1, 'SectileDateTimePickerPreviousMonth'));
export const DateTimePickerNextMonth = specializePickerRootPart('date-time', createPickerMove('month', 1, 'SectileDateTimePickerNextMonth'));
export const DateTimePickerPreviousYear = specializePickerRootPart('date-time', createPickerMove('year', -1, 'SectileDateTimePickerPreviousYear'));
export const DateTimePickerNextYear = specializePickerRootPart('date-time', createPickerMove('year', 1, 'SectileDateTimePickerNextYear'));
export const DateTimePickerWeekViewTrigger = specializePickerRootPart('date-time', createPickerViewTrigger('week', 'SectileDateTimePickerWeekViewTrigger'));
export const DateTimePickerMonthViewTrigger = specializePickerRootPart('date-time', createPickerViewTrigger('month', 'SectileDateTimePickerMonthViewTrigger'));
export const DateTimePickerYearViewTrigger = specializePickerRootPart('date-time', createPickerViewTrigger('year', 'SectileDateTimePickerYearViewTrigger'));
export type { DateTimeValue, DateValue, PickerCellSlotProps as DateTimePickerCellSlotProps, PickerMonthCellSlotProps as DateTimePickerMonthCellSlotProps, PickerPartProps as DateTimePickerPartProps, PickerPortalProps as DateTimePickerPortalProps };
