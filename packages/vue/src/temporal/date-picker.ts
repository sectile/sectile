import type { DatePickerOptions } from '@sectile/dom/temporal/date-picker';
import type { DateValue } from '@sectile/dom/temporal/date-field';
import {
  PickerAnchor, PickerCell, PickerContent, PickerGrid, PickerMonthCell, PickerPortal, PickerTrigger, createPickerInput, createPickerMove, createPickerViewTrigger, type PickerRootPartComponent,
  createPickerRoot, type PickerCellSlotProps, type PickerMonthCellSlotProps, type PickerPartProps, type PickerPortalProps, type PickerPositionProps, type PickerRootSlotProps,
} from './picker.js';
import { datePickerCapability } from './capabilities/date-picker.js';

export interface DatePickerRootProps extends PickerPartProps, PickerPositionProps {
  readonly modelValue?: DateValue | null; readonly defaultValue?: DateValue | null;
  readonly highlightedValue?: DateValue; readonly defaultHighlightedValue?: DateValue; readonly referenceDate?: DateValue;
  readonly defaultView?: PickerRootSlotProps['viewMode'];
  readonly open?: boolean; readonly defaultOpen?: boolean; readonly disabled?: boolean; readonly?: boolean;
  readonly required?: boolean; readonly label?: string; readonly policies?: DatePickerOptions['policies'];
}
export const DatePickerRoot = /* @__PURE__ */ createPickerRoot(datePickerCapability, 'SectileDatePickerRoot');
export type DatePickerRootSlotProps = PickerRootSlotProps<DateValue | null>;
export type DatePickerValueChangeHandler = NonNullable<InstanceType<typeof DatePickerRoot>['$props']['onUpdate:modelValue']>;
export type DatePickerOpenChangeHandler = NonNullable<InstanceType<typeof DatePickerRoot>['$props']['onUpdate:open']>;
export type DatePickerHighlightedValueChangeHandler = NonNullable<InstanceType<typeof DatePickerRoot>['$props']['onUpdate:highlightedValue']>;
export const DatePickerTrigger = PickerTrigger as unknown as PickerRootPartComponent<'date'>;
export const DatePickerAnchor = PickerAnchor as unknown as PickerRootPartComponent<'date'>;
export const DatePickerPortal = PickerPortal;
export const DatePickerContent = PickerContent as unknown as PickerRootPartComponent<'date'>;
export const DatePickerGrid = PickerGrid as unknown as PickerRootPartComponent<'date'>;
export const DatePickerCell = PickerCell;
export const DatePickerMonthCell = PickerMonthCell;
export const DatePickerInput = /* @__PURE__ */ createPickerInput('input', 'SectileDatePickerInput');
export const DatePickerPreviousWeek = /* @__PURE__ */ createPickerMove('week', -1, 'SectileDatePickerPreviousWeek') as unknown as PickerRootPartComponent<'date'>;
export const DatePickerNextWeek = /* @__PURE__ */ createPickerMove('week', 1, 'SectileDatePickerNextWeek') as unknown as PickerRootPartComponent<'date'>;
export const DatePickerPreviousMonth = /* @__PURE__ */ createPickerMove('month', -1, 'SectileDatePickerPreviousMonth') as unknown as PickerRootPartComponent<'date'>;
export const DatePickerNextMonth = /* @__PURE__ */ createPickerMove('month', 1, 'SectileDatePickerNextMonth') as unknown as PickerRootPartComponent<'date'>;
export const DatePickerPreviousYear = /* @__PURE__ */ createPickerMove('year', -1, 'SectileDatePickerPreviousYear') as unknown as PickerRootPartComponent<'date'>;
export const DatePickerNextYear = /* @__PURE__ */ createPickerMove('year', 1, 'SectileDatePickerNextYear') as unknown as PickerRootPartComponent<'date'>;
export const DatePickerWeekViewTrigger = /* @__PURE__ */ createPickerViewTrigger('week', 'SectileDatePickerWeekViewTrigger') as unknown as PickerRootPartComponent<'date'>;
export const DatePickerMonthViewTrigger = /* @__PURE__ */ createPickerViewTrigger('month', 'SectileDatePickerMonthViewTrigger') as unknown as PickerRootPartComponent<'date'>;
export const DatePickerYearViewTrigger = /* @__PURE__ */ createPickerViewTrigger('year', 'SectileDatePickerYearViewTrigger') as unknown as PickerRootPartComponent<'date'>;
export type { DateValue, PickerCellSlotProps as DatePickerCellSlotProps, PickerMonthCellSlotProps as DatePickerMonthCellSlotProps, PickerPartProps as DatePickerPartProps, PickerPortalProps as DatePickerPortalProps };
