import { fail, ok, validateID } from './foundation.js';
import type { TabularGroupID, TabularLimits, TabularResult } from '../contracts.js';

const EXPANSION_LIMITS = Symbol('sectile.tabular.expansion-limits');
type CanonicalExpansion = readonly TabularGroupID[] & {
  readonly [EXPANSION_LIMITS]: Pick<TabularLimits, 'maxSelectionIDs' | 'maxIDCodeUnits'>;
};

export function canonicalizeTabularExpansion(
  expansion: readonly TabularGroupID[],
  limits: Pick<TabularLimits, 'maxSelectionIDs' | 'maxIDCodeUnits'>,
): TabularResult<readonly TabularGroupID[]> {
  if (!Array.isArray(expansion)) {
    return fail('construction', 'invalid-controlled-shape', 'Expansion must be an array.');
  }
  if (EXPANSION_LIMITS in expansion) {
    const current = (expansion as CanonicalExpansion)[EXPANSION_LIMITS];
    if (current.maxSelectionIDs === limits.maxSelectionIDs && current.maxIDCodeUnits === limits.maxIDCodeUnits) {
      return ok(expansion);
    }
  }
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
  const result = [...expansion] as TabularGroupID[] & { [EXPANSION_LIMITS]?: typeof limits };
  Object.defineProperty(result, EXPANSION_LIMITS, { value: limits, enumerable: false });
  return ok(Object.freeze(result) as CanonicalExpansion);
}
