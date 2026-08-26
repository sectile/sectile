import type { ErrorClass, Result, SectileError, SectileErrorCode } from '@sectile/core';

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

export function validateMaxItems(value: number): SectileError | null {
  if (Number.isSafeInteger(value) && value >= 0) return null;
  return {
    class: 'construction',
    code: 'invalid-max-items',
    message: 'maxItems must be a non-negative safe integer.',
    details: { maxItems: value },
  };
}
