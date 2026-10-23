import { trySnapshotJSON } from '@sectile/core/json';
import { unwrap } from '@sectile/core/result';
import { dateFieldFormatLayout, formatDateFieldValue, parseDateFieldValue, type DateFieldFormat, type DateSegment } from './date-format.js';
import { timeFieldFormatLayout, timeFieldFormatMaximum, tryFormatTimeFieldValue, parseTimeFieldValue, type TimeFieldFormat, type TimeFieldFormatPart } from './time-format.js';
import { tryCreateDateTimeValue, formatDateTimeValue, parseDateTimeValue, type DateTimeValue } from '../values/date-time.js';
import { fail, ok } from '../internal/foundation.js';
import type { TemporalResult } from '../error.js';

export type DateTimeFieldFormatPart = DateSegment | TimeFieldFormatPart;
export interface DateTimeFieldFormatOptions {
  readonly date: DateFieldFormat;
  readonly time: TimeFieldFormat;
  readonly order?: readonly ['date', 'time'] | readonly ['time', 'date'];
  readonly separator?: string;
}
declare const dateTimeFieldFormatBrand: unique symbol;
export interface DateTimeFieldFormat {
  readonly [dateTimeFieldFormatBrand]: true;
  readonly date: DateFieldFormat; readonly time: TimeFieldFormat;
  readonly order: NonNullable<DateTimeFieldFormatOptions['order']>; readonly separator: string;
}
interface Layout { readonly parts: readonly DateTimeFieldFormatPart[]; readonly starts: readonly number[]; readonly ends: readonly number[]; readonly length: number; readonly dateStart: number; readonly timeStart: number; readonly dateLength: number; readonly timeLength: number }
interface Metadata { readonly layouts: readonly Layout[]; readonly maximum: number }
const formats = /* @__PURE__ */ new WeakMap<DateTimeFieldFormat, Metadata>();
const limits = /* @__PURE__ */ Object.freeze({ maxInputBytes: 8192, maxInputValues: 96, maxInputDepth: 4, maxStringCodeUnits: 32 });
const invalid = (): TemporalResult<never> => fail('construction', 'invalid-date-time-field-format', 'Date-time field format requires issued date/time formats, an exact group order and a bounded separator.');
const mismatch = (): TemporalResult<never> => fail('transition-rejection', 'invalid-date-time-format', 'Date-time text must match its field format.');

export function createDateTimeFieldFormat(options: DateTimeFieldFormatOptions): DateTimeFieldFormat { return unwrap(tryCreateDateTimeFieldFormat(options)); }
export function tryCreateDateTimeFieldFormat(options: DateTimeFieldFormatOptions): TemporalResult<DateTimeFieldFormat> {
  const captured = trySnapshotJSON(options, { limits }); if (!captured.ok) return captured;
  const data = captured.value.data; if (!data || typeof data !== 'object' || Array.isArray(data)) return invalid();
  const input = data as Readonly<Record<string, unknown>>;
  if (Object.keys(input).some(key => !['date', 'time', 'order', 'separator'].includes(key))) return invalid();
  const order = input['order'] === undefined ? ['date', 'time'] : input['order'], separator = input['separator'] === undefined ? ' ' : input['separator'];
  if (!Array.isArray(order) || order.length !== 2 || !(order[0] === 'date' && order[1] === 'time' || order[0] === 'time' && order[1] === 'date') || typeof separator !== 'string') return invalid();
  let date: DateFieldFormat, time: TimeFieldFormat;
  try {
    date = Object.getOwnPropertyDescriptor(options, 'date')?.value as DateFieldFormat;
    time = Object.getOwnPropertyDescriptor(options, 'time')?.value as TimeFieldFormat;
  } catch { return invalid(); }
  const day = dateFieldFormatLayout(date), morning = timeFieldFormatLayout(time, null);
  if (day === undefined || !morning.ok) return invalid();
  const afternoon = timeFieldFormatLayout(time, { hour: 15, minute: 0, second: 0, millisecond: 0 });
  const maximum = timeFieldFormatMaximum(time); if (!afternoon.ok || !maximum.ok) return invalid();
  const format = Object.freeze({ date, time, order: Object.freeze(order), separator }) as unknown as DateTimeFieldFormat;
  const combine = (clock: typeof morning.value): Layout => {
    const dateStart = order[0] === 'date' ? 0 : clock.length + separator.length;
    const timeStart = order[0] === 'time' ? 0 : day.length + separator.length;
    const parts: DateTimeFieldFormatPart[] = [], starts: number[] = [], ends: number[] = [];
    for (const group of order) {
      const layout = group === 'date' ? day : clock, offset = group === 'date' ? dateStart : timeStart;
      const names = group === 'date' ? date.order : time.order;
      for (let index = 0; index < names.length; index++) { parts.push(names[index]!); starts.push(offset + layout.starts[index]!); ends.push(offset + layout.ends[index]!); }
    }
    return { parts, starts, ends, length: day.length + separator.length + clock.length, dateStart, timeStart, dateLength: day.length, timeLength: clock.length };
  };
  const layouts = afternoon.value === morning.value ? [combine(morning.value)] : [combine(morning.value), combine(afternoon.value)];
  formats.set(format, { layouts, maximum: day.length + separator.length + maximum.value }); return ok(format);
}

