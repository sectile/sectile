import type { Result, StableID } from '@sectile/core';
import { canRequestCollectionWindow, type CollectionWindowEvent, type CollectionWindowState } from '@sectile/core/collection-window';
import { tryApplySequencePatch, type Sequence, type SequencePatch } from '@sectile/core/sequence';
import { unwrap } from '@sectile/core/result';
import type { Extent, ExtentIndex, ExtentUpdate } from './extent-index.js';
import { fail, ok } from './internal/foundation.js';
import { trackContentExtent, trackRange, trackSpan } from './internal/track.js';
import {
  alignedScrollOffset, anchorForPlan, normalizeQuery, pointDelta, rectanglesIntersect, ZERO_POINT,
  type VirtualAnchor, type VirtualLayoutMutation, type VirtualLayoutPlan, type VirtualLayoutStrategy,
  type VirtualMeasurementBatch, type VirtualPlacement, type VirtualPoint, type VirtualQueryInput,
  type VirtualRect, type VirtualScrollAlignment,
} from './layout.js';

export type LinearAxis = 'vertical' | 'horizontal';
export type LinearFlow = 'forward' | 'reverse';

export interface LinearLayoutState<ID extends StableID = StableID> {
  readonly domain: Sequence<ID>;
  readonly extents: ExtentIndex;
  readonly axis: LinearAxis;
  readonly flow: LinearFlow;
  readonly gap: number;
  readonly crossOffset: number;
  readonly crossExtent: number;
  readonly generation: number;
}
export interface LinearLayoutInput { readonly axis?: LinearAxis; readonly flow?: LinearFlow; readonly gap?: number; readonly crossOffset?: number; readonly crossExtent?: number; }
export interface LinearMeasurement { readonly index: number; readonly extent: Extent; }
export interface LinearPatch<ID extends StableID = StableID> { readonly patch: SequencePatch<ID>; readonly insertedExtents?: readonly Extent[]; }
export interface LinearLayoutWindow {
  readonly generation: number;
  readonly contentSize: { readonly width: number; readonly height: number };
  readonly viewport: VirtualRect;
  readonly renderBounds: VirtualRect;
  readonly renderStart: number;
  readonly renderEnd: number;
  readonly visibleStart: number;
  readonly visibleEnd: number;
}

export const linearLayoutStrategy: VirtualLayoutStrategy<LinearLayoutState, StableID, LinearMeasurement, LinearPatch> = Object.freeze({
  kind: 'linear',
  tryQuery: (state: LinearLayoutState, input: VirtualQueryInput) => tryQueryLinearLayout(state, input),
  tryMeasure: (state: LinearLayoutState, batch: VirtualMeasurementBatch<LinearMeasurement>) => tryApplyLinearMeasurements(state, batch),
  tryMutate: (state: LinearLayoutState, input: { readonly mutation: LinearPatch; readonly anchor?: VirtualAnchor | null }) => tryApplyLinearPatch(state, input.mutation, input.anchor),
  tryScrollTarget: (state: LinearLayoutState, id: StableID, viewport: VirtualRect, alignment?: VirtualScrollAlignment) => tryLinearScrollTarget(state, id, viewport, alignment),
});

export function createLinearLayout<ID extends StableID>(domain: Sequence<ID>, extents: ExtentIndex, input: LinearLayoutInput = {}): LinearLayoutState<ID> {
  return unwrap(tryCreateLinearLayout(domain, extents, input));
}

export function tryCreateLinearLayout<ID extends StableID>(domain: Sequence<ID>, extents: ExtentIndex, input: LinearLayoutInput = {}): Result<LinearLayoutState<ID>> {
  if (domain.size !== extents.size) return fail('construction', 'virtual-layout-domain-mismatch', 'Linear domain and extent index must have the same size.', { domainSize: domain.size, extentSize: extents.size });
  const axis = input.axis ?? 'vertical';
  const flow = input.flow ?? 'forward';
  const gap = input.gap ?? 0;
  const crossOffset = input.crossOffset ?? 0;
  const crossExtent = input.crossExtent ?? 0;
  if ((axis !== 'vertical' && axis !== 'horizontal') || (flow !== 'forward' && flow !== 'reverse')
    || !finiteNonNegative(gap) || !finiteNonNegative(crossOffset) || !finiteNonNegative(crossExtent)) {
    return geometryFailure('Linear axis, flow, gap, and cross geometry are invalid.');
  }
  return ok(freezeState({ domain, extents, axis, flow, gap, crossOffset, crossExtent, generation: 0 }));
}

export function queryLinearLayout<ID extends StableID>(state: LinearLayoutState<ID>, input: VirtualQueryInput): VirtualLayoutPlan<ID> {
  return unwrap(tryQueryLinearLayout(state, input));
}

