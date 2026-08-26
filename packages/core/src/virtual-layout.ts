import { createMachineUpdate, type MachineUpdate } from './internal/kernel/machine.js';
import { fail, ok } from './internal/kernel/foundation.js';
import { unwrap } from './result.js';
import type { CollectionWindowEvent, CollectionWindowState } from './collection-window.js';
import { canRequestCollectionWindow } from './collection-window.js';
import type { Extent, ExtentIndex, ExtentUpdate } from './structures/extent-index.js';
import type { Sequence, SequencePatch } from './structures/sequence.js';
import type { Result, StableID } from './shared.js';

export interface VirtualLayoutRange {
  readonly start: number;
  readonly end: number;
}

export interface VirtualLayoutState {
  readonly domainSize: number;
  readonly extents: ExtentIndex;
  readonly viewportOffset: number;
  readonly viewportExtent: number;
  readonly overscanBefore: number;
  readonly overscanAfter: number;
  readonly visibleRange: VirtualLayoutRange;
  readonly renderRange: VirtualLayoutRange;
  readonly measurementGeneration: number;
}

export interface VirtualLayoutStateInput {
  readonly viewportOffset?: number;
  readonly viewportExtent?: number;
  readonly overscanBefore?: number;
  readonly overscanAfter?: number;
}

export type VirtualScrollAlignment = 'start' | 'center' | 'end' | 'nearest';

export type VirtualLayoutEvent<ID extends StableID = StableID> =
  | { readonly type: 'viewport-changed'; readonly offset: number; readonly extent?: number }
  | { readonly type: 'overscan-changed'; readonly before: number; readonly after: number }
  | {
      readonly type: 'measurements-reported';
      readonly generation: number;
      readonly updates: readonly ExtentUpdate[];
    }
  | {
      readonly type: 'sequence-patched';
      readonly patch: SequencePatch<ID>;
      readonly insertedExtents?: readonly Extent[];
    }
  | {
      readonly type: 'scroll-to-index';
      readonly index: number;
      readonly align?: VirtualScrollAlignment;
      readonly offset?: number;
    };

export type VirtualLayoutCommand =
  | {
      readonly type: 'set-scroll-offset';
      readonly offset: number;
      readonly delta: number;
      readonly reason: 'anchor-correction' | 'target';
    }
  | {
      readonly type: 'render-range-changed';
      readonly range: VirtualLayoutRange;
      readonly generation: number;
    }
  | {
      readonly type: 'measure-range';
      readonly range: VirtualLayoutRange;
      readonly generation: number;
    };

export type VirtualLayoutUpdate = MachineUpdate<VirtualLayoutState, VirtualLayoutCommand>;

export function createVirtualLayoutState<ID extends StableID>(
  domain: Sequence<ID>,
  extents: ExtentIndex,
  input: VirtualLayoutStateInput = {},
): VirtualLayoutState {
  return unwrap(tryCreateVirtualLayoutState(domain, extents, input));
}

export function tryCreateVirtualLayoutState<ID extends StableID>(
  domain: Sequence<ID>,
  extents: ExtentIndex,
  input: VirtualLayoutStateInput = {},
): Result<VirtualLayoutState> {
  if (domain.size !== extents.size) {
    return fail(
      'construction',
      'virtual-layout-domain-mismatch',
      'Virtual layout domain and extent index must have the same size.',
      { domainSize: domain.size, extentSize: extents.size },
    );
  }
  const viewportOffset = input.viewportOffset ?? 0;
  const viewportExtent = input.viewportExtent ?? 0;
  const overscanBefore = input.overscanBefore ?? viewportExtent;
  const overscanAfter = input.overscanAfter ?? viewportExtent;
  const invalid = invalidGeometry(viewportOffset, viewportExtent, overscanBefore, overscanAfter);
  if (invalid !== null) return invalid;
  const geometry = calculateGeometry(
    extents,
    viewportOffset,
    viewportExtent,
    overscanBefore,
    overscanAfter,
  );
  return ok(freezeState({
    domainSize: domain.size,
    extents,
    viewportOffset: geometry.viewportOffset,
    viewportExtent,
    overscanBefore,
    overscanAfter,
    visibleRange: geometry.visibleRange,
    renderRange: geometry.renderRange,
    measurementGeneration: geometry.renderRange.start === geometry.renderRange.end ? 0 : 1,
  }));
}

