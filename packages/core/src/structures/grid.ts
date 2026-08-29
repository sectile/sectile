import { unwrap } from '../result.js';
import {
  DEFAULT_MAX_ID_CODE_UNITS,
  type AxisBoundaryPolicy,
  type GridDirection,
  type MoveResult,
  type ResourceCeilings,
  type Result,
  type ScanOptions,
  type SectileError,
  type StableID,
} from '../shared.js';
import {
  fail,
  freezeArray,
  normalizeMaxScan,
  ok,
  resourceError,
  validateSafeCeiling,
  validateStableID,
} from '../internal/kernel/foundation.js';
import { IndexedSequence, type SequenceView } from '../internal/kernel/indexed-sequence.js';
import type { Sequence } from './sequence.js';

export interface GridPosition {
  readonly row: number;
  readonly column: number;
}

export interface GridAxisScanOptions {
  readonly boundary?: AxisBoundaryPolicy;
  readonly maxScan?: number;
  readonly accepts: (row: number, column: number) => boolean;
}

export type GridAxisScanResult =
  | { readonly kind: 'found'; readonly position: GridPosition; readonly scanned: number }
  | { readonly kind: 'none'; readonly scanned: number }
  | {
      readonly kind: 'resource-rejected';
      readonly scanned: number;
      readonly error: SectileError;
    };

export interface GridOptions extends ResourceCeilings {
  readonly columnCount?: number;
  readonly maxRows?: number;
  readonly maxColumns?: number;
  readonly maxItems?: number;
  readonly maxCells?: number;
}

export interface Grid<ID extends StableID = StableID> {
  readonly rowCount: number;
  readonly columnCount: number;
  readonly size: number;
  cellAt(row: number, column: number): ID | null;
  positionOf(id: ID): GridPosition | null;
  domain(): Sequence<ID>;
  row(row: number): Sequence<ID> | null;
  column(column: number): Sequence<ID> | null;
  move(
    current: ID,
    direction: GridDirection,
    boundary?: AxisBoundaryPolicy,
    options?: ScanOptions<ID>,
  ): MoveResult<ID>;
}

class IndexedGrid<ID extends StableID> implements Grid<ID> {
  public readonly rowCount: number;
  public readonly columnCount: number;
  public readonly size: number;
  readonly #cells: readonly (ID | null)[];
  readonly #positions: ReadonlyMap<ID, GridPosition>;
  readonly #domainView: Sequence<ID>;
  readonly #rowViews = new Map<number, Sequence<ID>>();
  readonly #columnViews = new Map<number, Sequence<ID>>();

  public constructor(
    rowCount: number,
    columnCount: number,
    cells: readonly (ID | null)[],
    positions: ReadonlyMap<ID, GridPosition>,
    domainIDs: readonly ID[],
  ) {
    this.rowCount = rowCount;
    this.columnCount = columnCount;
    this.#cells = freezeArray(cells);
    this.#positions = positions;
    this.#domainView = new IndexedSequence(domainIDs) as SequenceView<ID>;
    this.size = positions.size;
    Object.freeze(this);
  }

