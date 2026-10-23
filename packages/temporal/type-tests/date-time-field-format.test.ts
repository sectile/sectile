import { createDateFieldFormat } from '@sectile/temporal/date-field';
import { createTimeFieldFormat } from '@sectile/temporal/time-field';
import { createDateTimeFieldFormat, tryCreateDateTimeFieldFormat, formatDateTimeFieldValue, parseDateTimeFieldValue, type DateTimeFieldFormat } from '@sectile/temporal/date-time-field';
import { createDateTimeFieldState, reformatDateTimeFieldState, applyDateTimeFieldEvent } from '@sectile/temporal/date-time-field';
const date = createDateFieldFormat({ order: ['year', 'month', 'day'] });
const time = createTimeFieldFormat({ precision: 'second' });
const format: DateTimeFieldFormat = createDateTimeFieldFormat({ date, time, order: ['time', 'date'], separator: ' ' });
tryCreateDateTimeFieldFormat({ date, time });
formatDateTimeFieldValue({ date: { year: 2026, month: 10, day: 14 }, time: { hour: 15, minute: 24, second: 38, millisecond: 0 } }, format);
parseDateTimeFieldValue('15:24:38 2026-10-14', format);
const state = createDateTimeFieldState(null, undefined, format);
reformatDateTimeFieldState(state, format); applyDateTimeFieldEvent(state, 'cancel');
// @ts-expect-error DateTime state consumes a combined format, not a date-only handle.
createDateTimeFieldState(null, undefined, date);
// @ts-expect-error Group order is an exact closed pair.
createDateTimeFieldFormat({ date, time, order: ['date', 'date'] });
// @ts-expect-error Formats are issued handles, not raw authoring records.
createDateTimeFieldFormat({ date, time: { precision: 'second' } });
