import type { DatePickerOptions } from '@sectile/dom/temporal/date-picker';
import type { DateValue } from '@sectile/dom/temporal/date-field';
import {
  PickerAnchor, PickerContent, PickerGrid, PickerPortal, PickerTrigger, createPickerInput, createPickerMove, createPickerYearCell, type PickerRootPartComponent,
  createPickerRoot, type PickerPartProps, type PickerPortalProps, type PickerPositionProps, type PickerRootSlotProps, type PickerYearCellSlotProps,
} from './picker.js';
import { yearPickerCapability } from './capabilities/year-picker.js';

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

export const YearPickerRoot = /* @__PURE__ */ createPickerRoot(yearPickerCapability, 'SectileYearPickerRoot', { scope: 'year-picker', granularity: 'year', defaultView: 'year' });
export type YearPickerRootSlotProps = PickerRootSlotProps<DateValue | null>;
export type YearPickerValueChangeHandler = NonNullable<InstanceType<typeof YearPickerRoot>['$props']['onUpdate:modelValue']>;
export type YearPickerOpenChangeHandler = NonNullable<InstanceType<typeof YearPickerRoot>['$props']['onUpdate:open']>;
export type YearPickerHighlightedValueChangeHandler = NonNullable<InstanceType<typeof YearPickerRoot>['$props']['onUpdate:highlightedValue']>;
export const YearPickerTrigger = PickerTrigger as unknown as PickerRootPartComponent<'date'>;
export const YearPickerAnchor = PickerAnchor as unknown as PickerRootPartComponent<'date'>;
export const YearPickerPortal = PickerPortal;
export const YearPickerContent = PickerContent as unknown as PickerRootPartComponent<'date'>;
export const YearPickerGrid = PickerGrid as unknown as PickerRootPartComponent<'date'>;
export const YearPickerCell = /* @__PURE__ */ createPickerYearCell('cell', 'SectileYearPickerCell');
export const YearPickerInput = /* @__PURE__ */ createPickerInput('input', 'SectileYearPickerInput');
export const YearPickerPreviousPage = /* @__PURE__ */ createPickerMove('year', -1, 'SectileYearPickerPreviousPage', 'previous-page') as unknown as PickerRootPartComponent<'date'>;
export const YearPickerNextPage = /* @__PURE__ */ createPickerMove('year', 1, 'SectileYearPickerNextPage', 'next-page') as unknown as PickerRootPartComponent<'date'>;

export type { YearPickerValue } from '@sectile/temporal/year-picker';
export type {
  PickerPartProps as YearPickerPartProps,
  PickerPortalProps as YearPickerPortalProps,
  PickerYearCellSlotProps as YearPickerCellSlotProps,
};
