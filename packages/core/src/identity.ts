import type { Result, StableID } from './shared.js';
import { DEFAULT_MAX_ID_CODE_UNITS } from './shared.js';
import {
  validateSafeCeiling,
  validateStableID,
  validateUniqueIDs,
} from './internal/kernel/foundation.js';

export interface StableIDNormalizationOptions {
  readonly maxIDCodeUnits?: number;
}

export { validateStableID };

export function sameStableIDOrder<ID extends StableID>(
  left: readonly ID[],
  right: readonly ID[],
): boolean {
  return left === right || (
    left.length === right.length
    && left.every((id, index) => id === right[index])
  );
}

export function tryNormalizeStableIDs<ID extends StableID>(
  ids: readonly ID[],
  options: StableIDNormalizationOptions = {},
): Result<readonly ID[]> {
  const maxIDCodeUnits = options.maxIDCodeUnits ?? DEFAULT_MAX_ID_CODE_UNITS;
  const ceilingError = validateSafeCeiling(maxIDCodeUnits, 'maxIDCodeUnits', 1);
  if (ceilingError !== null) return { ok: false, error: ceilingError };
  return validateUniqueIDs(ids, maxIDCodeUnits);
}

export type { Result, SectileError, StableID } from './shared.js';
export { DEFAULT_MAX_ID_CODE_UNITS } from './shared.js';
