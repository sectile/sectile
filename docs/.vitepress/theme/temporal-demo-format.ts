export interface DemoDateValue { readonly year: number; readonly month: number; readonly day: number }
export interface DemoTimeValue { readonly hour: number; readonly minute: number; readonly second?: number; readonly millisecond?: number }
export interface DemoDateTimeValue { readonly date: DemoDateValue; readonly time: DemoTimeValue }
export interface DemoRange<Value> { readonly start: Value; readonly end: Value }

export function formatDemoDate(value: DemoDateValue | null, locale = 'en-US'): string {
  if (value === null) return 'No date selected';
  return new Intl.DateTimeFormat(locale, {
    month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC',
  }).format(toDate(value));
}

export function formatDemoTime(value: DemoTimeValue | null, locale = 'en-US'): string {
  if (value === null) return 'No time selected';
  return new Intl.DateTimeFormat(locale, {
    hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'UTC',
  }).format(new Date(Date.UTC(2000, 0, 1, value.hour, value.minute)));
}

export function formatDemoDateTime(value: DemoDateTimeValue | null, locale = 'en-US'): string {
  if (value === null) return 'No schedule selected';
  return `${formatDemoDate(value.date, locale)} · ${formatDemoTime(value.time, locale)}`;
}

export function formatDemoDateRange(value: DemoRange<DemoDateValue> | null, locale = 'en-US'): string {
  if (value === null) return 'No date range selected';
  if (value.start.year === value.end.year && value.start.month === value.end.month) {
    const month = new Intl.DateTimeFormat(locale, { month: 'short', timeZone: 'UTC' }).format(toDate(value.start));
    return `${month} ${value.start.day}–${value.end.day}, ${value.end.year}`;
  }
  return `${formatDemoDate(value.start, locale)} – ${formatDemoDate(value.end, locale)}`;
}

export function formatDemoTimeRange(value: DemoRange<DemoTimeValue> | null, locale = 'en-US'): string {
  if (value === null) return 'No time range selected';
  return `${formatDemoTime(value.start, locale)} – ${formatDemoTime(value.end, locale)}`;
}

function toDate(value: DemoDateValue): Date {
  return new Date(Date.UTC(value.year, value.month - 1, value.day));
}
