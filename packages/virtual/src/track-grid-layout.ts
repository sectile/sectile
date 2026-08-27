import type { StableID } from '@sectile/core';
import type { VirtualResult } from './error.js';
import { unwrap } from '@sectile/core/result';
import {
  tryApplySequencePatch,
  tryCreateSequence,
  type Sequence,
  type SequencePatch,
} from '@sectile/core/sequence';
import { tryCreateExtentIndex, type Extent, type ExtentIndex, type ExtentUpdate } from './extent-index.js';
import { fail, ok } from './internal/foundation.js';
import { trackContentExtent, trackRange, trackSpan, type TrackRange } from './internal/track.js';
import type { LinearFlow } from './linear-layout.js';
import {
  alignedScrollOffset, anchorForPlan, normalizeQuery, pointDelta, rectanglesIntersect, ZERO_POINT,
  type VirtualAnchor, type VirtualLayoutMutation, type VirtualLayoutPlan, type VirtualLayoutStrategy,
  type VirtualMeasurementBatch, type VirtualPlacement, type VirtualPoint, type VirtualQueryInput,
  type VirtualRect, type VirtualScrollAlignment,
} from './layout.js';

export interface GridRegion<ID extends StableID = StableID> {
  readonly id: ID;
  readonly row: number;
  readonly column: number;
  readonly rowSpan?: number;
  readonly columnSpan?: number;
}

const trackGridLayoutStateBrand: unique symbol = Symbol('SectileTrackGridLayoutState');

export interface TrackGridLayoutState<ID extends StableID = StableID> {
  readonly [trackGridLayoutStateBrand]: true;
  readonly rows: ExtentIndex;
  readonly columns: ExtentIndex;
  readonly regions: readonly GridRegion<ID>[];
  readonly rowGap: number;
  readonly columnGap: number;
  readonly rowFlow: LinearFlow;
  readonly columnFlow: LinearFlow;
  readonly maxRegions: number;
  readonly generation: number;
}

export interface TrackGridLayoutSnapshot<ID extends StableID = StableID> {
  readonly schemaVersion: 1;
  readonly kind: 'track-grid';
  readonly rows: readonly Extent[];
  readonly rowMaxItems: number;
  readonly columns: readonly Extent[];
  readonly columnMaxItems: number;
  readonly regions: readonly GridRegion<ID>[];
  readonly rowGap: number;
  readonly columnGap: number;
  readonly rowFlow: LinearFlow;
  readonly columnFlow: LinearFlow;
  readonly maxRegions: number;
  readonly generation: number;
}

export interface TrackGridLayoutInput {
  readonly rowGap?: number;
  readonly columnGap?: number;
  readonly rowFlow?: LinearFlow;
  readonly columnFlow?: LinearFlow;
  readonly maxRegions?: number;
}

export interface GridTrackMeasurement { readonly axis: 'row' | 'column'; readonly index: number; readonly extent: Extent; }

export type TrackGridMutation<ID extends StableID = StableID> =
  | { readonly type: 'replace-regions'; readonly regions: readonly GridRegion<ID>[] }
  | { readonly type: 'patch-dense-regions'; readonly patch: SequencePatch<ID> }
  | { readonly type: 'splice-tracks'; readonly axis: 'row' | 'column'; readonly index: number; readonly deleteCount: number; readonly inserted: readonly Extent[] };

export interface TrackGridLayoutPlan<ID extends StableID = StableID> extends VirtualLayoutPlan<ID> {
  readonly rowRange: TrackRange;
  readonly columnRange: TrackRange;
}

interface IndexedRegion<ID extends StableID> {
  readonly value: GridRegion<ID>;
  readonly index: number;
  readonly rowEnd: number;
  readonly columnEnd: number;
}

interface RegionNode<ID extends StableID> {
  readonly region: IndexedRegion<ID>;
  readonly maxRowEnd: number;
  readonly left: RegionNode<ID> | null;
  readonly right: RegionNode<ID> | null;
}

