import type { Result } from '@sectile/core';
import { unwrap } from '@sectile/core/result';
import { tryCreateSequence, type SequencePatch } from '@sectile/core/sequence';
import type { VirtualErrorCode } from '@sectile/virtual';
import { tryCreateExtentIndex, tryCreateUniformExtentIndex, type Extent } from '@sectile/virtual/extent-index';
import {
  linearLayoutStrategy,
  tryApplyLinearPatch,
  tryCreateLinearLayout,
  type LinearMeasurement,
  type LinearLayoutState,
  type LinearPatch,
} from '@sectile/virtual/linear-layout';
import {
  partitionedTrackGridLayoutStrategy,
  tryApplyPartitionedTrackGridMutation,
  tryCreatePartitionedTrackGridLayout,
  type PartitionedTrack,
  type PartitionedTrackGridLayoutState,
  type PartitionedTrackGridMeasurement,
  type PartitionedTrackGridMutation,
  type PartitionedTrackGridRegion,
} from '@sectile/virtual/partitioned-track-grid-layout';
import type { VirtualIndexedView, VirtualLayoutStrategy } from '@sectile/virtual/layout';
import type { DataGridProjection } from './data-grid.js';
import type { DataTableProjection } from './data-table.js';
import type { DataTreeGridProjection } from './data-tree-grid.js';
import { encodeTabularCellID } from './model.js';
import type {
  TabularCellAddress,
  TabularCellID,
  TabularColumnID,
  TabularErrorCode,
  TabularRowID,
} from './contracts.js';

export type TabularVirtualErrorCode = TabularErrorCode | VirtualErrorCode | 'extent-policy-failed' | 'partition-ceiling-exceeded' | 'virtual-generation-mismatch';
export type TabularVirtualResult<T> = Result<T, TabularVirtualErrorCode>;

export interface TabularVirtualLimits {
  readonly maxPartitions: number;
  readonly maxProjectedCells: number;
}

export type TabularVirtualExtentPolicy<ID extends string> =
  | { readonly kind: 'uniform'; readonly extent: Extent }
  | { readonly kind: 'by-id'; readonly getExtent: (id: ID, index: number) => Extent };

export interface TabularVirtualLocator<ID extends string> {
  readonly id: ID;
  readonly index: number;
}

export interface DataTableVirtualAdapterOptions {
  readonly projection: DataTableProjection;
  readonly rowExtents: TabularVirtualExtentPolicy<TabularRowID>;
  readonly crossExtent: number;
  readonly limits?: Partial<TabularVirtualLimits>;
}

export interface DataGridVirtualAdapterOptions {
  readonly projection: DataGridProjection;
  readonly rowExtents: TabularVirtualExtentPolicy<TabularRowID>;
  readonly columnExtents: TabularVirtualExtentPolicy<TabularColumnID>;
  readonly limits?: Partial<TabularVirtualLimits>;
}

export interface DataTreeGridVirtualAdapterOptions {
  readonly projection: DataTreeGridProjection;
  readonly rowExtents: TabularVirtualExtentPolicy<TabularRowID>;
  readonly columnExtents: TabularVirtualExtentPolicy<TabularColumnID>;
  readonly limits?: Partial<TabularVirtualLimits>;
}

export interface DataTableVirtualAdapter {
  readonly projectionGeneration: number;
  readonly state: LinearLayoutState<TabularRowID>;
  readonly strategy: VirtualLayoutStrategy<LinearLayoutState<TabularRowID>, TabularRowID, LinearMeasurement, LinearPatch<TabularRowID>>;
  locateRow(rowID: TabularRowID): TabularVirtualLocator<TabularRowID> | null;
}

type GridVirtualState = PartitionedTrackGridLayoutState<TabularCellID, TabularRowID, TabularColumnID>;
type GridVirtualMutation = PartitionedTrackGridMutation<TabularCellID, TabularRowID, TabularColumnID>;