  public cellAt(row: number, column: number): ID | null {
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

  public positionOf(id: ID): GridPosition | null {
    return this.#positions.get(id) ?? null;
  }

  public domain(): Sequence<ID> {
    return this.#domainView;
  }

  public row(row: number): Sequence<ID> | null {
    if (!Number.isSafeInteger(row) || row < 0 || row >= this.rowCount) return null;
    const cached = this.#rowViews.get(row);
    if (cached !== undefined) return cached;
    const ids: ID[] = [];
    for (let column = 0; column < this.columnCount; column += 1) {
      const id = this.cellAt(row, column);
      if (id !== null) ids.push(id);
    }
    const view = new IndexedSequence(ids) as SequenceView<ID>;
    this.#rowViews.set(row, view);
    return view;
  }

  public column(column: number): Sequence<ID> | null {
    if (!Number.isSafeInteger(column) || column < 0 || column >= this.columnCount) return null;
    const cached = this.#columnViews.get(column);
    if (cached !== undefined) return cached;
    const ids: ID[] = [];
    for (let row = 0; row < this.rowCount; row += 1) {
      const id = this.cellAt(row, column);
      if (id !== null) ids.push(id);
    }
    const view = new IndexedSequence(ids) as SequenceView<ID>;
    this.#columnViews.set(column, view);
    return view;
  }

  public move(
    current: ID,
    direction: GridDirection,
    boundary: AxisBoundaryPolicy = 'stop',
    options: ScanOptions<ID> = {},
  ): MoveResult<ID> {
    const position = this.#positions.get(current);
    if (position === undefined) return { kind: 'none', scanned: 0 };
    const eligible = options.eligible ?? (() => true);
    const movement = scanGridAxis(this.rowCount, this.columnCount, position, direction, {
      boundary,
      ...(options.maxScan === undefined ? {} : { maxScan: options.maxScan }),
      accepts: (row, column) => {
        const candidate = this.cellAt(row, column);
        return candidate !== null && eligible(candidate);
      },
    });
    if (movement.kind !== 'found') return movement;
    const id = this.cellAt(movement.position.row, movement.position.column);
    return id === null
      ? { kind: 'none', scanned: movement.scanned }
      : { kind: 'found', id, scanned: movement.scanned };
  }
}

export function scanGridAxis(
  rowCount: number,
  columnCount: number,
  current: GridPosition,
  direction: GridDirection,
  options: GridAxisScanOptions,
): GridAxisScanResult {
  const boundary = options.boundary ?? 'stop';
  const maxScan = normalizeMaxScan(options.maxScan);
  if (typeof maxScan !== 'number') {
    return { kind: 'resource-rejected', scanned: 0, error: maxScan };
  }
  if (
    !Number.isSafeInteger(rowCount)
    || !Number.isSafeInteger(columnCount)
    || rowCount < 0
    || columnCount < 0
    || !Number.isSafeInteger(current.row)
    || !Number.isSafeInteger(current.column)
    || current.row < 0
    || current.column < 0
    || current.row >= rowCount
    || current.column >= columnCount
    || !isGridDirection(direction)
    || (boundary !== 'stop' && boundary !== 'wrap-axis')
  ) {
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

  const horizontal = direction === 'left' || direction === 'right';
  const positive = direction === 'right' || direction === 'down';
  const currentAxis = horizontal ? current.column : current.row;
  const axisLength = horizontal ? columnCount : rowCount;
  let scanned = 0;
  let axis = currentAxis + (positive ? 1 : -1);
  let wrapped = false;

  while (true) {
    if (axis < 0 || axis >= axisLength) {
      if (boundary === 'stop' || wrapped) break;
      axis = positive ? 0 : axisLength - 1;
      wrapped = true;
    }
    if (axis === currentAxis) break;
    if (scanned === maxScan) return gridScanRejected(scanned, maxScan);
    const row = horizontal ? current.row : axis;
    const column = horizontal ? axis : current.column;
    scanned += 1;
    if (options.accepts(row, column)) {
      return { kind: 'found', position: Object.freeze({ row, column }), scanned };
    }
    axis += positive ? 1 : -1;
  }
  return { kind: 'none', scanned };
}

export function createGrid<ID extends StableID>(
  rows: readonly (readonly (ID | null)[])[],
  options: GridOptions = {},
): Grid<ID> {
  return unwrap(tryCreateGrid(rows, options));
}

export function tryCreateGrid<ID extends StableID>(
  rows: readonly (readonly (ID | null)[])[],
  options: GridOptions = {},
): Result<Grid<ID>> {
  const maxRows = options.maxRows ?? 10_000;
  const maxColumns = options.maxColumns ?? 10_000;
  const maxItems = options.maxItems ?? 100_000;
  const maxCells = options.maxCells ?? 1_000_000;
  const maxIDCodeUnits = options.maxIDCodeUnits ?? DEFAULT_MAX_ID_CODE_UNITS;
  for (const [value, name] of [
    [maxRows, 'maxRows'],
    [maxColumns, 'maxColumns'],
    [maxItems, 'maxItems'],
    [maxCells, 'maxCells'],
    [maxIDCodeUnits, 'maxIDCodeUnits'],
  ] as const) {
    const error = validateSafeCeiling(value, name);
    if (error !== null) return { ok: false, error };
  }
  if (maxIDCodeUnits < 1) {
    return fail('construction', 'invalid-max-id-code-units', 'maxIDCodeUnits must be a positive safe integer.', { maxIDCodeUnits });
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

  const cells: (ID | null)[] = Array.from({ length: cellCount }, () => null);
  const positions = new Map<ID, GridPosition>();
  const domainIDs: ID[] = [];
  for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex] ?? [];
    for (let column = 0; column < row.length; column += 1) {
      const id = row[column] ?? null;
      if (id === null) continue;
      const idError = validateStableID(id, maxIDCodeUnits);
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
      domainIDs.push(id);
      cells[rowIndex * columnCount + column] = id;
    }
  }
  return ok(new IndexedGrid(rows.length, columnCount, cells, positions, domainIDs));
}

function gridScanRejected(scanned: number, maxScan: number): GridAxisScanResult {
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
  StableID,
} from '../shared.js';
