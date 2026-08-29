import {
  type BoundaryPolicy,
  type Direction,
  type MoveResult,
  type Result,
  type ScanOptions,
  type SectileError,
  type StableID,
} from '../../shared.js';
import { freezeArray, normalizeMaxScan, ok, resourceError } from './foundation.js';

export interface SequenceView<ID extends StableID> {
  readonly size: number;
  readonly ids: readonly ID[];
  readonly maxItems: number;
  readonly maxIDCodeUnits: number;
  at(index: number): ID | null;
  indexOf(id: ID): number | null;
  contains(id: ID): boolean;
  compare(left: ID, right: ID): -1 | 0 | 1 | null;
  project(predicate: (id: ID, index: number) => boolean): SequenceView<ID>;
  move(
    current: ID,
    direction: Direction,
    boundary?: BoundaryPolicy,
    options?: ScanOptions<ID>,
  ): MoveResult<ID>;
}

export type IndexedSequencePatch<ID extends StableID> =
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

const MAX_PATCH_DEPTH = 32;

export class IndexedSequence<ID extends StableID> implements SequenceView<ID> {
  public readonly ids: readonly ID[];
  public readonly maxItems: number;
  public readonly maxIDCodeUnits: number;
  readonly #index: ReadonlyMap<ID, number>;

  public constructor(
    ids: readonly ID[],
    maxItems = 100_000,
    maxIDCodeUnits = 1_024,
    index?: ReadonlyMap<ID, number>,
  ) {
    this.ids = Object.isFrozen(ids) ? ids : freezeArray(ids);
    this.maxItems = maxItems;
    this.maxIDCodeUnits = maxIDCodeUnits;
    if (index === undefined) {
      const built = new Map<ID, number>();
      for (let position = 0; position < this.ids.length; position += 1) {
        const id = this.ids[position];
        if (id !== undefined) built.set(id, position);
      }
      this.#index = built;
    } else {
      this.#index = index;
    }
    Object.freeze(this);
  }

  public get size(): number {
    return this.ids.length;
  }

  public at(index: number): ID | null {
    return Number.isSafeInteger(index) && index >= 0 && index < this.ids.length
      ? (this.ids[index] ?? null)
      : null;
  }

  public indexOf(id: ID): number | null {
    return this.#index.get(id) ?? null;
  }

  public contains(id: ID): boolean {
    return this.#index.has(id);
  }

  public compare(left: ID, right: ID): -1 | 0 | 1 | null {
    const leftIndex = this.#index.get(left);
    const rightIndex = this.#index.get(right);
    if (leftIndex === undefined || rightIndex === undefined) return null;
    return leftIndex === rightIndex ? 0 : leftIndex < rightIndex ? -1 : 1;
  }

  public project(predicate: (id: ID, index: number) => boolean): IndexedSequence<ID> {
    return new IndexedSequence(
      this.ids.filter(predicate),
      this.maxItems,
      this.maxIDCodeUnits,
    );
  }

  public move(
    current: ID,
    direction: Direction,
    boundary: BoundaryPolicy = 'stop',
    options: ScanOptions<ID> = {},
  ): MoveResult<ID> {
    return moveInSequence(this, current, direction, boundary, options);
  }
}

export class PatchedSequence<ID extends StableID> implements SequenceView<ID> {
  public readonly size: number;
  public readonly maxItems: number;
  public readonly maxIDCodeUnits: number;
  public readonly depth: number;
  public readonly changedCardinality: number;
  readonly #parent: SequenceView<ID>;
  readonly #patch: IndexedSequencePatch<ID>;
  readonly #insertedIndex: ReadonlyMap<ID, number> | null;
  #materialized: readonly ID[] | null = null;

