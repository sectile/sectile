import { FormResultError, type FormError, type FormErrorCode, type FormResult } from '../error.js';

export function ok<T>(value: T): FormResult<T> {
  return { ok: true, value };
}

export function fail<T = never, Code extends FormErrorCode = FormErrorCode>(
  errorClass: FormError['class'],
  code: Code,
  message: string,
  details?: Readonly<Record<string, unknown>>,
): FormResult<T, Code> {
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

export function unwrap<T, Code extends string>(result: FormResult<T, Code>): T {
  if (result.ok) return result.value;
  throw new FormResultError(result.error);
}
