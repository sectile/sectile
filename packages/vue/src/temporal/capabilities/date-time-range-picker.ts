import { createDateTimeRangePicker } from '@sectile/dom/temporal/date-time-range-picker';
import { formatDateValue, getDateFieldPlaceholder } from '@sectile/dom/temporal/date-field';
import { formatDateTimeValue, type DateTimeRange } from '@sectile/dom/temporal/date-time-field';
import { formatTimeValue, getTimeFieldPlaceholder } from '@sectile/dom/temporal/time-field';
import { formatDateFieldValue } from '@sectile/temporal/date-field';
import { formatTimeFieldValue } from '@sectile/temporal/time-field';
import { unwrap } from '@sectile/core/result';
import { createDateTimeRangePickerState } from '@sectile/temporal/date-time-range-picker';
import { definePickerFamilyCapability } from '../capability.js';

export const dateTimeRangePickerCapability = definePickerFamilyCapability({
  kind: 'date-time-range' as const,
  connect: (options) => createDateTimeRangePicker(options as never),
  presentation: formatter => {
    const dateFormat = formatter === undefined ? undefined : unwrap(formatter.dateFieldFormat());
    const timeFormat = formatter === undefined ? undefined : unwrap(formatter.timeFieldFormat('millisecond'));
    const date = { placeholder: getDateFieldPlaceholder(dateFormat), inputmode: 'numeric' as const };
    const time = { placeholder: getTimeFieldPlaceholder(timeFormat), inputmode: timeFormat?.dayPeriods === undefined ? 'numeric' as const : 'text' as const };
    return { options: { dateFormat, timeFormat }, attributes: { 'start-date-input': date, 'end-date-input': date, 'start-time-input': time, 'end-time-input': time },
      formatInput: (part, value) => {
        const endpoint = part.startsWith('start') ? (value as DateTimeRange).start : (value as DateTimeRange).end;
        return part === 'start-time-input' || part === 'end-time-input' ? timeFormat === undefined ? undefined : formatTimeFieldValue(endpoint.time, timeFormat)
          : part === 'start-date-input' || part === 'end-date-input' ? dateFormat === undefined ? undefined : formatDateFieldValue(endpoint.date, dateFormat) : undefined;
      } };
  },
  initialInputValues: (referenceDate, _policies, formatter) => {
    const state = createDateTimeRangePickerState({ referenceDate });
    const format = formatter === undefined ? undefined : unwrap(formatter.timeFieldFormat('millisecond'));
    return Object.freeze({ 'start-time-input': formatTimeFieldValue(state.startTime, format), 'end-time-input': formatTimeFieldValue(state.endTime, format) });
  },
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