  public constructor(
    parent: SequenceView<ID>,
    patch: IndexedSequencePatch<ID>,
    maxItems: number,
    maxIDCodeUnits: number,
    insertedIndex?: ReadonlyMap<ID, number>,
  ) {
    this.#parent = parent instanceof PatchedSequence && parent.depth >= MAX_PATCH_DEPTH
      ? new IndexedSequence(parent.ids, parent.maxItems, parent.maxIDCodeUnits)
      : parent;
    this.#patch = patch;
    this.size = patch.type === 'splice'
      ? this.#parent.size - patch.deleteCount + patch.inserted.length
      : this.#parent.size;
    this.maxItems = maxItems;
    this.maxIDCodeUnits = maxIDCodeUnits;
    this.depth = this.#parent instanceof PatchedSequence ? this.#parent.depth + 1 : 1;
    const localChanged = patch.type === 'splice'
      ? patch.deleteCount + patch.inserted.length
      : patch.count;
    this.changedCardinality = (
      this.#parent instanceof PatchedSequence ? this.#parent.changedCardinality : 0
    ) + localChanged;
    if (patch.type === 'splice') {
      if (insertedIndex !== undefined) this.#insertedIndex = insertedIndex;
      else {
        const built = new Map<ID, number>();
        for (let index = 0; index < patch.inserted.length; index += 1) {
          const id = patch.inserted[index];
          if (id !== undefined) built.set(id, index);
        }
        this.#insertedIndex = built;
      }
    } else this.#insertedIndex = null;
    Object.freeze(this);
  }

