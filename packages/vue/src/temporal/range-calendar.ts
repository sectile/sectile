import type { DateRangePickerOptions } from '@sectile/dom/temporal/date-range-picker';
import type { DateRange, DateValue } from '@sectile/dom/temporal/date-field';
import {
  PickerCell, PickerContent, PickerGrid, createPickerMove, createPickerRoot, type PickerRootPartComponent,
  type PickerCellSlotProps, type PickerPartProps, type PickerRootSlotProps,
} from './picker.js';
import { rangeCalendarCapability } from './capabilities/range-calendar.js';

export interface RangeCalendarRootProps extends PickerPartProps {
  readonly modelValue?: DateRange | null;
  readonly defaultValue?: DateRange | null;
  readonly highlightedValue?: DateValue;
  readonly defaultHighlightedValue?: DateValue; readonly referenceDate?: DateValue;
  readonly defaultView?: PickerRootSlotProps['viewMode'];
  readonly open?: boolean;
  readonly defaultOpen?: boolean;
  readonly disabled?: boolean;
  readonly?: boolean;
  readonly required?: boolean;
  readonly label?: string;
  readonly policies?: DateRangePickerOptions['policies'];
}

export const RangeCalendarRoot = /* @__PURE__ */ createPickerRoot(rangeCalendarCapability, 'SectileRangeCalendarRoot', {
  scope: 'range-calendar',
  defaultOpen: true,
  defaultView: 'month',
  inline: true,
});
export type RangeCalendarRootSlotProps = PickerRootSlotProps<DateRange | null>;
export type RangeCalendarValueChangeHandler = NonNullable<InstanceType<typeof RangeCalendarRoot>['$props']['onUpdate:modelValue']>;
export type RangeCalendarOpenChangeHandler = NonNullable<InstanceType<typeof RangeCalendarRoot>['$props']['onUpdate:open']>;
export type RangeCalendarHighlightedValueChangeHandler = NonNullable<InstanceType<typeof RangeCalendarRoot>['$props']['onUpdate:highlightedValue']>;
export const RangeCalendarContent = PickerContent as unknown as PickerRootPartComponent<'date-range'>;
export const RangeCalendarGrid = PickerGrid as unknown as PickerRootPartComponent<'date-range'>;
export const RangeCalendarCell = PickerCell;
export const RangeCalendarPreviousMonth = /* @__PURE__ */ createPickerMove('month', -1, 'SectileRangeCalendarPreviousMonth') as unknown as PickerRootPartComponent<'date-range'>;
export const RangeCalendarNextMonth = /* @__PURE__ */ createPickerMove('month', 1, 'SectileRangeCalendarNextMonth') as unknown as PickerRootPartComponent<'date-range'>;
export const RangeCalendarPreviousYear = /* @__PURE__ */ createPickerMove('year', -1, 'SectileRangeCalendarPreviousYear') as unknown as PickerRootPartComponent<'date-range'>;
export const RangeCalendarNextYear = /* @__PURE__ */ createPickerMove('year', 1, 'SectileRangeCalendarNextYear') as unknown as PickerRootPartComponent<'date-range'>;

export type {
  DateRange,
  DateValue,
  PickerCellSlotProps as RangeCalendarCellSlotProps,
  PickerPartProps as RangeCalendarPartProps,
};