export interface DataGridVirtualAdapter {
  readonly projectionGeneration: number;
  readonly state: GridVirtualState;
  readonly strategy: VirtualLayoutStrategy<GridVirtualState, TabularCellID, PartitionedTrackGridMeasurement<TabularRowID, TabularColumnID>, GridVirtualMutation>;
  locateRow(rowID: TabularRowID): TabularVirtualLocator<TabularRowID> | null;
  locateColumn(columnID: TabularColumnID): TabularVirtualLocator<TabularColumnID> | null;
  locateCell(cell: TabularCellAddress): TabularVirtualLocator<TabularCellID> | null;
}

export interface DataTreeGridVirtualAdapter extends DataGridVirtualAdapter {}

export interface DataTableVirtualReconciliation {
  readonly expectedVirtualGeneration: number;
  readonly projectionGeneration: number;
  readonly mutations: readonly LinearPatch<TabularRowID>[];
  readonly state: LinearLayoutState<TabularRowID>;
  readonly adapter: DataTableVirtualAdapter;
}

export interface DataGridVirtualReconciliation {
  readonly expectedVirtualGeneration: number;
  readonly projectionGeneration: number;
  readonly mutations: readonly GridVirtualMutation[];
  readonly state: GridVirtualState;
  readonly adapter: DataGridVirtualAdapter;
}

export interface DataTreeGridVirtualReconciliation extends Omit<DataGridVirtualReconciliation, 'adapter'> {
  readonly adapter: DataTreeGridVirtualAdapter;
}

interface TablePrivate {
  readonly rowExtents: TabularVirtualExtentPolicy<TabularRowID>;
  readonly limits: TabularVirtualLimits;
}

interface GridPrivate extends TablePrivate {
  readonly columnExtents: TabularVirtualExtentPolicy<TabularColumnID>;
}

const tablePrivate = new WeakMap<DataTableVirtualAdapter, TablePrivate>();
const gridPrivate = new WeakMap<DataGridVirtualAdapter, GridPrivate>();
const DEFAULT_LIMITS: TabularVirtualLimits = Object.freeze({ maxPartitions: 9, maxProjectedCells: 1_000_000 });
const SPARSE_PATCH_BUDGET = 32;

export function createDataTableVirtualAdapter(options: DataTableVirtualAdapterOptions): DataTableVirtualAdapter {
  return unwrap(tryCreateDataTableVirtualAdapter(options));
}

export function tryCreateDataTableVirtualAdapter(options: DataTableVirtualAdapterOptions): TabularVirtualResult<DataTableVirtualAdapter> {
  const limits = normalizeLimits(options.limits);
  if (!limits.ok) return limits;
  const ids = options.projection.rows.map((row) => row.id);
  const sequence = tryCreateSequence(ids, { maxItems: limits.value.maxProjectedCells });
  if (!sequence.ok) return sequence;
  const extents = createExtentDomain(ids, options.rowExtents, limits.value.maxProjectedCells, 'row');
  if (!extents.ok) return extents;
  const state = tryCreateLinearLayout(sequence.value, extents.value, {
    axis: 'vertical',
    crossExtent: options.crossExtent,
  });
  if (!state.ok) return state;
  return success(createTableAdapter(options.projection.generation, state.value, options.rowExtents, limits.value));
}

export function reconcileDataTableVirtualAdapter(
  adapter: DataTableVirtualAdapter,
  currentState: LinearLayoutState<TabularRowID>,
  nextProjection: DataTableProjection,
): TabularVirtualResult<DataTableVirtualReconciliation> {
  const privateState = tablePrivate.get(adapter);
  if (privateState === undefined || !compatibleLinearState(adapter.state, currentState)) return generationMismatch(adapter.state.generation, currentState.generation);
  const target = nextProjection.rows.map((row) => row.id);
  const reconciled = reconcileLinear(currentState, target, privateState.rowExtents);
  if (!reconciled.ok) return reconciled;
  const next = createTableAdapter(nextProjection.generation, reconciled.value.state, privateState.rowExtents, privateState.limits);
  return success(Object.freeze({
    expectedVirtualGeneration: currentState.generation,
    projectionGeneration: nextProjection.generation,
    mutations: reconciled.value.mutations,
    state: reconciled.value.state,
    adapter: next,
  }));
}

