import type { ErrorClass } from '@sectile/core/result';
import type { ChartErrorCode, ChartResult } from '../result.js';

export function chartOK<T>(value: T): ChartResult<T> {
  return { ok: true, value };
}

export function chartFail<T = never>(
  errorClass: ErrorClass,
  code: ChartErrorCode,
  message: string,
  details?: Readonly<Record<string, unknown>>,
): ChartResult<T> {
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
