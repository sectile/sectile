import { trySnapshotJSON } from '@sectile/core/json';
import { unwrap } from '@sectile/core/result';
import { tryCreateTimeValue, formatTimeValue, parseTimeValue, type TimeValue } from '../values/time.js';
import { validFieldDigits, type FieldDigits } from '../internal/field-format.js';
import { fail, ok } from '../internal/foundation.js';
import type { TemporalResult } from '../error.js';

export type TimeFieldPrecision = 'minute' | 'second' | 'millisecond';
export type TimeFieldHourCycle = 'h11' | 'h12' | 'h23' | 'h24';
export type TimeFieldFormatPart = 'hour' | 'minute' | 'second' | 'millisecond' | 'dayPeriod';
export interface TimeFieldFormatOptions {
  readonly precision: TimeFieldPrecision;
  readonly hourCycle?: TimeFieldHourCycle;
  readonly order?: readonly TimeFieldFormatPart[];
  readonly literals?: readonly string[];
  readonly digits?: FieldDigits;
  readonly dayPeriods?: readonly [string, string];
}
declare const timeFieldFormatBrand: unique symbol;
export interface TimeFieldFormat {
  readonly [timeFieldFormatBrand]: true;
  readonly precision: TimeFieldPrecision; readonly hourCycle: TimeFieldHourCycle;
  readonly order: readonly TimeFieldFormatPart[]; readonly literals: readonly string[];
  readonly digits: FieldDigits; readonly dayPeriods?: readonly [string, string];
}
interface Layout { readonly starts: readonly number[]; readonly ends: readonly number[]; readonly length: number }
const layouts = /* @__PURE__ */ new WeakMap<TimeFieldFormat, readonly Layout[]>();
const limits = /* @__PURE__ */ Object.freeze({ maxInputBytes: 4096, maxInputValues: 48, maxInputDepth: 3, maxStringCodeUnits: 32 });
const invalid = (): TemporalResult<never> => fail('construction', 'invalid-time-field-format', 'Time field format requires exact precision, cycle, parts, literals and digit glyphs.');
const mismatch = (): TemporalResult<never> => fail('transition-rejection', 'invalid-time-format', 'Time text must match its admitted field format.');
export function createTimeFieldFormat(options: TimeFieldFormatOptions): TimeFieldFormat { return unwrap(tryCreateTimeFieldFormat(options)); }
export function tryCreateTimeFieldFormat(options: TimeFieldFormatOptions): TemporalResult<TimeFieldFormat> {
  const captured = trySnapshotJSON(options, { limits }); if (!captured.ok) return captured;
  const data = captured.value.data; if (!data || typeof data !== 'object' || Array.isArray(data)) return invalid();
  const input = data as Readonly<Record<string, unknown>>;
  if (Object.keys(input).some(key => !['precision', 'hourCycle', 'order', 'literals', 'digits', 'dayPeriods'].includes(key))) return invalid();
  const precision = input['precision'], cycle = input['hourCycle'] === undefined ? 'h23' : input['hourCycle'];
  if (precision !== 'minute' && precision !== 'second' && precision !== 'millisecond') return invalid();
  if (cycle !== 'h11' && cycle !== 'h12' && cycle !== 'h23' && cycle !== 'h24') return invalid();
  const half = cycle === 'h11' || cycle === 'h12';
  const parts: TimeFieldFormatPart[] = ['hour', 'minute'];
  if (precision !== 'minute') parts.push('second'); if (precision === 'millisecond') parts.push('millisecond'); if (half) parts.push('dayPeriod');
  const order = input['order'] === undefined ? parts : input['order'];
  if (!Array.isArray(order) || order.length !== parts.length || new Set(order).size !== parts.length || order.some(part => !parts.includes(part as TimeFieldFormatPart))) return invalid();
  const literals = input['literals'] === undefined ? [...order.map((part, index) => index === 0 ? '' : part === 'dayPeriod' ? ' ' : part === 'millisecond' ? '.' : ':'), ''] : input['literals'];
  const digits = input['digits'] === undefined ? ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'] : input['digits'];
  const periods = input['dayPeriods'] === undefined ? (half ? ['AM', 'PM'] : undefined) : input['dayPeriods'];
  if (!Array.isArray(literals) || literals.length !== order.length + 1 || literals.some(text => typeof text !== 'string') || !validFieldDigits(digits)) return invalid();
  if (half ? !Array.isArray(periods) || periods.length !== 2 || periods.some(text => typeof text !== 'string' || !text.length) || periods[0] === periods[1] : periods !== undefined) return invalid();
  const format = Object.freeze({ precision, hourCycle: cycle, order: Object.freeze(order), literals: Object.freeze(literals), digits: Object.freeze(digits),
    ...(half ? { dayPeriods: Object.freeze(periods) } : {}) }) as unknown as TimeFieldFormat;
  const make = (period: number): Layout => {
    const starts: number[] = [], ends: number[] = []; let offset = format.literals[0]!.length;
    for (let index = 0; index < format.order.length; index++) {
      const part = format.order[index]!; starts.push(offset);
      offset += part === 'dayPeriod' ? format.dayPeriods![period]!.length : (part === 'millisecond' ? 3 : 2) * format.digits[0].length;
      ends.push(offset); offset += format.literals[index + 1]!.length;
    }
    return { starts, ends, length: offset };
  };
  layouts.set(format, half ? [make(0), make(1)] : [make(0)]); return ok(format);
}

