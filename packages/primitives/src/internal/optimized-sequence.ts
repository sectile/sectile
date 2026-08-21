import {
  type BoundaryPolicy,
  type Direction,
  type MoveResult,
  type ScanOptions,
  type SectileError,
  type StableID,
} from '../shared.js';
import { freezeArray, normalizeMaxScan, resourceError } from './foundation.js';

export interface SequenceView<ID extends StableID> {
  readonly size: number;
  readonly ids: readonly ID[];
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

export class IndexedSequence<ID extends StableID> implements SequenceView<ID> {
  public readonly ids: readonly ID[];
  readonly #index: ReadonlyMap<ID, number>;

  public constructor(ids: readonly ID[]) {
    this.ids = freezeArray(ids);
    this.#index = new Map(this.ids.map((id, index) => [id, index]));
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
    return new IndexedSequence(this.ids.filter(predicate));
  }

  public move(
    current: ID,
    direction: Direction,
    boundary: BoundaryPolicy = 'stop',
    options: ScanOptions<ID> = {},
  ): MoveResult<ID> {
    return moveInSequence(this.ids, this.#index, current, direction, boundary, options);
  }
}

export function moveInSequence<ID extends StableID>(
  ids: readonly ID[],
  index: ReadonlyMap<ID, number> | null,
  current: ID,
  direction: Direction,
  boundary: BoundaryPolicy,
  options: ScanOptions<ID>,
): MoveResult<ID> {
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

function invalidMovement<ID extends StableID>(code: string): MoveResult<ID> {
  const error: SectileError = {
    class: 'internal-invariant',
    code,
    message: 'Movement received an impossible runtime value.',
  };
  return { kind: 'resource-rejected', scanned: 0, error };
}
