import { createMonthRangePicker } from '@sectile/dom/temporal/month-range-picker';
import { formatDateValue, type DateRange, type DateValue } from '@sectile/dom/temporal/date-field';
import { definePickerFamilyCapability, type PickerCapabilityGranularity } from './picker-capability.js';

export const monthRangePickerCapability = definePickerFamilyCapability({
  kind: 'date-range' as const,
  connect: (options) => createMonthRangePicker(options as never),
  formatInput: (granularity, part, value) => {
    const range = value as DateRange;
    return formatPeriod(part.startsWith('start') ? range.start : range.end, granularity);
  },
});

function formatPeriod(value: DateValue, granularity: PickerCapabilityGranularity): string {
  return granularity === 'year' ? String(value.year) : granularity === 'month'
    ? `${String(value.year).padStart(4, '0')}-${String(value.month).padStart(2, '0')}` : formatDateValue(value);
}
