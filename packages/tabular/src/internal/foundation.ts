import type { SectileError } from '@sectile/core/result';
import type { TabularErrorCode, TabularLimits, TabularResult } from '../contracts.js';

export function ok<T>(value: T): TabularResult<T> {
  return Object.freeze({ ok: true, value });
}

export function fail<T = never>(
  errorClass: SectileError<TabularErrorCode>['class'],
  code: TabularErrorCode,
  message: string,
  details?: Readonly<Record<string, unknown>>,
): TabularResult<T> {
  return Object.freeze({
    ok: false,
    error: Object.freeze({
      class: errorClass,
      code,
      message,
      ...(details === undefined ? {} : { details: Object.freeze({ ...details }) }),
    }),
  });
}

export function validateID(
  value: unknown,
  label: string,
  limits: Pick<TabularLimits, 'maxIDCodeUnits'>,
): SectileError<TabularErrorCode> | null {
  if (typeof value !== 'string' || value.length === 0 || !isWellFormed(value)) {
    return Object.freeze({
      class: 'construction',
      code: 'invalid-id',
      message: `${label} must be a non-empty well-formed string.`,
      details: Object.freeze({ label }),
    });
  }
  if (value.length > limits.maxIDCodeUnits) {
    return Object.freeze({
      class: 'resource-rejection',
      code: 'id-code-unit-ceiling-exceeded',
      message: `${label} exceeds the configured UTF-16 code-unit ceiling.`,
      details: Object.freeze({ label, actual: value.length, ceiling: limits.maxIDCodeUnits }),
    });
  }
  return null;
}

function isWellFormed(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code >= 0xd800 && code <= 0xdbff) {
      if (index + 1 >= value.length) return false;
      const next = value.charCodeAt(index + 1);
      if (next < 0xdc00 || next > 0xdfff) return false;
      index += 1;
    } else if (code >= 0xdc00 && code <= 0xdfff) {
      return false;
    }
  }
  return true;
}
