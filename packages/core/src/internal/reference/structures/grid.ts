import type { Grid, GridPosition } from '../../../structures/grid.js';
import {
  type AxisBoundaryPolicy,
  type GridDirection,
  type MoveResult,
  type ScanOptions,
  type StableID,
} from '../../../shared.js';
import { freezeArray, normalizeMaxScan, resourceError } from '../../kernel/foundation.js';
import { ReferenceSequence } from './sequence.js';

/** Scan-based coordinate table used only as an executable oracle. */
export class ReferenceGrid<ID extends StableID> implements Grid<ID> {
  public readonly rowCount: number;
  public readonly columnCount: number;
  readonly #cells: readonly (ID | null)[];

  public constructor(rowCount: number, columnCount: number, cells: readonly (ID | null)[]) {
    this.rowCount = rowCount;
    this.columnCount = columnCount;
    this.#cells = freezeArray(cells);
    Object.freeze(this);
  }

  public get size(): number {
    let count = 0;
    for (const value of this.#cells) if (value !== null) count += 1;
    return count;
  }

  public cellAt(row: number, column: number): ID | null {
    if (row < 0 || column < 0 || row >= this.rowCount || column >= this.columnCount) return null;
    return this.#cells[row * this.columnCount + column] ?? null;
  }

  public positionOf(id: ID): GridPosition | null {
    const index = this.#cells.indexOf(id);
    return index < 0
      ? null
      : Object.freeze({ row: Math.floor(index / this.columnCount), column: index % this.columnCount });
  }

  public domain(): ReferenceSequence<ID> {
    return new ReferenceSequence(this.#cells.filter((id): id is ID => id !== null));
  }

  public row(row: number): ReferenceSequence<ID> | null {
    if (!Number.isSafeInteger(row) || row < 0 || row >= this.rowCount) return null;
    const result: ID[] = [];
    for (let column = 0; column < this.columnCount; column += 1) {
      const id = this.cellAt(row, column);
      if (id !== null) result.push(id);
    }
    return new ReferenceSequence(result);
  }

  public column(column: number): ReferenceSequence<ID> | null {
    if (!Number.isSafeInteger(column) || column < 0 || column >= this.columnCount) return null;
    const result: ID[] = [];
    for (let row = 0; row < this.rowCount; row += 1) {
      const id = this.cellAt(row, column);
      if (id !== null) result.push(id);
    }
    return new ReferenceSequence(result);
  }

  public move(
    current: ID,
    direction: GridDirection,
    boundary: AxisBoundaryPolicy = 'stop',
    options: ScanOptions<ID> = {},
  ): MoveResult<ID> {
    const position = this.positionOf(current);
    if (position === null) return { kind: 'none', scanned: 0 };
    const maxScan = normalizeMaxScan(options.maxScan);
    if (typeof maxScan !== 'number') {
      return { kind: 'resource-rejected', scanned: 0, error: maxScan };
    }
    const eligible = options.eligible ?? (() => true);
    const horizontal = direction === 'left' || direction === 'right';
    const positive = direction === 'right' || direction === 'down';
    const currentAxis = horizontal ? position.column : position.row;
    const length = horizontal ? this.columnCount : this.rowCount;
    const candidates: number[] = [];
    if (positive) {
      for (let axis = currentAxis + 1; axis < length; axis += 1) candidates.push(axis);
      if (boundary === 'wrap-axis') {
        for (let axis = 0; axis < currentAxis; axis += 1) candidates.push(axis);
      }
    } else {
      for (let axis = currentAxis - 1; axis >= 0; axis -= 1) candidates.push(axis);
      if (boundary === 'wrap-axis') {
        for (let axis = length - 1; axis > currentAxis; axis -= 1) candidates.push(axis);
      }
    }
    let scanned = 0;
    for (const axis of candidates) {
      if (scanned === maxScan) {
        return {
          kind: 'resource-rejected',
          scanned,
          error: resourceError(
            'scan-ceiling-reached',
            'Grid movement reached maxScan before its semantic result was determined.',
            { maxScan },
          ),
        };
      }
      const id = horizontal ? this.cellAt(position.row, axis) : this.cellAt(axis, position.column);
      scanned += 1;
      if (id !== null && eligible(id)) return { kind: 'found', id, scanned };
    }
    return { kind: 'none', scanned };
  }
}