export function createDataGridVirtualAdapter(options: DataGridVirtualAdapterOptions): DataGridVirtualAdapter {
  return unwrap(tryCreateDataGridVirtualAdapter(options));
}

export function tryCreateDataGridVirtualAdapter(options: DataGridVirtualAdapterOptions): TabularVirtualResult<DataGridVirtualAdapter> {
  return tryCreateGridAdapter(options, false);
}

export function reconcileDataGridVirtualAdapter(
  adapter: DataGridVirtualAdapter,
  currentState: GridVirtualState,
  nextProjection: DataGridProjection,
): TabularVirtualResult<DataGridVirtualReconciliation> {
  return reconcileGridAdapter(adapter, currentState, nextProjection, false);
}

export function createDataTreeGridVirtualAdapter(options: DataTreeGridVirtualAdapterOptions): DataTreeGridVirtualAdapter {
  return unwrap(tryCreateDataTreeGridVirtualAdapter(options));
}

export function tryCreateDataTreeGridVirtualAdapter(options: DataTreeGridVirtualAdapterOptions): TabularVirtualResult<DataTreeGridVirtualAdapter> {
  return tryCreateGridAdapter(options, true);
}

export function reconcileDataTreeGridVirtualAdapter(
  adapter: DataTreeGridVirtualAdapter,
  currentState: GridVirtualState,
  nextProjection: DataTreeGridProjection,
): TabularVirtualResult<DataTreeGridVirtualReconciliation> {
  const result = reconcileGridAdapter(adapter, currentState, nextProjection, true);
  return result.ok ? success(result.value as DataTreeGridVirtualReconciliation) : result;
}

function tryCreateGridAdapter(
  options: DataGridVirtualAdapterOptions | DataTreeGridVirtualAdapterOptions,
  tree: boolean,
): TabularVirtualResult<DataGridVirtualAdapter | DataTreeGridVirtualAdapter> {
  const limits = normalizeLimits(options.limits);
  if (!limits.ok) return limits;
  const domain = gridDomain(options.projection, options.rowExtents, options.columnExtents, limits.value);
  if (!domain.ok) return domain;
  const state = tryCreatePartitionedTrackGridLayout(domain.value.rows, domain.value.columns, domain.value.regions, {
    maxTracks: limits.value.maxProjectedCells,
    maxRegions: limits.value.maxProjectedCells,
  });
  if (!state.ok) return state;
  return success(createGridAdapter(options.projection.generation, state.value, options.rowExtents, options.columnExtents, limits.value, tree));
}

function reconcileGridAdapter(
  adapter: DataGridVirtualAdapter,
  currentState: GridVirtualState,
  nextProjection: DataGridProjection | DataTreeGridProjection,
  tree: boolean,
): TabularVirtualResult<DataGridVirtualReconciliation> {
  const privateState = gridPrivate.get(adapter);
  if (privateState === undefined || !compatibleGridState(adapter.state, currentState)) return generationMismatch(adapter.state.generation, currentState.generation);
  const target = gridDomain(nextProjection, privateState.rowExtents, privateState.columnExtents, privateState.limits);
  if (!target.ok) return target;
  const unionRows = unionTracks(currentState.rows, target.value.rows);
  const unionColumns = unionTracks(currentState.columns, target.value.columns);
  const mutations: GridVirtualMutation[] = [];
  let state = currentState;
  for (const mutation of [
    ...(sameTracks(state.rows, unionRows) ? [] : [{ type: 'replace-row-tracks' as const, tracks: unionRows }]),
    ...(sameTracks(state.columns, unionColumns) ? [] : [{ type: 'replace-column-tracks' as const, tracks: unionColumns }]),
    ...(sameRegions(state.regions, target.value.regions) ? [] : [{ type: 'replace-regions' as const, regions: target.value.regions }]),
    ...(sameTracks(unionRows, target.value.rows) ? [] : [{ type: 'replace-row-tracks' as const, tracks: target.value.rows }]),
    ...(sameTracks(unionColumns, target.value.columns) ? [] : [{ type: 'replace-column-tracks' as const, tracks: target.value.columns }]),
  ]) {
    const applied = tryApplyPartitionedTrackGridMutation(state, mutation);
    if (!applied.ok) return applied;
    mutations.push(Object.freeze(mutation));
    state = applied.value.state;
  }
  const next = createGridAdapter(nextProjection.generation, state, privateState.rowExtents, privateState.columnExtents, privateState.limits, tree);
  return success(Object.freeze({ expectedVirtualGeneration: currentState.generation, projectionGeneration: nextProjection.generation, mutations: Object.freeze(mutations), state, adapter: next }));
}

