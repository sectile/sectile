import type { DatePickerOptions } from '@sectile/dom/temporal/date-picker';
import type { DateValue } from '@sectile/dom/temporal/date-field';
import {
  PickerAnchor, PickerCell, PickerContent, PickerGrid, PickerMonthCell, PickerPortal, PickerTrigger, createPickerInput, createPickerMove, createPickerViewTrigger, specializePickerRootPart,
  createPickerRoot, type PickerCellSlotProps, type PickerMonthCellSlotProps, type PickerPartProps, type PickerPortalProps, type PickerPositionProps, type PickerRootSlotProps,
} from './internal/date-picker.js';
import { datePickerCapability } from './internal/date-picker-capability.js';

export interface DatePickerRootProps extends PickerPartProps, PickerPositionProps {
  readonly modelValue?: DateValue | null; readonly defaultValue?: DateValue | null;
  readonly highlightedValue?: DateValue; readonly defaultHighlightedValue?: DateValue; readonly referenceDate?: DateValue;
  readonly defaultView?: PickerRootSlotProps['viewMode'];
  readonly open?: boolean; readonly defaultOpen?: boolean; readonly disabled?: boolean; readonly?: boolean;
  readonly required?: boolean; readonly label?: string; readonly policies?: DatePickerOptions['policies'];
}
export const DatePickerRoot = createPickerRoot(datePickerCapability, 'SectileDatePickerRoot');
export type DatePickerRootSlotProps = PickerRootSlotProps<DateValue | null>;
export type DatePickerValueChangeHandler = NonNullable<InstanceType<typeof DatePickerRoot>['$props']['onUpdate:modelValue']>;
export type DatePickerOpenChangeHandler = NonNullable<InstanceType<typeof DatePickerRoot>['$props']['onUpdate:open']>;
export type DatePickerHighlightedValueChangeHandler = NonNullable<InstanceType<typeof DatePickerRoot>['$props']['onUpdate:highlightedValue']>;
export const DatePickerTrigger = specializePickerRootPart('date', PickerTrigger);
export const DatePickerAnchor = specializePickerRootPart('date', PickerAnchor);
export const DatePickerPortal = PickerPortal;
export const DatePickerContent = specializePickerRootPart('date', PickerContent);
export const DatePickerGrid = specializePickerRootPart('date', PickerGrid);
export const DatePickerCell = PickerCell;
export const DatePickerMonthCell = PickerMonthCell;
export const DatePickerInput = createPickerInput('input', 'SectileDatePickerInput');
export const DatePickerPreviousWeek = specializePickerRootPart('date', createPickerMove('week', -1, 'SectileDatePickerPreviousWeek'));
export const DatePickerNextWeek = specializePickerRootPart('date', createPickerMove('week', 1, 'SectileDatePickerNextWeek'));
export const DatePickerPreviousMonth = specializePickerRootPart('date', createPickerMove('month', -1, 'SectileDatePickerPreviousMonth'));
export const DatePickerNextMonth = specializePickerRootPart('date', createPickerMove('month', 1, 'SectileDatePickerNextMonth'));
export const DatePickerPreviousYear = specializePickerRootPart('date', createPickerMove('year', -1, 'SectileDatePickerPreviousYear'));
export const DatePickerNextYear = specializePickerRootPart('date', createPickerMove('year', 1, 'SectileDatePickerNextYear'));
export const DatePickerWeekViewTrigger = specializePickerRootPart('date', createPickerViewTrigger('week', 'SectileDatePickerWeekViewTrigger'));
export const DatePickerMonthViewTrigger = specializePickerRootPart('date', createPickerViewTrigger('month', 'SectileDatePickerMonthViewTrigger'));
export const DatePickerYearViewTrigger = specializePickerRootPart('date', createPickerViewTrigger('year', 'SectileDatePickerYearViewTrigger'));
export type { DateValue, PickerCellSlotProps as DatePickerCellSlotProps, PickerMonthCellSlotProps as DatePickerMonthCellSlotProps, PickerPartProps as DatePickerPartProps, PickerPortalProps as DatePickerPortalProps };
