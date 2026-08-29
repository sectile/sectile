import type { DateRangePickerOptions } from '@sectile/dom/temporal/date-range-picker';
import type { DateRange, DateValue } from '@sectile/dom/temporal/date-field';
import {
  PickerAnchor, PickerContent, PickerGrid, PickerPortal, PickerTrigger, createPickerInput, createPickerMove, createPickerYearCell, specializePickerRootPart,
  createPickerRoot, type PickerPartProps, type PickerPortalProps, type PickerPositionProps, type PickerRootSlotProps, type PickerYearCellSlotProps,
} from './internal/date-picker.js';

export interface YearRangePickerRootProps extends PickerPartProps, PickerPositionProps {
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

export const YearRangePickerRoot = createPickerRoot('date-range', 'SectileYearRangePickerRoot', { scope: 'year-range-picker', granularity: 'year', defaultView: 'year' });
export type YearRangePickerRootSlotProps = PickerRootSlotProps<DateRange | null>;
export type YearRangePickerValueChangeHandler = NonNullable<InstanceType<typeof YearRangePickerRoot>['$props']['onUpdate:modelValue']>;
export type YearRangePickerOpenChangeHandler = NonNullable<InstanceType<typeof YearRangePickerRoot>['$props']['onUpdate:open']>;
export type YearRangePickerHighlightedValueChangeHandler = NonNullable<InstanceType<typeof YearRangePickerRoot>['$props']['onUpdate:highlightedValue']>;
export const YearRangePickerTrigger = specializePickerRootPart('date-range', PickerTrigger);
export const YearRangePickerAnchor = specializePickerRootPart('date-range', PickerAnchor);
export const YearRangePickerPortal = PickerPortal;
export const YearRangePickerContent = specializePickerRootPart('date-range', PickerContent);
export const YearRangePickerGrid = specializePickerRootPart('date-range', PickerGrid);
export const YearRangePickerCell = createPickerYearCell('cell', 'SectileYearRangePickerCell');
export const YearRangePickerStartInput = createPickerInput('start-input', 'SectileYearRangePickerStartInput');
export const YearRangePickerEndInput = createPickerInput('end-input', 'SectileYearRangePickerEndInput');
export const YearRangePickerPreviousPage = specializePickerRootPart('date-range', createPickerMove('year', -1, 'SectileYearRangePickerPreviousPage', 'previous-page'));
export const YearRangePickerNextPage = specializePickerRootPart('date-range', createPickerMove('year', 1, 'SectileYearRangePickerNextPage', 'next-page'));

export type {
  DateRange as YearRangePickerValue,
  DateValue as YearPickerValue,
  PickerPartProps as YearRangePickerPartProps,
  PickerPortalProps as YearRangePickerPortalProps,
  PickerYearCellSlotProps as YearRangePickerCellSlotProps,
};
