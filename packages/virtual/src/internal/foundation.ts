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

export function preflightSequenceSplice(
  domain: { readonly size: number; readonly maxItems: number },
  index: number,
  deleteCount: number,
  insertedCount: number,
): VirtualResult<true> {
  const size = domain.size;
  if (index > size || deleteCount > size - index) {
    return fail(
      'transition-rejection',
      'sequence-patch-invalid',
      'Sequence patch must identify a valid post-removal destination and source range.',
      { index, deleteCount, insertedCount, size },
    );
  }
  const retainedSize = size - deleteCount;
  if (insertedCount > domain.maxItems - retainedSize) {
    return fail('resource-rejection', 'item-ceiling-exceeded', 'Sequence exceeds maxItems.', {
      size: retainedSize + insertedCount,
      maxItems: domain.maxItems,
    });
  }
  return ok(true);
}
