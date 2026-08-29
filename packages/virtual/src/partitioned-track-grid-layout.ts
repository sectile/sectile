import type { StableID } from '@sectile/core';
import { unwrap } from '@sectile/core/result';
import { tryCreateSequence } from '@sectile/core/sequence';
import type { VirtualResult } from './error.js';
import { tryCreateExtentIndex, type Extent, type ExtentIndex } from './extent-index.js';
import { blockedTrackRepairBound, createBlockedVector, type BlockedVector, useBlockedTrackRepair } from './internal/blocked-vector.js';
import { fail, ok } from './internal/foundation.js';
import { recordRepairDiagnostics } from './internal/repair-diagnostics.js';
import {
  alignedScrollOffset,
  anchorForPlan,
  normalizeQuery,
  pointDelta,
  rectanglesIntersect,
  ZERO_POINT,
  type VirtualAnchor,
  type VirtualLayoutMutation,
  type VirtualLayoutPlan,
  type VirtualLayoutStrategy,
  type VirtualIndexedView,
  type VirtualMeasurementBatch,
  type VirtualPlacement,
  type VirtualPoint,
  type VirtualQueryInput,
  type VirtualRect,
  type VirtualScrollAlignment,
} from './layout.js';
import {
  trackGridRegionRect,
  tryApplyGridMeasurements,
  tryCreateTrackGridLayout,
  tryQueryTrackGridLayout,
  type GridRegion,
  type TrackGridLayoutState,
} from './track-grid-layout.js';

export type TrackPartition = 'start' | 'center' | 'end';

export interface PartitionedTrack<ID extends StableID = StableID> {
  readonly id: ID;
  readonly partition: TrackPartition;
  readonly extent: Extent;
}

export interface PartitionedTrackGridRegion<
  ID extends StableID = StableID,
  RowID extends StableID = StableID,
  ColumnID extends StableID = StableID,
> {
  readonly id: ID;
  readonly row: RowID;
  readonly column: ColumnID;
  readonly rowSpan?: number;
  readonly columnSpan?: number;
}

const partitionedTrackGridLayoutStateBrand: unique symbol = Symbol('SectilePartitionedTrackGridLayoutState');

export interface PartitionedTrackGridLayoutState<
  ID extends StableID = StableID,
  RowID extends StableID = StableID,
  ColumnID extends StableID = StableID,
> {
  readonly [partitionedTrackGridLayoutStateBrand]: true;
  readonly rows: VirtualIndexedView<PartitionedTrack<RowID>>;
  readonly columns: VirtualIndexedView<PartitionedTrack<ColumnID>>;
  readonly regions: readonly PartitionedTrackGridRegion<ID, RowID, ColumnID>[];
  readonly rowGap: number;
  readonly columnGap: number;
  readonly maxTracks: number;
  readonly maxRegions: number;
  readonly generation: number;
}

export interface PartitionedTrackGridLayoutSnapshot<
  ID extends StableID = StableID,
  RowID extends StableID = StableID,
  ColumnID extends StableID = StableID,
> {
  readonly schemaVersion: 1;
  readonly kind: 'partitioned-track-grid';
  readonly rows: readonly PartitionedTrack<RowID>[];
  readonly columns: readonly PartitionedTrack<ColumnID>[];
  readonly regions: readonly PartitionedTrackGridRegion<ID, RowID, ColumnID>[];
  readonly rowGap: number;
  readonly columnGap: number;
  readonly maxTracks: number;
  readonly maxRegions: number;
  readonly generation: number;
}

export interface PartitionedTrackGridLayoutInput {
  readonly rowGap?: number;
  readonly columnGap?: number;
  readonly maxTracks?: number;
  readonly maxRegions?: number;
}

interface PartitionedStateInput<
  ID extends StableID,
  RowID extends StableID,
  ColumnID extends StableID,
> {
  readonly rows: readonly PartitionedTrack<RowID>[];
  readonly columns: readonly PartitionedTrack<ColumnID>[];
  readonly regions: readonly PartitionedTrackGridRegion<ID, RowID, ColumnID>[];
  readonly rowGap: number;
  readonly columnGap: number;
  readonly maxTracks: number;
  readonly maxRegions: number;
  readonly generation: number;
}

export interface PartitionedTrackGridLayoutPlan<ID extends StableID = StableID>
  extends VirtualLayoutPlan<ID> {
  readonly pinnedStartWidth: number;
  readonly pinnedEndWidth: number;
  readonly pinnedStartHeight: number;
  readonly pinnedEndHeight: number;
}

export type PartitionedTrackGridMeasurement<
  RowID extends StableID = StableID,
  ColumnID extends StableID = StableID,
> =
  | { readonly axis: 'row'; readonly id: RowID; readonly extent: Extent }
  | { readonly axis: 'column'; readonly id: ColumnID; readonly extent: Extent };

export type PartitionedTrackGridMutation<
  ID extends StableID = StableID,
  RowID extends StableID = StableID,
  ColumnID extends StableID = StableID,
> =
  | { readonly type: 'replace-regions'; readonly regions: readonly PartitionedTrackGridRegion<ID, RowID, ColumnID>[] }
  | { readonly type: 'replace-row-tracks'; readonly tracks: readonly PartitionedTrack<RowID>[] }
  | { readonly type: 'replace-column-tracks'; readonly tracks: readonly PartitionedTrack<ColumnID>[] };