export function tryQueryLinearLayout<ID extends StableID>(state: LinearLayoutState<ID>, input: VirtualQueryInput): Result<VirtualLayoutPlan<ID>> {
  const window = tryQueryLinearWindow(state, input);
  if (!window.ok) return window;
  const { viewport, renderBounds } = window.value;
  const placements: VirtualPlacement<ID>[] = [];
  for (let index = window.value.renderStart; index < window.value.renderEnd; index += 1) {
    const id = state.domain.at(index);
    const rect = rectAt(state, index);
    if (id === null || rect === null || !rectanglesIntersect(rect, renderBounds)) continue;
    placements.push(Object.freeze({ id, index, rect, visible: rectanglesIntersect(rect, viewport) }));
  }
  const frozen = Object.freeze(placements);
  return ok(Object.freeze({ generation: state.generation, contentSize: window.value.contentSize, viewport, renderBounds, placements: frozen, anchor: anchorForPlan(viewport, frozen) }));
}

export function queryLinearWindow<ID extends StableID>(state: LinearLayoutState<ID>, input: VirtualQueryInput): LinearLayoutWindow {
  return unwrap(tryQueryLinearWindow(state, input));
}

export function tryQueryLinearWindow<ID extends StableID>(state: LinearLayoutState<ID>, input: VirtualQueryInput): Result<LinearLayoutWindow> {
  const normalized = normalizeQuery(input);
  if (!normalized.ok) return normalized;
  const range = (bounds: VirtualRect): { readonly start: number; readonly end: number } => {
    const start = mainStart(state.axis, bounds);
    return trackRange(state.extents, state.gap, state.flow, start, start + mainExtent(state.axis, bounds));
  };
  const render = range(normalized.value.renderBounds);
  const visible = range(normalized.value.viewport);
  return ok(Object.freeze({
    generation: state.generation,
    contentSize: sizeOf(state),
    viewport: normalized.value.viewport,
    renderBounds: normalized.value.renderBounds,
    renderStart: render.start,
    renderEnd: render.end,
    visibleStart: visible.start,
    visibleEnd: visible.end,
  }));
}

export function applyLinearMeasurements<ID extends StableID>(state: LinearLayoutState<ID>, batch: VirtualMeasurementBatch<LinearMeasurement, ID>): VirtualLayoutMutation<LinearLayoutState<ID>> {
  return unwrap(tryApplyLinearMeasurements(state, batch));
}

export function tryApplyLinearMeasurements<ID extends StableID>(state: LinearLayoutState<ID>, batch: VirtualMeasurementBatch<LinearMeasurement, ID>): Result<VirtualLayoutMutation<LinearLayoutState<ID>>> {
  if (batch.generation !== state.generation) return fail('transition-rejection', 'virtual-layout-measurement-stale', 'Measurement generation is stale.', { generation: batch.generation, activeGeneration: state.generation });
  if (batch.measurements.length === 0) return ok(Object.freeze({ state, scrollDelta: ZERO_POINT }));
  const generation = nextGeneration(state.generation);
  if (!generation.ok) return generation;
  const before = anchorRect(state, batch.anchor);
  const updated = state.extents.update(batch.measurements as readonly ExtentUpdate[]);
  if (!updated.ok) return updated;
  const next = freezeState({ ...state, extents: updated.value, generation: generation.value });
  return ok(Object.freeze({ state: next, scrollDelta: anchorDelta(before, anchorRect(next, batch.anchor)) }));
}

export function applyLinearPatch<ID extends StableID>(state: LinearLayoutState<ID>, input: LinearPatch<ID>, anchor: VirtualAnchor<ID> | null = null): VirtualLayoutMutation<LinearLayoutState<ID>> {
  return unwrap(tryApplyLinearPatch(state, input, anchor));
}

export function tryApplyLinearPatch<ID extends StableID>(state: LinearLayoutState<ID>, input: LinearPatch<ID>, anchor: VirtualAnchor<ID> | null = null): Result<VirtualLayoutMutation<LinearLayoutState<ID>>> {
  const inserted = input.insertedExtents ?? [];
  if (input.patch.type === 'splice' && inserted.length !== input.patch.inserted.length) return fail('transition-rejection', 'virtual-layout-inserted-extents-mismatch', 'Every inserted identity requires one extent.');
  if (input.patch.type === 'move' && inserted.length !== 0) return fail('transition-rejection', 'virtual-layout-inserted-extents-mismatch', 'Move patches cannot insert extents.');
  const domain = tryApplySequencePatch(state.domain, input.patch, { maxItems: Math.max(1, state.domain.size - (input.patch.type === 'splice' ? input.patch.deleteCount : 0) + inserted.length) });
  if (!domain.ok) return domain;
  const extents = input.patch.type === 'splice'
    ? state.extents.splice(input.patch.index, input.patch.deleteCount, inserted)
    : state.extents.move(input.patch.from, input.patch.to, input.patch.count);
  if (!extents.ok) return extents;
  const generation = nextGeneration(state.generation);
  if (!generation.ok) return generation;
  const before = anchorRect(state, anchor);
  const next = freezeState({ ...state, domain: domain.value, extents: extents.value, generation: generation.value });
  return ok(Object.freeze({ state: next, scrollDelta: anchorDelta(before, anchorRect(next, anchor)) }));
}

