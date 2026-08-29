import { validateStableID } from '@sectile/core/identity';
import { failResult, okResult, type SectileError } from '@sectile/core/result';
import type { TabularErrorCode, TabularLimits, TabularResult } from '../contracts.js';

export function ok<T>(value: T): TabularResult<T> {
  return okResult<T, TabularErrorCode>(value);
}

export function fail<T = never>(
  errorClass: SectileError<TabularErrorCode>['class'],
  code: TabularErrorCode,
  message: string,
  details?: Readonly<Record<string, unknown>>,
): TabularResult<T> {
  return failResult<T, TabularErrorCode>(errorClass, code, message, details);
}

export function validateID(
  value: unknown,
  label: string,
  limits: Pick<TabularLimits, 'maxIDCodeUnits'>,
): SectileError<TabularErrorCode> | null {
  const error = validateStableID(value as string, limits.maxIDCodeUnits);
  if (error === null) return null;
  if (error.code !== 'id-code-unit-ceiling-exceeded') {
    return Object.freeze({
      class: 'construction',
      code: 'invalid-id',
      message: `${label} must be a non-empty well-formed string.`,
      details: Object.freeze({ label }),
    });
  }
  return Object.freeze({
    class: 'resource-rejection',
    code: 'id-code-unit-ceiling-exceeded',
    message: `${label} exceeds the configured UTF-16 code-unit ceiling.`,
    details: Object.freeze({
      label,
      actual: typeof value === 'string' ? value.length : 0,
      ceiling: limits.maxIDCodeUnits,
    }),
  });
}