/** Private layout access for the DateTime state owner; not a public entry export. */
export function dateTimeFieldFormatLayout(format: DateTimeFieldFormat, value: DateTimeValue | null): TemporalResult<Layout> {
  const metadata = formats.get(format); if (!metadata) return invalid();
  const clock = timeFieldFormatLayout(format.time, value === null ? null : value.time); if (!clock.ok) return clock;
  return ok(metadata.layouts[value !== null && value.time.hour >= 12 && metadata.layouts.length > 1 ? 1 : 0]!);
}
export function dateTimeFieldFormatMaximum(format: DateTimeFieldFormat): TemporalResult<number> {
  const metadata = formats.get(format); return metadata ? ok(metadata.maximum) : invalid();
}
export function formatDateTimeFieldValue(value: DateTimeValue, format?: DateTimeFieldFormat): string { return unwrap(tryFormatDateTimeFieldValue(value, format)); }
export function tryFormatDateTimeFieldValue(value: DateTimeValue, format?: DateTimeFieldFormat): TemporalResult<string> {
  if (format === undefined) return ok(formatDateTimeValue(value));
  if (!formats.has(format)) return invalid();
  const normalized = tryCreateDateTimeValue(value.date, value.time); if (!normalized.ok) return normalized;
  const clock = tryFormatTimeFieldValue(normalized.value.time, format.time); if (!clock.ok) return clock;
  const day = formatDateFieldValue(normalized.value.date, format.date);
  return ok(format.order[0] === 'date' ? day + format.separator + clock.value : clock.value + format.separator + day);
}
export function parseDateTimeFieldValue(text: string, format?: DateTimeFieldFormat): TemporalResult<DateTimeValue> {
  if (format === undefined) return parseDateTimeValue(text);
  const metadata = formats.get(format); if (!metadata) return invalid();
  if (typeof text !== 'string') return fail('construction', 'invalid-date-time-text', 'Date-time text must be a string.');
  for (const layout of metadata.layouts) {
    if (text.length !== layout.length) continue;
    const separatorStart = format.order[0] === 'date' ? layout.dateLength : layout.timeLength;
    if (text.slice(separatorStart, separatorStart + format.separator.length) !== format.separator) continue;
    const day = parseDateFieldValue(text.slice(layout.dateStart, layout.dateStart + layout.dateLength), format.date); if (!day.ok) return day;
    const clock = parseTimeFieldValue(text.slice(layout.timeStart, layout.timeStart + layout.timeLength), format.time); if (!clock.ok) return clock;
    return tryCreateDateTimeValue(day.value, clock.value);
  }
  return mismatch();
}
