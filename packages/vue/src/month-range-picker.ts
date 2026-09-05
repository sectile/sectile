import type { DateRangePickerOptions } from '@sectile/dom/temporal/date-range-picker';
import type { DateRange, DateValue } from '@sectile/dom/temporal/date-field';
import {
  PickerAnchor, PickerContent, PickerGrid, PickerPortal, PickerTrigger, createPickerInput, createPickerMonthCell, createPickerMove, specializePickerRootPart,
  createPickerRoot, type PickerMonthCellSlotProps, type PickerPartProps, type PickerPortalProps, type PickerPositionProps, type PickerRootSlotProps,
} from './internal/date-picker.js';
import { monthRangePickerCapability } from './internal/month-range-picker-capability.js';

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

export const MonthRangePickerRoot = createPickerRoot(monthRangePickerCapability, 'SectileMonthRangePickerRoot', { scope: 'month-range-picker', granularity: 'month', defaultView: 'year' });
export type MonthRangePickerRootSlotProps = PickerRootSlotProps<DateRange | null>;
export type MonthRangePickerValueChangeHandler = NonNullable<InstanceType<typeof MonthRangePickerRoot>['$props']['onUpdate:modelValue']>;
export type MonthRangePickerOpenChangeHandler = NonNullable<InstanceType<typeof MonthRangePickerRoot>['$props']['onUpdate:open']>;
export type MonthRangePickerHighlightedValueChangeHandler = NonNullable<InstanceType<typeof MonthRangePickerRoot>['$props']['onUpdate:highlightedValue']>;
export const MonthRangePickerTrigger = specializePickerRootPart('date-range', PickerTrigger);
export const MonthRangePickerAnchor = specializePickerRootPart('date-range', PickerAnchor);
export const MonthRangePickerPortal = PickerPortal;
export const MonthRangePickerContent = /* @__PURE__ */ specializePickerRootPart('date-range', PickerContent);
export const MonthRangePickerGrid = specializePickerRootPart('date-range', PickerGrid);
export const MonthRangePickerCell = createPickerMonthCell('cell', 'SectileMonthRangePickerCell');
export const MonthRangePickerStartInput = createPickerInput('start-input', 'SectileMonthRangePickerStartInput');
export const MonthRangePickerEndInput = createPickerInput('end-input', 'SectileMonthRangePickerEndInput');
export const MonthRangePickerPreviousYear = specializePickerRootPart('date-range', createPickerMove('year', -1, 'SectileMonthRangePickerPreviousYear'));
export const MonthRangePickerNextYear = specializePickerRootPart('date-range', createPickerMove('year', 1, 'SectileMonthRangePickerNextYear'));

export type {
  DateRange as MonthRangePickerValue,
  DateValue as MonthPickerValue,
  PickerMonthCellSlotProps as MonthRangePickerCellSlotProps,
  PickerPartProps as MonthRangePickerPartProps,
  PickerPortalProps as MonthRangePickerPortalProps,
};
