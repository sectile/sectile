import { createCalendar } from '@sectile/dom/temporal/calendar';
import { formatDateValue, type DateValue } from '@sectile/dom/temporal/date-field';
import { definePickerFamilyCapability } from './picker-capability.js';

export const calendarCapability = definePickerFamilyCapability({
  kind: 'calendar' as const,
  connect: (options) => createCalendar(options as never),
  formatInput: (_granularity, _part, value) => formatDateValue(value as DateValue),
});