interface GridInternals<ID extends StableID> {
  readonly root: RegionNode<ID> | null;
  readonly byID: ReadonlyMap<ID, IndexedRegion<ID>> | null;
  readonly dense: DenseGridInternals<ID> | null;
}

interface DenseGridInternals<ID extends StableID> {
  readonly domain: Sequence<ID>;
  readonly columnCount: number;
}

const internals = new WeakMap<TrackGridLayoutState, GridInternals<StableID>>();

export const trackGridLayoutStrategy: VirtualLayoutStrategy<TrackGridLayoutState, StableID, GridTrackMeasurement, TrackGridMutation> = Object.freeze({
  kind: 'track-grid',
  tryQuery: (state: TrackGridLayoutState, input: VirtualQueryInput) => tryQueryTrackGridLayout(state, input),
  tryMeasure: (state: TrackGridLayoutState, batch: VirtualMeasurementBatch<GridTrackMeasurement>) => tryApplyGridMeasurements(state, batch),
  tryMutate: (state: TrackGridLayoutState, input: { readonly mutation: TrackGridMutation; readonly anchor?: VirtualAnchor | null }) => tryApplyTrackGridMutation(state, input.mutation, input.anchor),
  tryScrollTarget: (state: TrackGridLayoutState, id: StableID, viewport: VirtualRect, alignment?: VirtualScrollAlignment) => tryTrackGridScrollTarget(state, id, viewport, alignment),
});

export function createTrackGridLayout<ID extends StableID>(
  rows: ExtentIndex,
  columns: ExtentIndex,
  regions: readonly GridRegion<ID>[],
  input: TrackGridLayoutInput = {},
): TrackGridLayoutState<ID> {
  return unwrap(tryCreateTrackGridLayout(rows, columns, regions, input));
}

export function createDenseTrackGridLayout<ID extends StableID>(
  rows: ExtentIndex,
  columns: ExtentIndex,
  ids: readonly ID[],
  input: TrackGridLayoutInput = {},
): TrackGridLayoutState<ID> {
  const created = tryCreateSequence(ids, {
    maxItems: input.maxRegions ?? 1_000_000,
  });
  const domain = unwrap(created);
  if (columns.size === 0 && domain.size > 0) {
    throw new RangeError('Dense grid items require at least one column.');
  }
  if (domain.size > rows.size * columns.size) {
    throw new RangeError('Dense grid tracks must contain every item.');
  }
  const state = createTrackGridLayout<ID>(rows, columns, [], input);
  return createDenseState(state, domain);
}

export function tryCreateTrackGridLayout<ID extends StableID>(
  rows: ExtentIndex,
  columns: ExtentIndex,
  regions: readonly GridRegion<ID>[],
  input: TrackGridLayoutInput = {},
): VirtualResult<TrackGridLayoutState<ID>> {
  const rowGap = input.rowGap ?? 0;
  const columnGap = input.columnGap ?? 0;
  const rowFlow = input.rowFlow ?? 'forward';
  const columnFlow = input.columnFlow ?? 'forward';
  const maxRegions = input.maxRegions ?? 1_000_000;
  if (!finiteNonNegative(rowGap) || !finiteNonNegative(columnGap) || !validFlow(rowFlow) || !validFlow(columnFlow)) return geometryFailure('Grid gaps and flows are invalid.');
  if (!Number.isSafeInteger(maxRegions) || maxRegions < 0) return fail('construction', 'invalid-max-items', 'maxRegions must be a non-negative safe integer.', { maxRegions });
  const indexed = validateRegions(rows.size, columns.size, regions, maxRegions);
  if (!indexed.ok) return indexed;
  return ok(createState({ rows, columns, regions: indexed.value.map(({ value }) => value), rowGap, columnGap, rowFlow, columnFlow, maxRegions, generation: 0 }, indexed.value));
}

