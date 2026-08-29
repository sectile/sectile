import type { ErrorClass } from '@sectile/core';
import { failResult, okResult } from '@sectile/core/result';
import type { TemporalErrorCode, TemporalResult } from '../error.js';

export function ok<T>(value: T): TemporalResult<T> {
  return okResult<T, TemporalErrorCode>(value);
}

export function fail<T = never, Code extends TemporalErrorCode = TemporalErrorCode>(
  errorClass: ErrorClass,
  code: Code,
  message: string,
  details?: Readonly<Record<string, unknown>>,
): TemporalResult<T, Code> {
  return failResult<T, Code>(errorClass, code, message, details);
}

export function freezeArray<T>(values: readonly T[]): readonly T[] {
  return Object.freeze([...values]);
}
