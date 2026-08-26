import type { ErrorClass } from '@sectile/core';
import type { TemporalErrorCode, TemporalResult } from '../error.js';

export function ok<T>(value: T): TemporalResult<T> {
  return { ok: true, value };
}

export function fail<T = never, Code extends TemporalErrorCode = TemporalErrorCode>(
  errorClass: ErrorClass,
  code: Code,
  message: string,
  details?: Readonly<Record<string, unknown>>,
): TemporalResult<T, Code> {
  return {
    ok: false,
    error: {
      class: errorClass,
      code,
      message,
      ...(details === undefined ? {} : { details }),
    },
  };
}

export function freezeArray<T>(values: readonly T[]): readonly T[] {
  return Object.freeze([...values]);
}
