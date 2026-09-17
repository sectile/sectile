import { unwrap } from '@sectile/core/result';
import type { TemporalResult } from '../error.js';
import { fail, ok } from '../internal/foundation.js';

export interface DateValue {
  readonly year: number;
  readonly month: number;
  readonly day: number;
}

export interface DateRange {
  readonly start: DateValue;
  readonly end: DateValue;
}

export function createDateValue(year: number, month: number, day: number): DateValue {
  return unwrap(tryCreateDateValue(year, month, day));
}

export function tryCreateDateValue(year: number, month: number, day: number): TemporalResult<DateValue> {
  if (!Number.isSafeInteger(year) || year < 1 || year > 9_999) {
    return fail('construction', 'invalid-date-year', 'Date year must be an integer from 1 through 9999.', { year });
  }
  if (!Number.isSafeInteger(month) || month < 1 || month > 12) {
    return fail('construction', 'invalid-date-month', 'Date month must be an integer from 1 through 12.', { month });
  }
  const maximum = daysInMonth(year, month);
  if (!Number.isSafeInteger(day) || day < 1 || day > maximum) {
    return fail('construction', 'invalid-date-day', 'Date day must exist in its Gregorian month.', { year, month, day });
  }
  return ok(Object.freeze({ year, month, day }));
}

export function parseDateValue(text: string): TemporalResult<DateValue> {
  if (typeof text !== 'string') return fail('construction', 'invalid-date-text', 'Date text must be a string.');
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  return match === null
    ? fail('transition-rejection', 'invalid-date-format', 'Date text must use YYYY-MM-DD.', { text })
    : tryCreateDateValue(Number(match[1]), Number(match[2]), Number(match[3]));
}

export function formatDateValue(value: DateValue): string {
  return `${String(value.year).padStart(4, '0')}-${String(value.month).padStart(2, '0')}-${String(value.day).padStart(2, '0')}`;
}

export function compareDateValues(left: DateValue, right: DateValue): -1 | 0 | 1 {
  const leftDay = dateToOrdinal(left);
  const rightDay = dateToOrdinal(right);
  return leftDay < rightDay ? -1 : leftDay > rightDay ? 1 : 0;
}

export function differenceInDateDays(left: DateValue, right: DateValue): number {
  return dateToOrdinal(left) - dateToOrdinal(right);
}

/** ISO weekday: Monday is 1 and Sunday is 7. */
export function dateDayOfWeek(value: DateValue): 1 | 2 | 3 | 4 | 5 | 6 | 7 {
  const thursday = dateToOrdinal(Object.freeze({ year: 1970, month: 1, day: 1 }));
  return (((dateToOrdinal(value) - thursday + 3) % 7 + 7) % 7 + 1) as 1 | 2 | 3 | 4 | 5 | 6 | 7;
}

export function addDateDays(value: DateValue, amount: number): TemporalResult<DateValue> {
  if (!Number.isSafeInteger(amount)) return fail('transition-rejection', 'invalid-date-day-delta', 'Date day delta must be a safe integer.');
  const result = ordinalToDate(dateToOrdinal(value) + amount);
  return result.year < 1 || result.year > 9_999
    ? fail('transition-rejection', 'date-outside-supported-range', 'Date arithmetic must remain between years 1 and 9999.')
    : ok(result);
}

export function addDateMonths(value: DateValue, amount: number): TemporalResult<DateValue> {
  if (!Number.isSafeInteger(amount)) return fail('transition-rejection', 'invalid-date-month-delta', 'Date month delta must be a safe integer.');
  const absolute = value.year * 12 + value.month - 1 + amount;
  const year = Math.floor(absolute / 12);
  const month = absolute - year * 12 + 1;
  if (year < 1 || year > 9_999) return fail('transition-rejection', 'date-outside-supported-range', 'Date arithmetic must remain between years 1 and 9999.');
  return tryCreateDateValue(year, month, Math.min(value.day, daysInMonth(year, month)));
}

export function addDateYears(value: DateValue, amount: number): TemporalResult<DateValue> {
  if (!Number.isSafeInteger(amount)) return fail('transition-rejection', 'invalid-date-year-delta', 'Date year delta must be a safe integer.');
  const year = value.year + amount;
  if (year < 1 || year > 9_999) return fail('transition-rejection', 'date-outside-supported-range', 'Date arithmetic must remain between years 1 and 9999.');
  return tryCreateDateValue(year, value.month, Math.min(value.day, daysInMonth(year, value.month)));
}

export function createDateRange(start: DateValue, end: DateValue): DateRange {
  return unwrap(tryCreateDateRange(start, end));
}

export function tryCreateDateRange(start: DateValue, end: DateValue): TemporalResult<DateRange> {
  const validStart = tryCreateDateValue(start.year, start.month, start.day);
  if (!validStart.ok) return validStart;
  const validEnd = tryCreateDateValue(end.year, end.month, end.day);
  if (!validEnd.ok) return validEnd;
  if (compareDateValues(validStart.value, validEnd.value) > 0) {
    return fail('construction', 'inverted-date-range', 'Date range start must not follow its end.');
  }
  return ok(Object.freeze({ start: validStart.value, end: validEnd.value }));
}

export function dateRangeContains(range: DateRange, value: DateValue): boolean {
  return compareDateValues(range.start, value) <= 0 && compareDateValues(value, range.end) <= 0;
}

export function daysInMonth(year: number, month: number): number {
  return month === 2 ? (isLeapYear(year) ? 29 : 28) : (month === 4 || month === 6 || month === 9 || month === 11 ? 30 : 31);
}

export function isLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

function dateToOrdinal(value: DateValue): number {
  let year = value.year;
  const month = value.month;
  year -= month <= 2 ? 1 : 0;
  const era = Math.floor(year / 400);
  const yearOfEra = year - era * 400;
  const monthPrime = month + (month > 2 ? -3 : 9);
  const dayOfYear = Math.floor((153 * monthPrime + 2) / 5) + value.day - 1;
  const dayOfEra = yearOfEra * 365 + Math.floor(yearOfEra / 4) - Math.floor(yearOfEra / 100) + dayOfYear;
  return era * 146097 + dayOfEra;
}

function ordinalToDate(ordinal: number): DateValue {
  const era = Math.floor(ordinal / 146097);
  const dayOfEra = ordinal - era * 146097;
  const yearOfEra = Math.floor((dayOfEra - Math.floor(dayOfEra / 1460) + Math.floor(dayOfEra / 36524) - Math.floor(dayOfEra / 146096)) / 365);
  let year = yearOfEra + era * 400;
  const dayOfYear = dayOfEra - (365 * yearOfEra + Math.floor(yearOfEra / 4) - Math.floor(yearOfEra / 100));
  const monthPrime = Math.floor((5 * dayOfYear + 2) / 153);
  const day = dayOfYear - Math.floor((153 * monthPrime + 2) / 5) + 1;
  const month = monthPrime + (monthPrime < 10 ? 3 : -9);
  year += month <= 2 ? 1 : 0;
  return Object.freeze({ year, month, day });
}
