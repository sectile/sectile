import { createRangeCalendar } from '@sectile/dom/temporal/range-calendar';
import { formatDateValue, type DateRange } from '@sectile/dom/temporal/date-field';
import { definePickerFamilyCapability } from './picker-capability.js';

export const rangeCalendarCapability = definePickerFamilyCapability({
  kind: 'date-range' as const,
  connect: (options) => createRangeCalendar(options as never),
  formatInput: (_granularity, part, value) => {
    const range = value as DateRange;
    return formatDateValue(part.startsWith('start') ? range.start : range.end);
  },
});
