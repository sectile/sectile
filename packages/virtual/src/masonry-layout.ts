import type { StableID } from '@sectile/core';
import type { VirtualResult } from './error.js';
import { tryApplySequencePatch, tryCreateSequence, type Sequence, type SequencePatch } from '@sectile/core/sequence';
import { unwrap } from '@sectile/core/result';
import { tryCreateExtentIndex, type Extent, type ExtentIndex, type ExtentUpdate } from './extent-index.js';
import { fail, ok } from './internal/foundation.js';
import { extentValue } from './internal/track.js';
import type { LinearAxis, LinearFlow } from './linear-layout.js';
import {
  alignedScrollOffset, anchorForPlan, normalizeQuery, pointDelta, rectanglesIntersect, ZERO_POINT,
  type VirtualAnchor, type VirtualLayoutMutation, type VirtualLayoutPlan, type VirtualLayoutStrategy,
  type VirtualMeasurementBatch, type VirtualPlacement, type VirtualPoint, type VirtualQueryInput,
  type VirtualRect, type VirtualScrollAlignment,
} from './layout.js';

export type MasonryPlacementPolicy = 'shortest' | 'round-robin';

const masonryLayoutStateBrand: unique symbol = Symbol('SectileMasonryLayoutState');

export interface MasonryLayoutState<ID extends StableID = StableID> {
  readonly [masonryLayoutStateBrand]: true;
  readonly domain: Sequence<ID>;
  readonly extents: ExtentIndex;
  readonly axis: LinearAxis;
  readonly flow: LinearFlow;
  readonly laneCount: number;
  readonly laneExtent: number;
  readonly laneGap: number;
  readonly itemGap: number;
  readonly placementPolicy: MasonryPlacementPolicy;
  readonly maxLanes: number;
  readonly generation: number;
}

export interface MasonryLayoutSnapshot<ID extends StableID = StableID> {
  readonly schemaVersion: 1;
  readonly kind: 'masonry';
  readonly ids: readonly ID[];
  readonly sequenceMaxItems: number;
  readonly sequenceMaxIDCodeUnits: number;
  readonly extents: readonly Extent[];
  readonly extentMaxItems: number;
  readonly axis: LinearAxis;
  readonly flow: LinearFlow;
  readonly laneCount: number;
  readonly laneExtent: number;
  readonly laneGap: number;
  readonly itemGap: number;
  readonly placementPolicy: MasonryPlacementPolicy;
  readonly maxLanes: number;
  readonly generation: number;
}

type MasonryLayoutStateData<ID extends StableID = StableID> = Omit<
  MasonryLayoutState<ID>,
  typeof masonryLayoutStateBrand
>;

export interface MasonryLayoutInput {
  readonly axis?: LinearAxis;
  readonly flow?: LinearFlow;
  readonly laneCount: number;
  readonly laneExtent: number;
  readonly laneGap?: number;
  readonly itemGap?: number;
  readonly placementPolicy?: MasonryPlacementPolicy;
  readonly maxLanes?: number;
}

export interface MasonryMeasurement { readonly index: number; readonly extent: Extent; }

export type MasonryMutation<ID extends StableID = StableID> =
  | { readonly type: 'items'; readonly patch: SequencePatch<ID>; readonly insertedExtents?: readonly Extent[] }
  | { readonly type: 'geometry'; readonly laneCount?: number; readonly laneExtent?: number; readonly laneGap?: number; readonly itemGap?: number; readonly axis?: LinearAxis; readonly flow?: LinearFlow; readonly placementPolicy?: MasonryPlacementPolicy };

export interface MasonryPlacement<ID extends StableID = StableID> extends VirtualPlacement<ID> { readonly lane: number; }
export interface MasonryLayoutPlan<ID extends StableID = StableID> extends VirtualLayoutPlan<ID> { readonly placements: readonly MasonryPlacement<ID>[]; }

interface LogicalPlacement<ID extends StableID> {
  readonly id: ID;
  readonly index: number;
  readonly lane: number;
  readonly start: number;
  readonly extent: number;
}