interface PartitionRange {
  readonly startIndex: number;
  readonly endIndex: number;
  readonly offset: number;
  readonly extent: number;
}

interface PartitionRanges {
  readonly start: PartitionRange;
  readonly center: PartitionRange;
  readonly end: PartitionRange;
}

interface PartitionedInternals<
  ID extends StableID,
  RowID extends StableID,
  ColumnID extends StableID,
> {
  readonly grid: TrackGridLayoutState<ID>;
  readonly rowIndex: ReadonlyMap<RowID, number>;
  readonly columnIndex: ReadonlyMap<ColumnID, number>;
  readonly regionIndex: ReadonlyMap<ID, number>;
  readonly rowRanges: PartitionRanges;
  readonly columnRanges: PartitionRanges;
  readonly rows: BlockedVector<PartitionedTrack<RowID>>;
  readonly columns: BlockedVector<PartitionedTrack<ColumnID>>;
  readonly rowPartitions: readonly TrackPartition[];
  readonly columnPartitions: readonly TrackPartition[];
}

const internals = new WeakMap<PartitionedTrackGridLayoutState, PartitionedInternals<StableID, StableID, StableID>>();

export const partitionedTrackGridLayoutStrategy: VirtualLayoutStrategy<
  PartitionedTrackGridLayoutState,
  StableID,
  PartitionedTrackGridMeasurement,
  PartitionedTrackGridMutation
> = Object.freeze({
  kind: 'partitioned-track-grid',
  tryQuery: (state: PartitionedTrackGridLayoutState, input: VirtualQueryInput) => tryQueryPartitionedTrackGridLayout(state, input),
  tryMeasure: (state: PartitionedTrackGridLayoutState, batch: VirtualMeasurementBatch<PartitionedTrackGridMeasurement>) => tryApplyPartitionedTrackGridMeasurements(state, batch),
  tryMutate: (state: PartitionedTrackGridLayoutState, input: { readonly mutation: PartitionedTrackGridMutation; readonly anchor?: VirtualAnchor | null }) => tryApplyPartitionedTrackGridMutation(state, input.mutation, input.anchor),
  tryScrollTarget: (state: PartitionedTrackGridLayoutState, id: StableID, viewport: VirtualRect, alignment?: VirtualScrollAlignment) => tryPartitionedTrackGridScrollTarget(state, id, viewport, alignment),
});

export function createPartitionedTrackGridLayout<
  ID extends StableID,
  RowID extends StableID,
  ColumnID extends StableID,
>(
  rows: readonly PartitionedTrack<RowID>[],
  columns: readonly PartitionedTrack<ColumnID>[],
  regions: readonly PartitionedTrackGridRegion<ID, RowID, ColumnID>[],
  input: PartitionedTrackGridLayoutInput = {},
): PartitionedTrackGridLayoutState<ID, RowID, ColumnID> {
  return unwrap(tryCreatePartitionedTrackGridLayout(rows, columns, regions, input));
}

export function tryCreatePartitionedTrackGridLayout<
  ID extends StableID,
  RowID extends StableID,
  ColumnID extends StableID,
>(
  rows: readonly PartitionedTrack<RowID>[],
  columns: readonly PartitionedTrack<ColumnID>[],
  regions: readonly PartitionedTrackGridRegion<ID, RowID, ColumnID>[],
  input: PartitionedTrackGridLayoutInput = {},
): VirtualResult<PartitionedTrackGridLayoutState<ID, RowID, ColumnID>> {
  const rowGap = input.rowGap ?? 0;
  const columnGap = input.columnGap ?? 0;
  const maxTracks = input.maxTracks ?? 1_000_000;
  const maxRegions = input.maxRegions ?? 1_000_000;
  if (!finiteNonNegative(rowGap) || !finiteNonNegative(columnGap)) {
    return fail('construction', 'virtual-layout-geometry-invalid', 'Partitioned grid gaps must be finite and non-negative.', { rowGap, columnGap });
  }
  if (!nonNegativeSafe(maxTracks) || !nonNegativeSafe(maxRegions)) {
    return fail('construction', 'invalid-max-items', 'Partitioned grid ceilings must be non-negative safe integers.', { maxTracks, maxRegions });
  }
  const normalizedRows = normalizeTracks(rows, maxTracks);
  if (!normalizedRows.ok) return normalizedRows;
  const normalizedColumns = normalizeTracks(columns, maxTracks);
  if (!normalizedColumns.ok) return normalizedColumns;
  return createState({
    rows: normalizedRows.value,
    columns: normalizedColumns.value,
    regions: freezeRegions(regions),
    rowGap,
    columnGap,
    maxTracks,
    maxRegions,
    generation: 0,
  });
}

export function snapshotPartitionedTrackGridLayout<
  ID extends StableID,
  RowID extends StableID,
  ColumnID extends StableID,
>(state: PartitionedTrackGridLayoutState<ID, RowID, ColumnID>): PartitionedTrackGridLayoutSnapshot<ID, RowID, ColumnID> {
  requireInternals(state);
  return Object.freeze({
    schemaVersion: 1,
    kind: 'partitioned-track-grid',
    rows: freezeTrackView(state.rows),
    columns: freezeTrackView(state.columns),
    regions: freezeRegions(state.regions),
    rowGap: state.rowGap,
    columnGap: state.columnGap,
    maxTracks: state.maxTracks,
    maxRegions: state.maxRegions,
    generation: state.generation,
  });
}