function createTableAdapter(
  projectionGeneration: number,
  state: LinearLayoutState<TabularRowID>,
  rowExtents: TabularVirtualExtentPolicy<TabularRowID>,
  limits: TabularVirtualLimits,
): DataTableVirtualAdapter {
  const adapter: DataTableVirtualAdapter = Object.freeze({
    projectionGeneration,
    state,
    strategy: linearLayoutStrategy as DataTableVirtualAdapter['strategy'],
    locateRow: (rowID: TabularRowID) => sequenceLocator(state.domain, rowID),
  });
  tablePrivate.set(adapter, Object.freeze({ rowExtents, limits }));
  return adapter;
}

function createGridAdapter(
  projectionGeneration: number,
  state: GridVirtualState,
  rowExtents: TabularVirtualExtentPolicy<TabularRowID>,
  columnExtents: TabularVirtualExtentPolicy<TabularColumnID>,
  limits: TabularVirtualLimits,
  _tree: boolean,
): DataGridVirtualAdapter {
  const rowIndexes = trackIndexes(state.rows);
  const columnIndexes = trackIndexes(state.columns);
  const columnCount = state.columns.size;
  const adapter: DataGridVirtualAdapter = Object.freeze({
    projectionGeneration,
    state,
    strategy: partitionedTrackGridLayoutStrategy as DataGridVirtualAdapter['strategy'],
    locateRow: (rowID: TabularRowID) => indexedLocator(rowIndexes, rowID),
    locateColumn: (columnID: TabularColumnID) => indexedLocator(columnIndexes, columnID),
    locateCell: (cell: TabularCellAddress) => {
      const rowIndex = rowIndexes.get(cell.rowID);
      const columnIndex = columnIndexes.get(cell.columnID);
      if (rowIndex === undefined || columnIndex === undefined) return null;
      return Object.freeze({ id: encodeTabularCellID(cell), index: rowIndex * columnCount + columnIndex });
    },
  });
  gridPrivate.set(adapter, Object.freeze({ rowExtents, columnExtents, limits }));
  return adapter;
}

