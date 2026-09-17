import {
  type DateValue,
  tryCreateDateValue,
  parseDateValue,
  formatDateValue,
  compareDateValues,
  addDateDays,
} from './date.js';
import { type TimeValue, tryCreateTimeValue, parseTimeValue, formatTimeValue } from './time.js';
import { unwrap } from '@sectile/core/result';
import type { TemporalResult } from '../error.js';
import { ok, fail } from '../internal/foundation.js';

export interface DateTimeValue {
  readonly date: DateValue;
  readonly time: TimeValue;
}

export interface DateTimeRange {
  readonly start: DateTimeValue;
  readonly end: DateTimeValue;
}

const MILLISECONDS_PER_DAY = 86_400_000;

export function createDateTimeValue(date: DateValue, time: TimeValue): DateTimeValue {
  return unwrap(tryCreateDateTimeValue(date, time));
}

export function tryCreateDateTimeValue(date: DateValue, time: TimeValue): TemporalResult<DateTimeValue> {
  const validDate = tryCreateDateValue(date.year, date.month, date.day);
  if (!validDate.ok) return validDate;
  const validTime = tryCreateTimeValue(time.hour, time.minute, time.second, time.millisecond);
  if (!validTime.ok) return validTime;
  return ok(Object.freeze({ date: validDate.value, time: validTime.value }));
}

export function parseDateTimeValue(text: string): TemporalResult<DateTimeValue> {
  if (typeof text !== 'string') {
    return fail('construction', 'invalid-date-time-text', 'Date-time text must be a string.');
  }
  const separator = text.indexOf('T');
  if (separator !== 10 || text.indexOf('T', separator + 1) !== -1) {
    return fail(
      'transition-rejection',
      'invalid-date-time-format',
      'Date-time text must use YYYY-MM-DDTHH:mm, with optional seconds and milliseconds.',
      { text },
    );
  }
  const date = parseDateValue(text.slice(0, separator));
  if (!date.ok) return date;
  const time = parseTimeValue(text.slice(separator + 1));
  return time.ok ? tryCreateDateTimeValue(date.value, time.value) : time;
}

export function formatDateTimeValue(value: DateTimeValue): string {
  return `${formatDateValue(value.date)}T${formatTimeValue(value.time)}`;
}

export function compareDateTimeValues(left: DateTimeValue, right: DateTimeValue): -1 | 0 | 1 {
  const dateOrder = compareDateValues(left.date, right.date);
  if (dateOrder !== 0) return dateOrder;
  const leftTime = timeToMilliseconds(left.time);
  const rightTime = timeToMilliseconds(right.time);
  return leftTime < rightTime ? -1 : leftTime > rightTime ? 1 : 0;
}

export function createDateTimeRange(
  start: DateTimeValue,
  end: DateTimeValue,
): DateTimeRange {
  return unwrap(tryCreateDateTimeRange(start, end));
}

export function tryCreateDateTimeRange(
  start: DateTimeValue,
  end: DateTimeValue,
): TemporalResult<DateTimeRange> {
  const validStart = tryCreateDateTimeValue(start.date, start.time);
  if (!validStart.ok) return validStart;
  const validEnd = tryCreateDateTimeValue(end.date, end.time);
  if (!validEnd.ok) return validEnd;
  if (compareDateTimeValues(validStart.value, validEnd.value) > 0) {
    return fail(
      'construction',
      'inverted-date-time-range',
      'Date-time range start must not follow its end.',
    );
  }
  return ok(Object.freeze({ start: validStart.value, end: validEnd.value }));
}

export function formatDateTimeRange(value: DateTimeRange): string {
  return `${formatDateTimeValue(value.start)}/${formatDateTimeValue(value.end)}`;
}

export function addDateTimeMilliseconds(value: DateTimeValue, amount: number): TemporalResult<DateTimeValue> {
  if (!Number.isSafeInteger(amount)) {
    return fail('transition-rejection', 'invalid-date-time-delta', 'Date-time delta must be a safe integer.');
  }
  const total = timeToMilliseconds(value.time) + amount;
  const dayDelta = Math.floor(total / MILLISECONDS_PER_DAY);
  const timeOfDay = ((total % MILLISECONDS_PER_DAY) + MILLISECONDS_PER_DAY) % MILLISECONDS_PER_DAY;
  const date = addDateDays(value.date, dayDelta);
  if (!date.ok) return date;
  const time = millisecondsToTime(timeOfDay);
  return time.ok ? tryCreateDateTimeValue(date.value, time.value) : time;
}

function timeToMilliseconds(value: TimeValue): number {
  return ((value.hour * 60 + value.minute) * 60 + value.second) * 1_000 + value.millisecond;
}

function millisecondsToTime(value: number): TemporalResult<TimeValue> {
  const hour = Math.floor(value / 3_600_000);
  const minute = Math.floor((value % 3_600_000) / 60_000);
  const second = Math.floor((value % 60_000) / 1_000);
  return tryCreateTimeValue(hour, minute, second, value % 1_000);
}