export function linearScrollTarget<ID extends StableID>(state: LinearLayoutState<ID>, id: ID, viewport: VirtualRect, alignment: VirtualScrollAlignment = 'nearest'): VirtualPoint {
  return unwrap(tryLinearScrollTarget(state, id, viewport, alignment));
}

export function tryLinearScrollTarget<ID extends StableID>(state: LinearLayoutState<ID>, id: ID, viewport: VirtualRect, alignment: VirtualScrollAlignment = 'nearest'): Result<VirtualPoint> {
  const index = state.domain.indexOf(id);
  const rect = index === null ? null : rectAt(state, index);
  if (rect === null) return fail('transition-rejection', 'virtual-layout-scroll-target-invalid', 'Scroll target must exist in the linear domain.', { id });
  const content = sizeOf(state);
  return ok(Object.freeze(state.axis === 'vertical'
    ? { x: viewport.x, y: alignedScrollOffset(rect.y, rect.height, viewport.y, viewport.height, content.height, alignment) }
    : { x: alignedScrollOffset(rect.x, rect.width, viewport.x, viewport.width, content.width, alignment), y: viewport.y }));
}

export function linearRectAt<ID extends StableID>(state: LinearLayoutState<ID>, index: number): VirtualRect | null {
  return rectAt(state, index);
}

export function collectionWindowEventForLinearPlan<ID extends StableID>(
  plan: VirtualLayoutPlan<ID>,
  collection: CollectionWindowState<ID>,
  loadedDomain: Sequence<ID>,
): Result<CollectionWindowEvent<ID> | null> {
  if (loadedDomain.size !== collection.size) return fail('transition-rejection', 'virtual-layout-window-mismatch', 'Loaded identity domain must match the collection window size.');
  if (collection.pending !== null || plan.placements.length === 0) return ok(null);
  let renderStart = Number.MAX_SAFE_INTEGER;
  let renderEnd = 0;
  let visibleStart = Number.MAX_SAFE_INTEGER;
  for (const placement of plan.placements) {
    renderStart = Math.min(renderStart, placement.index);
    renderEnd = Math.max(renderEnd, placement.index + 1);
    if (placement.visible) visibleStart = Math.min(visibleStart, placement.index);
  }
  const loadedEnd = collection.start + collection.size;
  const needsBefore = renderStart < collection.start;
  const needsAfter = renderEnd > loadedEnd;
  const direction = visibleStart < collection.start || (needsBefore && !needsAfter) ? 'before' : needsAfter ? 'after' : null;
  if (direction === null || !canRequestCollectionWindow(collection, direction)) return ok(null);
  const anchor = direction === 'before' ? loadedDomain.at(0) : loadedDomain.at(loadedDomain.size - 1);
  return ok({ type: 'request-window', direction, anchor });
}

function rectAt<ID extends StableID>(state: LinearLayoutState<ID>, index: number): VirtualRect | null {
  const span = trackSpan(state.extents, state.gap, state.flow, index, 1);
  if (span === null) return null;
  return state.axis === 'vertical'
    ? Object.freeze({ x: state.crossOffset, y: span.start, width: state.crossExtent, height: span.extent })
    : Object.freeze({ x: span.start, y: state.crossOffset, width: span.extent, height: state.crossExtent });
}

function anchorRect<ID extends StableID>(state: LinearLayoutState<ID>, anchor: VirtualAnchor<ID> | null | undefined): VirtualRect | null {
  if (anchor === null || anchor === undefined) return null;
  const index = state.domain.indexOf(anchor.id);
  return index === null ? null : rectAt(state, index);
}

function anchorDelta(before: VirtualRect | null, after: VirtualRect | null): VirtualPoint { return before === null || after === null ? ZERO_POINT : pointDelta(before, after); }
function mainContentExtent<ID extends StableID>(state: LinearLayoutState<ID>): number { return trackContentExtent(state.extents, state.gap); }
function sizeOf<ID extends StableID>(state: LinearLayoutState<ID>): { readonly width: number; readonly height: number } {
  const main = mainContentExtent(state);
  return Object.freeze(state.axis === 'vertical' ? { width: state.crossOffset + state.crossExtent, height: main } : { width: main, height: state.crossOffset + state.crossExtent });
}
function mainStart(axis: LinearAxis, rect: VirtualRect): number { return axis === 'vertical' ? rect.y : rect.x; }
function mainExtent(axis: LinearAxis, rect: VirtualRect): number { return axis === 'vertical' ? rect.height : rect.width; }
function nextGeneration(generation: number): Result<number> { return generation === Number.MAX_SAFE_INTEGER ? fail('resource-rejection', 'virtual-layout-generation-exhausted', 'Layout generation reached the safe-integer ceiling.') : ok(generation + 1); }
function freezeState<ID extends StableID>(state: LinearLayoutState<ID>): LinearLayoutState<ID> { return Object.freeze(state); }
function finiteNonNegative(value: number): boolean { return Number.isFinite(value) && value >= 0; }
function geometryFailure<T>(message: string): Result<T> { return fail('construction', 'virtual-layout-geometry-invalid', message); }