export function applyVirtualLayoutEvent<ID extends StableID>(
  state: VirtualLayoutState,
  event: VirtualLayoutEvent<ID>,
): Result<VirtualLayoutUpdate> {
  if (event.type === 'viewport-changed') return changeViewport(state, event.offset, event.extent);
  if (event.type === 'overscan-changed') return changeOverscan(state, event.before, event.after);
  if (event.type === 'measurements-reported') return applyMeasurements(state, event.generation, event.updates);
  if (event.type === 'sequence-patched') {
    return applyDomainPatch(state, event.patch, event.insertedExtents ?? []);
  }
  return scrollToIndex(state, event.index, event.align ?? 'nearest', event.offset ?? 0);
}

export function collectionWindowEventForVirtualLayout<ID extends StableID>(
  layout: VirtualLayoutState,
  collection: CollectionWindowState<ID>,
  loadedDomain: Sequence<ID>,
): Result<CollectionWindowEvent<ID> | null> {
  if (loadedDomain.size !== collection.size) {
    return fail(
      'transition-rejection',
      'virtual-layout-window-mismatch',
      'Loaded identity domain must match the collection window size.',
      { domainSize: loadedDomain.size, windowSize: collection.size },
    );
  }
  if (collection.pending !== null) return ok(null);
  const loadedEnd = collection.start + collection.size;
  const needsBefore = layout.renderRange.start < collection.start;
  const needsAfter = layout.renderRange.end > loadedEnd;
  const visibleNeedsBefore = layout.visibleRange.start < collection.start;
  const direction = visibleNeedsBefore || (needsBefore && !needsAfter) ? 'before' : needsAfter ? 'after' : null;
  if (direction === null || !canRequestCollectionWindow(collection, direction)) return ok(null);
  const anchor = direction === 'before' ? loadedDomain.at(0) : loadedDomain.at(loadedDomain.size - 1);
  return ok({ type: 'request-window', direction, anchor });
}

function changeViewport(
  state: VirtualLayoutState,
  offset: number,
  extent: number | undefined,
): Result<VirtualLayoutUpdate> {
  const viewportExtent = extent ?? state.viewportExtent;
  const invalid = invalidGeometry(offset, viewportExtent, state.overscanBefore, state.overscanAfter);
  if (invalid !== null) return transitionFailure(invalid);
  return recalculate(state, {
    ...state,
    viewportOffset: offset,
    viewportExtent,
  });
}

function changeOverscan(
  state: VirtualLayoutState,
  before: number,
  after: number,
): Result<VirtualLayoutUpdate> {
  const invalid = invalidGeometry(state.viewportOffset, state.viewportExtent, before, after);
  if (invalid !== null) return transitionFailure(invalid);
  return recalculate(state, { ...state, overscanBefore: before, overscanAfter: after });
}

function applyMeasurements(
  state: VirtualLayoutState,
  generation: number,
  updates: readonly ExtentUpdate[],
): Result<VirtualLayoutUpdate> {
  if (generation !== state.measurementGeneration) {
    return fail(
      'transition-rejection',
      'virtual-layout-measurement-stale',
      'Measurement generation does not match the active render range.',
      { generation, activeGeneration: state.measurementGeneration },
    );
  }
  const anchor = captureAnchor(state);
  const updated = state.extents.update(updates);
  if (!updated.ok) return updated;
  const correctedOffset = correctedViewportOffset(state, updated.value, anchor, anchor?.index ?? null);
  return recalculate(
    state,
    { ...state, extents: updated.value, viewportOffset: correctedOffset },
    correctedOffset === state.viewportOffset ? [] : [scrollCommand(state, correctedOffset, 'anchor-correction')],
  );
}

function applyDomainPatch<ID extends StableID>(
  state: VirtualLayoutState,
  patch: SequencePatch<ID>,
  insertedExtents: readonly Extent[],
): Result<VirtualLayoutUpdate> {
  const anchor = captureAnchor(state);
  let nextExtents: Result<ExtentIndex>;
  let nextAnchorIndex: number | null = anchor?.index ?? null;
  if (patch.type === 'splice') {
    if (insertedExtents.length !== patch.inserted.length) {
      return fail(
        'transition-rejection',
        'virtual-layout-inserted-extents-mismatch',
        'Every inserted identity must have one initial extent.',
        { identities: patch.inserted.length, extents: insertedExtents.length },
      );
    }
    nextExtents = state.extents.splice(patch.index, patch.deleteCount, insertedExtents);
    if (nextExtents.ok && nextAnchorIndex !== null) {
      nextAnchorIndex = spliceAnchorIndex(
        nextAnchorIndex,
        patch.index,
        patch.deleteCount,
        insertedExtents.length,
        nextExtents.value.size,
      );
    }
  } else {
    if (insertedExtents.length !== 0) {
      return fail(
        'transition-rejection',
        'virtual-layout-inserted-extents-mismatch',
        'Move patches do not accept inserted extents.',
      );
    }
    nextExtents = state.extents.move(patch.from, patch.to, patch.count);
    if (nextExtents.ok && nextAnchorIndex !== null) {
      nextAnchorIndex = moveAnchorIndex(nextAnchorIndex, patch.from, patch.to, patch.count);
    }
  }
  if (!nextExtents.ok) return nextExtents;
  const correctedOffset = correctedViewportOffset(state, nextExtents.value, anchor, nextAnchorIndex);
  const scrollCommands = correctedOffset === state.viewportOffset
    ? []
    : [scrollCommand(state, correctedOffset, 'anchor-correction')];
  return recalculate(
    state,
    {
      ...state,
      domainSize: nextExtents.value.size,
      extents: nextExtents.value,
      viewportOffset: correctedOffset,
    },
    scrollCommands,
    true,
  );
}

