import { createTemporalFormatter, tryCreateTemporalFormatter, type TemporalFormatter, type TemporalFormatResult } from '@sectile/dom/temporal/format';
import { createDateField } from '@sectile/dom/temporal/date-field';
import type { DatePickerOptions } from '@sectile/dom/temporal/date-picker';
import type { DateRangePickerOptions } from '@sectile/dom/temporal/date-range-picker';
import type { DateTimePickerOptions } from '@sectile/dom/temporal/date-time-picker';
import type { DateTimeRangePickerOptions } from '@sectile/dom/temporal/date-time-range-picker';
import { createTimeField, getTimeFieldPlaceholder } from '@sectile/dom/temporal/time-field';
import { createDateRangeField } from '@sectile/dom/temporal/date-range-field';
import { createDateRangeFieldState } from '@sectile/temporal/date-range-field';
import { createTimeRangeField } from '@sectile/dom/temporal/time-range-field';
import { createTimeRangeFieldState } from '@sectile/temporal/time-range-field';
import { createDateTimeRangeField, tryCreateDateTimeRangeField, type DateTimeRangeFieldConnection } from '@sectile/dom/temporal/date-time-range-field';
import { createDateTimeRangeFieldState } from '@sectile/temporal/date-time-range-field';
import { createDateTimeFieldState } from '@sectile/temporal/date-time-field';
import { createDateTimeField, getDateTimeFieldPlaceholder } from '@sectile/dom/temporal/date-time-field';
const formatter: TemporalFormatter = createTemporalFormatter({ locale: 'ko-KR', timeZone: 'Asia/Seoul' });
formatter.month({ year: 2026, month: 10 }, 'short');
formatter.month({ year: 2026, month: 10 }, 'narrow');
// @ts-expect-error Month display widths use the same closed vocabulary as weekdays.
formatter.month({ year: 2026, month: 10 }, 'compact');
formatter.weekday({ year: 2026, month: 10, day: 14 }, 'short');
// @ts-expect-error Weekday width is a closed locale-formatting vocabulary.
formatter.weekday({ year: 2026, month: 10, day: 14 }, 'wide');
const label: TemporalFormatResult<string> = formatter.date({ year: 2026, month: 10, day: 14 });
formatter.time({ hour: 15, minute: 24, second: 38, millisecond: 125 }, 'millisecond');
formatter.dateAt(0);
const yearLabel: TemporalFormatResult<string> = formatter.year({ year: 2026 }); void yearLabel;
// @ts-expect-error Civil year labels require the existing numeric year vocabulary.
formatter.year({ year: '2026' });
const editFormat = formatter.dateFieldFormat();
const dateTimeEditFormat = formatter.dateTimeFieldFormat('millisecond'), pickerTimeEditFormat = formatter.timeFieldFormat('millisecond');
if (editFormat.ok && dateTimeEditFormat.ok && pickerTimeEditFormat.ok) {
  const picker: Pick<DateTimePickerOptions, 'format' | 'dateFormat' | 'timeFormat'> = { format: dateTimeEditFormat.value, dateFormat: editFormat.value, timeFormat: pickerTimeEditFormat.value };
  const range: Pick<DateTimeRangePickerOptions, 'dateFormat' | 'timeFormat'> = { dateFormat: editFormat.value, timeFormat: pickerTimeEditFormat.value };
  void [picker, range];
}
const clearPickerFormat: Pick<DatePickerOptions, 'format'> = { format: undefined }; void clearPickerFormat;
if (pickerTimeEditFormat.ok) {
  // @ts-expect-error A time edit format is not a combined date-time edit format.
  const invalidTimePickerFormat: Pick<DateTimePickerOptions, 'format'> = { format: pickerTimeEditFormat.value }; void invalidTimePickerFormat;
}
const noPickerHost: Pick<DatePickerOptions, 'layerHost'> = { layerHost: null }; void noPickerHost;
const noRangePickerHost: Pick<DateRangePickerOptions, 'layerHost'> = noPickerHost; void noRangePickerHost;
const noDateTimeHost: Pick<DateTimePickerOptions, 'layerHost'> = noPickerHost;
const noDateTimeRangeHost: Pick<DateTimeRangePickerOptions, 'layerHost'> = noPickerHost;
void [noDateTimeHost, noDateTimeRangeHost];
// @ts-expect-error Layer hosting uses the declared document connection, not a selector.
const invalidPickerHost: Pick<DatePickerOptions, 'layerHost'> = { layerHost: '#overlays' }; void invalidPickerHost;
if (editFormat.ok) { const picker: Pick<DatePickerOptions, 'format'> = { format: editFormat.value }; void picker; }
const timeEditFormat = formatter.timeFieldFormat('second');
// @ts-expect-error A date picker consumes a date format, not a time format.
if (timeEditFormat.ok) { const picker: Pick<DatePickerOptions, 'format'> = { format: timeEditFormat.value }; void picker; }
const combinedEditFormat = formatter.dateTimeFieldFormat('millisecond');
if (combinedEditFormat.ok) {
  createDateTimeFieldState(null, undefined, combinedEditFormat.value);
  createDateTimeField({ input: document.createElement('input'), format: combinedEditFormat.value });
  const placeholder: string = getDateTimeFieldPlaceholder(combinedEditFormat.value); void placeholder;
}
// @ts-expect-error Date-time editing precision is a closed selection.
formatter.dateTimeFieldFormat('week');
if (timeEditFormat.ok) {
  createTimeField({ input: document.createElement('input'), format: timeEditFormat.value });
  createTimeRangeField({ startInput: document.createElement('input'), endInput: document.createElement('input'), format: timeEditFormat.value });
  const placeholder: string = getTimeFieldPlaceholder(timeEditFormat.value);
  void placeholder;
}
if (editFormat.ok) createDateField({ input: document.createElement('input'), format: editFormat.value });
if (editFormat.ok) createDateRangeField({ startInput: document.createElement('input'), endInput: document.createElement('input'), format: editFormat.value });
createDateRangeField({ startInput: document.createElement('input'), endInput: document.createElement('input'), defaultState: createDateRangeFieldState() });
createTimeRangeField({ startInput: document.createElement('input'), endInput: document.createElement('input'), defaultState: createTimeRangeFieldState() });
const rangeInputs = { startInput: document.createElement('input'), endInput: document.createElement('input') };
const combinedRange = createDateTimeRangeField({ ...rangeInputs, defaultState: createDateTimeRangeFieldState(),
  onValueChange(value) { value?.start.date.year satisfies number | undefined; },
});
const combinedConnection: DateTimeRangeFieldConnection = combinedRange;
combinedConnection.handleEvent({ type: 'field', endpoint: 'end', event: { type: 'set-value', value: null } });
tryCreateDateTimeRangeField(rangeInputs);
if (combinedEditFormat.ok) createDateTimeRangeField({ ...rangeInputs, format: combinedEditFormat.value });
// @ts-expect-error An endpoint must be a combined date-time value.
createDateTimeRangeField({ ...rangeInputs, value: { start: { year: 2026, month: 10, day: 14 }, end: { year: 2026, month: 10, day: 15 } } });
// @ts-expect-error Endpoint selection is closed.
combinedRange.handleEvent({ type: 'focus', endpoint: 'middle' });
// @ts-expect-error A date-only layout is not a combined range layout.
if (editFormat.ok) createDateTimeRangeField({ ...rangeInputs, format: editFormat.value });
tryCreateTemporalFormatter({ locale: 'en-US', timeZone: 'UTC' });
void label;
// @ts-expect-error Admission requires an explicit timezone for request-safe projection.
createTemporalFormatter({ locale: 'en-US' });
// @ts-expect-error Formatting does not accept a native Date as a civil date.
formatter.date(new Date());
// @ts-expect-error Precision is a closed typed selection.
formatter.time({ hour: 1, minute: 0, second: 0, millisecond: 0 }, 'week');
// @ts-expect-error Editable precision is the same closed selection.
formatter.timeFieldFormat('week');
// @ts-expect-error A date format cannot be used by a time input.
if (editFormat.ok) createTimeField({ input: document.createElement('input'), format: editFormat.value });
// @ts-expect-error DOM editing consumes an admitted Temporal format, not raw formatter options.
createDateField({ input: document.createElement('input'), format: { locale: 'ko-KR', timeZone: 'UTC' } });