export function restorePartitionedTrackGridLayout<
  ID extends StableID,
  RowID extends StableID,
  ColumnID extends StableID,
>(snapshot: PartitionedTrackGridLayoutSnapshot<ID, RowID, ColumnID>): PartitionedTrackGridLayoutState<ID, RowID, ColumnID> {
  return unwrap(tryRestorePartitionedTrackGridLayout(snapshot));
}

export function tryRestorePartitionedTrackGridLayout<
  ID extends StableID,
  RowID extends StableID,
  ColumnID extends StableID,
>(snapshot: PartitionedTrackGridLayoutSnapshot<ID, RowID, ColumnID>): VirtualResult<PartitionedTrackGridLayoutState<ID, RowID, ColumnID>> {
  if (!validSnapshotHeader(snapshot)) return snapshotFailure();
  const created = tryCreatePartitionedTrackGridLayout(snapshot.rows, snapshot.columns, snapshot.regions, snapshot);
  if (!created.ok) return created;
  const data = getInternals(created.value);
  if (!data.ok) return data;
  return createState({
    rows: data.value.rows.view.toArray(),
    columns: data.value.columns.view.toArray(),
    regions: created.value.regions,
    rowGap: created.value.rowGap,
    columnGap: created.value.columnGap,
    maxTracks: created.value.maxTracks,
    maxRegions: created.value.maxRegions,
    generation: snapshot.generation,
  });
}

export function queryPartitionedTrackGridLayout<
  ID extends StableID,
  RowID extends StableID,
  ColumnID extends StableID,
>(state: PartitionedTrackGridLayoutState<ID, RowID, ColumnID>, input: VirtualQueryInput): PartitionedTrackGridLayoutPlan<ID> {
  return unwrap(tryQueryPartitionedTrackGridLayout(state, input));
}

export function tryQueryPartitionedTrackGridLayout<
  ID extends StableID,
  RowID extends StableID,
  ColumnID extends StableID,
>(state: PartitionedTrackGridLayoutState<ID, RowID, ColumnID>, input: VirtualQueryInput): VirtualResult<PartitionedTrackGridLayoutPlan<ID>> {
  const normalized = normalizeQuery(input);
  if (!normalized.ok) return normalized;
  const data = getInternals(state);
  if (!data.ok) return data;
  const rowSegments = querySegments(data.value.rowRanges, normalized.value.renderBounds.y, normalized.value.renderBounds.height);
  const columnSegments = querySegments(data.value.columnRanges, normalized.value.renderBounds.x, normalized.value.renderBounds.width);
  const candidates = new Map<ID, VirtualPlacement<ID>>();
  for (const row of rowSegments) {
    for (const column of columnSegments) {
      const queried = tryQueryTrackGridLayout(data.value.grid, {
        viewport: Object.freeze({ x: column.offset, y: row.offset, width: column.extent, height: row.extent }),
      });
      if (!queried.ok) return queried;
      for (const placement of queried.value.placements) candidates.set(placement.id, placement);
    }
  }
  const placements: VirtualPlacement<ID>[] = [];
  for (const placement of candidates.values()) {
    const region = state.regions[data.value.regionIndex.get(placement.id) ?? -1];
    if (region === undefined) return domainMismatch('Partitioned region index is stale.');
    const rowIndex = data.value.rowIndex.get(region.row);
    const columnIndex = data.value.columnIndex.get(region.column);
    if (rowIndex === undefined || columnIndex === undefined) return domainMismatch('Partitioned region track index is stale.');
    const rowPartition = data.value.rowPartitions[rowIndex]!;
    const columnPartition = data.value.columnPartitions[columnIndex]!;
    const rect = projectRect(
      placement.rect,
      rowPartition,
      columnPartition,
      data.value.rowRanges,
      data.value.columnRanges,
      normalized.value.viewport,
    );
    if (!rectanglesIntersect(rect, normalized.value.renderBounds)) continue;
    const zIndex = (rowPartition === 'center' ? 0 : 1) + (columnPartition === 'center' ? 0 : 1);
    placements.push(Object.freeze({
      id: placement.id,
      index: placement.index,
      rect,
      visible: rectanglesIntersect(rect, normalized.value.viewport),
      ...(zIndex === 0 ? {} : { zIndex }),
    }));
  }
  placements.sort((left, right) => (left.zIndex ?? 0) - (right.zIndex ?? 0) || left.index - right.index);
  const frozen = Object.freeze(placements);
  return ok(Object.freeze({
    generation: state.generation,
    contentSize: Object.freeze({ width: data.value.grid.columns.totalExtent + gapExtent(state.columns.size, state.columnGap), height: data.value.grid.rows.totalExtent + gapExtent(state.rows.size, state.rowGap) }),
    viewport: normalized.value.viewport,
    renderBounds: normalized.value.renderBounds,
    placements: frozen,
    anchor: anchorForPlan(normalized.value.viewport, frozen),
    pinnedStartWidth: data.value.columnRanges.start.extent,
    pinnedEndWidth: data.value.columnRanges.end.extent,
    pinnedStartHeight: data.value.rowRanges.start.extent,
    pinnedEndHeight: data.value.rowRanges.end.extent,
  }));
}

