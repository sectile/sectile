import type { ErrorClass, Result, SectileErrorCode } from '@sectile/core';

export function ok<T>(value: T): Result<T> {
  return { ok: true, value };
}

export function fail<T = never, Code extends SectileErrorCode = SectileErrorCode>(
  errorClass: ErrorClass,
  code: Code,
  message: string,
  details?: Readonly<Record<string, unknown>>,
): Result<T, Code> {
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
