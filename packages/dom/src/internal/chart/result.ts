import type { Result } from '@sectile/core/result';

export function invalidRenderer<T>(message: string): Result<T> {
  return { ok: false, error: { class: 'construction', code: 'invalid-boundary', message } };
}
