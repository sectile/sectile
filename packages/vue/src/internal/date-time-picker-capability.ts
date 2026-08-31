import { createDateTimePicker } from '@sectile/dom/temporal/date-time-picker';
import { formatDateValue } from '@sectile/dom/temporal/date-field';
import { formatDateTimeValue, type DateTimeValue } from '@sectile/dom/temporal/date-time-field';
import { formatTimeValue } from '@sectile/dom/temporal/time-field';
import { definePickerFamilyCapability } from './picker-capability.js';

export const dateTimePickerCapability = definePickerFamilyCapability({
  kind: 'date-time' as const,
  connect: (options) => createDateTimePicker(options as never),
  formatInput: (_granularity, part, value) => {
    const dateTime = value as DateTimeValue;
    return part === 'time-input'
      ? formatTimeValue(dateTime.time)
      : part === 'date-input'
        ? formatDateValue(dateTime.date)
        : formatDateTimeValue(dateTime);
  },
});
