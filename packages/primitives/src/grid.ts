import {
  DEFAULT_MAX_ID_CODE_UNITS,
  type AxisBoundaryPolicy,
  type GridDirection,
  type MoveResult,
  type ResourceCeilings,
  type Result,
  type ScanOptions,
  type StableId,
} from './shared.js';
import {
  fail,
  freezeArray,
  normalizeMaxScan,
  ok,
  resourceError,
  validateSafeCeiling,
  validateStableId,
} from './internal/foundation.js';
import { IndexedSequence, type SequenceView } from './internal/optimized-sequence.js';
import type { Sequence } from './sequence.js';

export interface GridPosition {
  readonly row: number;
  readonly column: number;
}

export interface GridOptions extends ResourceCeilings {
  readonly columnCount?: number;
  readonly maxRows?: number;
  readonly maxColumns?: number;
  readonly maxItems?: number;
  readonly maxCells?: number;
}

export interface Grid<Id extends StableId = StableId> {
  readonly rowCount: number;
  readonly columnCount: number;
  readonly size: number;
  cellAt(row: number, column: number): Id | null;
  positionOf(id: Id): GridPosition | null;
  row(row: number): Sequence<Id> | null;
  column(column: number): Sequence<Id> | null;
  move(
    current: Id,
    direction: GridDirection,
    boundary?: AxisBoundaryPolicy,
    options?: ScanOptions<Id>,
  ): MoveResult<Id>;
}

class IndexedGrid<Id extends StableId> implements Grid<Id> {
  public readonly rowCount: number;
  public readonly columnCount: number;
  public readonly size: number;
  readonly #cells: readonly (Id | null)[];
  readonly #positions: ReadonlyMap<Id, GridPosition>;

  public constructor(
    rowCount: number,
    columnCount: number,
    cells: readonly (Id | null)[],
    positions: ReadonlyMap<Id, GridPosition>,
  ) {
    this.rowCount = rowCount;
    this.columnCount = columnCount;
    this.#cells = freezeArray(cells);
    this.#positions = positions;
    this.size = positions.size;
    Object.freeze(this);
  }

  public cellAt(row: number, column: number): Id | null {
    if (
      !Number.isSafeInteger(row) ||
      !Number.isSafeInteger(column) ||
      row < 0 ||
      column < 0 ||
      row >= this.rowCount ||
      column >= this.columnCount
    ) {
      return null;
    }
    return this.#cells[row * this.columnCount + column] ?? null;
  }

  public positionOf(id: Id): GridPosition | null {
    return this.#positions.get(id) ?? null;
  }

  public row(row: number): Sequence<Id> | null {
    if (!Number.isSafeInteger(row) || row < 0 || row >= this.rowCount) return null;
    const ids: Id[] = [];
    for (let column = 0; column < this.columnCount; column += 1) {
      const id = this.cellAt(row, column);
      if (id !== null) ids.push(id);
    }
    return new IndexedSequence(ids) as SequenceView<Id>;
  }

  public column(column: number): Sequence<Id> | null {
    if (!Number.isSafeInteger(column) || column < 0 || column >= this.columnCount) return null;
    const ids: Id[] = [];
    for (let row = 0; row < this.rowCount; row += 1) {
      const id = this.cellAt(row, column);
      if (id !== null) ids.push(id);
    }
    return new IndexedSequence(ids) as SequenceView<Id>;
  }

  public move(
    current: Id,
    direction: GridDirection,
    boundary: AxisBoundaryPolicy = 'stop',
    options: ScanOptions<Id> = {},
  ): MoveResult<Id> {
    const position = this.#positions.get(current);
    if (position === undefined) return { kind: 'none', scanned: 0 };
    const maxScan = normalizeMaxScan(options.maxScan);
    if (typeof maxScan !== 'number') {
      return { kind: 'resource-rejected', scanned: 0, error: maxScan };
    }
    if (!isGridDirection(direction) || (boundary !== 'stop' && boundary !== 'wrap-axis')) {
      return {
        kind: 'resource-rejected',
        scanned: 0,
        error: {
          class: 'internal-invariant',
          code: 'invalid-grid-movement',
          message: 'Grid movement received an impossible runtime value.',
        },
      };
    }
    const eligible = options.eligible ?? (() => true);
    const horizontal = direction === 'left' || direction === 'right';
    const positive = direction === 'right' || direction === 'down';
    const currentAxis = horizontal ? position.column : position.row;
    const axisLength = horizontal ? this.columnCount : this.rowCount;
    const idAtAxis = (axis: number): Id | null =>
      horizontal ? this.cellAt(position.row, axis) : this.cellAt(axis, position.column);
    let scanned = 0;
    let axis = currentAxis + (positive ? 1 : -1);

    while (axis >= 0 && axis < axisLength) {
      if (scanned === maxScan) return gridScanRejected(scanned, maxScan);
      const candidate = idAtAxis(axis);
      scanned += 1;
      if (candidate !== null && eligible(candidate)) {
        return { kind: 'found', id: candidate, scanned };
      }
      axis += positive ? 1 : -1;
    }

    if (boundary === 'wrap-axis') {
      axis = positive ? 0 : axisLength - 1;
      while (axis !== currentAxis) {
        if (scanned === maxScan) return gridScanRejected(scanned, maxScan);
        const candidate = idAtAxis(axis);
        scanned += 1;
        if (candidate !== null && eligible(candidate)) {
          return { kind: 'found', id: candidate, scanned };
        }
        axis += positive ? 1 : -1;
      }
    }
    return { kind: 'none', scanned };
  }
}