export function snapshotTrackGridLayout<ID extends StableID>(
  state: TrackGridLayoutState<ID>,
): TrackGridLayoutSnapshot<ID> {
  const rows = state.rows.slice(0, state.rows.size);
  const columns = state.columns.slice(0, state.columns.size);
  if (rows === null || columns === null)
    throw new Error('Internal invariant breach: grid track range is invalid.');
  return Object.freeze({
    schemaVersion: 1,
    kind: 'track-grid',
    rows,
    rowMaxItems: state.rows.maxItems,
    columns,
    columnMaxItems: state.columns.maxItems,
    regions: Object.freeze(state.regions.map((region) => Object.freeze({ ...region }))),
    rowGap: state.rowGap,
    columnGap: state.columnGap,
    rowFlow: state.rowFlow,
    columnFlow: state.columnFlow,
    maxRegions: state.maxRegions,
    generation: state.generation,
  });
}

export function restoreTrackGridLayout<ID extends StableID>(
  snapshot: TrackGridLayoutSnapshot<ID>,
): TrackGridLayoutState<ID> {
  return unwrap(tryRestoreTrackGridLayout(snapshot));
}

export function tryRestoreTrackGridLayout<ID extends StableID>(
  snapshot: TrackGridLayoutSnapshot<ID>,
): VirtualResult<TrackGridLayoutState<ID>> {
  if (!validSnapshotHeader(snapshot)) return snapshotFailure();
  const rows = tryCreateExtentIndex(snapshot.rows, {
    maxItems: snapshot.rowMaxItems,
  });
  if (!rows.ok) return rows;
  const columns = tryCreateExtentIndex(snapshot.columns, {
    maxItems: snapshot.columnMaxItems,
  });
  if (!columns.ok) return columns;
  const restored = tryCreateTrackGridLayout(
    rows.value,
    columns.value,
    snapshot.regions,
    snapshot,
  );
  if (!restored.ok) return restored;
  const grid = getInternals(restored.value);
  if (!grid.ok) return grid;
  return ok(createState(
    { ...restored.value, generation: snapshot.generation },
    null,
    grid.value,
  ));
}

export function queryTrackGridLayout<ID extends StableID>(state: TrackGridLayoutState<ID>, input: VirtualQueryInput): TrackGridLayoutPlan<ID> {
  return unwrap(tryQueryTrackGridLayout(state, input));
}

export function tryQueryTrackGridLayout<ID extends StableID>(state: TrackGridLayoutState<ID>, input: VirtualQueryInput): VirtualResult<TrackGridLayoutPlan<ID>> {
  const normalized = normalizeQuery(input);
  if (!normalized.ok) return normalized;
  const grid = getInternals(state);
  if (!grid.ok) return grid;
  const rowRange = trackRange(state.rows, state.rowGap, state.rowFlow, normalized.value.renderBounds.y, normalized.value.renderBounds.y + normalized.value.renderBounds.height);
  const columnRange = trackRange(state.columns, state.columnGap, state.columnFlow, normalized.value.renderBounds.x, normalized.value.renderBounds.x + normalized.value.renderBounds.width);
  if (grid.value.dense !== null) {
    return queryDenseGrid(state, grid.value.dense, normalized.value, rowRange, columnRange);
  }
  const candidates: IndexedRegion<ID>[] = [];
  queryRows(grid.value.root, rowRange.start, rowRange.end, candidates);
  const placements: VirtualPlacement<ID>[] = [];
  for (const candidate of candidates) {
    if (candidate.value.column >= columnRange.end || candidate.columnEnd <= columnRange.start) continue;
    const rect = regionRect(state, candidate.value);
    if (rect === null || !rectanglesIntersect(rect, normalized.value.renderBounds)) continue;
    placements.push(Object.freeze({ id: candidate.value.id, index: candidate.index, rect, visible: rectanglesIntersect(rect, normalized.value.viewport) }));
  }
  placements.sort((left, right) => left.index - right.index);
  const frozen = Object.freeze(placements);
  return ok(Object.freeze({
    generation: state.generation,
    contentSize: contentSize(state),
    viewport: normalized.value.viewport,
    renderBounds: normalized.value.renderBounds,
    placements: frozen,
    anchor: anchorForPlan(normalized.value.viewport, frozen),
    rowRange,
    columnRange,
  }));
}