interface MasonryInternals<ID extends StableID> {
  readonly placements: readonly LogicalPlacement<ID>[];
  readonly lanes: readonly (readonly LogicalPlacement<ID>[])[];
  readonly contentMain: number;
}

interface MasonryReuse<ID extends StableID> {
  readonly previous: MasonryInternals<ID>;
  readonly recomputeStart: number;
}

const internals = new WeakMap<MasonryLayoutState, MasonryInternals<StableID>>();

export const masonryLayoutStrategy: VirtualLayoutStrategy<MasonryLayoutState, StableID, MasonryMeasurement, MasonryMutation> = Object.freeze({
  kind: 'masonry',
  tryQuery: (state: MasonryLayoutState, input: VirtualQueryInput) => tryQueryMasonryLayout(state, input),
  tryMeasure: (state: MasonryLayoutState, batch: VirtualMeasurementBatch<MasonryMeasurement>) => tryApplyMasonryMeasurements(state, batch),
  tryMutate: (state: MasonryLayoutState, input: { readonly mutation: MasonryMutation; readonly anchor?: VirtualAnchor | null }) => tryApplyMasonryMutation(state, input.mutation, input.anchor),
  tryScrollTarget: (state: MasonryLayoutState, id: StableID, viewport: VirtualRect, alignment?: VirtualScrollAlignment) => tryMasonryScrollTarget(state, id, viewport, alignment),
});

export function createMasonryLayout<ID extends StableID>(domain: Sequence<ID>, extents: ExtentIndex, input: MasonryLayoutInput): MasonryLayoutState<ID> {
  return unwrap(tryCreateMasonryLayout(domain, extents, input));
}

export function tryCreateMasonryLayout<ID extends StableID>(domain: Sequence<ID>, extents: ExtentIndex, input: MasonryLayoutInput): VirtualResult<MasonryLayoutState<ID>> {
  if (domain.size !== extents.size) return fail('construction', 'virtual-layout-domain-mismatch', 'Masonry domain and extent index must have the same size.', { domainSize: domain.size, extentSize: extents.size });
  const geometry = normalizeGeometry(input);
  if (!geometry.ok) return geometry;
  return ok(createState({ domain, extents, ...geometry.value, generation: 0 }));
}

export function snapshotMasonryLayout<ID extends StableID>(
  state: MasonryLayoutState<ID>,
): MasonryLayoutSnapshot<ID> {
  const extents = state.extents.slice(0, state.extents.size);
  if (extents === null)
    throw new Error('Internal invariant breach: masonry extent range is invalid.');
  return Object.freeze({
    schemaVersion: 1,
    kind: 'masonry',
    ids: Object.freeze([...state.domain.ids]),
    sequenceMaxItems: state.domain.maxItems,
    sequenceMaxIDCodeUnits: state.domain.maxIDCodeUnits,
    extents,
    extentMaxItems: state.extents.maxItems,
    axis: state.axis,
    flow: state.flow,
    laneCount: state.laneCount,
    laneExtent: state.laneExtent,
    laneGap: state.laneGap,
    itemGap: state.itemGap,
    placementPolicy: state.placementPolicy,
    maxLanes: state.maxLanes,
    generation: state.generation,
  });
}

export function restoreMasonryLayout<ID extends StableID>(
  snapshot: MasonryLayoutSnapshot<ID>,
): MasonryLayoutState<ID> {
  return unwrap(tryRestoreMasonryLayout(snapshot));
}

export function tryRestoreMasonryLayout<ID extends StableID>(
  snapshot: MasonryLayoutSnapshot<ID>,
): VirtualResult<MasonryLayoutState<ID>> {
  if (!validSnapshotHeader(snapshot)) return snapshotFailure();
  const domain = tryCreateSequence(snapshot.ids, {
    maxItems: snapshot.sequenceMaxItems,
    maxIDCodeUnits: snapshot.sequenceMaxIDCodeUnits,
  });
  if (!domain.ok) return domain;
  const extents = tryCreateExtentIndex(snapshot.extents, {
    maxItems: snapshot.extentMaxItems,
  });
  if (!extents.ok) return extents;
  const restored = tryCreateMasonryLayout(domain.value, extents.value, snapshot);
  if (!restored.ok) return restored;
  return ok(createState({ ...restored.value, generation: snapshot.generation }));
}

