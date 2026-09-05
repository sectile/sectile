import type { DateRangePickerOptions } from '@sectile/dom/temporal/date-range-picker';
import type { DateRange, DateValue } from '@sectile/dom/temporal/date-field';
import {
  PickerCell, PickerContent, PickerGrid, createPickerMove, createPickerRoot, specializePickerRootPart,
  type PickerCellSlotProps, type PickerPartProps, type PickerRootSlotProps,
} from './internal/date-picker.js';
import { rangeCalendarCapability } from './internal/range-calendar-capability.js';

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

export const RangeCalendarRoot = createPickerRoot(rangeCalendarCapability, 'SectileRangeCalendarRoot', {
  scope: 'range-calendar',
  defaultOpen: true,
  defaultView: 'month',
  inline: true,
});
export type RangeCalendarRootSlotProps = PickerRootSlotProps<DateRange | null>;
export type RangeCalendarValueChangeHandler = NonNullable<InstanceType<typeof RangeCalendarRoot>['$props']['onUpdate:modelValue']>;
export type RangeCalendarOpenChangeHandler = NonNullable<InstanceType<typeof RangeCalendarRoot>['$props']['onUpdate:open']>;
export type RangeCalendarHighlightedValueChangeHandler = NonNullable<InstanceType<typeof RangeCalendarRoot>['$props']['onUpdate:highlightedValue']>;
export const RangeCalendarContent = /* @__PURE__ */ specializePickerRootPart('date-range', PickerContent);
export const RangeCalendarGrid = specializePickerRootPart('date-range', PickerGrid);
export const RangeCalendarCell = PickerCell;
export const RangeCalendarPreviousMonth = specializePickerRootPart('date-range', createPickerMove('month', -1, 'SectileRangeCalendarPreviousMonth'));
export const RangeCalendarNextMonth = specializePickerRootPart('date-range', createPickerMove('month', 1, 'SectileRangeCalendarNextMonth'));
export const RangeCalendarPreviousYear = specializePickerRootPart('date-range', createPickerMove('year', -1, 'SectileRangeCalendarPreviousYear'));
export const RangeCalendarNextYear = specializePickerRootPart('date-range', createPickerMove('year', 1, 'SectileRangeCalendarNextYear'));

export type {
  DateRange,
  DateValue,
  PickerCellSlotProps as RangeCalendarCellSlotProps,
  PickerPartProps as RangeCalendarPartProps,
};