function gridDomain(
  projection: DataGridProjection | DataTreeGridProjection,
  rowPolicy: TabularVirtualExtentPolicy<TabularRowID>,
  columnPolicy: TabularVirtualExtentPolicy<TabularColumnID>,
  limits: TabularVirtualLimits,
): TabularVirtualResult<{ readonly rows: readonly PartitionedTrack<TabularRowID>[]; readonly columns: readonly PartitionedTrack<TabularColumnID>[]; readonly regions: readonly PartitionedTrackGridRegion<TabularCellID, TabularRowID, TabularColumnID>[] }> {
  const rowIDs = projection.rows.map((row) => row.rowID);
  const columnIDs = [...projection.columns.start, ...projection.columns.center, ...projection.columns.end];
  if (rowIDs.length > limits.maxProjectedCells || columnIDs.length > limits.maxProjectedCells) return failure('resource-rejection', 'projected-cell-ceiling-exceeded', 'Projected tracks exceed the configured ceiling.');
  if (rowIDs.length * columnIDs.length > limits.maxProjectedCells) return failure('resource-rejection', 'projected-cell-ceiling-exceeded', 'Projected cells exceed the configured ceiling.');
  const partitions = [projection.columns.start, projection.columns.center, projection.columns.end].filter((ids) => ids.length > 0).length;
  if (partitions > limits.maxPartitions) return failure('resource-rejection', 'partition-ceiling-exceeded', 'Logical pin partitions exceed the configured ceiling.');
  const rows: PartitionedTrack<TabularRowID>[] = [];
  for (let index = 0; index < rowIDs.length; index += 1) {
    const id = rowIDs[index]!;
    const extent = tryExtentFor(rowPolicy, id, index, 'row');
    if (!extent.ok) return extent;
    rows.push(Object.freeze({ id, partition: 'center' as const, extent: extent.value }));
  }
  const columns: PartitionedTrack<TabularColumnID>[] = [];
  for (let index = 0; index < columnIDs.length; index += 1) {
    const id = columnIDs[index]!;
    const extent = tryExtentFor(columnPolicy, id, index, 'column');
    if (!extent.ok) return extent;
    const partition = index < projection.columns.start.length
      ? 'start' as const
      : index < projection.columns.start.length + projection.columns.center.length
        ? 'center' as const
        : 'end' as const;
    columns.push(Object.freeze({ id, partition, extent: extent.value }));
  }
  const regions = projection.rows.flatMap((row) => columnIDs.map((columnID) => Object.freeze({ id: encodeTabularCellID({ rowID: row.rowID, columnID }), row: row.rowID, column: columnID })));
  return success(Object.freeze({ rows: Object.freeze(rows), columns: Object.freeze(columns), regions: Object.freeze(regions) }));
}

function createExtentDomain<ID extends string>(ids: readonly ID[], policy: TabularVirtualExtentPolicy<ID>, maxItems: number, axis: 'row' | 'column') {
  if (policy.kind === 'uniform') return tryCreateUniformExtentIndex(ids.length, policy.extent, { maxItems });
  const extents: Extent[] = [];
  for (let index = 0; index < ids.length; index += 1) {
    const extent = tryExtentFor(policy, ids[index]!, index, axis);
    if (!extent.ok) return extent;
    extents.push(extent.value);
  }
  return tryCreateExtentIndex(extents, { maxItems });
}

function reconcileLinear(state: LinearLayoutState<TabularRowID>, target: readonly TabularRowID[], policy: TabularVirtualExtentPolicy<TabularRowID>): TabularVirtualResult<{ readonly mutations: readonly LinearPatch<TabularRowID>[]; readonly state: LinearLayoutState<TabularRowID> }> {
  const patches = sparseLinearPatches(state.domain.ids, target);
  if (patches === null) return replaceLinear(state, target, policy);
  const mutations: LinearPatch<TabularRowID>[] = [];
  let current = state;
  for (const patch of patches) {
    let insertedExtents: readonly Extent[] | undefined;
    if (patch.type === 'splice') {
      const extents: Extent[] = [];
      for (let index = 0; index < patch.inserted.length; index += 1) {
        const extent = tryExtentFor(policy, patch.inserted[index]!, patch.index + index, 'row');
        if (!extent.ok) return extent;
        extents.push(extent.value);
      }
      insertedExtents = Object.freeze(extents);
    }
    const mutation = Object.freeze({ patch: Object.freeze(patch), ...(insertedExtents === undefined ? {} : { insertedExtents }) });
    const applied = tryApplyLinearPatch(current, mutation);
    if (!applied.ok) return applied;
    mutations.push(mutation);
    current = applied.value.state;
  }
  return success(Object.freeze({ mutations: Object.freeze(mutations), state: current }));
}