export function applyGridMeasurements<ID extends StableID>(state: TrackGridLayoutState<ID>, batch: VirtualMeasurementBatch<GridTrackMeasurement, ID>): VirtualLayoutMutation<TrackGridLayoutState<ID>> {
  return unwrap(tryApplyGridMeasurements(state, batch));
}

export function tryApplyGridMeasurements<ID extends StableID>(state: TrackGridLayoutState<ID>, batch: VirtualMeasurementBatch<GridTrackMeasurement, ID>): VirtualResult<VirtualLayoutMutation<TrackGridLayoutState<ID>>> {
  if (batch.generation !== state.generation) return fail('transition-rejection', 'virtual-layout-measurement-stale', 'Measurement generation is stale.', { generation: batch.generation, activeGeneration: state.generation });
  if (batch.measurements.length === 0) return ok(Object.freeze({ state, scrollDelta: ZERO_POINT }));
  const rowUpdates: ExtentUpdate[] = [];
  const columnUpdates: ExtentUpdate[] = [];
  for (const measurement of batch.measurements) {
    if (measurement.axis !== 'row' && measurement.axis !== 'column') return fail('transition-rejection', 'virtual-layout-measurement-invalid', 'Grid measurements require a row or column axis.', { measurement });
    (measurement.axis === 'row' ? rowUpdates : columnUpdates).push(measurement);
  }
  const rows = state.rows.update(rowUpdates);
  if (!rows.ok) return rows;
  const columns = state.columns.update(columnUpdates);
  if (!columns.ok) return columns;
  const generation = nextGeneration(state.generation);
  if (!generation.ok) return generation;
  const before = anchorRect(state, batch.anchor);
  const grid = getInternals(state);
  if (!grid.ok) return grid;
  const next = createState({ ...state, rows: rows.value, columns: columns.value, generation: generation.value }, null, grid.value);
  return ok(Object.freeze({ state: next, scrollDelta: anchorDelta(before, anchorRect(next, batch.anchor)) }));
}

export function applyTrackGridMutation<ID extends StableID>(state: TrackGridLayoutState<ID>, mutation: TrackGridMutation<ID>, anchor: VirtualAnchor<ID> | null = null): VirtualLayoutMutation<TrackGridLayoutState<ID>> {
  return unwrap(tryApplyTrackGridMutation(state, mutation, anchor));
}