export function queryMasonryLayout<ID extends StableID>(state: MasonryLayoutState<ID>, input: VirtualQueryInput): MasonryLayoutPlan<ID> {
  return unwrap(tryQueryMasonryLayout(state, input));
}

export function tryQueryMasonryLayout<ID extends StableID>(state: MasonryLayoutState<ID>, input: VirtualQueryInput): VirtualResult<MasonryLayoutPlan<ID>> {
  const normalized = normalizeQuery(input);
  if (!normalized.ok) return normalized;
  const data = getInternals(state);
  if (!data.ok) return data;
  const renderMain = mainBounds(state, normalized.value.renderBounds, data.value.contentMain);
  const laneRange = visibleLanes(state, normalized.value.renderBounds);
  const placements: MasonryPlacement<ID>[] = [];
  for (let laneIndex = laneRange.start; laneIndex < laneRange.end; laneIndex += 1) {
    const lane = data.value.lanes[laneIndex]!;
    const start = firstEndingAfter(lane, renderMain.start);
    for (let index = start; index < lane.length && lane[index]!.start < renderMain.end; index += 1) {
      const logical = lane[index]!;
      const rect = placementRect(state, data.value.contentMain, logical);
      if (!rectanglesIntersect(rect, normalized.value.renderBounds)) continue;
      placements.push(Object.freeze({ id: logical.id, index: logical.index, lane: logical.lane, rect, visible: rectanglesIntersect(rect, normalized.value.viewport) }));
    }
  }
  placements.sort((left, right) => left.index - right.index);
  const frozen = Object.freeze(placements);
  return ok(Object.freeze({
    generation: state.generation,
    contentSize: contentSize(state, data.value.contentMain),
    viewport: normalized.value.viewport,
    renderBounds: normalized.value.renderBounds,
    placements: frozen,
    anchor: anchorForPlan(normalized.value.viewport, frozen),
  }));
}

export function applyMasonryMeasurements<ID extends StableID>(state: MasonryLayoutState<ID>, batch: VirtualMeasurementBatch<MasonryMeasurement, ID>): VirtualLayoutMutation<MasonryLayoutState<ID>> {
  return unwrap(tryApplyMasonryMeasurements(state, batch));
}

export function tryApplyMasonryMeasurements<ID extends StableID>(state: MasonryLayoutState<ID>, batch: VirtualMeasurementBatch<MasonryMeasurement, ID>): VirtualResult<VirtualLayoutMutation<MasonryLayoutState<ID>>> {
  if (batch.generation !== state.generation) return fail('transition-rejection', 'virtual-layout-measurement-stale', 'Measurement generation is stale.', { generation: batch.generation, activeGeneration: state.generation });
  if (batch.measurements.length === 0) return ok(Object.freeze({ state, scrollDelta: ZERO_POINT }));
  const before = anchorRect(state, batch.anchor);
  const updated = state.extents.update(batch.measurements as readonly ExtentUpdate[]);
  if (!updated.ok) return updated;
  const generation = nextGeneration(state.generation);
  if (!generation.ok) return generation;
  const data = getInternals(state);
  if (!data.ok) return data;
  const next = createState(
    { ...state, extents: updated.value, generation: generation.value },
    {
      previous: data.value,
      recomputeStart: firstChangedExtentIndex(state.extents, batch.measurements),
    },
  );
  return ok(Object.freeze({ state: next, scrollDelta: anchorDelta(before, anchorRect(next, batch.anchor)) }));
}

