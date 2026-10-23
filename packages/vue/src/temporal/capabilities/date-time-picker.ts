import { createDateTimePicker } from '@sectile/dom/temporal/date-time-picker';
import { formatDateValue, getDateFieldPlaceholder } from '@sectile/dom/temporal/date-field';
import { formatDateTimeValue, getDateTimeFieldPlaceholder, type DateTimeValue } from '@sectile/dom/temporal/date-time-field';
import { formatTimeValue, getTimeFieldPlaceholder } from '@sectile/dom/temporal/time-field';
import { formatDateFieldValue } from '@sectile/temporal/date-field';
import { formatTimeFieldValue } from '@sectile/temporal/time-field';
import { formatDateTimeFieldValue } from '@sectile/temporal/date-time-field';
import { unwrap } from '@sectile/core/result';
import { createDateTimePickerState, type DateTimePickerPolicies } from '@sectile/temporal/date-time-picker';
import { definePickerFamilyCapability } from '../capability.js';

export const dateTimePickerCapability = definePickerFamilyCapability({
  kind: 'date-time' as const,
  connect: (options) => createDateTimePicker(options as never),
  presentation: formatter => {
    const format = formatter === undefined ? undefined : unwrap(formatter.dateTimeFieldFormat('millisecond'));
    const dateFormat = format?.date, timeFormat = format?.time;
    return { options: { format, dateFormat, timeFormat }, attributes: {
      'date-time-input': { placeholder: getDateTimeFieldPlaceholder(format), inputmode: 'text' },
      'date-input': { placeholder: getDateFieldPlaceholder(dateFormat), inputmode: 'numeric' },
      'time-input': { placeholder: getTimeFieldPlaceholder(timeFormat), inputmode: timeFormat?.dayPeriods === undefined ? 'numeric' : 'text' },
    }, formatInput: (part, value) => {
      const dateTime = value as DateTimeValue;
      return format === undefined ? undefined : part === 'time-input' ? formatTimeFieldValue(dateTime.time, timeFormat)
        : part === 'date-input' ? formatDateFieldValue(dateTime.date, dateFormat) : formatDateTimeFieldValue(dateTime, format);
    } };
  },
  initialInputValues: (referenceDate, policies, formatter) => {
    const time = (policies as DateTimePickerPolicies | undefined)?.defaultTime;
    const state = createDateTimePickerState({ referenceDate, ...(time === undefined ? {} : { time }) });
    return Object.freeze({ 'time-input': formatter === undefined ? formatTimeValue(state.time) : formatTimeFieldValue(state.time, unwrap(formatter.dateTimeFieldFormat('millisecond')).time) });
  },
  formatInput: (_granularity, part, value) => {
    const dateTime = value as DateTimeValue;
    return part === 'time-input'
      ? formatTimeValue(dateTime.time)
      : part === 'date-input'
        ? formatDateValue(dateTime.date)
        : formatDateTimeValue(dateTime);
  },
});