  public get ids(): readonly ID[] {
    if (this.#materialized !== null) return this.#materialized;
    this.#materialized = Object.freeze(this.copyIDs());
    return this.#materialized;
  }

  public copyIDs(): ID[] {
    const patches: IndexedSequencePatch<ID>[] = [];
    let base: SequenceView<ID> = this;
    while (base instanceof PatchedSequence) {
      patches.push(base.#patch);
      base = base.#parent;
    }
    const ids = [...base.ids];
    for (let index = patches.length - 1; index >= 0; index -= 1) {
      const patch = patches[index];
      if (patch?.type === 'splice') {
        ids.splice(patch.index, patch.deleteCount, ...patch.inserted);
      } else if (patch !== undefined && patch.count > 0 && patch.from !== patch.to) {
        const moved = ids.splice(patch.from, patch.count);
        ids.splice(patch.to, 0, ...moved);
      }
    }
    return ids;
  }

  public at(index: number): ID | null {
    if (!Number.isSafeInteger(index) || index < 0 || index >= this.size) return null;
    if (this.#patch.type === 'splice') {
      const insertedEnd = this.#patch.index + this.#patch.inserted.length;
      if (index < this.#patch.index) return this.#parent.at(index);
      if (index < insertedEnd) return this.#patch.inserted[index - this.#patch.index] ?? null;
      return this.#parent.at(index - this.#patch.inserted.length + this.#patch.deleteCount);
    }
    return this.#parent.at(parentIndexForMove(index, this.#patch));
  }

  public indexOf(id: ID): number | null {
    if (this.#patch.type === 'splice') {
      const inserted = this.#insertedIndex?.get(id);
      if (inserted !== undefined) return this.#patch.index + inserted;
      const previous = this.#parent.indexOf(id);
      if (previous === null) return null;
      const deletedEnd = this.#patch.index + this.#patch.deleteCount;
      if (previous >= this.#patch.index && previous < deletedEnd) return null;
      return previous < this.#patch.index
        ? previous
        : previous - this.#patch.deleteCount + this.#patch.inserted.length;
    }
    const previous = this.#parent.indexOf(id);
    return previous === null ? null : movedIndex(previous, this.#patch);
  }

  public contains(id: ID): boolean {
    return this.indexOf(id) !== null;
  }

  public compare(left: ID, right: ID): -1 | 0 | 1 | null {
    const leftIndex = this.indexOf(left);
    const rightIndex = this.indexOf(right);
    if (leftIndex === null || rightIndex === null) return null;
    return leftIndex === rightIndex ? 0 : leftIndex < rightIndex ? -1 : 1;
  }

  public project(predicate: (id: ID, index: number) => boolean): IndexedSequence<ID> {
    return new IndexedSequence(
      this.ids.filter(predicate),
      this.maxItems,
      this.maxIDCodeUnits,
    );
  }

  public move(
    current: ID,
    direction: Direction,
    boundary: BoundaryPolicy = 'stop',
    options: ScanOptions<ID> = {},
  ): MoveResult<ID> {
    return moveInSequence(this, current, direction, boundary, options);
  }
}

function parentIndexForMove<ID extends StableID>(
  index: number,
  patch: Extract<IndexedSequencePatch<ID>, { readonly type: 'move' }>,
): number {
  if (patch.count === 0 || patch.from === patch.to) return index;
  const movedEnd = patch.to + patch.count;
  if (index >= patch.to && index < movedEnd) return patch.from + index - patch.to;
  if (patch.to < patch.from) {
    if (index >= movedEnd && index < patch.from + patch.count) return index - patch.count;
    return index;
  }
  if (index >= patch.from && index < patch.to) return index + patch.count;
  return index;
}

function movedIndex<ID extends StableID>(
  index: number,
  patch: Extract<IndexedSequencePatch<ID>, { readonly type: 'move' }>,
): number {
  if (patch.count === 0 || patch.from === patch.to) return index;
  if (index >= patch.from && index < patch.from + patch.count)
    return patch.to + index - patch.from;
  if (patch.to < patch.from) {
    if (index >= patch.to && index < patch.from) return index + patch.count;
    return index;
  }
  const shiftedEnd = patch.to + patch.count;
  if (index >= patch.from + patch.count && index < shiftedEnd) return index - patch.count;
  return index;
}

export function moveInSequence<ID extends StableID>(
  sequence: Pick<SequenceView<ID>, 'size' | 'at' | 'indexOf'>,
  current: ID,
  direction: Direction,
  boundary: BoundaryPolicy,
  options: ScanOptions<ID>,
): MoveResult<ID> {
  const currentIndex = sequence.indexOf(current);
  if (currentIndex === null) return { kind: 'none', scanned: 0 };
  if (direction !== -1 && direction !== 1) return invalidMovement('invalid-direction');
  if (boundary !== 'stop' && boundary !== 'wrap') return invalidMovement('invalid-boundary');

  const normalized = normalizeMaxScan(options.maxScan);
  if (typeof normalized !== 'number') {
    return { kind: 'resource-rejected', scanned: 0, error: normalized };
  }
  const eligible = options.eligible ?? (() => true);
  const size = sequence.size;
  let scanned = 0;
  let candidateIndex = currentIndex + direction;

  while (candidateIndex >= 0 && candidateIndex < size) {
    if (scanned === normalized) return scanRejected(scanned, normalized);
    const candidate = sequence.at(candidateIndex);
    scanned += 1;
    if (candidate !== null && eligible(candidate)) {
      return { kind: 'found', id: candidate, scanned };
    }
    candidateIndex += direction;
  }

  if (boundary === 'wrap') {
    candidateIndex = direction > 0 ? 0 : size - 1;
    while (candidateIndex !== currentIndex) {
      if (scanned === normalized) return scanRejected(scanned, normalized);
      const candidate = sequence.at(candidateIndex);
      scanned += 1;
      if (candidate !== null && eligible(candidate)) {
        return { kind: 'found', id: candidate, scanned };
      }
      candidateIndex += direction;
    }
  }

  return { kind: 'none', scanned };
}

export function findEligibleFromEdge<ID extends StableID>(
  sequence: SequenceView<ID>,
  direction: Direction,
  options: ScanOptions<ID> = {},
): Result<ID | null> {
  const maxScan = normalizeMaxScan(options.maxScan);
  if (typeof maxScan !== 'number') return { ok: false, error: maxScan };
  const eligible = options.eligible ?? (() => true);
  let scanned = 0;
  let index = direction > 0 ? 0 : sequence.size - 1;

  while (index >= 0 && index < sequence.size) {
    if (scanned === maxScan) {
      return {
        ok: false,
        error: resourceError(
          'scan-ceiling-reached',
          'Movement reached maxScan before its semantic result was determined.',
          { maxScan },
        ),
      };
    }
    const id = sequence.at(index);
    scanned += 1;
    if (id !== null && eligible(id)) return ok(id);
    index += direction;
  }
  return ok(null);
}

function scanRejected<ID extends StableID>(scanned: number, maxScan: number): MoveResult<ID> {
  return {
    kind: 'resource-rejected',
    scanned,
    error: resourceError(
      'scan-ceiling-reached',
      'Movement reached maxScan before its semantic result was determined.',
      { maxScan },
    ),
  };
}

function invalidMovement<ID extends StableID>(
  code: 'invalid-boundary' | 'invalid-direction',
): MoveResult<ID> {
  const error: SectileError = {
    class: 'internal-invariant',
    code,
    message: 'Movement received an impossible runtime value.',
  };
  return { kind: 'resource-rejected', scanned: 0, error };
}
