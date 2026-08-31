import { createMonthPicker } from '@sectile/dom/temporal/month-picker';
import { formatDateValue, type DateValue } from '@sectile/dom/temporal/date-field';
import { definePickerFamilyCapability, type PickerCapabilityGranularity } from './picker-capability.js';

export const monthPickerCapability = definePickerFamilyCapability({
  kind: 'date' as const,
  connect: (options) => createMonthPicker(options as never),
  formatInput: (granularity, _part, value) => formatPeriod(value as DateValue, granularity),
});

function formatPeriod(value: DateValue, granularity: PickerCapabilityGranularity): string {
  return granularity === 'year' ? String(value.year) : granularity === 'month'
    ? `${String(value.year).padStart(4, '0')}-${String(value.month).padStart(2, '0')}` : formatDateValue(value);
}
