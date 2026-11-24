import { createDateRangePicker } from '@sectile/dom/temporal/date-range-picker';
import { formatDateValue, getDateFieldPlaceholder, type DateRange, type DateValue } from '@sectile/dom/temporal/date-field';
import { formatDateFieldValue } from '@sectile/temporal/date-field';
import { definePickerFamilyCapability, type PickerCapabilityGranularity } from '../capability.js';

export const dateRangePickerCapability = definePickerFamilyCapability({
  kind: 'date-range' as const,
  connect: (options) => createDateRangePicker(options as never),
  presentation: (formatter, explicit) => {
    const format = explicit ?? formatter.dateFieldFormat();
    const attributes = { placeholder: getDateFieldPlaceholder(format), inputmode: 'numeric' as const };
    return { options: { format }, attributes: { 'start-input': attributes, 'end-input': attributes },
      formatInput: (part, value) => formatDateFieldValue(part.startsWith('start') ? (value as DateRange).start : (value as DateRange).end, format) };
  },
  formatInput: (granularity, part, value) => {
    const range = value as DateRange;
    return formatPeriod(part.startsWith('start') ? range.start : range.end, granularity);
  },
});

function formatPeriod(value: DateValue, granularity: PickerCapabilityGranularity): string {
  return granularity === 'year'
    ? String(value.year)
    : granularity === 'month'
      ? `${String(value.year).padStart(4, '0')}-${String(value.month).padStart(2, '0')}`
      : formatDateValue(value);
}