export function createGrid<Id extends StableId>(
  rows: readonly (readonly (Id | null)[])[],
  options: GridOptions = {},
): Result<Grid<Id>> {
  const maxRows = options.maxRows ?? 10_000;
  const maxColumns = options.maxColumns ?? 10_000;
  const maxItems = options.maxItems ?? 100_000;
  const maxCells = options.maxCells ?? 1_000_000;
  const maxIdCodeUnits = options.maxIdCodeUnits ?? DEFAULT_MAX_ID_CODE_UNITS;
  for (const [value, name] of [
    [maxRows, 'maxRows'],
    [maxColumns, 'maxColumns'],
    [maxItems, 'maxItems'],
    [maxCells, 'maxCells'],
    [maxIdCodeUnits, 'maxIdCodeUnits'],
  ] as const) {
    const error = validateSafeCeiling(value, name);
    if (error !== null) return { ok: false, error };
  }
  if (maxIdCodeUnits < 1) {
    return fail('construction', 'invalid-max-id-code-units', 'maxIdCodeUnits must be a positive safe integer.', { maxIdCodeUnits });
  }
  if (rows.length > maxRows) {
    return fail('resource-rejection', 'row-ceiling-exceeded', 'Grid exceeds maxRows.', {
      rowCount: rows.length,
      maxRows,
    });
  }
  const observedColumns = rows.reduce((maximum, row) => Math.max(maximum, row.length), 0);
  const columnCount = options.columnCount ?? observedColumns;
  const columnError = validateSafeCeiling(columnCount, 'columnCount');
  if (columnError !== null) return { ok: false, error: columnError };
  if (columnCount < observedColumns) {
    return fail(
      'construction',
      'column-count-too-small',
      'columnCount cannot truncate an occupied or explicit input coordinate.',
      { columnCount, observedColumns },
    );
  }
  if (columnCount > maxColumns) {
    return fail('resource-rejection', 'column-ceiling-exceeded', 'Grid exceeds maxColumns.', {
      columnCount,
      maxColumns,
    });
  }
  const cellCount = rows.length * columnCount;
  if (!Number.isSafeInteger(cellCount) || cellCount > maxCells) {
    return fail('resource-rejection', 'cell-ceiling-exceeded', 'Grid rectangle exceeds maxCells.', {
      rowCount: rows.length,
      columnCount,
      cellCount,
      maxCells,
    });
  }

  const cells: (Id | null)[] = Array.from({ length: cellCount }, () => null);
  const positions = new Map<Id, GridPosition>();
  for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex] ?? [];
    for (let column = 0; column < row.length; column += 1) {
      const id = row[column] ?? null;
      if (id === null) continue;
      const idError = validateStableId(id, maxIdCodeUnits);
      if (idError !== null) return { ok: false, error: idError };
      if (positions.has(id)) {
        return fail('construction', 'duplicate-id', 'Each grid identity must occupy one coordinate.', {
          id,
          row: rowIndex,
          column,
        });
      }
      if (positions.size === maxItems) {
        return fail('resource-rejection', 'item-ceiling-exceeded', 'Grid exceeds maxItems.', {
          maxItems,
        });
      }
      const position = Object.freeze({ row: rowIndex, column });
      positions.set(id, position);
      cells[rowIndex * columnCount + column] = id;
    }
  }
  return ok(new IndexedGrid(rows.length, columnCount, cells, positions));
}

function gridScanRejected<Id extends StableId>(scanned: number, maxScan: number): MoveResult<Id> {
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

function isGridDirection(value: string): value is GridDirection {
  return value === 'left' || value === 'right' || value === 'up' || value === 'down';
}

export type {
  AxisBoundaryPolicy,
  GridDirection,
  MoveResult,
  Result,
  ScanOptions,
  StableId,
} from './shared.js';
