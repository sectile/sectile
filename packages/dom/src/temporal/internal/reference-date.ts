import type { DateValue } from '@sectile/temporal/date-field';

export function currentReferenceDate(now: Date = new Date()): DateValue {
  return Object.freeze({
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    day: now.getDate(),
  });
}
