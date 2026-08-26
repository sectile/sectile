import type { ErrorClass } from '@sectile/core';
import type { VirtualError, VirtualErrorCode, VirtualResult } from '../error.js';

export function ok<T>(value: T): VirtualResult<T> {
  return { ok: true, value };
}

export function fail<T = never, Code extends VirtualErrorCode = VirtualErrorCode>(
  errorClass: ErrorClass,
  code: Code,
  message: string,
  details?: Readonly<Record<string, unknown>>,
): VirtualResult<T, Code> {
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

export function validateMaxItems(value: number): VirtualError | null {
  if (Number.isSafeInteger(value) && value >= 0) return null;
  return {
    class: 'construction',
    code: 'invalid-max-items',
    message: 'maxItems must be a non-negative safe integer.',
    details: { maxItems: value },
  };
}
