import type { DatePickerOptions } from '@sectile/dom/temporal/date-picker';
import type { DateValue } from '@sectile/dom/temporal/date-field';
import {
  PickerAnchor, PickerContent, PickerGrid, PickerPortal, PickerTrigger, createPickerInput, createPickerMonthCell, createPickerMove, type PickerRootPartComponent,
  createPickerRoot, type PickerMonthCellSlotProps, type PickerPartProps, type PickerPortalProps, type PickerPositionProps, type PickerRootSlotProps,
} from './picker.js';
import { monthPickerCapability } from './capabilities/month-picker.js';

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

export const MonthPickerRoot = /* @__PURE__ */ createPickerRoot(monthPickerCapability, 'SectileMonthPickerRoot', { scope: 'month-picker', granularity: 'month', defaultView: 'year' });
export type MonthPickerRootSlotProps = PickerRootSlotProps<DateValue | null>;
export type MonthPickerValueChangeHandler = NonNullable<InstanceType<typeof MonthPickerRoot>['$props']['onUpdate:modelValue']>;
export type MonthPickerOpenChangeHandler = NonNullable<InstanceType<typeof MonthPickerRoot>['$props']['onUpdate:open']>;
export type MonthPickerHighlightedValueChangeHandler = NonNullable<InstanceType<typeof MonthPickerRoot>['$props']['onUpdate:highlightedValue']>;
export const MonthPickerTrigger = PickerTrigger as unknown as PickerRootPartComponent<'date'>;
export const MonthPickerAnchor = PickerAnchor as unknown as PickerRootPartComponent<'date'>;
export const MonthPickerPortal = PickerPortal;
export const MonthPickerContent = PickerContent as unknown as PickerRootPartComponent<'date'>;
export const MonthPickerGrid = PickerGrid as unknown as PickerRootPartComponent<'date'>;
export const MonthPickerCell = /* @__PURE__ */ createPickerMonthCell('cell', 'SectileMonthPickerCell');
export const MonthPickerInput = /* @__PURE__ */ createPickerInput('input', 'SectileMonthPickerInput');
export const MonthPickerPreviousYear = /* @__PURE__ */ createPickerMove('year', -1, 'SectileMonthPickerPreviousYear') as unknown as PickerRootPartComponent<'date'>;
export const MonthPickerNextYear = /* @__PURE__ */ createPickerMove('year', 1, 'SectileMonthPickerNextYear') as unknown as PickerRootPartComponent<'date'>;

export type { MonthPickerValue } from '@sectile/temporal/month-picker';
export type {
  PickerMonthCellSlotProps as MonthPickerCellSlotProps,
  PickerPartProps as MonthPickerPartProps,
  PickerPortalProps as MonthPickerPortalProps,
};