export function applyPartitionedTrackGridMeasurements<
  ID extends StableID,
  RowID extends StableID,
  ColumnID extends StableID,
>(
  state: PartitionedTrackGridLayoutState<ID, RowID, ColumnID>,
  batch: VirtualMeasurementBatch<PartitionedTrackGridMeasurement<RowID, ColumnID>, ID>,
): VirtualLayoutMutation<PartitionedTrackGridLayoutState<ID, RowID, ColumnID>> {
  return unwrap(tryApplyPartitionedTrackGridMeasurements(state, batch));
}

export function tryApplyPartitionedTrackGridMeasurements<
  ID extends StableID,
  RowID extends StableID,
  ColumnID extends StableID,
>(
  state: PartitionedTrackGridLayoutState<ID, RowID, ColumnID>,
  batch: VirtualMeasurementBatch<PartitionedTrackGridMeasurement<RowID, ColumnID>, ID>,
): VirtualResult<VirtualLayoutMutation<PartitionedTrackGridLayoutState<ID, RowID, ColumnID>>> {
  if (batch.generation !== state.generation) {
    return fail('transition-rejection', 'virtual-layout-measurement-stale', 'Measurement generation is stale.', { generation: batch.generation, activeGeneration: state.generation });
  }
  if (batch.measurements.length === 0) return ok(Object.freeze({ state, scrollDelta: ZERO_POINT }));
  const data = getInternals(state);
  if (!data.ok) return data;
  const seen = new Set<string>();
  const rowChanges: (readonly [number, PartitionedTrack<RowID>])[] = [];
  const columnChanges: (readonly [number, PartitionedTrack<ColumnID>])[] = [];
  const gridMeasurements: { readonly axis: 'row' | 'column'; readonly index: number; readonly extent: Extent }[] = [];
  for (const measurement of batch.measurements) {
    const key = `${measurement.axis}:${measurement.id}`;
    if (seen.has(key)) return measurementFailure('Measurements must target each track at most once.', measurement);
    seen.add(key);
    const index = measurement.axis === 'row'
      ? data.value.rowIndex.get(measurement.id as RowID)
      : data.value.columnIndex.get(measurement.id as ColumnID);
    if (index === undefined) return measurementFailure('Measurement target must exist in the active track domain.', measurement);
    const source = measurement.axis === 'row' ? data.value.rows.at(index) : data.value.columns.at(index);
    if (source === undefined) return domainMismatch('Measurement track index is stale.');
    if (sameExtent(source.extent, measurement.extent)) continue;
    const updated = Object.freeze({ ...source, extent: Object.freeze({ ...measurement.extent }) });
    if (measurement.axis === 'row') rowChanges.push([index, updated as PartitionedTrack<RowID>]);
    else columnChanges.push([index, updated as PartitionedTrack<ColumnID>]);
    gridMeasurements.push(Object.freeze({ axis: measurement.axis, index, extent: measurement.extent }));
  }
  if (gridMeasurements.length === 0) return ok(Object.freeze({ state, scrollDelta: ZERO_POINT }));
  const generation = nextGeneration(state.generation);
  if (!generation.ok) return generation;
  const before = baseAnchorRect(state, batch.anchor);
  let next: VirtualResult<PartitionedTrackGridLayoutState<ID, RowID, ColumnID>>;
  rowChanges.sort(([left], [right]) => left - right);
  columnChanges.sort(([left], [right]) => left - right);
  const trackCount = state.rows.size + state.columns.size;
  const repairBound = blockedTrackRepairBound(gridMeasurements.length, trackCount);
  if (useBlockedTrackRepair(gridMeasurements.length, trackCount)) {
    const grid = tryApplyGridMeasurements(data.value.grid, {
      generation: data.value.grid.generation,
      measurements: gridMeasurements,
    });
    if (!grid.ok) return grid;
    const rows = data.value.rows.updateDetailed(rowChanges);
    const columns = data.value.columns.updateDetailed(columnChanges);
    const measured = createMeasuredState(
      state,
      data.value,
      rows.vector,
      columns.vector,
      grid.value.state,
      generation.value,
    );
    recordRepairDiagnostics(measured, {
      mode: 'incremental',
      changed: gridMeasurements.length,
      touchedBlocks: new Set([
        ...rowChanges.map(([index]) => `r:${Math.floor(index / 64)}`),
        ...columnChanges.map(([index]) => `c:${Math.floor(index / 64)}`),
      ]).size,
      copiedNodes: rows.copiedNodes + columns.copiedNodes,
      copiedEntries: rows.copiedEntries + columns.copiedEntries,
      rebuiltItems: 0,
      repairBound,
    });
    next = ok(measured);
  } else {
    const rows = materializeChanges(data.value.rows, rowChanges);
    const columns = materializeChanges(data.value.columns, columnChanges);
    next = createState({
      rows,
      columns,
      regions: state.regions,
      rowGap: state.rowGap,
      columnGap: state.columnGap,
      maxTracks: state.maxTracks,
      maxRegions: state.maxRegions,
      generation: generation.value,
    });
    if (next.ok) recordRepairDiagnostics(next.value, {
      mode: 'rebuild',
      changed: gridMeasurements.length,
      touchedBlocks: new Set([
        ...rowChanges.map(([index]) => `r:${Math.floor(index / 64)}`),
        ...columnChanges.map(([index]) => `c:${Math.floor(index / 64)}`),
      ]).size,
      copiedNodes: 0,
      copiedEntries: 0,
      rebuiltItems: trackCount + state.regions.length,
      repairBound,
    });
  }
  if (!next.ok) return transitionResult(next);
  return ok(Object.freeze({ state: next.value, scrollDelta: anchorDelta(before, baseAnchorRect(next.value, batch.anchor)) }));
}

