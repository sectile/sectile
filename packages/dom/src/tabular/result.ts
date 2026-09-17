import type {
  TabularDOMRegistrationOptions,
} from './contracts.js';
import type {
  TabularResult,
} from '@sectile/tabular';

export function validateRegistrationGeneration(
  current: number,
  options: TabularDOMRegistrationOptions,
): TabularResult<true> {
  if (options.expectedProjectionGeneration !== undefined && options.expectedProjectionGeneration !== current) {
    return domFailure('stale-revision', 'DOM registration projection generation is stale.', {
      expectedProjectionGeneration: options.expectedProjectionGeneration,
      currentProjectionGeneration: current,
    });
  }
  return ok(true);
}

export function domFailure<T>(
  code: 'invalid-controlled-shape' | 'invalid-column-definition' | 'profile-view-mismatch' | 'stale-revision',
  message: string,
  details?: Readonly<Record<string, unknown>>,
): TabularResult<T> {
  return { ok: false, error: { class: 'construction', code, message, ...(details === undefined ? {} : { details }) } };
}

export function ok<T>(value: T): TabularResult<T> { return { ok: true, value }; }
