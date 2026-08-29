import type { ErrorClass } from '@sectile/core';
import { failResult, okResult } from '@sectile/core/result';
import type { VirtualError, VirtualErrorCode, VirtualResult } from '../error.js';

export function ok<T>(value: T): VirtualResult<T> {
  return okResult<T, VirtualErrorCode>(value);
}

export function fail<T = never, Code extends VirtualErrorCode = VirtualErrorCode>(
  errorClass: ErrorClass,
  code: Code,
  message: string,
  details?: Readonly<Record<string, unknown>>,
): VirtualResult<T, Code> {
  return failResult<T, Code>(errorClass, code, message, details);
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