export function formatTimeFieldValue(value: TimeValue, format?: TimeFieldFormat): string {
  return unwrap(tryFormatTimeFieldValue(value, format));
}
/** Internal issued-layout access shared by serialization and the TimeField owner. */
export function timeFieldFormatLayout(format: TimeFieldFormat, value: TimeValue | null): TemporalResult<Layout> {
  const admitted = layouts.get(format); if (!admitted) return invalid();
  if (value !== null && (format.precision === 'minute' && (value.second !== 0 || value.millisecond !== 0) || format.precision === 'second' && value.millisecond !== 0))
    return fail('construction', 'time-field-format-precision-loss', 'Time field precision cannot discard nonzero components.');
  return ok(admitted[value !== null && value.hour >= 12 && admitted.length > 1 ? 1 : 0]!);
}
export function timeFieldFormatMaximum(format: TimeFieldFormat): TemporalResult<number> {
  const admitted = layouts.get(format); return admitted ? ok(Math.max(admitted[0]!.length, admitted[1]?.length ?? 0)) : invalid();
}
export function tryFormatTimeFieldValue(value: TimeValue, format?: TimeFieldFormat): TemporalResult<string> {
  if (format === undefined) return ok(formatTimeValue(value));
  const issued = timeFieldFormatLayout(format, null); if (!issued.ok) return issued;
  const normalized = tryCreateTimeValue(value.hour, value.minute, value.second, value.millisecond); if (!normalized.ok) return normalized;
  const valid = normalized.value;
  const layout = timeFieldFormatLayout(format, valid); if (!layout.ok) return layout;
  const hour = format.hourCycle === 'h11' ? valid.hour % 12 : format.hourCycle === 'h12' ? valid.hour % 12 || 12 : format.hourCycle === 'h24' ? valid.hour || 24 : valid.hour;
  let text = format.literals[0]!;
  for (let index = 0; index < format.order.length; index++) {
    const part = format.order[index]!;
    if (part === 'dayPeriod') text += format.dayPeriods![valid.hour < 12 ? 0 : 1];
    else {
      const number = part === 'hour' ? hour : valid[part];
      for (const digit of String(number).padStart(part === 'millisecond' ? 3 : 2, '0')) text += format.digits[digit.charCodeAt(0) - 48];
    }
    text += format.literals[index + 1]!;
  }
  return ok(text);
}

export function parseTimeFieldValue(text: string, format?: TimeFieldFormat): TemporalResult<TimeValue> {
  if (format === undefined) return parseTimeValue(text);
  const admitted = layouts.get(format); if (!admitted) return invalid();
  if (typeof text !== 'string') return fail('construction', 'invalid-time-text', 'Time text must be a string.');
  for (let period = 0; period < admitted.length; period++) {
    const layout = admitted[period]!; if (text.length !== layout.length) continue;
    const values = { hour: 0, minute: 0, second: 0, millisecond: 0 }; let offset = 0, matches = true;
    for (let index = 0; index < format.order.length; index++) {
      const part = format.order[index]!, literal = format.literals[index]!;
      if (!text.startsWith(literal, offset)) { matches = false; break; } offset += literal.length;
      if (part === 'dayPeriod') {
        if (text.slice(offset, layout.ends[index]) !== format.dayPeriods![period]) { matches = false; break; }
        offset = layout.ends[index]!;
      } else {
        let number = 0;
        for (; offset < layout.ends[index]!; offset += format.digits[0].length) {
          const digit = format.digits.indexOf(text.slice(offset, offset + format.digits[0].length));
          if (digit < 0) { matches = false; break; } number = number * 10 + digit;
        }
        if (!matches) break; values[part] = number;
      }
    }
    if (!matches || text.slice(offset) !== format.literals[format.order.length]) continue;
    if (format.hourCycle === 'h12') { if (values.hour < 1 || values.hour > 12) continue; values.hour = values.hour % 12 + period * 12; }
    else if (format.hourCycle === 'h11') { if (values.hour > 11) continue; values.hour += period * 12; }
    else if (format.hourCycle === 'h24') { if (values.hour < 1 || values.hour > 24) continue; values.hour %= 24; }
    return tryCreateTimeValue(values.hour, values.minute, values.second, values.millisecond);
  }
  return mismatch();
}
