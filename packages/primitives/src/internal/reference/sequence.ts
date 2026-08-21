import {
  type BoundaryPolicy,
  type Direction,
  type MoveResult,
  type ScanOptions,
  type StableId,
} from '../../shared.js';
import type { Sequence } from '../../sequence.js';
import { freezeArray, normalizeMaxScan, resourceError } from '../foundation.js';

/** Deliberately linear executable specification for differential verification. */
export class ReferenceSequence<Id extends StableId> implements Sequence<Id> {
  public readonly ids: readonly Id[];

  public constructor(ids: readonly Id[]) {
    this.ids = freezeArray(ids);
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
    const index = this.ids.indexOf(id);
    return index < 0 ? null : index;
  }

  public contains(id: Id): boolean {
    return this.ids.includes(id);
  }

  public compare(left: Id, right: Id): -1 | 0 | 1 | null {
    const leftIndex = this.ids.indexOf(left);
    const rightIndex = this.ids.indexOf(right);
    if (leftIndex < 0 || rightIndex < 0) return null;
    return leftIndex === rightIndex ? 0 : leftIndex < rightIndex ? -1 : 1;
  }

  public project(predicate: (id: Id, index: number) => boolean): ReferenceSequence<Id> {
    const result: Id[] = [];
    for (let index = 0; index < this.ids.length; index += 1) {
      const id = this.ids[index];
      if (id !== undefined && predicate(id, index)) result.push(id);
    }
    return new ReferenceSequence(result);
  }

  public move(
    current: Id,
    direction: Direction,
    boundary: BoundaryPolicy = 'stop',
    options: ScanOptions<Id> = {},
  ): MoveResult<Id> {
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
