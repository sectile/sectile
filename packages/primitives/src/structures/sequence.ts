import {
  DEFAULT_MAX_ID_CODE_UNITS,
  type BoundaryPolicy,
  type Direction,
  type MoveResult,
  type ResourceCeilings,
  type Result,
  type ScanOptions,
  type StableID,
} from '../shared.js';
import { fail, ok, validateSafeCeiling, validateUniqueIDs } from '../internal/kernel/foundation.js';
import { IndexedSequence, type SequenceView } from '../internal/kernel/indexed-sequence.js';

export interface SequenceOptions extends ResourceCeilings {
  readonly maxItems?: number;
}

export interface Sequence<ID extends StableID = StableID> {
  readonly size: number;
  readonly ids: readonly ID[];
  at(index: number): ID | null;
  indexOf(id: ID): number | null;
  contains(id: ID): boolean;
  compare(left: ID, right: ID): -1 | 0 | 1 | null;
  project(predicate: (id: ID, index: number) => boolean): Sequence<ID>;
  move(
    current: ID,
    direction: Direction,
    boundary?: BoundaryPolicy,
    options?: ScanOptions<ID>,
  ): MoveResult<ID>;
}

export function createSequence<ID extends StableID>(
  ids: readonly ID[],
  options: SequenceOptions = {},
): Result<Sequence<ID>> {
  const maxItems = options.maxItems ?? 100_000;
  const ceilingError = validateSafeCeiling(maxItems, 'maxItems');
  if (ceilingError !== null) return { ok: false, error: ceilingError };
  const maxIDCodeUnits = options.maxIDCodeUnits ?? DEFAULT_MAX_ID_CODE_UNITS;
  const idCeilingError = validateSafeCeiling(maxIDCodeUnits, 'maxIDCodeUnits', 1);
  if (idCeilingError !== null) return { ok: false, error: idCeilingError };
  if (ids.length > maxItems) {
    return fail('resource-rejection', 'item-ceiling-exceeded', 'Sequence exceeds maxItems.', {
      size: ids.length,
      maxItems,
    });
  }
  const validated = validateUniqueIDs(ids, maxIDCodeUnits);
  if (!validated.ok) return validated;
  return ok(new IndexedSequence(validated.value) as SequenceView<ID>);
}

export type {
  BoundaryPolicy,
  Direction,
  MoveResult,
  Result,
  ScanOptions,
  SectileError,
  StableID,
} from '../shared.js';
