import {
  type BoundaryPolicy,
  type Direction,
  type MoveResult,
  type ScanOptions,
  type StableID,
} from '../../../shared.js';
import type { Sequence } from '../../../structures/sequence.js';
import { freezeArray, normalizeMaxScan, resourceError } from '../../kernel/foundation.js';

/** Deliberately linear executable specification for differential verification. */
export class ReferenceSequence<ID extends StableID> implements Sequence<ID> {
  public readonly ids: readonly ID[];
  public readonly maxItems: number;
  public readonly maxIDCodeUnits: number;

  public constructor(
    ids: readonly ID[],
    maxItems = 100_000,
    maxIDCodeUnits = 1_024,
  ) {
    this.ids = freezeArray(ids);
    this.maxItems = maxItems;
    this.maxIDCodeUnits = maxIDCodeUnits;
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
    const index = this.ids.indexOf(id);
    return index < 0 ? null : index;
  }

  public contains(id: ID): boolean {
    return this.ids.includes(id);
  }

  public compare(left: ID, right: ID): -1 | 0 | 1 | null {
    const leftIndex = this.ids.indexOf(left);
    const rightIndex = this.ids.indexOf(right);
    if (leftIndex < 0 || rightIndex < 0) return null;
    return leftIndex === rightIndex ? 0 : leftIndex < rightIndex ? -1 : 1;
  }

  public project(predicate: (id: ID, index: number) => boolean): ReferenceSequence<ID> {
    const result: ID[] = [];
    for (let index = 0; index < this.ids.length; index += 1) {
      const id = this.ids[index];
      if (id !== undefined && predicate(id, index)) result.push(id);
    }
    return new ReferenceSequence(
      result,
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
    const currentIndex = this.ids.indexOf(current);
    if (currentIndex < 0) return { kind: 'none', scanned: 0 };
    const maxScan = normalizeMaxScan(options.maxScan);
    if (typeof maxScan !== 'number') {
      return { kind: 'resource-rejected', scanned: 0, error: maxScan };
    }
    const eligible = options.eligible ?? (() => true);
    const candidateIndexes: number[] = [];
    if (direction > 0) {
      for (let index = currentIndex + 1; index < this.ids.length; index += 1) candidateIndexes.push(index);
      if (boundary === 'wrap') {
        for (let index = 0; index < currentIndex; index += 1) candidateIndexes.push(index);
      }
    } else {
      for (let index = currentIndex - 1; index >= 0; index -= 1) candidateIndexes.push(index);
      if (boundary === 'wrap') {
        for (let index = this.ids.length - 1; index > currentIndex; index -= 1) candidateIndexes.push(index);
      }
    }
    let scanned = 0;
    for (const index of candidateIndexes) {
      if (scanned === maxScan) {
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
      const id = this.ids[index];
      scanned += 1;
      if (id !== undefined && eligible(id)) return { kind: 'found', id, scanned };
    }
    return { kind: 'none', scanned };
  }
}
