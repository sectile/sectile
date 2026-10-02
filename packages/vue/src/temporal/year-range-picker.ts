import type { DateRangePickerOptions } from '@sectile/dom/temporal/date-range-picker';
import type { DateRange, DateValue } from '@sectile/dom/temporal/date-field';
import {
  PickerAnchor, PickerContent, PickerGrid, PickerPortal, PickerTrigger, createPickerInput, createPickerMove, createPickerYearCell, type PickerRootPartComponent,
  createPickerRoot, type PickerPartProps, type PickerPortalProps, type PickerPositionProps, type PickerRootSlotProps, type PickerYearCellSlotProps,
} from './picker.js';
import { yearRangePickerCapability } from './capabilities/year-range-picker.js';

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

export const YearRangePickerRoot = /* @__PURE__ */ createPickerRoot(yearRangePickerCapability, 'SectileYearRangePickerRoot', { scope: 'year-range-picker', granularity: 'year', defaultView: 'year' });
export type YearRangePickerRootSlotProps = PickerRootSlotProps<DateRange | null>;
export type YearRangePickerValueChangeHandler = NonNullable<InstanceType<typeof YearRangePickerRoot>['$props']['onUpdate:modelValue']>;
export type YearRangePickerOpenChangeHandler = NonNullable<InstanceType<typeof YearRangePickerRoot>['$props']['onUpdate:open']>;
export type YearRangePickerHighlightedValueChangeHandler = NonNullable<InstanceType<typeof YearRangePickerRoot>['$props']['onUpdate:highlightedValue']>;
export const YearRangePickerTrigger = PickerTrigger as unknown as PickerRootPartComponent<'date-range'>;
export const YearRangePickerAnchor = PickerAnchor as unknown as PickerRootPartComponent<'date-range'>;
export const YearRangePickerPortal = PickerPortal;
export const YearRangePickerContent = PickerContent as unknown as PickerRootPartComponent<'date-range'>;
export const YearRangePickerGrid = PickerGrid as unknown as PickerRootPartComponent<'date-range'>;
export const YearRangePickerCell = /* @__PURE__ */ createPickerYearCell('cell', 'SectileYearRangePickerCell');
export const YearRangePickerStartInput = /* @__PURE__ */ createPickerInput('start-input', 'SectileYearRangePickerStartInput');
export const YearRangePickerEndInput = /* @__PURE__ */ createPickerInput('end-input', 'SectileYearRangePickerEndInput');
export const YearRangePickerPreviousPage = /* @__PURE__ */ createPickerMove('year', -1, 'SectileYearRangePickerPreviousPage', 'previous-page') as unknown as PickerRootPartComponent<'date-range'>;
export const YearRangePickerNextPage = /* @__PURE__ */ createPickerMove('year', 1, 'SectileYearRangePickerNextPage', 'next-page') as unknown as PickerRootPartComponent<'date-range'>;

export type { YearRangePickerValue } from '@sectile/temporal/year-range-picker';
export type { YearPickerValue } from '@sectile/temporal/year-picker';
export type {
  PickerPartProps as YearRangePickerPartProps,
  PickerPortalProps as YearRangePickerPortalProps,
  PickerYearCellSlotProps as YearRangePickerCellSlotProps,
};