export function applyPartitionedTrackGridMutation<
  ID extends StableID,
  RowID extends StableID,
  ColumnID extends StableID,
>(
  state: PartitionedTrackGridLayoutState<ID, RowID, ColumnID>,
  mutation: PartitionedTrackGridMutation<ID, RowID, ColumnID>,
  anchor: VirtualAnchor<ID> | null = null,
): VirtualLayoutMutation<PartitionedTrackGridLayoutState<ID, RowID, ColumnID>> {
  return unwrap(tryApplyPartitionedTrackGridMutation(state, mutation, anchor));
}

export function tryApplyPartitionedTrackGridMutation<
  ID extends StableID,
  RowID extends StableID,
  ColumnID extends StableID,
>(
  state: PartitionedTrackGridLayoutState<ID, RowID, ColumnID>,
  mutation: PartitionedTrackGridMutation<ID, RowID, ColumnID>,
  anchor: VirtualAnchor<ID> | null = null,
): VirtualResult<VirtualLayoutMutation<PartitionedTrackGridLayoutState<ID, RowID, ColumnID>>> {
  const data = getInternals(state);
  if (!data.ok) return data;
  let rows = data.value.rows.view.toArray();
  let columns = data.value.columns.view.toArray();
  let regions = state.regions;
  if (mutation.type === 'replace-regions') regions = freezeRegions(mutation.regions);
  else if (mutation.type === 'replace-row-tracks') {
    const normalized = normalizeTracks(mutation.tracks, state.maxTracks);
    if (!normalized.ok) return transitionResult(normalized);
    rows = preserveExtents(normalized.value, data.value.rows.view);
  } else if (mutation.type === 'replace-column-tracks') {
    const normalized = normalizeTracks(mutation.tracks, state.maxTracks);
    if (!normalized.ok) return transitionResult(normalized);
    columns = preserveExtents(normalized.value, data.value.columns.view);
  } else {
    return fail('transition-rejection', 'virtual-layout-mutation-invalid', 'Partitioned grid mutation type is unsupported.', { mutation });
  }
  const generation = nextGeneration(state.generation);
  if (!generation.ok) return generation;
  const before = baseAnchorRect(state, anchor);
  const next = createState({
    rows,
    columns,
    regions,
    rowGap: state.rowGap,
    columnGap: state.columnGap,
    maxTracks: state.maxTracks,
    maxRegions: state.maxRegions,
    generation: generation.value,
  });
  if (!next.ok) return transitionResult(next);
  return ok(Object.freeze({ state: next.value, scrollDelta: anchorDelta(before, baseAnchorRect(next.value, anchor)) }));
}

export function partitionedTrackGridScrollTarget<
  ID extends StableID,
  RowID extends StableID,
  ColumnID extends StableID,
>(
  state: PartitionedTrackGridLayoutState<ID, RowID, ColumnID>,
  id: ID,
  viewport: VirtualRect,
  alignment: VirtualScrollAlignment = 'nearest',
): VirtualPoint {
  return unwrap(tryPartitionedTrackGridScrollTarget(state, id, viewport, alignment));
}

export function tryPartitionedTrackGridScrollTarget<
  ID extends StableID,
  RowID extends StableID,
  ColumnID extends StableID,
>(
  state: PartitionedTrackGridLayoutState<ID, RowID, ColumnID>,
  id: ID,
  viewport: VirtualRect,
  alignment: VirtualScrollAlignment = 'nearest',
): VirtualResult<VirtualPoint> {
  const normalized = normalizeQuery({ viewport });
  if (!normalized.ok) return normalized;
  const data = getInternals(state);
  if (!data.ok) return data;
  const region = state.regions[data.value.regionIndex.get(id) ?? -1];
  const rect = trackGridRegionRect(data.value.grid, id);
  if (region === undefined || rect === null) {
    return fail('transition-rejection', 'virtual-layout-scroll-target-invalid', 'Scroll target must exist in the partitioned grid region domain.', { id });
  }
  const rowIndex = data.value.rowIndex.get(region.row);
  const columnIndex = data.value.columnIndex.get(region.column);
  if (rowIndex === undefined || columnIndex === undefined) return domainMismatch('Scroll target track index is stale.');
  const rowPinned = data.value.rowPartitions[rowIndex] !== 'center';
  const columnPinned = data.value.columnPartitions[columnIndex] !== 'center';
  const contentWidth = data.value.grid.columns.totalExtent + gapExtent(state.columns.size, state.columnGap);
  const contentHeight = data.value.grid.rows.totalExtent + gapExtent(state.rows.size, state.rowGap);
  return ok(Object.freeze({
    x: columnPinned ? viewport.x : alignedScrollOffset(rect.x, rect.width, viewport.x, viewport.width, contentWidth, alignment),
    y: rowPinned ? viewport.y : alignedScrollOffset(rect.y, rect.height, viewport.y, viewport.height, contentHeight, alignment),
  }));
}