export function applyMasonryMutation<ID extends StableID>(state: MasonryLayoutState<ID>, mutation: MasonryMutation<ID>, anchor: VirtualAnchor<ID> | null = null): VirtualLayoutMutation<MasonryLayoutState<ID>> {
  return unwrap(tryApplyMasonryMutation(state, mutation, anchor));
}

export function tryApplyMasonryMutation<ID extends StableID>(state: MasonryLayoutState<ID>, mutation: MasonryMutation<ID>, anchor: VirtualAnchor<ID> | null = null): VirtualResult<VirtualLayoutMutation<MasonryLayoutState<ID>>> {
  if (mutation.type !== 'items' && mutation.type !== 'geometry') return fail('transition-rejection', 'virtual-layout-mutation-invalid', 'Masonry mutation type is unsupported.', { mutation });
  const before = anchorRect(state, anchor);
  let partial: Omit<MasonryLayoutStateData<ID>, 'generation'>;
  let recomputeStart: number | null = null;
  if (mutation.type === 'items') {
    const inserted = mutation.insertedExtents ?? [];
    if (mutation.patch.type === 'splice' && inserted.length !== mutation.patch.inserted.length) return fail('transition-rejection', 'virtual-layout-inserted-extents-mismatch', 'Every inserted identity requires one extent.');
    if (mutation.patch.type === 'move' && inserted.length !== 0) return fail('transition-rejection', 'virtual-layout-inserted-extents-mismatch', 'Move patches cannot insert extents.');
    const domain = tryApplySequencePatch(state.domain, mutation.patch);
    if (!domain.ok) return domain;
    const extents = mutation.patch.type === 'splice'
      ? state.extents.splice(mutation.patch.index, mutation.patch.deleteCount, inserted)
      : state.extents.move(mutation.patch.from, mutation.patch.to, mutation.patch.count);
    if (!extents.ok) return extents;
    partial = { ...state, domain: domain.value, extents: extents.value };
    recomputeStart = mutation.patch.type === 'splice'
      ? mutation.patch.index
      : Math.min(mutation.patch.from, mutation.patch.to);
  } else {
    const geometry = normalizeGeometry({
      axis: mutation.axis ?? state.axis,
      flow: mutation.flow ?? state.flow,
      laneCount: mutation.laneCount ?? state.laneCount,
      laneExtent: mutation.laneExtent ?? state.laneExtent,
      laneGap: mutation.laneGap ?? state.laneGap,
      itemGap: mutation.itemGap ?? state.itemGap,
      placementPolicy: mutation.placementPolicy ?? state.placementPolicy,
      maxLanes: state.maxLanes,
    });
    if (!geometry.ok) return { ok: false, error: { ...geometry.error, class: 'transition-rejection' } };
    partial = { domain: state.domain, extents: state.extents, ...geometry.value };
  }
  const generation = nextGeneration(state.generation);
  if (!generation.ok) return generation;
  const data = recomputeStart === null ? null : getInternals(state);
  if (data !== null && !data.ok) return data;
  const next = createState(
    { ...partial, generation: generation.value },
    data === null
      ? undefined
      : {
          previous: data.value,
          recomputeStart: Math.min(recomputeStart ?? 0, partial.domain.size),
        },
  );
  return ok(Object.freeze({ state: next, scrollDelta: anchorDelta(before, anchorRect(next, anchor)) }));
}

export function masonryScrollTarget<ID extends StableID>(state: MasonryLayoutState<ID>, id: ID, viewport: VirtualRect, alignment: VirtualScrollAlignment = 'nearest'): VirtualPoint {
  return unwrap(tryMasonryScrollTarget(state, id, viewport, alignment));
}