function sparseLinearPatches(current: readonly TabularRowID[], target: readonly TabularRowID[]): readonly SequencePatch<TabularRowID>[] | null {
  if (sameIDs(current, target)) return Object.freeze([]);
  const rotation = rotationPatch(current, target);
  if (rotation !== null) return Object.freeze([rotation]);
  const working = [...current];
  const targetSet = new Set(target);
  const patches: SequencePatch<TabularRowID>[] = [];
  for (let index = working.length - 1; index >= 0; index -= 1) {
    if (targetSet.has(working[index]!)) continue;
    patches.push(Object.freeze({ type: 'splice', index, deleteCount: 1, inserted: Object.freeze([]) }));
    if (patches.length > SPARSE_PATCH_BUDGET) return null;
    working.splice(index, 1);
  }
  for (let index = 0; index < target.length; index += 1) {
    if (working[index] === target[index]) continue;
    const found = working.indexOf(target[index]!, index + 1);
    const patch: SequencePatch<TabularRowID> = found >= 0
      ? Object.freeze({ type: 'move', from: found, to: index, count: 1 })
      : Object.freeze({ type: 'splice', index, deleteCount: 0, inserted: Object.freeze([target[index]!]) });
    patches.push(patch);
    if (patches.length > SPARSE_PATCH_BUDGET) return null;
    if (found >= 0) working.splice(index, 0, working.splice(found, 1)[0]!);
    else working.splice(index, 0, target[index]!);
  }
  return Object.freeze(patches);
}

function rotationPatch(current: readonly TabularRowID[], target: readonly TabularRowID[]): SequencePatch<TabularRowID> | null {
  if (current.length !== target.length || current.length < 2) return null;
  const offset = current.indexOf(target[0]!);
  if (offset <= 0) return null;
  for (let index = 0; index < target.length; index += 1) {
    if (target[index] !== current[(offset + index) % current.length]) return null;
  }
  return Object.freeze({ type: 'move', from: 0, to: current.length - offset, count: offset });
}

function replaceLinear(state: LinearLayoutState<TabularRowID>, target: readonly TabularRowID[], policy: TabularVirtualExtentPolicy<TabularRowID>): TabularVirtualResult<{ readonly mutations: readonly LinearPatch<TabularRowID>[]; readonly state: LinearLayoutState<TabularRowID> }> {
  const previousExtents = state.extents.slice(0, state.domain.size);
  if (previousExtents === null) return failure('transition-rejection', 'virtual-layout-inserted-extents-mismatch', 'Current Virtual extents cannot be read for replacement.');
  const insertedExtents: Extent[] = [];
  for (let index = 0; index < target.length; index += 1) {
    const previousIndex = state.domain.indexOf(target[index]!);
    if (previousIndex !== null) {
      insertedExtents.push(previousExtents[previousIndex]!);
      continue;
    }
    const extent = tryExtentFor(policy, target[index]!, index, 'row');
    if (!extent.ok) return extent;
    insertedExtents.push(extent.value);
  }
  const mutation: LinearPatch<TabularRowID> = Object.freeze({
    patch: Object.freeze({ type: 'splice', index: 0, deleteCount: state.domain.size, inserted: Object.freeze([...target]) }),
    insertedExtents: Object.freeze(insertedExtents),
  });
  const applied = tryApplyLinearPatch(state, mutation);
  if (!applied.ok) return applied;
  return success(Object.freeze({ mutations: Object.freeze([mutation]), state: applied.value.state }));
}

function normalizeLimits(input: Partial<TabularVirtualLimits> | undefined): TabularVirtualResult<TabularVirtualLimits> {
  const limits = Object.freeze({ ...DEFAULT_LIMITS, ...input });
  for (const [key, value] of Object.entries(limits)) {
    if (!Number.isSafeInteger(value) || value <= 0) return failure('construction', 'invalid-max-items', 'Virtual adapter ceilings must be positive safe integers.', { key, value });
  }
  return success(limits);
}

function compatibleLinearState(expected: LinearLayoutState<TabularRowID>, current: LinearLayoutState<TabularRowID>): boolean {
  return current.generation >= expected.generation
    && expected.axis === current.axis
    && expected.flow === current.flow
    && expected.gap === current.gap
    && expected.crossOffset === current.crossOffset
    && expected.crossExtent === current.crossExtent
    && sameIDs(expected.domain.ids, current.domain.ids);
}

function compatibleGridState(expected: GridVirtualState, current: GridVirtualState): boolean {
  return current.generation >= expected.generation
    && sameTracks(expected.rows, current.rows)
    && sameTracks(expected.columns, current.columns)
    && sameRegions(expected.regions, current.regions);
}

