import { fail, ok, validateID } from './foundation.js';
import type { TabularGroupID, TabularLimits, TabularResult } from '../contracts.js';

const expansionLimits = new WeakMap<object, Pick<TabularLimits, 'maxSelectionIDs' | 'maxIDCodeUnits'>>();
type CanonicalExpansion = readonly TabularGroupID[];

export function canonicalizeTabularExpansion(
  expansion: readonly TabularGroupID[],
  limits: Pick<TabularLimits, 'maxSelectionIDs' | 'maxIDCodeUnits'>,
): TabularResult<readonly TabularGroupID[]> {
  if (!Array.isArray(expansion)) {
    return fail('construction', 'invalid-controlled-shape', 'Expansion must be an array.');
  }
  const current = expansionLimits.get(expansion);
  if (current !== undefined
    && current.maxSelectionIDs === limits.maxSelectionIDs
    && current.maxIDCodeUnits === limits.maxIDCodeUnits) return ok(expansion);
  if (expansion.length > limits.maxSelectionIDs) {
    return fail('resource-rejection', 'selection-id-ceiling-exceeded', 'Expansion IDs exceed the configured selection identity ceiling.', {
      actual: expansion.length,
      ceiling: limits.maxSelectionIDs,
    });
  }
  const seen = new Set<TabularGroupID>();
  for (const id of expansion) {
    const error = validateID(id, 'expansionID', limits);
    if (error !== null) return { ok: false, error };
    if (seen.has(id)) return fail('construction', 'duplicate-identity', 'Expansion IDs must be unique.', { id });
    seen.add(id);
  }
  const result = Object.freeze([...expansion]) as CanonicalExpansion;
  expansionLimits.set(result, limits);
  return ok(result);
}
