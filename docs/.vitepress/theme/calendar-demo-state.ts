export type CalendarViewMode = 'month' | 'week';

const dayMilliseconds = 86_400_000;

export function calendarRows(anchor: string, viewMode: CalendarViewMode): readonly (readonly string[])[] {
  const anchorDate = parseDate(anchor);
  if (viewMode === 'week') {
    return Object.freeze([Object.freeze(weekDates(anchorDate).map(formatIsoDate))]);
  }

  const monthStart = new Date(Date.UTC(anchorDate.getUTCFullYear(), anchorDate.getUTCMonth(), 1));
  const gridStart = shiftDate(monthStart, -mondayIndex(monthStart));
  const dates = Array.from({ length: 42 }, (_, index) => formatIsoDate(shiftDate(gridStart, index)));
  return Object.freeze(Array.from({ length: 6 }, (_, index) => Object.freeze(dates.slice(index * 7, index * 7 + 7))));
}

export function shiftCalendarAnchor(anchor: string, viewMode: CalendarViewMode, direction: -1 | 1): string {
  const current = parseDate(anchor);
  if (viewMode === 'week') return formatIsoDate(shiftDate(current, direction * 7));

  const targetMonth = new Date(Date.UTC(current.getUTCFullYear(), current.getUTCMonth() + direction, 1));
  const lastDay = new Date(Date.UTC(targetMonth.getUTCFullYear(), targetMonth.getUTCMonth() + 1, 0)).getUTCDate();
  targetMonth.setUTCDate(Math.min(current.getUTCDate(), lastDay));
  return formatIsoDate(targetMonth);
}

export function calendarTitle(anchor: string, viewMode: CalendarViewMode, locale: 'en-US' | 'ko-KR'): string {
  const anchorDate = parseDate(anchor);
  if (viewMode === 'month') {
    return new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(anchorDate);
  }

  const dates = weekDates(anchorDate);
  const first = dates[0]!;
  const last = dates.at(-1)!;
  const formatter = new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric', timeZone: 'UTC' });
  return locale === 'ko-KR'
    ? `${formatter.format(first)}–${formatter.format(last)}`
    : `${formatter.format(first)} – ${formatter.format(last)}, ${last.getUTCFullYear()}`;
}

export function calendarSelectionLabel(value: string | null, locale: 'en-US' | 'ko-KR'): string {
  if (value === null) return locale === 'ko-KR' ? '선택한 날짜 없음' : 'No date selected';
  return new Intl.DateTimeFormat(locale, {
    month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC',
  }).format(parseDate(value));
}

export function isCalendarWeekend(value: string): boolean {
  const day = parseDate(value).getUTCDay();
  return day === 0 || day === 6;
}

export function isSameCalendarMonth(value: string, anchor: string): boolean {
  const date = parseDate(value);
  const anchorDate = parseDate(anchor);
  return date.getUTCFullYear() === anchorDate.getUTCFullYear()
    && date.getUTCMonth() === anchorDate.getUTCMonth();
}

function weekDates(anchor: Date): Date[] {
  const start = shiftDate(anchor, -mondayIndex(anchor));
  return Array.from({ length: 7 }, (_, index) => shiftDate(start, index));
}

function mondayIndex(value: Date): number {
  return (value.getUTCDay() + 6) % 7;
}

function parseDate(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    throw new TypeError(`Invalid calendar date: ${value}`);
  }
  return new Date(Date.UTC(year!, month! - 1, day));
}

function shiftDate(value: Date, days: number): Date {
  return new Date(value.getTime() + days * dayMilliseconds);
}

function formatIsoDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}
