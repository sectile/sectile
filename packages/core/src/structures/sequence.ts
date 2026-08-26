import { unwrap } from '../result.js';
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

export type SequencePatch<ID extends StableID = StableID> =
  | {
      readonly type: 'splice';
      readonly index: number;
      readonly deleteCount: number;
      readonly inserted: readonly ID[];
    }
  | {
      readonly type: 'move';
      readonly from: number;
      readonly to: number;
      readonly count: number;
    };

export type SequenceProjectionPredicate<ID extends StableID = StableID> = (id: ID, index: number) => boolean;

export interface Sequence<ID extends StableID = StableID> {
  readonly size: number;
  readonly ids: readonly ID[];
  at(index: number): ID | null;
  indexOf(id: ID): number | null;
  contains(id: ID): boolean;
  compare(left: ID, right: ID): -1 | 0 | 1 | null;
  project(predicate: SequenceProjectionPredicate<ID>): Sequence<ID>;
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
): Sequence<ID> {
  return unwrap(tryCreateSequence(ids, options));
}

export function tryCreateSequence<ID extends StableID>(
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

export function applySequencePatch<ID extends StableID>(
  sequence: Sequence<ID>,
  patch: SequencePatch<ID>,
  options: SequenceOptions = {},
): Sequence<ID> {
  return unwrap(tryApplySequencePatch(sequence, patch, options));
}

export function tryApplySequencePatch<ID extends StableID>(
  sequence: Sequence<ID>,
  patch: SequencePatch<ID>,
  options: SequenceOptions = {},
): Result<Sequence<ID>> {
  const ids = [...sequence.ids];
  if (patch.type === 'splice') {
    if (
      !Number.isSafeInteger(patch.index)
      || !Number.isSafeInteger(patch.deleteCount)
      || patch.index < 0
      || patch.deleteCount < 0
      || patch.index > ids.length
      || patch.deleteCount > ids.length - patch.index
    ) return invalidPatch(patch, ids.length);
    ids.splice(patch.index, patch.deleteCount, ...patch.inserted);
  } else {
    if (
      !Number.isSafeInteger(patch.from)
      || !Number.isSafeInteger(patch.to)
      || !Number.isSafeInteger(patch.count)
      || patch.from < 0
      || patch.count < 0
      || patch.from > ids.length
      || patch.count > ids.length - patch.from
      || patch.to < 0
      || patch.to > ids.length - patch.count
    ) return invalidPatch(patch, ids.length);
    if (patch.count === 0 || patch.from === patch.to) return ok(sequence);
    const moved = ids.splice(patch.from, patch.count);
    ids.splice(patch.to, 0, ...moved);
  }
  const result = tryCreateSequence(ids, options);
  if (result.ok) return result;
  return fail('transition-rejection', result.error.code, result.error.message, result.error.details);
}

function invalidPatch<ID extends StableID>(
  patch: SequencePatch<ID>,
  size: number,
): Result<never> {
  return fail(
    'transition-rejection',
    'sequence-patch-invalid',
    'Sequence patch must identify a valid post-removal destination and source range.',
    { patch, size },
  );
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
