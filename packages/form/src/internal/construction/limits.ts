import type { FormErrorCode, FormResult as Result } from '../../error.js';
import { fail, ok } from '../result.js';

export interface Limits {
  readonly maxEntries: number;
  readonly maxPathSegments: number;
  readonly maxArrayIndex: number;
  /** Field/issue records plus related-ID slots; retained by canonical Form states for later issue mutations. */
  readonly maxOutputNodes: number;
  readonly maxPathCodeUnits: number;
}

export const DEFAULT_LIMITS: Limits = Object.freeze({
  maxEntries: 100_000,
  maxPathSegments: 1_024,
  maxArrayIndex: 100_000,
  maxOutputNodes: 200_000,
  maxPathCodeUnits: 1_048_576,
});

export function normalizeLimits(
  input: Partial<Limits> | undefined,
): Result<Limits> {
  if (input !== undefined && (input === null || typeof input !== 'object' || Array.isArray(input))) {
    return fail('construction', 'form-limit-invalid', 'Form construction limits must be an object.');
  }
  const limits = { ...DEFAULT_LIMITS, ...input };
  for (const [key, value] of Object.entries(limits)) {
    if (!Number.isSafeInteger(value) || value <= 0) {
      return fail('construction', 'form-limit-invalid', 'Form construction limits must be positive safe integers.', { key, value });
    }
  }
  return ok(Object.freeze(limits));
}

export function exceeded<T>(
  code: Extract<FormErrorCode, `${string}-ceiling-exceeded`>,
  actual: number,
  ceiling: number,
): Result<T> {
  return fail('resource-rejection', code, 'Form construction input exceeds its configured ceiling.', { actual, ceiling });
}
