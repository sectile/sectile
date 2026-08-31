import { createDateTimeRangePicker } from '@sectile/dom/temporal/date-time-range-picker';
import { formatDateValue } from '@sectile/dom/temporal/date-field';
import { formatDateTimeValue, type DateTimeRange } from '@sectile/dom/temporal/date-time-field';
import { formatTimeValue } from '@sectile/dom/temporal/time-field';
import { definePickerFamilyCapability } from './picker-capability.js';

export const dateTimeRangePickerCapability = definePickerFamilyCapability({
  kind: 'date-time-range' as const,
  connect: (options) => createDateTimeRangePicker(options as never),
  formatInput: (_granularity, part, value) => {
    const range = value as DateTimeRange;
    const endpoint = part.startsWith('start') ? range.start : range.end;
    return part.endsWith('time-input') && !part.includes('date-time')
      ? formatTimeValue(endpoint.time)
      : part.endsWith('date-input')
        ? formatDateValue(endpoint.date)
        : formatDateTimeValue(endpoint);
  },
});
