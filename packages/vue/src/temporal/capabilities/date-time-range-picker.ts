import { createDateTimeRangePicker } from '@sectile/dom/temporal/date-time-range-picker';
import { formatDateValue, getDateFieldPlaceholder } from '@sectile/dom/temporal/date-field';
import { formatDateTimeValue, getDateTimeFieldPlaceholder, type DateTimeRange } from '@sectile/dom/temporal/date-time-field';
import { formatDateTimeFieldValue } from '@sectile/temporal/date-time-field';
import { formatTimeValue, getTimeFieldPlaceholder } from '@sectile/dom/temporal/time-field';
import { formatDateFieldValue } from '@sectile/temporal/date-field';
import { formatTimeFieldValue } from '@sectile/temporal/time-field';
import { unwrap } from '@sectile/core/result';
import { createDateTimeRangePickerState } from '@sectile/temporal/date-time-range-picker';
import { definePickerFamilyCapability } from '../capability.js';
import { admitTimePresentation, resolveDateTimeFormat } from '../internal/time-presentation.js';

export const dateTimeRangePickerCapability = definePickerFamilyCapability({
  kind: 'date-time-range' as const,
  connect: (options) => createDateTimeRangePicker(options as never),
  presentation: (formatter, _date, explicit) => {
    const format = explicit?.format ?? (explicit?.precision === undefined ? undefined : resolveDateTimeFormat(formatter, explicit.precision));
    const dateFormat = format?.date ?? (formatter === undefined ? undefined : unwrap(formatter.dateFieldFormat()));
    const timeFormat = format?.time ?? (formatter === undefined ? undefined : unwrap(formatter.timeFieldFormat('millisecond')));
    const date = { placeholder: getDateFieldPlaceholder(dateFormat), inputmode: 'numeric' as const };
    const time = { placeholder: getTimeFieldPlaceholder(timeFormat), inputmode: timeFormat?.dayPeriods === undefined ? 'numeric' as const : 'text' as const };
    const combined = { placeholder: getDateTimeFieldPlaceholder(format), inputmode: 'text' as const };
    return { timeFormat, ...(timeFormat === undefined ? {} : { admitTimes: times => admitTimePresentation(timeFormat, times) }),
      options: { dateFormat, timeFormat, format }, attributes: {
      'start-date-input': date, 'end-date-input': date, 'start-time-input': time, 'end-time-input': time,
      ...(format === undefined ? {} : { 'start-date-time-input': combined, 'end-date-time-input': combined }),
    },
      formatInput: (part, value) => {
        const endpoint = part.startsWith('start') ? (value as DateTimeRange).start : (value as DateTimeRange).end;
        return part === 'start-time-input' || part === 'end-time-input' ? timeFormat === undefined ? undefined : formatTimeFieldValue(endpoint.time, timeFormat)
          : part === 'start-date-input' || part === 'end-date-input' ? dateFormat === undefined ? undefined : formatDateFieldValue(endpoint.date, dateFormat)
            : format === undefined ? undefined : formatDateTimeFieldValue(endpoint, format);
      } };
  },
  initialInputValues: (referenceDate, _policies, presentation) => {
    const state = createDateTimeRangePickerState({ referenceDate });
    const format = presentation?.timeFormat;
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