export function tryMasonryScrollTarget<ID extends StableID>(state: MasonryLayoutState<ID>, id: ID, viewport: VirtualRect, alignment: VirtualScrollAlignment = 'nearest'): VirtualResult<VirtualPoint> {
  const data = getInternals(state);
  if (!data.ok) return data;
  const index = state.domain.indexOf(id);
  const logical = index === null ? undefined : data.value.placements[index];
  if (logical === undefined) return fail('transition-rejection', 'virtual-layout-scroll-target-invalid', 'Scroll target must exist in the masonry domain.', { id });
  const rect = placementRect(state, data.value.contentMain, logical);
  const size = contentSize(state, data.value.contentMain);
  return ok(Object.freeze(state.axis === 'vertical'
    ? { x: viewport.x, y: alignedScrollOffset(rect.y, rect.height, viewport.y, viewport.height, size.height, alignment) }
    : { x: alignedScrollOffset(rect.x, rect.width, viewport.x, viewport.width, size.width, alignment), y: viewport.y }));
}

export function masonryRectAt<ID extends StableID>(state: MasonryLayoutState<ID>, id: ID): VirtualRect | null {
  const data = internals.get(state as MasonryLayoutState);
  const index = state.domain.indexOf(id);
  const logical = index === null ? undefined : data?.placements[index];
  return logical === undefined || data === undefined ? null : placementRect(state, data.contentMain, logical as LogicalPlacement<ID>);
}

function createState<ID extends StableID>(state: MasonryLayoutStateData<ID>, reuse?: MasonryReuse<ID>): MasonryLayoutState<ID> {
  Object.defineProperty(state, masonryLayoutStateBrand, { value: true });
  const frozen = Object.freeze(state) as MasonryLayoutState<ID>;
  internals.set(frozen, buildInternals(frozen, reuse) as MasonryInternals<StableID>);
  return frozen;
}

function buildInternals<ID extends StableID>(state: MasonryLayoutState<ID>, reuse?: MasonryReuse<ID>): MasonryInternals<ID> {
  const laneEnds = Array<number>(state.laneCount).fill(0);
  const lanes = Array.from({ length: state.laneCount }, () => [] as LogicalPlacement<ID>[]);
  const recomputeStart = reuse === undefined
    ? 0
    : Math.min(Math.max(0, reuse.recomputeStart), state.domain.size);
  const placements: LogicalPlacement<ID>[] = reuse === undefined
    ? []
    : reuse.previous.placements.slice(0, recomputeStart) as LogicalPlacement<ID>[];
  if (reuse !== undefined && recomputeStart > 0) {
    for (let lane = 0; lane < state.laneCount; lane += 1) {
      const previous = reuse.previous.lanes[lane] ?? [];
      const end = firstIndexAtOrAfter(previous, recomputeStart);
      const prefix = previous.slice(0, end) as LogicalPlacement<ID>[];
      lanes[lane]!.push(...prefix);
      const last = prefix[prefix.length - 1];
      if (last !== undefined) laneEnds[lane] = last.start + last.extent + state.itemGap;
    }
  }
  const heap = state.placementPolicy === 'shortest' && state.laneCount > 16
    ? Array.from({ length: state.laneCount }, (_, lane) => ({ lane, end: laneEnds[lane]! })).sort(compareLane)
    : null;
  const extents = state.extents.slice(recomputeStart, state.extents.size);
  if (extents === null) throw new Error('Internal invariant breach: masonry extent range is invalid.');
  for (let index = recomputeStart; index < state.domain.size; index += 1) {
    const id = state.domain.at(index)!;
    const extent = extentValue(extents[index - recomputeStart]!);
    const lane = state.placementPolicy === 'round-robin' ? index % state.laneCount : heap === null ? shortestLane(laneEnds) : heap[0]!.lane;
    const start = laneEnds[lane]!;
    const placement = { id, index, lane, start, extent };
    placements.push(placement);
    lanes[lane]!.push(placement);
    laneEnds[lane] = start + extent + state.itemGap;
    if (heap !== null) {
      heap[0] = { lane, end: laneEnds[lane]! };
      restoreHeap(heap);
    }
  }
  let contentMain = 0;
  for (const end of laneEnds) contentMain = Math.max(contentMain, end === 0 ? 0 : end - state.itemGap);
  return Object.freeze({ placements: Object.freeze(placements), lanes: Object.freeze(lanes.map((lane) => Object.freeze(lane))), contentMain });
}