function createState<
  ID extends StableID,
  RowID extends StableID,
  ColumnID extends StableID,
>(input: PartitionedStateInput<ID, RowID, ColumnID>): VirtualResult<PartitionedTrackGridLayoutState<ID, RowID, ColumnID>> {
  const built = buildGrid(input.rows, input.columns, input.regions, input);
  if (!built.ok) return built;
  const mutable = { ...input, rows: built.value.rows.view, columns: built.value.columns.view };
  Object.defineProperty(mutable, partitionedTrackGridLayoutStateBrand, { value: true });
  const state = Object.freeze(mutable) as PartitionedTrackGridLayoutState<ID, RowID, ColumnID>;
  internals.set(state, built.value as PartitionedInternals<StableID, StableID, StableID>);
  return ok(state);
}

function createMeasuredState<
  ID extends StableID,
  RowID extends StableID,
  ColumnID extends StableID,
>(
  previous: PartitionedTrackGridLayoutState<ID, RowID, ColumnID>,
  data: PartitionedInternals<ID, RowID, ColumnID>,
  rows: BlockedVector<PartitionedTrack<RowID>>,
  columns: BlockedVector<PartitionedTrack<ColumnID>>,
  grid: TrackGridLayoutState<ID>,
  generation: number,
): PartitionedTrackGridLayoutState<ID, RowID, ColumnID> {
  const mutable = { ...previous, rows: rows.view, columns: columns.view, generation };
  Object.defineProperty(mutable, partitionedTrackGridLayoutStateBrand, { value: true });
  const state = Object.freeze(mutable) as PartitionedTrackGridLayoutState<ID, RowID, ColumnID>;
  internals.set(state, {
    ...data,
    grid,
    rows,
    columns,
    rowRanges: partitionRangesFromTemplate(data.rowRanges, grid.rows, state.rowGap),
    columnRanges: partitionRangesFromTemplate(data.columnRanges, grid.columns, state.columnGap),
  } as PartitionedInternals<StableID, StableID, StableID>);
  return state;
}

function buildGrid<
  ID extends StableID,
  RowID extends StableID,
  ColumnID extends StableID,
>(
  rows: readonly PartitionedTrack<RowID>[],
  columns: readonly PartitionedTrack<ColumnID>[],
  regions: readonly PartitionedTrackGridRegion<ID, RowID, ColumnID>[],
  input: Pick<PartitionedTrackGridLayoutState<ID, RowID, ColumnID>, 'rowGap' | 'columnGap' | 'maxTracks' | 'maxRegions'>,
): VirtualResult<PartitionedInternals<ID, RowID, ColumnID>> {
  const rowIndex = new Map(rows.map((track, index) => [track.id, index]));
  const columnIndex = new Map(columns.map((track, index) => [track.id, index]));
  const numericRegions: GridRegion<ID>[] = [];
  for (const region of regions) {
    const row = rowIndex.get(region.row);
    const column = columnIndex.get(region.column);
    const rowSpan = region.rowSpan ?? 1;
    const columnSpan = region.columnSpan ?? 1;
    if (row === undefined || column === undefined) {
      return fail('construction', 'virtual-layout-region-invalid', 'Partitioned grid regions must reference existing row and column tracks.', { region });
    }
    if (!spanWithinPartition(rows, row, rowSpan) || !spanWithinPartition(columns, column, columnSpan)) {
      return fail('construction', 'virtual-layout-region-invalid', 'Partitioned grid regions cannot span logical partition boundaries.', { region });
    }
    numericRegions.push(Object.freeze({
      id: region.id,
      row,
      column,
      ...(rowSpan === 1 ? {} : { rowSpan }),
      ...(columnSpan === 1 ? {} : { columnSpan }),
    }));
  }
  const rowExtents = tryCreateExtentIndex(rows.map(({ extent }) => extent), { maxItems: input.maxTracks });
  if (!rowExtents.ok) return rowExtents;
  const columnExtents = tryCreateExtentIndex(columns.map(({ extent }) => extent), { maxItems: input.maxTracks });
  if (!columnExtents.ok) return columnExtents;
  const grid = tryCreateTrackGridLayout(rowExtents.value, columnExtents.value, numericRegions, {
    rowGap: input.rowGap,
    columnGap: input.columnGap,
    maxRegions: input.maxRegions,
  });
  if (!grid.ok) return grid;
  return ok(Object.freeze({
    grid: grid.value,
    rowIndex,
    columnIndex,
    regionIndex: new Map(regions.map((region, index) => [region.id, index])),
    rowRanges: partitionRanges(rows, rowExtents.value, input.rowGap),
    columnRanges: partitionRanges(columns, columnExtents.value, input.columnGap),
    rows: createBlockedVector(rows),
    columns: createBlockedVector(columns),
    rowPartitions: Object.freeze(rows.map((track) => track.partition)),
    columnPartitions: Object.freeze(columns.map((track) => track.partition)),
  }));
}