export function tryApplyTrackGridMutation<ID extends StableID>(state: TrackGridLayoutState<ID>, mutation: TrackGridMutation<ID>, anchor: VirtualAnchor<ID> | null = null): VirtualResult<VirtualLayoutMutation<TrackGridLayoutState<ID>>> {
  if (mutation.type !== 'replace-regions' && mutation.type !== 'patch-dense-regions' && mutation.type !== 'splice-tracks') return fail('transition-rejection', 'virtual-layout-mutation-invalid', 'Grid mutation type is unsupported.', { mutation });
  const before = anchorRect(state, anchor);
  const current = getInternals(state);
  if (!current.ok) return current;
  if (mutation.type === 'patch-dense-regions') {
    if (current.value.dense === null) return fail('transition-rejection', 'virtual-layout-mutation-invalid', 'Dense region patches require a dense grid state.');
    const domain = tryApplySequencePatch(current.value.dense.domain, mutation.patch, {
      maxItems: state.maxRegions,
    });
    if (!domain.ok) return domain;
    if (state.columns.size === 0 && domain.value.size > 0 || domain.value.size > state.rows.size * state.columns.size) {
      return fail('transition-rejection', 'virtual-layout-region-invalid', 'Dense grid tracks must contain every item.');
    }
    const generation = nextGeneration(state.generation);
    if (!generation.ok) return generation;
    const next = createDenseState({ ...state, generation: generation.value }, domain.value);
    return ok(Object.freeze({ state: next, scrollDelta: anchorDelta(before, anchorRect(next, anchor)) }));
  }
  let rows = state.rows;
  let columns = state.columns;
  let regions: readonly GridRegion<ID>[] = state.regions;
  if (mutation.type === 'replace-regions') regions = mutation.regions;
  else {
    const target = mutation.axis === 'row' ? rows : columns;
    const changed = target.splice(mutation.index, mutation.deleteCount, mutation.inserted);
    if (!changed.ok) return changed;
    if (current.value.dense === null) {
      const transformed = transformRegions(regions, mutation.axis, mutation.index, mutation.deleteCount, mutation.inserted.length);
      if (!transformed.ok) return transformed;
      regions = transformed.value;
    }
    if (mutation.axis === 'row') rows = changed.value;
    else columns = changed.value;
  }
  if (current.value.dense !== null && mutation.type === 'splice-tracks') {
    if (columns.size === 0 && current.value.dense.domain.size > 0 || current.value.dense.domain.size > rows.size * columns.size) {
      return fail('transition-rejection', 'virtual-layout-region-invalid', 'Dense grid tracks must contain every item.');
    }
    const generation = nextGeneration(state.generation);
    if (!generation.ok) return generation;
    const next = createDenseState(
      { ...state, rows, columns, generation: generation.value },
      current.value.dense.domain,
    );
    return ok(Object.freeze({ state: next, scrollDelta: anchorDelta(before, anchorRect(next, anchor)) }));
  }
  const validated = validateRegions(rows.size, columns.size, regions, state.maxRegions);
  if (!validated.ok) return validated.error.class === 'construction'
    ? { ok: false, error: { ...validated.error, class: 'transition-rejection' } }
    : validated;
  const generation = nextGeneration(state.generation);
  if (!generation.ok) return generation;
  const next = createState({ ...state, rows, columns, regions: validated.value.map(({ value }) => value), generation: generation.value }, validated.value);
  return ok(Object.freeze({ state: next, scrollDelta: anchorDelta(before, anchorRect(next, anchor)) }));
}

export function trackGridScrollTarget<ID extends StableID>(state: TrackGridLayoutState<ID>, id: ID, viewport: VirtualRect, alignment: VirtualScrollAlignment = 'nearest'): VirtualPoint {
  return unwrap(tryTrackGridScrollTarget(state, id, viewport, alignment));
}

export function tryTrackGridScrollTarget<ID extends StableID>(state: TrackGridLayoutState<ID>, id: ID, viewport: VirtualRect, alignment: VirtualScrollAlignment = 'nearest'): VirtualResult<VirtualPoint> {
  const grid = getInternals(state);
  if (!grid.ok) return grid;
  const denseIndex = grid.value.dense?.domain.indexOf(id) ?? null;
  const region = grid.value.byID?.get(id);
  const rect = denseIndex !== null
    ? denseRegionRect(state, denseIndex, grid.value.dense!.columnCount)
    : region === undefined ? null : regionRect(state, region.value);
  if (rect === null) return fail('transition-rejection', 'virtual-layout-scroll-target-invalid', 'Scroll target must exist in the grid region domain.', { id });
  const size = contentSize(state);
  return ok(Object.freeze({
    x: alignedScrollOffset(rect.x, rect.width, viewport.x, viewport.width, size.width, alignment),
    y: alignedScrollOffset(rect.y, rect.height, viewport.y, viewport.height, size.height, alignment),
  }));
}

export function trackGridRegionRect<ID extends StableID>(state: TrackGridLayoutState<ID>, id: ID): VirtualRect | null {
  const grid = internals.get(state as TrackGridLayoutState);
  const denseIndex = grid?.dense?.domain.indexOf(id) ?? null;
  if (denseIndex !== null) return denseRegionRect(state, denseIndex, grid!.dense!.columnCount);
  const region = grid?.byID?.get(id);
  return region === undefined ? null : regionRect(state, region.value as GridRegion<ID>);
}