function firstIndexAtOrAfter<ID extends StableID>(lane: readonly LogicalPlacement<ID>[], itemIndex: number): number {
  let low = 0;
  let high = lane.length;
  while (low < high) {
    const middle = (low + high) >>> 1;
    if (lane[middle]!.index < itemIndex) low = middle + 1;
    else high = middle;
  }
  return low;
}

function firstChangedExtentIndex(index: ExtentIndex, measurements: readonly MasonryMeasurement[]): number {
  let first = index.size;
  for (const measurement of measurements) {
    const previous = index.extentAt(measurement.index);
    if (previous === null || extentValue(previous) !== extentValue(measurement.extent)) {
      first = Math.min(first, measurement.index);
    }
  }
  return first;
}

function normalizeGeometry(input: MasonryLayoutInput): VirtualResult<Omit<MasonryLayoutStateData, 'domain' | 'extents' | 'generation'>> {
  const axis = input.axis ?? 'vertical';
  const flow = input.flow ?? 'forward';
  const laneGap = input.laneGap ?? 0;
  const itemGap = input.itemGap ?? 0;
  const placementPolicy = input.placementPolicy ?? 'shortest';
  const maxLanes = input.maxLanes ?? 4_096;
  if (!Number.isSafeInteger(maxLanes) || maxLanes < 1) return fail('construction', 'invalid-max-items', 'maxLanes must be a positive safe integer.', { maxLanes });
  if (input.laneCount > maxLanes) return fail('resource-rejection', 'item-ceiling-exceeded', 'Masonry lane count exceeds maxLanes.', { laneCount: input.laneCount, maxLanes });
  if ((axis !== 'vertical' && axis !== 'horizontal') || (flow !== 'forward' && flow !== 'reverse')
    || !Number.isSafeInteger(input.laneCount) || input.laneCount < 1 || !finitePositive(input.laneExtent)
    || !finiteNonNegative(laneGap) || !finiteNonNegative(itemGap)
    || (placementPolicy !== 'shortest' && placementPolicy !== 'round-robin')) {
    return fail('construction', 'virtual-layout-geometry-invalid', 'Masonry axis, flow, lanes, gaps, and placement policy are invalid.');
  }
  return ok(Object.freeze({ axis, flow, laneCount: input.laneCount, laneExtent: input.laneExtent, laneGap, itemGap, placementPolicy, maxLanes }));
}

function placementRect<ID extends StableID>(state: MasonryLayoutState<ID>, contentMain: number, placement: LogicalPlacement<ID>): VirtualRect {
  const main = state.flow === 'forward' ? placement.start : contentMain - placement.start - placement.extent;
  const cross = placement.lane * (state.laneExtent + state.laneGap);
  return Object.freeze(state.axis === 'vertical'
    ? { x: cross, y: main, width: state.laneExtent, height: placement.extent }
    : { x: main, y: cross, width: placement.extent, height: state.laneExtent });
}

function mainBounds<ID extends StableID>(state: MasonryLayoutState<ID>, rect: VirtualRect, contentMain: number): { readonly start: number; readonly end: number } {
  const start = state.axis === 'vertical' ? rect.y : rect.x;
  const end = start + (state.axis === 'vertical' ? rect.height : rect.width);
  return state.flow === 'forward' ? { start, end } : { start: Math.max(0, contentMain - end), end: Math.max(0, contentMain - start) };
}

function visibleLanes<ID extends StableID>(state: MasonryLayoutState<ID>, rect: VirtualRect): { readonly start: number; readonly end: number } {
  const crossStart = state.axis === 'vertical' ? rect.x : rect.y;
  const crossEnd = crossStart + (state.axis === 'vertical' ? rect.width : rect.height);
  const stride = state.laneExtent + state.laneGap;
  const start = Math.min(state.laneCount, Math.max(0, Math.floor(crossStart / stride)));
  const end = Math.min(state.laneCount, Math.max(start, Math.ceil((crossEnd + state.laneGap) / stride)));
  return { start, end };
}

