import { createDatePicker } from '@sectile/dom/temporal/date-picker';
import { formatDateValue, getDateFieldPlaceholder, type DateValue } from '@sectile/dom/temporal/date-field';
import { formatDateFieldValue } from '@sectile/temporal/date-field';
import { unwrap } from '@sectile/core/result';
import { definePickerFamilyCapability, type PickerCapabilityGranularity } from '../capability.js';

export const datePickerCapability = definePickerFamilyCapability({
  kind: 'date' as const,
  connect: (options) => createDatePicker(options as never),
  presentation: formatter => {
    const format = formatter === undefined ? undefined : unwrap(formatter.dateFieldFormat());
    return { options: { format }, attributes: { input: { placeholder: getDateFieldPlaceholder(format), inputmode: 'numeric' } },
      formatInput: (part, value) => part === 'input' && format !== undefined ? formatDateFieldValue(value as DateValue, format) : undefined };
  },
  formatInput: (granularity, _part, value) => formatPeriod(value as DateValue, granularity),
});

function formatPeriod(value: DateValue, granularity: PickerCapabilityGranularity): string {
  return granularity === 'year'
    ? String(value.year)
    : granularity === 'month'
      ? `${String(value.year).padStart(4, '0')}-${String(value.month).padStart(2, '0')}`
      : formatDateValue(value);
}
