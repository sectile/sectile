import {
  type BoundaryPolicy,
  type Direction,
  type MoveResult,
  type ScanOptions,
  type SectileError,
  type StableId,
} from '../shared.js';
import { freezeArray, normalizeMaxScan, resourceError } from './foundation.js';

export interface SequenceView<Id extends StableId> {
  readonly size: number;
  readonly ids: readonly Id[];
  at(index: number): Id | null;
  indexOf(id: Id): number | null;
  contains(id: Id): boolean;
  compare(left: Id, right: Id): -1 | 0 | 1 | null;
  project(predicate: (id: Id, index: number) => boolean): SequenceView<Id>;
  move(
    current: Id,
    direction: Direction,
    boundary?: BoundaryPolicy,
    options?: ScanOptions<Id>,
  ): MoveResult<Id>;
}

export class IndexedSequence<Id extends StableId> implements SequenceView<Id> {
  public readonly ids: readonly Id[];
  readonly #index: ReadonlyMap<Id, number>;

  public constructor(ids: readonly Id[]) {
    this.ids = freezeArray(ids);
    this.#index = new Map(this.ids.map((id, index) => [id, index]));
    Object.freeze(this);
  }

  public get size(): number {
    return this.ids.length;
  }

  public at(index: number): Id | null {
    return Number.isSafeInteger(index) && index >= 0 && index < this.ids.length
      ? (this.ids[index] ?? null)
      : null;
  }

  public indexOf(id: Id): number | null {
    return this.#index.get(id) ?? null;
  }

  public contains(id: Id): boolean {
    return this.#index.has(id);
  }

  public compare(left: Id, right: Id): -1 | 0 | 1 | null {
    const leftIndex = this.#index.get(left);
    const rightIndex = this.#index.get(right);
    if (leftIndex === undefined || rightIndex === undefined) return null;
    return leftIndex === rightIndex ? 0 : leftIndex < rightIndex ? -1 : 1;
  }

  public project(predicate: (id: Id, index: number) => boolean): IndexedSequence<Id> {
    return new IndexedSequence(this.ids.filter(predicate));
  }

  public move(
    current: Id,
    direction: Direction,
    boundary: BoundaryPolicy = 'stop',
    options: ScanOptions<Id> = {},
  ): MoveResult<Id> {
    return moveInSequence(this.ids, this.#index, current, direction, boundary, options);
  }
}

export function moveInSequence<Id extends StableId>(
  ids: readonly Id[],
  index: ReadonlyMap<Id, number> | null,
  current: Id,
  direction: Direction,
  boundary: BoundaryPolicy,
  options: ScanOptions<Id>,
): MoveResult<Id> {
  const currentIndex = index === null ? ids.indexOf(current) : index.get(current);
  if (currentIndex === undefined || currentIndex < 0) return { kind: 'none', scanned: 0 };
  if (direction !== -1 && direction !== 1) return invalidMovement('invalid-direction');
  if (boundary !== 'stop' && boundary !== 'wrap') return invalidMovement('invalid-boundary');

  const normalized = normalizeMaxScan(options.maxScan);
  if (typeof normalized !== 'number') {
    return { kind: 'resource-rejected', scanned: 0, error: normalized };
  }
  const eligible = options.eligible ?? (() => true);
  const size = ids.length;
  let scanned = 0;
  let candidateIndex = currentIndex + direction;

  while (candidateIndex >= 0 && candidateIndex < size) {
    if (scanned === normalized) return scanRejected(scanned, normalized);
    const candidate = ids[candidateIndex];
    scanned += 1;
    if (candidate !== undefined && eligible(candidate)) {
      return { kind: 'found', id: candidate, scanned };
    }
    candidateIndex += direction;
  }

  if (boundary === 'wrap') {
    candidateIndex = direction > 0 ? 0 : size - 1;
    while (candidateIndex !== currentIndex) {
      if (scanned === normalized) return scanRejected(scanned, normalized);
      const candidate = ids[candidateIndex];
      scanned += 1;
      if (candidate !== undefined && eligible(candidate)) {
        return { kind: 'found', id: candidate, scanned };
      }
      candidateIndex += direction;
    }
  }

  return { kind: 'none', scanned };
}

function scanRejected<Id extends StableId>(scanned: number, maxScan: number): MoveResult<Id> {
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

function invalidMovement<Id extends StableId>(code: string): MoveResult<Id> {
  const error: SectileError = {
    class: 'internal-invariant',
    code,
    message: 'Movement received an impossible runtime value.',
  };
  return { kind: 'resource-rejected', scanned: 0, error };
}