function scrollToIndex(
  state: VirtualLayoutState,
  index: number,
  align: VirtualScrollAlignment,
  offset: number,
): Result<VirtualLayoutUpdate> {
  if (
    !Number.isSafeInteger(index)
    || index < 0
    || index >= state.domainSize
    || !Number.isFinite(offset)
    || (align !== 'start' && align !== 'center' && align !== 'end' && align !== 'nearest')
  ) {
    return fail(
      'transition-rejection',
      'virtual-layout-scroll-target-invalid',
      'Scroll target must identify an existing item, finite offset, and known alignment.',
      { index, align, offset, size: state.domainSize },
    );
  }
  const itemStart = state.extents.offsetAt(index)!;
  const itemEnd = state.extents.offsetAt(index + 1)!;
  const viewportEnd = state.viewportOffset + state.viewportExtent;
  let target: number;
  if (align === 'start') target = itemStart - offset;
  else if (align === 'center') target = (itemStart + itemEnd - state.viewportExtent) / 2 - offset;
  else if (align === 'end') target = itemEnd - state.viewportExtent - offset;
  else if (itemStart >= state.viewportOffset && itemEnd <= viewportEnd) return createMachineUpdate(state);
  else if (itemStart < state.viewportOffset) target = itemStart - offset;
  else target = itemEnd - state.viewportExtent + offset;
  const clamped = clampViewportOffset(target, state.viewportExtent, state.extents.totalExtent);
  if (clamped === state.viewportOffset) return createMachineUpdate(state);
  return recalculate(
    state,
    { ...state, viewportOffset: clamped },
    [scrollCommand(state, clamped, 'target')],
  );
}

function recalculate(
  previous: VirtualLayoutState,
  candidate: Omit<VirtualLayoutState, 'visibleRange' | 'renderRange' | 'measurementGeneration'>
    & Partial<Pick<VirtualLayoutState, 'visibleRange' | 'renderRange' | 'measurementGeneration'>>,
  commands: readonly VirtualLayoutCommand[] = [],
  forceRangeCommands = false,
): Result<VirtualLayoutUpdate> {
  const geometry = calculateGeometry(
    candidate.extents,
    candidate.viewportOffset,
    candidate.viewportExtent,
    candidate.overscanBefore,
    candidate.overscanAfter,
  );
  const changed = forceRangeCommands || !sameRange(previous.renderRange, geometry.renderRange);
  let generation = previous.measurementGeneration;
  const rangeCommands = [...commands];
  if (changed) {
    if (generation === Number.MAX_SAFE_INTEGER) {
      return fail(
        'resource-rejection',
        'virtual-layout-generation-exhausted',
        'Virtual layout measurement generation cannot advance beyond the safe-integer ceiling.',
      );
    }
    generation += 1;
    const range = freezeRange(geometry.renderRange.start, geometry.renderRange.end);
    rangeCommands.push({ type: 'render-range-changed', range, generation });
    if (range.start !== range.end) rangeCommands.push({ type: 'measure-range', range, generation });
  }
  return createMachineUpdate(freezeState({
    ...candidate,
    viewportOffset: geometry.viewportOffset,
    visibleRange: geometry.visibleRange,
    renderRange: geometry.renderRange,
    measurementGeneration: generation,
  }), rangeCommands);
}

