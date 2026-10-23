import { failResult, okResult, unwrap, type Result } from '@sectile/core/result';
import { trySnapshotJSON } from '@sectile/core/json';
import { tryCreateDateValue, tryCreateDateFieldFormat, type DateFieldFormat, type DateFieldFormatOptions, type DateValue, type DateSegment } from '@sectile/temporal/date-field';
import { tryCreateTimeValue, tryCreateTimeFieldFormat, type TimeValue, type TimeFieldFormat, type TimeFieldFormatPart } from '@sectile/temporal/time-field';
import { tryCreateDateTimeFieldFormat, type DateTimeFieldFormat, type DateTimeValue } from '@sectile/temporal/date-time-field';
import type { CalendarMonthValue } from '@sectile/temporal/calendar';
import type { TemporalErrorCode } from '@sectile/temporal';

export type TemporalFormatErrorCode = TemporalErrorCode | 'dom.temporal-format-invalid' | 'dom.temporal-format-limit'
  | 'dom.temporal-locale-unavailable' | 'dom.temporal-zone-invalid' | 'dom.temporal-format-unavailable';
export type TemporalFormatResult<T> = Result<T, TemporalFormatErrorCode>;
export type TemporalTimePrecision = 'minute' | 'second' | 'millisecond';
export interface TemporalFormatterOptions { readonly locale: string; readonly timeZone: string }
export interface TemporalFormatter {
  readonly locale: string; readonly timeZone: string;
  readonly dateOrder: readonly DateSegment[];
  readonly capabilities: { readonly calendar: 'gregory'; readonly dateParts: true; readonly timePrecisions: readonly TemporalTimePrecision[] };
  date(value: DateValue): TemporalFormatResult<string>;
  time(value: TimeValue, precision?: TemporalTimePrecision): TemporalFormatResult<string>;
  dateTime(value: DateTimeValue, precision?: TemporalTimePrecision): TemporalFormatResult<string>;
  month(value: CalendarMonthValue, width?: 'long' | 'short' | 'narrow'): TemporalFormatResult<string>;
  year(value: Pick<DateValue, 'year'>): TemporalFormatResult<string>;
  weekday(value: DateValue, width?: 'long' | 'short' | 'narrow'): TemporalFormatResult<string>;
  /** Unix milliseconds to a civil date in the configured zone; never reads now. */
  dateAt(instant: number): TemporalFormatResult<DateValue>;
  dateFieldFormat(): TemporalFormatResult<DateFieldFormat>;
  timeFieldFormat(precision?: TemporalTimePrecision): TemporalFormatResult<TimeFieldFormat>;
  dateTimeFieldFormat(precision?: TemporalTimePrecision): TemporalFormatResult<DateTimeFieldFormat>;
}
const precisions: readonly TemporalTimePrecision[] = /* @__PURE__ */ Object.freeze(['minute', 'second', 'millisecond']);
type Kind = 'date' | 'month' | `month-${'short' | 'narrow'}` | 'year' | `weekday-${'long' | 'short' | 'narrow'}` | `time-${TemporalTimePrecision}` | `dateTime-${TemporalTimePrecision}`;
const bounds = /* @__PURE__ */ Object.freeze({ maxInputBytes: 8192, maxInputValues: 3, maxInputDepth: 2, maxStringCodeUnits: 1024 });
function reject(code: TemporalFormatErrorCode, message: string): TemporalFormatResult<never> {
  return failResult(code === 'dom.temporal-format-limit' ? 'resource-rejection' : 'construction', code, message);
}
export function createTemporalFormatter(options: TemporalFormatterOptions): TemporalFormatter { return unwrap(tryCreateTemporalFormatter(options)); }
export function tryCreateTemporalFormatter(options: TemporalFormatterOptions): TemporalFormatResult<TemporalFormatter> {
  const captured = trySnapshotJSON(options, { limits: bounds });
  if (!captured.ok) return reject(captured.error.class === 'resource-rejection' ? 'dom.temporal-format-limit' : 'dom.temporal-format-invalid', 'Temporal formatting requires bounded own data');
  const data = captured.value.data;
  if (!data || typeof data !== 'object' || Array.isArray(data) || Object.keys(data).length !== 2) return reject('dom.temporal-format-invalid', 'Temporal formatting requires locale and timeZone');
  const input = data as Readonly<Record<string, unknown>>, locale = input['locale'], zone = input['timeZone'];
  if (typeof locale !== 'string' || !locale || typeof zone !== 'string' || !zone) return reject('dom.temporal-format-invalid', 'Temporal formatting requires nonempty identifiers');
  if (typeof Intl === 'undefined' || typeof Intl.DateTimeFormat !== 'function' || typeof Intl.DateTimeFormat.prototype.formatToParts !== 'function') return reject('dom.temporal-format-unavailable', 'Temporal formatting requires Intl date parts');
  try {
    if (!Intl.DateTimeFormat.supportedLocalesOf(locale).length) return reject('dom.temporal-locale-unavailable', 'Temporal locale data is unavailable');
  } catch { return reject('dom.temporal-format-invalid', 'Temporal locale is invalid'); }
  let clock: Intl.DateTimeFormat;
  try { clock = new Intl.DateTimeFormat('en-US', { calendar: 'gregory', numberingSystem: 'latn', timeZone: zone, year: 'numeric', month: 'numeric', day: 'numeric', era: 'short' }); }
  catch { return reject('dom.temporal-zone-invalid', 'Temporal time zone is invalid or unavailable'); }
  const timeZone = clock.resolvedOptions().timeZone;
  let initial: Intl.DateTimeFormat;
  try { initial = new Intl.DateTimeFormat(locale, { calendar: 'gregory', timeZone: 'UTC', year: 'numeric', month: '2-digit', day: '2-digit' }); }
  catch { return reject('dom.temporal-format-unavailable', 'Gregorian formatting is unavailable'); }
  if (initial.resolvedOptions().calendar !== 'gregory') return reject('dom.temporal-format-unavailable', 'Gregorian formatting is unavailable');
  const order = initial.formatToParts(0).flatMap(part => part.type === 'year' || part.type === 'month' || part.type === 'day' ? [part.type] : []);
  if (order.length !== 3 || new Set(order).size !== 3) return reject('dom.temporal-format-unavailable', 'Temporal date parts are incomplete');
  const adEra = clock.formatToParts(0).find(part => part.type === 'era')?.value;
  if (!adEra) return reject('dom.temporal-format-unavailable', 'Gregorian era parts are unavailable');
  const resolvedLocale = initial.resolvedOptions().locale;
  let fieldFormat: DateFieldFormat | undefined;
  const timeFormats: Partial<Record<TemporalTimePrecision, TimeFieldFormat>> = {};
  const dateTimeFormats: Partial<Record<TemporalTimePrecision, DateTimeFieldFormat>> = {};
  let digitSystem: string | undefined, digitAlphabet: NonNullable<DateFieldFormatOptions['digits']> | undefined;
  const digitsFor = (source: Intl.DateTimeFormat): NonNullable<DateFieldFormatOptions['digits']> => {
    const system = source.resolvedOptions().numberingSystem;
    if (digitAlphabet !== undefined && digitSystem === system) return digitAlphabet;
    const numbers = new Intl.NumberFormat(resolvedLocale, { useGrouping: false, numberingSystem: system });
    const digits = Array.from({ length: 10 }, (_, digit) => numbers.format(digit)) as unknown as NonNullable<DateFieldFormatOptions['digits']>;
    digitSystem = system; digitAlphabet = digits; return digits;
  };
  const formatters = new Map<Kind, Intl.DateTimeFormat>([['date', initial]]);
  const formatter = (kind: Kind): Intl.DateTimeFormat => {
    const existing = formatters.get(kind); if (existing) return existing;
    const options: Intl.DateTimeFormatOptions = { calendar: 'gregory', timeZone: 'UTC' };
    if (kind === 'month' || kind.startsWith('month-')) { options.year = 'numeric'; options.month = kind === 'month' ? 'long' : kind.slice(6) as 'short' | 'narrow'; }
    else if (kind === 'year') options.year = 'numeric';
    else if (kind.startsWith('weekday-')) options.weekday = kind.slice(8) as 'long' | 'short' | 'narrow';
    else {
      if (kind.startsWith('dateTime-')) { options.year = 'numeric'; options.month = '2-digit'; options.day = '2-digit'; }
      options.hour = 'numeric'; options.minute = '2-digit';
      if (!kind.endsWith('-minute')) options.second = '2-digit';
      if (kind.endsWith('-millisecond')) options.fractionalSecondDigits = 3;
    }
    const created = new Intl.DateTimeFormat(resolvedLocale, options); formatters.set(kind, created); return created;
  };
  const civil = (date: DateValue, time?: TimeValue, requireTime = false): TemporalFormatResult<number> => {
    const day = tryCreateDateValue(date?.year, date?.month, date?.day); if (!day.ok) return day;
    if (requireTime || time !== undefined) { const valid = tryCreateTimeValue(time?.hour as number, time?.minute, time?.second, time?.millisecond); if (!valid.ok) return valid; }
    const value = new Date(0); value.setUTCFullYear(day.value.year, day.value.month - 1, day.value.day);
    value.setUTCHours(time?.hour ?? 0, time?.minute ?? 0, time?.second ?? 0, time?.millisecond ?? 0);
    return okResult(value.getTime());
  };
  const format = (kind: Kind, date: DateValue, time?: TimeValue): TemporalFormatResult<string> => {
    const value = civil(date, time, kind.startsWith('time-') || kind.startsWith('dateTime-')); if (!value.ok) return value;
    try { return okResult(formatter(kind).format(value.value)); }
    catch { return reject('dom.temporal-format-unavailable', 'Temporal formatting precision is unavailable'); }
  };
  const precisionOK = (value: TemporalTimePrecision): boolean => precisions.includes(value);
  const admitTime = (source: Intl.DateTimeFormat, precision: TemporalTimePrecision, partsAt: (hour: number) => readonly Intl.DateTimeFormatPart[] | undefined): TemporalFormatResult<TimeFieldFormat> => {
    const hourCycle = source.resolvedOptions().hourCycle;
    if (hourCycle !== 'h11' && hourCycle !== 'h12' && hourCycle !== 'h23' && hourCycle !== 'h24') return reject('dom.temporal-format-unavailable', 'Time field cycle is unavailable');
    const native = partsAt(15), parts = native === undefined ? undefined : editParts(native, true);
    if (!parts) return reject('dom.temporal-format-unavailable', 'Time field parts are unsupported');
    const half = hourCycle === 'h11' || hourCycle === 'h12';
    const morning = half ? partsAt(0)?.find(part => part.type === 'dayPeriod')?.value : undefined, afternoon = half ? native?.find(part => part.type === 'dayPeriod')?.value : undefined;
    if (half && (morning === undefined || afternoon === undefined)) return reject('dom.temporal-format-unavailable', 'Time field day periods are unavailable');
    const periods: readonly [string, string] | undefined = morning !== undefined && afternoon !== undefined ? [morning, afternoon] : undefined;
    for (let hour = 0; hour < 24; hour++) {
      const observedNative = partsAt(hour), observed = observedNative === undefined ? undefined : editParts(observedNative, true);
      if (!observed || !sameParts(observed, parts) || half && observedNative?.find(part => part.type === 'dayPeriod')?.value !== periods![hour < 12 ? 0 : 1]) return reject('dom.temporal-format-unavailable', 'Time field pattern varies outside its portable representation');
    }
    const admitted = tryCreateTimeFieldFormat({ precision, hourCycle, order: parts.order as TimeFieldFormatPart[], literals: parts.literals, digits: digitsFor(source), ...(periods === undefined ? {} : { dayPeriods: periods }) });
    return admitted.ok ? admitted : reject('dom.temporal-format-unavailable', 'Time field pattern is unsupported');
  };
  return okResult(Object.freeze({ locale: resolvedLocale, timeZone, dateOrder: Object.freeze(order),
    capabilities: Object.freeze({ calendar: 'gregory' as const, dateParts: true as const, timePrecisions: precisions }),
    dateFieldFormat(): TemporalFormatResult<DateFieldFormat> {
      if (fieldFormat !== undefined) return okResult(fieldFormat);
      try {
        const parts = editParts(initial.formatToParts(0), false);
        if (!parts) return reject('dom.temporal-format-unavailable', 'Date field parts are unsupported');
        const admitted = tryCreateDateFieldFormat({ order: [order[0]!, order[1]!, order[2]!], literals: parts.literals as unknown as NonNullable<DateFieldFormatOptions['literals']>, digits: digitsFor(initial) });
        if (!admitted.ok) return reject('dom.temporal-format-unavailable', 'Date field pattern is unsupported');
        fieldFormat = admitted.value;
        return okResult(fieldFormat);
      } catch { return reject('dom.temporal-format-unavailable', 'Date field numbering or parts are unavailable'); }
    },
    timeFieldFormat(precision: TemporalTimePrecision = 'minute'): TemporalFormatResult<TimeFieldFormat> {
      if (!precisionOK(precision)) return reject('dom.temporal-format-invalid', 'Unknown temporal precision');
      const cached = timeFormats[precision]; if (cached !== undefined) return okResult(cached);
      try {
        const source = formatter(`time-${precision}`);
        const admitted = admitTime(source, precision, hour => source.formatToParts(Date.UTC(2000, 0, 1, hour, 24, 38, 125))); if (!admitted.ok) return admitted;
        timeFormats[precision] = admitted.value; return okResult(admitted.value);
      } catch { return reject('dom.temporal-format-unavailable', 'Time field numbering or parts are unavailable'); }
    },
    dateTimeFieldFormat(precision: TemporalTimePrecision = 'minute'): TemporalFormatResult<DateTimeFieldFormat> {
      if (!precisionOK(precision)) return reject('dom.temporal-format-invalid', 'Unknown temporal precision');
      const cached = dateTimeFormats[precision]; if (cached !== undefined) return okResult(cached);
      try {
        const source = formatter(`dateTime-${precision}`);
        const groups = dateTimeGroups(source.formatToParts(Date.UTC(2000, 0, 1, 15, 24, 38, 125)));
        const day = groups === undefined ? undefined : editParts(groups.date, false);
        if (!groups || !day) return reject('dom.temporal-format-unavailable', 'Date-time field groups are unsupported');
        const dateFormat = tryCreateDateFieldFormat({ order: day.order as unknown as DateFieldFormatOptions['order'], literals: day.literals as unknown as NonNullable<DateFieldFormatOptions['literals']>, digits: digitsFor(source) });
        if (!dateFormat.ok) return reject('dom.temporal-format-unavailable', 'Date-time date pattern is unsupported');
        const timeFormat = admitTime(source, precision, hour => {
          const observed = dateTimeGroups(source.formatToParts(Date.UTC(2000, 0, 1, hour, 24, 38, 125))), dateParts = observed === undefined ? undefined : editParts(observed.date, false);
          return observed && dateParts && observed.order[0] === groups.order[0] && observed.separator === groups.separator && sameParts(dateParts, day) ? observed.time : undefined;
        });
        if (!timeFormat.ok) return timeFormat;
        const admitted = tryCreateDateTimeFieldFormat({ date: dateFormat.value, time: timeFormat.value, order: groups.order, separator: groups.separator });
        if (!admitted.ok) return reject('dom.temporal-format-unavailable', 'Date-time field pattern is unsupported');
        dateTimeFormats[precision] = admitted.value; return okResult(admitted.value);
      } catch { return reject('dom.temporal-format-unavailable', 'Date-time field numbering or parts are unavailable'); }
    },
    date: (value: DateValue) => format('date', value),
    time: (value: TimeValue, precision: TemporalTimePrecision = 'minute') => precisionOK(precision) ? format(`time-${precision}`, { year: 2000, month: 1, day: 1 }, value) : reject('dom.temporal-format-invalid', 'Unknown temporal precision'),
    dateTime: (value: DateTimeValue, precision: TemporalTimePrecision = 'minute') => precisionOK(precision) ? format(`dateTime-${precision}`, value?.date, value?.time) : reject('dom.temporal-format-invalid', 'Unknown temporal precision'),
    month: (value: CalendarMonthValue, width: 'long' | 'short' | 'narrow' = 'long') =>
      width === 'long' || width === 'short' || width === 'narrow'
        ? format(width === 'long' ? 'month' : `month-${width}`, { year: value?.year, month: value?.month, day: 1 })
        : reject('dom.temporal-format-invalid', 'Unknown month width'),
    year: (value: Pick<DateValue, 'year'>) => format('year', { year: value?.year, month: 1, day: 1 }),
    weekday: (value: DateValue, width: 'long' | 'short' | 'narrow' = 'long') =>
      width === 'long' || width === 'short' || width === 'narrow' ? format(`weekday-${width}`, value)
        : reject('dom.temporal-format-invalid', 'Unknown weekday width'),
    dateAt(instant: number): TemporalFormatResult<DateValue> {
      if (!Number.isFinite(instant) || Math.abs(instant) > 8.64e15) return reject('dom.temporal-format-invalid', 'Instant must be finite Unix milliseconds within native date bounds');
      const parts = clock.formatToParts(instant);
      if (parts.find(part => part.type === 'era')?.value !== adEra) return reject('invalid-date-year', 'Reference date must be in the supported Gregorian era');
      return tryCreateDateValue(Number(parts.find(part => part.type === 'year')?.value), Number(parts.find(part => part.type === 'month')?.value), Number(parts.find(part => part.type === 'day')?.value));
    },
  } satisfies TemporalFormatter));
}
/** Intl part projection only; portable field validation/parsing remain Temporal-owned. */
function editParts(parts: readonly Intl.DateTimeFormatPart[], time: boolean): { order: string[]; literals: string[] } | undefined {
  const order: string[] = [], literals = [''];
  for (const part of parts) {
    if (part.type === 'literal') literals[literals.length - 1] += part.value;
    else if (time ? part.type === 'hour' || part.type === 'minute' || part.type === 'second' || part.type === 'fractionalSecond' || part.type === 'dayPeriod'
      : part.type === 'year' || part.type === 'month' || part.type === 'day') { order.push(part.type === 'fractionalSecond' ? 'millisecond' : part.type); literals.push(''); }
    else return undefined;
  }
  return { order, literals };
}
function sameParts(left: { order: string[]; literals: string[] }, right: { order: string[]; literals: string[] }): boolean {
  return left.order.length === right.order.length && left.literals.length === right.literals.length
    && left.order.every((part, index) => part === right.order[index]) && left.literals.every((literal, index) => literal === right.literals[index]);
}
function dateTimeGroups(parts: readonly Intl.DateTimeFormatPart[]): { date: readonly Intl.DateTimeFormatPart[]; time: readonly Intl.DateTimeFormatPart[]; order: readonly ['date', 'time'] | readonly ['time', 'date']; separator: string } | undefined {
  let first: 'date' | 'time' | undefined, secondStart = -1, firstEnd = -1;
  for (let index = 0; index < parts.length; index++) {
    const type = parts[index]!.type; if (type === 'literal') continue;
    const group = type === 'year' || type === 'month' || type === 'day' ? 'date'
      : type === 'hour' || type === 'minute' || type === 'second' || type === 'fractionalSecond' || type === 'dayPeriod' ? 'time' : undefined;
    if (group === undefined) return undefined;
    first ??= group;
    if (group === first) { if (secondStart >= 0) return undefined; firstEnd = index; }
    else if (secondStart < 0) secondStart = index;
  }
  if (first === undefined || secondStart < 0) return undefined;
  const a = parts.slice(0, firstEnd + 1), b = parts.slice(secondStart), separator = parts.slice(firstEnd + 1, secondStart).map(part => part.value).join('');
  return first === 'date' ? { date: a, time: b, order: ['date', 'time'], separator } : { date: b, time: a, order: ['time', 'date'], separator };
}
