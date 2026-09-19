import { DEFAULT_MAX_ID_CODE_UNITS } from '@sectile/core/identity';
import { failResult, okResult, type Result } from '@sectile/core/result';
import type { ContentErrorCode } from './error.js';

export interface ContentLimits {
  readonly maxNodes: number;
  readonly maxDepth: number;
  readonly maxIDCodeUnits: number;
  readonly maxStringCodeUnits: number;
  readonly maxTotalStringCodeUnits: number;
  readonly maxValues: number;
  readonly maxMarksPerText: number;
  readonly maxSlotsPerComponent: number;
  readonly maxComponents: number;
  readonly maxGroups: number;
  readonly maxOperationsPerTransform: number;
}

export const DEFAULT_CONTENT_LIMITS: ContentLimits = Object.freeze({
  maxNodes: 100_000,
  maxDepth: 256,
  maxIDCodeUnits: DEFAULT_MAX_ID_CODE_UNITS,
  maxStringCodeUnits: 1_048_576,
  maxTotalStringCodeUnits: 16_777_216,
  maxValues: 1_000_000,
  maxMarksPerText: 32,
  maxSlotsPerComponent: 64,
  maxComponents: 10_000,
  maxGroups: 10_000,
  maxOperationsPerTransform: 4_096,
});

export function normalizeContentLimits(
  input: Partial<ContentLimits> | undefined,
): Result<ContentLimits, ContentErrorCode> {
  if (
    input !== undefined
    && (
      input === null
      || typeof input !== 'object'
      || Array.isArray(input)
    )
  ) {
    return failResult(
      'construction',
      'content-limit-invalid',
      'Content limits must be an object.',
    );
  }

  const limits = { ...DEFAULT_CONTENT_LIMITS, ...input };
  for (const [key, value] of Object.entries(limits)) {
    if (!Number.isSafeInteger(value) || value <= 0) {
      return failResult(
        'construction',
        'content-limit-invalid',
        'Content limits must be positive safe integers.',
        { key, value },
      );
    }
  }

  return okResult(Object.freeze(limits));
}

export function contentCeilingExceeded<T>(
  code: Extract<
    ContentErrorCode,
    `content-${string}-ceiling-exceeded`
  >,
  actual: number,
  ceiling: number,
  details: Readonly<Record<string, unknown>> = {},
): Result<T, ContentErrorCode> {
  return failResult(
    'resource-rejection',
    code,
    'Portable Content input exceeds its configured ceiling.',
    {
      actual,
      ceiling,
      ...details,
    },
  );
}
