import type { DatePickerOptions } from '@sectile/dom/temporal';
import type { DateValue } from '@sectile/dom/temporal';
import {
  PickerAnchor, PickerContent, PickerGrid, PickerPortal, PickerTrigger, createPickerInput, createPickerMonthCell, createPickerMove, specializePickerRootPart,
  createPickerRoot, type PickerMonthCellSlotProps, type PickerPartProps, type PickerPortalProps, type PickerPositionProps, type PickerRootSlotProps,
} from './internal/date-picker.js';

export interface MonthPickerRootProps extends PickerPartProps, PickerPositionProps {
  readonly modelValue?: DateValue | null;
  readonly defaultValue?: DateValue | null;
  readonly highlightedValue?: DateValue;
  readonly defaultHighlightedValue?: DateValue; readonly referenceDate?: DateValue;
  readonly open?: boolean;
  readonly defaultOpen?: boolean;
  readonly defaultView?: PickerRootSlotProps['viewMode'];
  readonly disabled?: boolean;
  readonly?: boolean;
  readonly required?: boolean;
  readonly label?: string;
  readonly policies?: DatePickerOptions['policies'];
}

export const MonthPickerRoot = createPickerRoot('date', 'SectileMonthPickerRoot', { scope: 'month-picker', granularity: 'month', defaultView: 'year' });
export type MonthPickerRootSlotProps = PickerRootSlotProps<DateValue | null>;
export type MonthPickerValueChangeHandler = NonNullable<InstanceType<typeof MonthPickerRoot>['$props']['onUpdate:modelValue']>;
export type MonthPickerOpenChangeHandler = NonNullable<InstanceType<typeof MonthPickerRoot>['$props']['onUpdate:open']>;
export type MonthPickerHighlightedValueChangeHandler = NonNullable<InstanceType<typeof MonthPickerRoot>['$props']['onUpdate:highlightedValue']>;
export type MonthPickerPositionChangeHandler = NonNullable<InstanceType<typeof MonthPickerRoot>['$props']['onPositionChange']>;
export const MonthPickerTrigger = specializePickerRootPart('date', PickerTrigger);
export const MonthPickerAnchor = specializePickerRootPart('date', PickerAnchor);
export const MonthPickerPortal = PickerPortal;
export const MonthPickerContent = specializePickerRootPart('date', PickerContent);
export const MonthPickerGrid = specializePickerRootPart('date', PickerGrid);
export const MonthPickerCell = createPickerMonthCell('cell', 'SectileMonthPickerCell');
export const MonthPickerInput = createPickerInput('input', 'SectileMonthPickerInput');
export const MonthPickerPreviousYear = specializePickerRootPart('date', createPickerMove('year', -1, 'SectileMonthPickerPreviousYear'));
export const MonthPickerNextYear = specializePickerRootPart('date', createPickerMove('year', 1, 'SectileMonthPickerNextYear'));

export type {
  DateValue as MonthPickerValue,
  PickerMonthCellSlotProps as MonthPickerCellSlotProps,
  PickerPartProps as MonthPickerPartProps,
  PickerPortalProps as MonthPickerPortalProps,
};