function calculateGeometry(
  extents: ExtentIndex,
  requestedOffset: number,
  viewportExtent: number,
  overscanBefore: number,
  overscanAfter: number,
): { viewportOffset: number; visibleRange: VirtualLayoutRange; renderRange: VirtualLayoutRange } {
  const viewportOffset = clampViewportOffset(requestedOffset, viewportExtent, extents.totalExtent);
  const visibleRange = rangeForOffsets(extents, viewportOffset, viewportOffset + viewportExtent);
  const renderRange = rangeForOffsets(
    extents,
    Math.max(0, viewportOffset - overscanBefore),
    Math.min(extents.totalExtent, viewportOffset + viewportExtent + overscanAfter),
  );
  return { viewportOffset, visibleRange, renderRange };
}

function rangeForOffsets(extents: ExtentIndex, startOffset: number, endOffset: number): VirtualLayoutRange {
  if (extents.size === 0) return freezeRange(0, 0);
  if (extents.totalExtent === 0) return freezeRange(0, 1);
  const start = startOffset >= extents.totalExtent ? extents.size : extents.indexAtOffset(startOffset) ?? 0;
  if (endOffset <= startOffset) return freezeRange(start, start);
  if (endOffset >= extents.totalExtent) return freezeRange(start, extents.size);
  const containing = extents.indexAtOffset(endOffset);
  if (containing === null) return freezeRange(start, extents.size);
  const containingStart = extents.offsetAt(containing)!;
  return freezeRange(start, containingStart === endOffset ? containing : containing + 1);
}

function captureAnchor(state: VirtualLayoutState): { index: number; documentOffset: number } | null {
  if (state.domainSize === 0) return null;
  const index = state.extents.indexAtOffset(state.viewportOffset) ?? state.domainSize - 1;
  return { index, documentOffset: state.extents.offsetAt(index)! };
}

function correctedViewportOffset(
  state: VirtualLayoutState,
  extents: ExtentIndex,
  anchor: { index: number; documentOffset: number } | null,
  nextAnchorIndex: number | null,
): number {
  if (anchor === null || nextAnchorIndex === null || extents.size === 0) {
    return clampViewportOffset(state.viewportOffset, state.viewportExtent, extents.totalExtent);
  }
  const nextDocumentOffset = extents.offsetAt(nextAnchorIndex)!;
  return clampViewportOffset(
    state.viewportOffset + nextDocumentOffset - anchor.documentOffset,
    state.viewportExtent,
    extents.totalExtent,
  );
}

function spliceAnchorIndex(
  anchor: number,
  start: number,
  deleteCount: number,
  insertCount: number,
  nextSize: number,
): number | null {
  if (nextSize === 0) return null;
  if (anchor < start) return anchor;
  if (anchor >= start + deleteCount) return anchor + insertCount - deleteCount;
  return Math.min(start, nextSize - 1);
}

function moveAnchorIndex(anchor: number, from: number, to: number, count: number): number {
  if (count === 0 || from === to) return anchor;
  if (anchor >= from && anchor < from + count) return to + anchor - from;
  const afterRemoval = anchor >= from + count ? anchor - count : anchor;
  return afterRemoval >= to ? afterRemoval + count : afterRemoval;
}

function scrollCommand(
  state: VirtualLayoutState,
  offset: number,
  reason: 'anchor-correction' | 'target',
): VirtualLayoutCommand {
  return Object.freeze({ type: 'set-scroll-offset', offset, delta: offset - state.viewportOffset, reason });
}

function invalidGeometry(
  offset: number,
  extent: number,
  before: number,
  after: number,
): Result<never> | null {
  if ([offset, extent, before, after].every((value) => Number.isFinite(value) && value >= 0)) return null;
  return fail(
    'construction',
    'virtual-layout-geometry-invalid',
    'Viewport and overscan geometry must be non-negative finite numbers.',
    { offset, extent, before, after },
  );
}

function clampViewportOffset(offset: number, viewportExtent: number, totalExtent: number): number {
  return Math.min(Math.max(0, offset), Math.max(0, totalExtent - viewportExtent));
}

function sameRange(left: VirtualLayoutRange, right: VirtualLayoutRange): boolean {
  return left.start === right.start && left.end === right.end;
}

function freezeRange(start: number, end: number): VirtualLayoutRange {
  return Object.freeze({ start, end });
}

function freezeState(state: VirtualLayoutState): VirtualLayoutState {
  return Object.freeze({
    ...state,
    visibleRange: freezeRange(state.visibleRange.start, state.visibleRange.end),
    renderRange: freezeRange(state.renderRange.start, state.renderRange.end),
  });
}

function transitionFailure<T>(result: Result<T>): Result<never> {
  if (result.ok) throw new Error('Expected a failed result.');
  return fail('transition-rejection', result.error.code, result.error.message, result.error.details);
}

export type { Result } from './shared.js';