function normalizeTracks<ID extends StableID>(tracks: readonly PartitionedTrack<ID>[], maxTracks: number): VirtualResult<readonly PartitionedTrack<ID>[]> {
  if (tracks.length > maxTracks) return fail('resource-rejection', 'extent-index-ceiling-exceeded', 'Partitioned tracks exceed maxTracks.', { size: tracks.length, maxTracks });
  const domain = tryCreateSequence(tracks.map(({ id }) => id), { maxItems: Math.max(1, maxTracks) });
  if (!domain.ok) return domain;
  const grouped: PartitionedTrack<ID>[] = [];
  for (const partition of ['start', 'center', 'end'] as const) {
    for (const track of tracks) {
      if (!validPartition(track.partition)) return fail('construction', 'virtual-layout-domain-mismatch', 'Track partition must be start, center, or end.', { track });
      if (track.partition === partition) grouped.push(Object.freeze({ id: track.id, partition, extent: Object.freeze({ ...track.extent }) }));
    }
  }
  const extents = tryCreateExtentIndex(grouped.map(({ extent }) => extent), { maxItems: maxTracks });
  if (!extents.ok) return extents;
  return ok(Object.freeze(grouped));
}

function partitionRanges<ID extends StableID>(tracks: readonly PartitionedTrack<ID>[], extents: ExtentIndex, gap: number): PartitionRanges {
  return partitionRangesFromPartitions(tracks.map((track) => track.partition), extents, gap);
}

function partitionRangesFromPartitions(partitions: readonly TrackPartition[], extents: ExtentIndex, gap: number): PartitionRanges {
  const starts = partitions.filter((partition) => partition === 'start').length;
  const centers = partitions.filter((partition) => partition === 'center').length;
  const start = makeRange(extents, gap, 0, starts);
  const center = makeRange(extents, gap, starts, starts + centers);
  const end = makeRange(extents, gap, starts + centers, partitions.length);
  return Object.freeze({ start, center, end });
}

function partitionRangesFromTemplate(template: PartitionRanges, extents: ExtentIndex, gap: number): PartitionRanges {
  return Object.freeze({
    start: makeRange(extents, gap, template.start.startIndex, template.start.endIndex),
    center: makeRange(extents, gap, template.center.startIndex, template.center.endIndex),
    end: makeRange(extents, gap, template.end.startIndex, template.end.endIndex),
  });
}

function makeRange(extents: ExtentIndex, gap: number, startIndex: number, endIndex: number): PartitionRange {
  const offset = extents.offsetAt(startIndex) ?? extents.totalExtent;
  const endOffset = extents.offsetAt(endIndex) ?? extents.totalExtent;
  return Object.freeze({
    startIndex,
    endIndex,
    offset: offset + gap * startIndex,
    extent: Math.max(0, endOffset - offset + gapExtent(endIndex - startIndex, gap)),
  });
}

function querySegments(ranges: PartitionRanges, renderStart: number, renderExtent: number): readonly PartitionRange[] {
  const result: PartitionRange[] = [];
  if (ranges.start.endIndex > ranges.start.startIndex) result.push(ranges.start);
  if (ranges.center.endIndex > ranges.center.startIndex) {
    const start = Math.max(ranges.center.offset, renderStart);
    const end = Math.min(ranges.center.offset + ranges.center.extent, renderStart + renderExtent);
    if (end > start) result.push(Object.freeze({ ...ranges.center, offset: start, extent: end - start }));
  }
  if (ranges.end.endIndex > ranges.end.startIndex) result.push(ranges.end);
  return Object.freeze(result);
}

function projectRect(
  rect: VirtualRect,
  rowPartition: TrackPartition,
  columnPartition: TrackPartition,
  rowRanges: PartitionRanges,
  columnRanges: PartitionRanges,
  viewport: VirtualRect,
): VirtualRect {
  return Object.freeze({
    x: projectAxis(rect.x, rect.width, columnPartition, columnRanges, viewport.x, viewport.width),
    y: projectAxis(rect.y, rect.height, rowPartition, rowRanges, viewport.y, viewport.height),
    width: rect.width,
    height: rect.height,
  });
}

function projectAxis(
  start: number,
  extent: number,
  partition: TrackPartition,
  ranges: PartitionRanges,
  viewportStart: number,
  viewportExtent: number,
): number {
  if (partition === 'start') return viewportStart + start - ranges.start.offset;
  if (partition === 'end') return viewportStart + viewportExtent - ranges.end.extent + start - ranges.end.offset;
  return start;
}

function preserveExtents<ID extends StableID>(next: readonly PartitionedTrack<ID>[], previous: VirtualIndexedView<PartitionedTrack<ID>>): readonly PartitionedTrack<ID>[] {
  const current = new Map<ID, Extent>();
  previous.forEach((track) => current.set(track.id, track.extent));
  return Object.freeze(next.map((track) => Object.freeze({ ...track, extent: current.get(track.id) ?? track.extent })));
}

function baseAnchorRect<ID extends StableID>(state: PartitionedTrackGridLayoutState<ID>, anchor: VirtualAnchor<ID> | null | undefined): VirtualRect | null {
  if (anchor === null || anchor === undefined) return null;
  const data = internals.get(state as PartitionedTrackGridLayoutState);
  return data === undefined ? null : trackGridRegionRect(data.grid, anchor.id);
}

