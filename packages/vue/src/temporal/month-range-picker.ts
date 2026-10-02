import type { DateRangePickerOptions } from '@sectile/dom/temporal/date-range-picker';
import type { DateRange, DateValue } from '@sectile/dom/temporal/date-field';
import {
  PickerAnchor, PickerContent, PickerGrid, PickerPortal, PickerTrigger, createPickerInput, createPickerMonthCell, createPickerMove, type PickerRootPartComponent,
  createPickerRoot, type PickerMonthCellSlotProps, type PickerPartProps, type PickerPortalProps, type PickerPositionProps, type PickerRootSlotProps,
} from './picker.js';
import { monthRangePickerCapability } from './capabilities/month-range-picker.js';

export interface MonthRangePickerRootProps extends PickerPartProps, PickerPositionProps {
  readonly modelValue?: DateRange | null;
  readonly defaultValue?: DateRange | null;
  readonly highlightedValue?: DateValue;
  readonly defaultHighlightedValue?: DateValue; readonly referenceDate?: DateValue;
  readonly open?: boolean;
  readonly defaultOpen?: boolean;
  readonly defaultView?: PickerRootSlotProps['viewMode'];
  readonly disabled?: boolean;
  readonly?: boolean;
  readonly required?: boolean;
  readonly label?: string;
  readonly policies?: DateRangePickerOptions['policies'];
}

export const MonthRangePickerRoot = /* @__PURE__ */ createPickerRoot(monthRangePickerCapability, 'SectileMonthRangePickerRoot', { scope: 'month-range-picker', granularity: 'month', defaultView: 'year' });
export type MonthRangePickerRootSlotProps = PickerRootSlotProps<DateRange | null>;
export type MonthRangePickerValueChangeHandler = NonNullable<InstanceType<typeof MonthRangePickerRoot>['$props']['onUpdate:modelValue']>;
export type MonthRangePickerOpenChangeHandler = NonNullable<InstanceType<typeof MonthRangePickerRoot>['$props']['onUpdate:open']>;
export type MonthRangePickerHighlightedValueChangeHandler = NonNullable<InstanceType<typeof MonthRangePickerRoot>['$props']['onUpdate:highlightedValue']>;
export const MonthRangePickerTrigger = PickerTrigger as unknown as PickerRootPartComponent<'date-range'>;
export const MonthRangePickerAnchor = PickerAnchor as unknown as PickerRootPartComponent<'date-range'>;
export const MonthRangePickerPortal = PickerPortal;
export const MonthRangePickerContent = PickerContent as unknown as PickerRootPartComponent<'date-range'>;
export const MonthRangePickerGrid = PickerGrid as unknown as PickerRootPartComponent<'date-range'>;
export const MonthRangePickerCell = /* @__PURE__ */ createPickerMonthCell('cell', 'SectileMonthRangePickerCell');
export const MonthRangePickerStartInput = /* @__PURE__ */ createPickerInput('start-input', 'SectileMonthRangePickerStartInput');
export const MonthRangePickerEndInput = /* @__PURE__ */ createPickerInput('end-input', 'SectileMonthRangePickerEndInput');
export const MonthRangePickerPreviousYear = /* @__PURE__ */ createPickerMove('year', -1, 'SectileMonthRangePickerPreviousYear') as unknown as PickerRootPartComponent<'date-range'>;
export const MonthRangePickerNextYear = /* @__PURE__ */ createPickerMove('year', 1, 'SectileMonthRangePickerNextYear') as unknown as PickerRootPartComponent<'date-range'>;

export type { MonthRangePickerValue } from '@sectile/temporal/month-range-picker';
export type { MonthPickerValue } from '@sectile/temporal/month-picker';
export type {
  PickerMonthCellSlotProps as MonthRangePickerCellSlotProps,
  PickerPartProps as MonthRangePickerPartProps,
  PickerPortalProps as MonthRangePickerPortalProps,
};