function createState<ID extends StableID>(state: Omit<TrackGridLayoutState<ID>, typeof trackGridLayoutStateBrand>, indexed: readonly IndexedRegion<ID>[] | null, reusable?: GridInternals<ID>): TrackGridLayoutState<ID> {
  const mutable = { ...state, regions: reusable === undefined ? Object.freeze([...state.regions]) : state.regions };
  Object.defineProperty(mutable, trackGridLayoutStateBrand, { value: true });
  const frozen = Object.freeze(mutable) as TrackGridLayoutState<ID>;
  if (reusable !== undefined) {
    internals.set(frozen, reusable as GridInternals<StableID>);
    return frozen;
  }
  if (indexed === null) throw new Error('Internal invariant breach: grid regions require an index.');
  const sorted = [...indexed].sort(compareRegions);
  internals.set(frozen, { root: buildRegionTree(sorted, 0, sorted.length), byID: new Map(indexed.map((region) => [region.value.id, region])), dense: null } as GridInternals<StableID>);
  return frozen;
}

function createDenseState<ID extends StableID>(
  state: Omit<TrackGridLayoutState<ID>, typeof trackGridLayoutStateBrand>,
  domain: Sequence<ID>,
): TrackGridLayoutState<ID> {
  const columnCount = state.columns.size;
  const regions = denseRegions(domain, columnCount);
  return createState(
    { ...state, regions },
    null,
    { root: null, byID: null, dense: Object.freeze({ domain, columnCount }) },
  );
}

function denseRegions<ID extends StableID>(
  domain: Sequence<ID>,
  columnCount: number,
): readonly GridRegion<ID>[] {
  const target = new Array<GridRegion<ID>>(domain.size);
  return new Proxy(target, {
    get(array, property, receiver) {
      if (typeof property === 'string') {
        const index = Number(property);
        if (Number.isSafeInteger(index) && index >= 0 && index < domain.size) {
          const existing = array[index];
          if (existing !== undefined) return existing;
          const id = domain.at(index);
          if (id === null) return undefined;
          const region = Object.freeze({
            id,
            row: Math.floor(index / columnCount),
            column: index % columnCount,
          });
          array[index] = region;
          return region;
        }
      }
      return Reflect.get(array, property, receiver);
    },
    set: () => false,
    deleteProperty: () => false,
  });
}

function queryDenseGrid<ID extends StableID>(
  state: TrackGridLayoutState<ID>,
  dense: DenseGridInternals<ID>,
  input: Readonly<{ readonly viewport: VirtualRect; readonly renderBounds: VirtualRect }>,
  rowRange: TrackRange,
  columnRange: TrackRange,
): VirtualResult<TrackGridLayoutPlan<ID>> {
  const placements: VirtualPlacement<ID>[] = [];
  for (let row = rowRange.start; row < rowRange.end; row += 1) {
    for (let column = columnRange.start; column < columnRange.end; column += 1) {
      const index = row * dense.columnCount + column;
      const id = dense.domain.at(index);
      if (id === null) continue;
      const rect = denseRegionRect(state, index, dense.columnCount);
      if (rect === null || !rectanglesIntersect(rect, input.renderBounds)) continue;
      placements.push(Object.freeze({
        id,
        index,
        rect,
        visible: rectanglesIntersect(rect, input.viewport),
      }));
    }
  }
  const frozen = Object.freeze(placements);
  return ok(Object.freeze({
    generation: state.generation,
    contentSize: contentSize(state),
    viewport: input.viewport,
    renderBounds: input.renderBounds,
    placements: frozen,
    anchor: anchorForPlan(input.viewport, frozen),
    rowRange,
    columnRange,
  }));
}

function denseRegionRect<ID extends StableID>(
  state: TrackGridLayoutState<ID>,
  index: number,
  columnCount: number,
): VirtualRect | null {
  if (columnCount === 0) return null;
  const row = Math.floor(index / columnCount);
  const column = index % columnCount;
  const rowSpan = trackSpan(state.rows, state.rowGap, state.rowFlow, row, 1);
  const columnSpan = trackSpan(state.columns, state.columnGap, state.columnFlow, column, 1);
  return rowSpan === null || columnSpan === null ? null : Object.freeze({
    x: columnSpan.start,
    y: rowSpan.start,
    width: columnSpan.extent,
    height: rowSpan.extent,
  });
}