function freezeTrackView<ID extends StableID>(tracks: VirtualIndexedView<PartitionedTrack<ID>>): readonly PartitionedTrack<ID>[] {
  const output: PartitionedTrack<ID>[] = [];
  tracks.forEach((track) => output.push(Object.freeze({ id: track.id, partition: track.partition, extent: Object.freeze({ ...track.extent }) })));
  return Object.freeze(output);
}

function materializeChanges<T>(vector: BlockedVector<T>, changes: readonly (readonly [number, T])[]): readonly T[] {
  const output = new Array<T>(vector.size);
  let cursor = 0;
  vector.forEach((value, index) => {
    if (cursor < changes.length && changes[cursor]![0] === index) output[index] = changes[cursor++]![1];
    else output[index] = value;
  });
  return Object.freeze(output);
}

function freezeRegions<ID extends StableID, RowID extends StableID, ColumnID extends StableID>(
  regions: readonly PartitionedTrackGridRegion<ID, RowID, ColumnID>[],
): readonly PartitionedTrackGridRegion<ID, RowID, ColumnID>[] {
  return Object.freeze(regions.map((region) => Object.freeze({
    id: region.id,
    row: region.row,
    column: region.column,
    ...(region.rowSpan === undefined || region.rowSpan === 1 ? {} : { rowSpan: region.rowSpan }),
    ...(region.columnSpan === undefined || region.columnSpan === 1 ? {} : { columnSpan: region.columnSpan }),
  })));
}

function spanWithinPartition<ID extends StableID>(tracks: readonly PartitionedTrack<ID>[], start: number, span: number): boolean {
  if (!Number.isSafeInteger(span) || span <= 0 || start + span > tracks.length) return false;
  const partition = tracks[start]?.partition;
  for (let index = start + 1; index < start + span; index += 1) if (tracks[index]?.partition !== partition) return false;
  return partition !== undefined;
}

function getInternals<ID extends StableID, RowID extends StableID, ColumnID extends StableID>(
  state: PartitionedTrackGridLayoutState<ID, RowID, ColumnID>,
): VirtualResult<PartitionedInternals<ID, RowID, ColumnID>> {
  const value = internals.get(state as PartitionedTrackGridLayoutState);
  return value === undefined
    ? domainMismatch('Partitioned grid layout state must be created by createPartitionedTrackGridLayout().')
    : ok(value as PartitionedInternals<ID, RowID, ColumnID>);
}

function requireInternals(state: PartitionedTrackGridLayoutState): void {
  if (!internals.has(state)) throw new TypeError('Partitioned grid layout state must be created by createPartitionedTrackGridLayout().');
}

function validSnapshotHeader(snapshot: PartitionedTrackGridLayoutSnapshot): boolean {
  return snapshot !== null
    && typeof snapshot === 'object'
    && snapshot.schemaVersion === 1
    && snapshot.kind === 'partitioned-track-grid'
    && Array.isArray(snapshot.rows)
    && Array.isArray(snapshot.columns)
    && Array.isArray(snapshot.regions)
    && nonNegativeSafe(snapshot.maxTracks)
    && snapshot.maxTracks >= snapshot.rows.length
    && snapshot.maxTracks >= snapshot.columns.length
    && nonNegativeSafe(snapshot.maxRegions)
    && snapshot.maxRegions >= snapshot.regions.length
    && nonNegativeSafe(snapshot.generation);
}

function transitionResult<T>(result: VirtualResult<T>): VirtualResult<T> {
  return result.ok || result.error.class !== 'construction'
    ? result
    : { ok: false, error: { ...result.error, class: 'transition-rejection' } };
}

function measurementFailure<T>(message: string, measurement: unknown): VirtualResult<T> {
  return fail('transition-rejection', 'virtual-layout-measurement-invalid', message, { measurement });
}

function domainMismatch<T>(message: string): VirtualResult<T> {
  return fail('construction', 'virtual-layout-domain-mismatch', message);
}

function snapshotFailure<T>(): VirtualResult<T> {
  return fail('construction', 'virtual-layout-snapshot-invalid', 'Partitioned track-grid layout snapshot is invalid.');
}

function nextGeneration(generation: number): VirtualResult<number> {
  return generation === Number.MAX_SAFE_INTEGER
    ? fail('resource-rejection', 'virtual-layout-generation-exhausted', 'Layout generation reached the safe-integer ceiling.')
    : ok(generation + 1);
}

function anchorDelta(before: VirtualRect | null, after: VirtualRect | null): VirtualPoint {
  return before === null || after === null ? ZERO_POINT : pointDelta(before, after);
}

function gapExtent(size: number, gap: number): number {
  return Math.max(0, size - 1) * gap;
}

function validPartition(value: string): value is TrackPartition {
  return value === 'start' || value === 'center' || value === 'end';
}

function finiteNonNegative(value: number): boolean {
  return Number.isFinite(value) && value >= 0;
}

function nonNegativeSafe(value: number): boolean {
  return Number.isSafeInteger(value) && value >= 0;
}

function sameExtent(left: Extent, right: Extent): boolean {
  return right !== null && typeof right === 'object' && left.kind === right.kind && (left.kind === 'unknown'
    ? left.fallback === (right.kind === 'unknown' ? right.fallback : Number.NaN)
    : left.value === (right.kind === 'unknown' ? Number.NaN : right.value));
}
