import type { Result } from '@sectile/core';
import { unwrap } from '@sectile/core/result';
import { tryCreateSequence } from '@sectile/core/sequence';
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
import type { VirtualLayoutStrategy } from '@sectile/virtual/layout';
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

export type TabularVirtualErrorCode = TabularErrorCode | VirtualErrorCode | 'partition-ceiling-exceeded' | 'virtual-generation-mismatch';
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

export function createDataTableVirtualAdapter(options: DataTableVirtualAdapterOptions): DataTableVirtualAdapter {
  return unwrap(tryCreateDataTableVirtualAdapter(options));
}

export function tryCreateDataTableVirtualAdapter(options: DataTableVirtualAdapterOptions): TabularVirtualResult<DataTableVirtualAdapter> {
  const limits = normalizeLimits(options.limits);
  if (!limits.ok) return limits;
  const ids = options.projection.rows.map((row) => row.id);
  const sequence = tryCreateSequence(ids, { maxItems: limits.value.maxProjectedCells });
  if (!sequence.ok) return sequence;
  const extents = createExtentDomain(ids, options.rowExtents, limits.value.maxProjectedCells);
  if (!extents.ok) return extents;
  const state = tryCreateLinearLayout(sequence.value, extents.value, {
    axis: 'vertical',
    // Row virtualization owns only the main axis. A non-zero normalized cross
    // span keeps rows queryable while the native table continues to own width.
    crossExtent: 1,
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
    locateRow: (rowID: TabularRowID) => locator(state.domain.ids, rowID),
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
  const cellIDs = state.regions.map((region) => region.id);
  const adapter: DataGridVirtualAdapter = Object.freeze({
    projectionGeneration,
    state,
    strategy: partitionedTrackGridLayoutStrategy as DataGridVirtualAdapter['strategy'],
    locateRow: (rowID: TabularRowID) => locator(state.rows.map((track) => track.id), rowID),
    locateColumn: (columnID: TabularColumnID) => locator(state.columns.map((track) => track.id), columnID),
    locateCell: (cell: TabularCellAddress) => locator(cellIDs, encodeTabularCellID(cell)),
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
  if (rowIDs.length * columnIDs.length > limits.maxProjectedCells) return failure('resource-rejection', 'projected-cell-ceiling-exceeded', 'Projected cells exceed the configured ceiling.');
  const partitions = [projection.columns.start, projection.columns.center, projection.columns.end].filter((ids) => ids.length > 0).length;
  if (partitions > limits.maxPartitions) return failure('resource-rejection', 'partition-ceiling-exceeded', 'Logical pin partitions exceed the configured ceiling.');
  const rows = rowIDs.map((id, index) => Object.freeze({ id, partition: 'center' as const, extent: extentFor(rowPolicy, id, index) }));
  const columns = [
    ...projection.columns.start.map((id, index) => Object.freeze({ id, partition: 'start' as const, extent: extentFor(columnPolicy, id, index) })),
    ...projection.columns.center.map((id, index) => Object.freeze({ id, partition: 'center' as const, extent: extentFor(columnPolicy, id, projection.columns.start.length + index) })),
    ...projection.columns.end.map((id, index) => Object.freeze({ id, partition: 'end' as const, extent: extentFor(columnPolicy, id, projection.columns.start.length + projection.columns.center.length + index) })),
  ];
  const regions = projection.rows.flatMap((row) => columnIDs.map((columnID) => Object.freeze({ id: encodeTabularCellID({ rowID: row.rowID, columnID }), row: row.rowID, column: columnID })));
  return success(Object.freeze({ rows: Object.freeze(rows), columns: Object.freeze(columns), regions: Object.freeze(regions) }));
}

function createExtentDomain<ID extends string>(ids: readonly ID[], policy: TabularVirtualExtentPolicy<ID>, maxItems: number) {
  return policy.kind === 'uniform'
    ? tryCreateUniformExtentIndex(ids.length, policy.extent, { maxItems })
    : tryCreateExtentIndex(ids.map((id, index) => policy.getExtent(id, index)), { maxItems });
}

function reconcileLinear(state: LinearLayoutState<TabularRowID>, target: readonly TabularRowID[], policy: TabularVirtualExtentPolicy<TabularRowID>): TabularVirtualResult<{ readonly mutations: readonly LinearPatch<TabularRowID>[]; readonly state: LinearLayoutState<TabularRowID> }> {
  const working = [...state.domain.ids];
  const targetSet = new Set(target);
  const mutations: LinearPatch<TabularRowID>[] = [];
  let current = state;
  for (let index = working.length - 1; index >= 0; index -= 1) {
    if (targetSet.has(working[index]!)) continue;
    const mutation = Object.freeze({ patch: Object.freeze({ type: 'splice' as const, index, deleteCount: 1, inserted: Object.freeze([]) }), insertedExtents: Object.freeze([]) });
    const applied = tryApplyLinearPatch(current, mutation);
    if (!applied.ok) return applied;
    mutations.push(mutation);
    current = applied.value.state;
    working.splice(index, 1);
  }
  for (let index = 0; index < target.length; index += 1) {
    if (working[index] === target[index]) continue;
    const found = working.indexOf(target[index]!, index + 1);
    const mutation: LinearPatch<TabularRowID> = found >= 0
      ? Object.freeze({ patch: Object.freeze({ type: 'move', from: found, to: index, count: 1 }) })
      : Object.freeze({ patch: Object.freeze({ type: 'splice', index, deleteCount: 0, inserted: Object.freeze([target[index]!]) }), insertedExtents: Object.freeze([extentFor(policy, target[index]!, index)]) });
    const applied = tryApplyLinearPatch(current, mutation);
    if (!applied.ok) return applied;
    mutations.push(mutation);
    current = applied.value.state;
    if (found >= 0) working.splice(index, 0, working.splice(found, 1)[0]!);
    else working.splice(index, 0, target[index]!);
  }
  return success(Object.freeze({ mutations: Object.freeze(mutations), state: current }));
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

function unionTracks<ID extends string>(current: readonly PartitionedTrack<ID>[], target: readonly PartitionedTrack<ID>[]): readonly PartitionedTrack<ID>[] {
  const targetMap = new Map(target.map((track) => [track.id, track]));
  return Object.freeze([...current.map((track) => targetMap.get(track.id) ?? track), ...target.filter((track) => !current.some((entry) => entry.id === track.id))]);
}

function sameTracks<ID extends string>(left: readonly PartitionedTrack<ID>[], right: readonly PartitionedTrack<ID>[]): boolean {
  return left.length === right.length && left.every((track, index) => track.id === right[index]?.id && track.partition === right[index]?.partition);
}

function sameRegions(left: readonly PartitionedTrackGridRegion[], right: readonly PartitionedTrackGridRegion[]): boolean {
  return left.length === right.length && left.every((region, index) => region.id === right[index]?.id && region.row === right[index]?.row && region.column === right[index]?.column);
}

function sameIDs(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((id, index) => id === right[index]);
}

function locator<ID extends string>(ids: readonly ID[], id: ID): TabularVirtualLocator<ID> | null {
  const index = ids.indexOf(id);
  return index < 0 ? null : Object.freeze({ id, index });
}

function extentFor<ID extends string>(policy: TabularVirtualExtentPolicy<ID>, id: ID, index: number): Extent {
  return policy.kind === 'uniform' ? policy.extent : policy.getExtent(id, index);
}

function success<T>(value: T): TabularVirtualResult<T> { return { ok: true, value }; }
function failure<T>(errorClass: 'construction' | 'transition-rejection' | 'resource-rejection', code: TabularVirtualErrorCode, message: string, details?: Readonly<Record<string, unknown>>): TabularVirtualResult<T> {
  return { ok: false, error: Object.freeze({ class: errorClass, code, message, ...(details === undefined ? {} : { details }) }) };
}
function generationMismatch<T>(expected: number, actual: number): TabularVirtualResult<T> {
  return failure('transition-rejection', 'virtual-generation-mismatch', 'Current Virtual state does not descend from the adapter state.', { expectedMinimumGeneration: expected, actualGeneration: actual });
}
