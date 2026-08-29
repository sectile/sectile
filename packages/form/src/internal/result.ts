import { failResult, okResult } from '@sectile/core/result';
import { FormResultError, type FormError, type FormErrorCode, type FormResult } from '../error.js';

export function ok<T>(value: T): FormResult<T> {
  return okResult<T, FormErrorCode>(value);
}

export function fail<T = never, Code extends FormErrorCode = FormErrorCode>(
  errorClass: FormError['class'],
  code: Code,
  message: string,
  details?: Readonly<Record<string, unknown>>,
): FormResult<T, Code> {
  return failResult<T, Code>(errorClass, code, message, details);
}

export function unwrap<T, Code extends string>(result: FormResult<T, Code>): T {
  if (result.ok) return result.value;
  throw new FormResultError(result.error);
}