type TrackSource<ID extends string> = readonly PartitionedTrack<ID>[] | VirtualIndexedView<PartitionedTrack<ID>>;

function unionTracks<ID extends string>(current: TrackSource<ID>, target: readonly PartitionedTrack<ID>[]): readonly PartitionedTrack<ID>[] {
  const targetMap = new Map(target.map((track) => [track.id, track]));
  const currentIDs = new Set<ID>();
  const output: PartitionedTrack<ID>[] = [];
  for (const track of iterateTracks(current)) {
    currentIDs.add(track.id);
    output.push(targetMap.get(track.id) ?? track);
  }
  for (const track of target) if (!currentIDs.has(track.id)) output.push(track);
  return Object.freeze(output);
}

function sameTracks<ID extends string>(left: TrackSource<ID>, right: TrackSource<ID>): boolean {
  if (trackSize(left) !== trackSize(right)) return false;
  const leftValues = iterateTracks(left);
  const rightValues = iterateTracks(right);
  while (true) {
    const leftValue = leftValues.next();
    const rightValue = rightValues.next();
    if (leftValue.done || rightValue.done) return leftValue.done === rightValue.done;
    if (leftValue.value.id !== rightValue.value.id || leftValue.value.partition !== rightValue.value.partition) return false;
  }
}

function trackIndexes<ID extends string>(tracks: VirtualIndexedView<PartitionedTrack<ID>>): ReadonlyMap<ID, number> {
  const indexes = new Map<ID, number>();
  tracks.forEach((track, index) => indexes.set(track.id, index));
  return indexes;
}

function trackSize<ID extends string>(tracks: TrackSource<ID>): number {
  return Array.isArray(tracks) ? tracks.length : (tracks as VirtualIndexedView<PartitionedTrack<ID>>).size;
}

function iterateTracks<ID extends string>(tracks: TrackSource<ID>): IterableIterator<PartitionedTrack<ID>> {
  return Array.isArray(tracks)
    ? tracks.values()
    : (tracks as VirtualIndexedView<PartitionedTrack<ID>>).iterate();
}

function sameRegions(left: readonly PartitionedTrackGridRegion[], right: readonly PartitionedTrackGridRegion[]): boolean {
  return left.length === right.length && left.every((region, index) => region.id === right[index]?.id && region.row === right[index]?.row && region.column === right[index]?.column);
}

function sameIDs(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((id, index) => id === right[index]);
}

function sequenceLocator<ID extends string>(sequence: { indexOf(id: ID): number | null }, id: ID): TabularVirtualLocator<ID> | null {
  const index = sequence.indexOf(id);
  return index === null ? null : Object.freeze({ id, index });
}

function indexedLocator<ID extends string>(indexes: ReadonlyMap<ID, number>, id: ID): TabularVirtualLocator<ID> | null {
  const index = indexes.get(id);
  return index === undefined ? null : Object.freeze({ id, index });
}

function tryExtentFor<ID extends string>(policy: TabularVirtualExtentPolicy<ID>, id: ID, index: number, axis: 'row' | 'column'): TabularVirtualResult<Extent> {
  if (policy.kind === 'uniform') return success(policy.extent);
  try {
    return success(policy.getExtent(id, index));
  } catch (error) {
    return failure('transition-rejection', 'extent-policy-failed', 'Tabular Virtual extent policy threw.', {
      axis,
      id,
      index,
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

function success<T>(value: T): TabularVirtualResult<T> { return { ok: true, value }; }
function failure<T>(errorClass: 'construction' | 'transition-rejection' | 'resource-rejection', code: TabularVirtualErrorCode, message: string, details?: Readonly<Record<string, unknown>>): TabularVirtualResult<T> {
  return { ok: false, error: Object.freeze({ class: errorClass, code, message, ...(details === undefined ? {} : { details }) }) };
}
function generationMismatch<T>(expected: number, actual: number): TabularVirtualResult<T> {
  return failure('transition-rejection', 'virtual-generation-mismatch', 'Current Virtual state does not descend from the adapter state.', { expectedMinimumGeneration: expected, actualGeneration: actual });
}
