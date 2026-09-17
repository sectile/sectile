import { unwrap } from '@sectile/core/result';
import type { TemporalResult } from '../error.js';
import { fail, ok } from '../internal/foundation.js';

export interface TimeValue {
  readonly hour: number;
  readonly minute: number;
  readonly second: number;
  readonly millisecond: number;
}

export function createTimeValue(hour: number, minute = 0, second = 0, millisecond = 0): TimeValue {
  return unwrap(tryCreateTimeValue(hour, minute, second, millisecond));
}

export function tryCreateTimeValue(hour: number, minute = 0, second = 0, millisecond = 0): TemporalResult<TimeValue> {
  for (const [name, value, maximum] of [['hour', hour, 23], ['minute', minute, 59], ['second', second, 59], ['millisecond', millisecond, 999]] as const) {
    if (!Number.isSafeInteger(value) || value < 0 || value > maximum) {
      return fail('construction', `invalid-time-${name}`, `Time ${name} must be an integer from 0 through ${maximum}.`, { [name]: value });
    }
  }
  return ok(Object.freeze({ hour, minute, second, millisecond }));
}

export function parseTimeValue(text: string): TemporalResult<TimeValue> {
  if (typeof text !== 'string') return fail('construction', 'invalid-time-text', 'Time text must be a string.');
  const match = /^(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?$/.exec(text);
  if (match === null) return fail('transition-rejection', 'invalid-time-format', 'Time text must use HH:mm, HH:mm:ss, or HH:mm:ss.SSS.', { text });
  return tryCreateTimeValue(Number(match[1]), Number(match[2]), Number(match[3] ?? 0), Number((match[4] ?? '0').padEnd(3, '0')));
}

export function formatTimeValue(value: TimeValue): string {
  const base = `${pad(value.hour, 2)}:${pad(value.minute, 2)}`;
  if (value.millisecond !== 0) return `${base}:${pad(value.second, 2)}.${pad(value.millisecond, 3)}`;
  return value.second === 0 ? base : `${base}:${pad(value.second, 2)}`;
}

export function compareTimeValues(left: TimeValue, right: TimeValue): -1 | 0 | 1 {
  const a = timeToMilliseconds(left);
  const b = timeToMilliseconds(right);
  return a < b ? -1 : a > b ? 1 : 0;
}

export function addTimeMilliseconds(value: TimeValue, amount: number): TemporalResult<TimeValue> {
  if (!Number.isSafeInteger(amount)) return fail('transition-rejection', 'invalid-time-delta', 'Time delta must be a safe integer.');
  const day = 86_400_000;
  const next = ((timeToMilliseconds(value) + amount) % day + day) % day;
  const hour = Math.floor(next / 3_600_000);
  const minute = Math.floor((next % 3_600_000) / 60_000);
  const second = Math.floor((next % 60_000) / 1_000);
  return tryCreateTimeValue(hour, minute, second, next % 1_000);
}

function timeToMilliseconds(value: TimeValue): number { return ((value.hour * 60 + value.minute) * 60 + value.second) * 1_000 + value.millisecond; }

function pad(value: number, length: number): string { return String(value).padStart(length, '0'); }

export interface TimeRange { readonly start: TimeValue; readonly end: TimeValue }

export function createTimeRange(start: TimeValue, end: TimeValue): TimeRange {
  return unwrap(tryCreateTimeRange(start, end));
}

export function tryCreateTimeRange(start: TimeValue, end: TimeValue): TemporalResult<TimeRange> {
  const validStart = tryCreateTimeValue(start.hour, start.minute, start.second, start.millisecond); if (!validStart.ok) return validStart;
  const validEnd = tryCreateTimeValue(end.hour, end.minute, end.second, end.millisecond); if (!validEnd.ok) return validEnd;
  return compareTimeValues(validStart.value, validEnd.value) <= 0 ? ok(Object.freeze({ start: validStart.value, end: validEnd.value })) : fail('construction', 'inverted-time-range', 'Time range start must not be after end.');
}