function firstEndingAfter<ID extends StableID>(lane: readonly LogicalPlacement<ID>[], offset: number): number {
  let low = 0;
  let high = lane.length;
  while (low < high) {
    const middle = (low + high) >>> 1;
    const placement = lane[middle]!;
    if (placement.start + placement.extent <= offset) low = middle + 1;
    else high = middle;
  }
  return low;
}

function shortestLane(laneEnds: readonly number[]): number {
  let selected = 0;
  for (let lane = 1; lane < laneEnds.length; lane += 1) if (laneEnds[lane]! < laneEnds[selected]!) selected = lane;
  return selected;
}

function restoreHeap(heap: { lane: number; end: number }[]): void {
  let index = 0;
  while (true) {
    const left = index * 2 + 1;
    if (left >= heap.length) return;
    const right = left + 1;
    let child = right < heap.length && compareLane(heap[right]!, heap[left]!) < 0 ? right : left;
    if (compareLane(heap[index]!, heap[child]!) <= 0) return;
    [heap[index], heap[child]] = [heap[child]!, heap[index]!];
    index = child;
  }
}

function compareLane(left: { lane: number; end: number }, right: { lane: number; end: number }): number { return left.end - right.end || left.lane - right.lane; }

function anchorRect<ID extends StableID>(state: MasonryLayoutState<ID>, anchor: VirtualAnchor<ID> | null | undefined): VirtualRect | null {
  return anchor === null || anchor === undefined ? null : masonryRectAt(state, anchor.id);
}

function contentSize<ID extends StableID>(state: MasonryLayoutState<ID>, contentMain: number): { readonly width: number; readonly height: number } {
  const cross = state.laneCount * state.laneExtent + Math.max(0, state.laneCount - 1) * state.laneGap;
  return Object.freeze(state.axis === 'vertical' ? { width: cross, height: contentMain } : { width: contentMain, height: cross });
}

function getInternals<ID extends StableID>(state: MasonryLayoutState<ID>): VirtualResult<MasonryInternals<ID>> {
  const value = internals.get(state as MasonryLayoutState);
  return value === undefined ? fail('construction', 'virtual-layout-domain-mismatch', 'Masonry state must be created by createMasonryLayout().') : ok(value as MasonryInternals<ID>);
}

function validSnapshotHeader<ID extends StableID>(snapshot: MasonryLayoutSnapshot<ID>): boolean {
  return snapshot !== null
    && typeof snapshot === 'object'
    && snapshot.schemaVersion === 1
    && snapshot.kind === 'masonry'
    && Array.isArray(snapshot.ids)
    && Array.isArray(snapshot.extents)
    && Number.isSafeInteger(snapshot.sequenceMaxItems)
    && snapshot.sequenceMaxItems >= snapshot.ids.length
    && Number.isSafeInteger(snapshot.sequenceMaxIDCodeUnits)
    && snapshot.sequenceMaxIDCodeUnits > 0
    && Number.isSafeInteger(snapshot.generation)
    && snapshot.generation >= 0
    && Number.isSafeInteger(snapshot.extentMaxItems)
    && snapshot.extentMaxItems >= snapshot.extents.length;
}
function snapshotFailure<T>(): VirtualResult<T> { return fail('construction', 'virtual-layout-snapshot-invalid', 'Masonry layout snapshot is invalid.'); }

function anchorDelta(before: VirtualRect | null, after: VirtualRect | null): VirtualPoint { return before === null || after === null ? ZERO_POINT : pointDelta(before, after); }
function nextGeneration(generation: number): VirtualResult<number> { return generation === Number.MAX_SAFE_INTEGER ? fail('resource-rejection', 'virtual-layout-generation-exhausted', 'Layout generation reached the safe-integer ceiling.') : ok(generation + 1); }
function finiteNonNegative(value: number): boolean { return Number.isFinite(value) && value >= 0; }
function finitePositive(value: number): boolean { return Number.isFinite(value) && value > 0; }
