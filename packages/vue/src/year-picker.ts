import type { DatePickerOptions } from '@sectile/dom/date-picker';
import type { DateValue } from '@sectile/dom/date-field';
import {
  PickerContent, PickerGrid, PickerPortal, PickerTrigger, createPickerInput, createPickerMove, createPickerYearCell, specializePickerRootPart,
  createPickerRoot, type PickerPartProps, type PickerPortalProps, type PickerPositionProps, type PickerRootSlotProps, type PickerYearCellSlotProps,
} from './internal/date-picker.js';

export interface YearPickerRootProps extends PickerPartProps, PickerPositionProps {
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

export const YearPickerRoot = createPickerRoot('date', 'SectileYearPickerRoot', { scope: 'year-picker', granularity: 'year', defaultView: 'year' });
export type YearPickerRootSlotProps = PickerRootSlotProps<DateValue | null>;
export type YearPickerValueChangeHandler = NonNullable<InstanceType<typeof YearPickerRoot>['$props']['onUpdate:modelValue']>;
export type YearPickerOpenChangeHandler = NonNullable<InstanceType<typeof YearPickerRoot>['$props']['onUpdate:open']>;
export type YearPickerHighlightedValueChangeHandler = NonNullable<InstanceType<typeof YearPickerRoot>['$props']['onUpdate:highlightedValue']>;
export type YearPickerPositionChangeHandler = NonNullable<InstanceType<typeof YearPickerRoot>['$props']['onPositionChange']>;
export const YearPickerTrigger = specializePickerRootPart('date', PickerTrigger);
export const YearPickerPortal = PickerPortal;
export const YearPickerContent = specializePickerRootPart('date', PickerContent);
export const YearPickerGrid = specializePickerRootPart('date', PickerGrid);
export const YearPickerCell = createPickerYearCell('cell', 'SectileYearPickerCell');
export const YearPickerInput = createPickerInput('input', 'SectileYearPickerInput');
export const YearPickerPreviousPage = specializePickerRootPart('date', createPickerMove('year', -1, 'SectileYearPickerPreviousPage', 'previous-page'));
export const YearPickerNextPage = specializePickerRootPart('date', createPickerMove('year', 1, 'SectileYearPickerNextPage', 'next-page'));

export type {
  DateValue as YearPickerValue,
  PickerPartProps as YearPickerPartProps,
  PickerPortalProps as YearPickerPortalProps,
  PickerYearCellSlotProps as YearPickerCellSlotProps,
};
