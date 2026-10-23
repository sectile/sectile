import { trySnapshotJSON } from '@sectile/core/json';
import { unwrap } from '@sectile/core/result';
import { tryCreateDateValue, formatDateValue, parseDateValue, type DateValue } from '../values/date.js';
import { validFieldDigits } from '../internal/field-format.js';
import { fail, ok } from '../internal/foundation.js';
import type { TemporalResult } from '../error.js';

export type DateSegment = 'year' | 'month' | 'day';
export interface DateFieldFormatOptions {
  readonly order: readonly [DateSegment, DateSegment, DateSegment];
  readonly literals?: readonly [string, string, string, string];
  readonly digits?: readonly [string, string, string, string, string, string, string, string, string, string];
}
declare const dateFieldFormatBrand: unique symbol;
export interface DateFieldFormat {
  readonly [dateFieldFormatBrand]: true;
  readonly order: DateFieldFormatOptions['order'];
  readonly literals: NonNullable<DateFieldFormatOptions['literals']>;
  readonly digits: NonNullable<DateFieldFormatOptions['digits']>;
}
interface DateFieldLayout { readonly starts: readonly number[]; readonly ends: readonly number[]; readonly length: number }
const dateFieldLayouts = /* @__PURE__ */ new WeakMap<DateFieldFormat, DateFieldLayout>();
const formatLimits = /* @__PURE__ */ Object.freeze({ maxInputBytes: 2048, maxInputValues: 32, maxInputDepth: 3, maxStringCodeUnits: 32 });

export function createDateFieldFormat(options: DateFieldFormatOptions): DateFieldFormat {
  return unwrap(tryCreateDateFieldFormat(options));
}
export function tryCreateDateFieldFormat(options: DateFieldFormatOptions): TemporalResult<DateFieldFormat> {
  const captured = trySnapshotJSON(options, { limits: formatLimits });
  if (!captured.ok) return captured;
  const data = captured.value.data;
  if (!data || typeof data !== 'object' || Array.isArray(data)) return invalidDateFieldFormat();
  const input = data as Readonly<Record<string, unknown>>;
  if (Object.keys(input).some(key => key !== 'order' && key !== 'literals' && key !== 'digits')) return invalidDateFieldFormat();
  const order = input['order'], literals = input['literals'] === undefined ? ['', '-', '-', ''] : input['literals'], digits = input['digits'] === undefined ? ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'] : input['digits'];
  if (!Array.isArray(order) || order.length !== 3 || new Set(order).size !== 3 || order.some(part => part !== 'year' && part !== 'month' && part !== 'day')) return invalidDateFieldFormat();
  if (!Array.isArray(literals) || literals.length !== 4 || literals.some(text => typeof text !== 'string')) return invalidDateFieldFormat();
  if (!validFieldDigits(digits)) return invalidDateFieldFormat();
  const format = Object.freeze({ order: Object.freeze(order), literals: Object.freeze(literals), digits: Object.freeze(digits) }) as unknown as DateFieldFormat;
  const starts: number[] = [], ends: number[] = [];
  let offset = format.literals[0].length;
  for (let index = 0; index < 3; index++) {
    starts.push(offset); offset += (format.order[index] === 'year' ? 4 : 2) * format.digits[0].length;
    ends.push(offset); offset += format.literals[index + 1]!.length;
  }
  dateFieldLayouts.set(format, { starts, ends, length: offset });
  return ok(format);
}
export function invalidDateFieldFormat(): TemporalResult<never> {
  return fail('construction', 'invalid-date-field-format', 'Date field format requires three date segments, four literals and ten distinct equal-width digit glyphs.');
}
/** Internal issued-layout access; not reexported by the public field entry. */
export function dateFieldFormatLayout(format: DateFieldFormat): DateFieldLayout | undefined { return dateFieldLayouts.get(format); }

export function formatDateFieldValue(value: DateValue, format?: DateFieldFormat): string {
  if (format === undefined) return formatDateValue(value);
  if (!dateFieldLayouts.has(format)) return unwrap(invalidDateFieldFormat());
  const valid = unwrap(tryCreateDateValue(value.year, value.month, value.day));
  let text = format.literals[0];
  for (let index = 0; index < 3; index++) {
    const segment = format.order[index]!;
    const digits = String(valid[segment]).padStart(segment === 'year' ? 4 : 2, '0');
    for (const digit of digits) text += format.digits[digit.charCodeAt(0) - 48];
    text += format.literals[index + 1];
  }
  return text;
}
export function parseDateFieldValue(text: string, format?: DateFieldFormat): TemporalResult<DateValue> {
  if (format === undefined) return parseDateValue(text);
  const layout = dateFieldLayouts.get(format); if (layout === undefined) return invalidDateFieldFormat();
  if (typeof text !== 'string') return fail('construction', 'invalid-date-text', 'Date text must be a string.');
  if (text.length !== layout.length) return fail('transition-rejection', 'invalid-date-format', 'Date text must match its field format.');
  const values = { year: 0, month: 0, day: 0 };
  let offset = 0;
  for (let index = 0; index < 3; index++) {
    const literal = format.literals[index]!;
    if (!text.startsWith(literal, offset)) return fail('transition-rejection', 'invalid-date-format', 'Date text must match its field format.');
    offset += literal.length;
    let value = 0;
    for (; offset < layout.ends[index]!; offset += format.digits[0].length) {
      const digit = format.digits.indexOf(text.slice(offset, offset + format.digits[0].length));
      if (digit < 0) return fail('transition-rejection', 'invalid-date-format', 'Date text must use its field digit glyphs.');
      value = value * 10 + digit;
    }
    values[format.order[index]!] = value;
  }
  if (text.slice(offset) !== format.literals[3]) return fail('transition-rejection', 'invalid-date-format', 'Date text must match its field format.');
  return tryCreateDateValue(values.year, values.month, values.day);
}
