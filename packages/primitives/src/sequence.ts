import {
  DEFAULT_MAX_ID_CODE_UNITS,
  type BoundaryPolicy,
  type Direction,
  type MoveResult,
  type ResourceCeilings,
  type Result,
  type ScanOptions,
  type StableId,
} from './shared.js';
import { fail, ok, validateSafeCeiling, validateUniqueIds } from './internal/foundation.js';
import { IndexedSequence, type SequenceView } from './internal/optimized-sequence.js';

export interface SequenceOptions extends ResourceCeilings {
  readonly maxItems?: number;
}

export interface Sequence<Id extends StableId = StableId> {
  readonly size: number;
  readonly ids: readonly Id[];
  at(index: number): Id | null;
  indexOf(id: Id): number | null;
  contains(id: Id): boolean;
  compare(left: Id, right: Id): -1 | 0 | 1 | null;
  project(predicate: (id: Id, index: number) => boolean): Sequence<Id>;
  move(
    current: Id,
    direction: Direction,
    boundary?: BoundaryPolicy,
    options?: ScanOptions<Id>,
  ): MoveResult<Id>;
}

export function createSequence<Id extends StableId>(
  ids: readonly Id[],
  options: SequenceOptions = {},
): Result<Sequence<Id>> {
  const maxItems = options.maxItems ?? 100_000;
  const ceilingError = validateSafeCeiling(maxItems, 'maxItems');
  if (ceilingError !== null) return { ok: false, error: ceilingError };
  const maxIdCodeUnits = options.maxIdCodeUnits ?? DEFAULT_MAX_ID_CODE_UNITS;
  const idCeilingError = validateSafeCeiling(maxIdCodeUnits, 'maxIdCodeUnits', 1);
  if (idCeilingError !== null) return { ok: false, error: idCeilingError };
  if (ids.length > maxItems) {
    return fail('resource-rejection', 'item-ceiling-exceeded', 'Sequence exceeds maxItems.', {
      size: ids.length,
      maxItems,
    });
  }
  const validated = validateUniqueIds(ids, maxIdCodeUnits);
  if (!validated.ok) return validated;
  return ok(new IndexedSequence(validated.value) as SequenceView<Id>);
}

export type {
  BoundaryPolicy,
  Direction,
  MoveResult,
  Result,
  ScanOptions,
  SectileError,
  StableId,
} from './shared.js';