function validateRegions<ID extends StableID>(rowCount: number, columnCount: number, regions: readonly GridRegion<ID>[], maxRegions: number): VirtualResult<readonly IndexedRegion<ID>[]> {
  if (regions.length > maxRegions) return fail('resource-rejection', 'item-ceiling-exceeded', 'Grid regions exceed maxRegions.', { size: regions.length, maxRegions });
  const domain = tryCreateSequence(regions.map(({ id }) => id), { maxItems: Math.max(1, maxRegions) });
  if (!domain.ok) return domain;
  const indexed: IndexedRegion<ID>[] = [];
  for (let index = 0; index < regions.length; index += 1) {
    const region = regions[index]!;
    const rowSpan = region.rowSpan ?? 1;
    const columnSpan = region.columnSpan ?? 1;
    if (!positiveSafe(rowSpan) || !positiveSafe(columnSpan) || !nonNegativeSafe(region.row) || !nonNegativeSafe(region.column)
      || region.row + rowSpan > rowCount || region.column + columnSpan > columnCount) {
      return fail('construction', 'virtual-layout-region-invalid', 'Grid regions require unique stable IDs and valid track spans.', { region, rowCount, columnCount });
    }
    const value = Object.freeze({ id: region.id, row: region.row, column: region.column, ...(rowSpan === 1 ? {} : { rowSpan }), ...(columnSpan === 1 ? {} : { columnSpan }) }) as GridRegion<ID>;
    indexed.push(Object.freeze({ value, index, rowEnd: region.row + rowSpan, columnEnd: region.column + columnSpan }));
  }
  const sorted = [...indexed].sort(compareRegions);
  const active: IndexedRegion<ID>[] = [];
  for (const region of sorted) {
    for (let index = active.length - 1; index >= 0; index -= 1) if (active[index]!.rowEnd <= region.value.row) active.splice(index, 1);
    for (const other of active) if (other.value.column < region.columnEnd && region.value.column < other.columnEnd) {
      return fail('construction', 'virtual-layout-region-overlap', 'Track-grid regions cannot overlap.', { left: other.value.id, right: region.value.id });
    }
    active.push(region);
  }
  return ok(Object.freeze(indexed));
}

function transformRegions<ID extends StableID>(regions: readonly GridRegion<ID>[], axis: 'row' | 'column', index: number, deleteCount: number, insertedCount: number): VirtualResult<readonly GridRegion<ID>[]> {
  const removedEnd = index + deleteCount;
  const delta = insertedCount - deleteCount;
  const result: GridRegion<ID>[] = [];
  for (const region of regions) {
    const start = axis === 'row' ? region.row : region.column;
    const span = axis === 'row' ? region.rowSpan ?? 1 : region.columnSpan ?? 1;
    const end = start + span;
    const insertionSplitsRegion = deleteCount === 0 && start < index && index < end;
    const deletionTouchesRegion = deleteCount > 0 && start < removedEnd && end > index;
    if (insertionSplitsRegion || deletionTouchesRegion) return fail('transition-rejection', 'virtual-layout-mutation-invalid', 'Track splice intersects a region; replace regions atomically to define the new spans.', { id: region.id, axis, index, deleteCount });
    const nextStart = start >= removedEnd ? start + delta : start;
    result.push(Object.freeze(axis === 'row' ? { ...region, row: nextStart } : { ...region, column: nextStart }));
  }
  return ok(Object.freeze(result));
}

function queryRows<ID extends StableID>(node: RegionNode<ID> | null, start: number, end: number, output: IndexedRegion<ID>[]): void {
  if (node === null || node.maxRowEnd <= start) return;
  if (node.left !== null) queryRows(node.left, start, end, output);
  if (node.region.value.row < end && node.region.rowEnd > start) output.push(node.region);
  if (node.region.value.row < end) queryRows(node.right, start, end, output);
}

function buildRegionTree<ID extends StableID>(regions: readonly IndexedRegion<ID>[], from: number, to: number): RegionNode<ID> | null {
  if (from >= to) return null;
  const middle = (from + to) >>> 1;
  const left = buildRegionTree(regions, from, middle);
  const right = buildRegionTree(regions, middle + 1, to);
  const region = regions[middle]!;
  return Object.freeze({ region, left, right, maxRowEnd: Math.max(region.rowEnd, left?.maxRowEnd ?? 0, right?.maxRowEnd ?? 0) });
}

function regionRect<ID extends StableID>(state: TrackGridLayoutState<ID>, region: GridRegion<ID>): VirtualRect | null {
  const row = trackSpan(state.rows, state.rowGap, state.rowFlow, region.row, region.rowSpan ?? 1);
  const column = trackSpan(state.columns, state.columnGap, state.columnFlow, region.column, region.columnSpan ?? 1);
  return row === null || column === null ? null : Object.freeze({ x: column.start, y: row.start, width: column.extent, height: row.extent });
}

function anchorRect<ID extends StableID>(state: TrackGridLayoutState<ID>, anchor: VirtualAnchor<ID> | null | undefined): VirtualRect | null {
  return anchor === null || anchor === undefined ? null : trackGridRegionRect(state, anchor.id);
}

function contentSize<ID extends StableID>(state: TrackGridLayoutState<ID>): { readonly width: number; readonly height: number } {
  return Object.freeze({ width: trackContentExtent(state.columns, state.columnGap), height: trackContentExtent(state.rows, state.rowGap) });
}

function getInternals<ID extends StableID>(state: TrackGridLayoutState<ID>): VirtualResult<GridInternals<ID>> {
  const value = internals.get(state as TrackGridLayoutState);
  return value === undefined ? fail('construction', 'virtual-layout-domain-mismatch', 'Grid layout state must be created by createTrackGridLayout().') : ok(value as GridInternals<ID>);
}

function validSnapshotHeader<ID extends StableID>(snapshot: TrackGridLayoutSnapshot<ID>): boolean {
  return snapshot !== null
    && typeof snapshot === 'object'
    && snapshot.schemaVersion === 1
    && snapshot.kind === 'track-grid'
    && Array.isArray(snapshot.rows)
    && Array.isArray(snapshot.columns)
    && Array.isArray(snapshot.regions)
    && Number.isSafeInteger(snapshot.rowMaxItems)
    && snapshot.rowMaxItems >= snapshot.rows.length
    && Number.isSafeInteger(snapshot.columnMaxItems)
    && snapshot.columnMaxItems >= snapshot.columns.length
    && Number.isSafeInteger(snapshot.maxRegions)
    && snapshot.maxRegions >= snapshot.regions.length
    && Number.isSafeInteger(snapshot.generation)
    && snapshot.generation >= 0;
}
function snapshotFailure<T>(): VirtualResult<T> { return fail('construction', 'virtual-layout-snapshot-invalid', 'Track-grid layout snapshot is invalid.'); }

function compareRegions<ID extends StableID>(left: IndexedRegion<ID>, right: IndexedRegion<ID>): number {
  return left.value.row - right.value.row || left.value.column - right.value.column || left.index - right.index;
}

function anchorDelta(before: VirtualRect | null, after: VirtualRect | null): VirtualPoint { return before === null || after === null ? ZERO_POINT : pointDelta(before, after); }
function nextGeneration(generation: number): VirtualResult<number> { return generation === Number.MAX_SAFE_INTEGER ? fail('resource-rejection', 'virtual-layout-generation-exhausted', 'Layout generation reached the safe-integer ceiling.') : ok(generation + 1); }
function geometryFailure<T>(message: string): VirtualResult<T> { return fail('construction', 'virtual-layout-geometry-invalid', message); }
function finiteNonNegative(value: number): boolean { return Number.isFinite(value) && value >= 0; }
function positiveSafe(value: number): boolean { return Number.isSafeInteger(value) && value > 0; }
function nonNegativeSafe(value: number): boolean { return Number.isSafeInteger(value) && value >= 0; }
function validFlow(value: string): value is LinearFlow { return value === 'forward' || value === 'reverse'; }
