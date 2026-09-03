import type { StableID } from '@sectile/core';
import {
  ZERO_INSETS,
  ZERO_POINT,
  pointDelta,
  rectanglesIntersect,
  tryCreateInsets,
  tryCreateRect,
  type Insets,
  type Point,
  type Rect,
  type Size,
} from '@sectile/core/geometry';
import type { VirtualResult } from './error.js';

export type VirtualPoint = Point;
export type VirtualSize = Size;
export type VirtualRect = Rect;
export type VirtualInsets = Insets;
export interface VirtualIndexedView<T> {
  /** Constant-time cardinality. */
  readonly size: number;
  /** Indexed lookup; O(log n) worst-case across Virtual representations. */
  at(index: number): T | undefined;
  /** Lazy full traversal in O(n) time without snapshot allocation. */
  iterate(): IterableIterator<T>;
  /** Full traversal in O(n) time without snapshot allocation. */
  forEach(callback: (value: T, index: number) => void): void;
  /** Explicit immutable snapshot materialization in O(n) time and output space. */
  toArray(): readonly T[];
}
export interface VirtualQueryInput { readonly viewport: VirtualRect; readonly overscan?: number | Partial<VirtualInsets>; }
export interface VirtualPlacement<ID extends StableID = StableID> { readonly id: ID; readonly index: number; readonly rect: VirtualRect; readonly visible: boolean; readonly zIndex?: number; }
export interface VirtualAnchor<ID extends StableID = StableID> { readonly id: ID; readonly viewportOffset: VirtualPoint; }
export interface VirtualLayoutPlan<ID extends StableID = StableID> {
  readonly generation: number;
  readonly contentSize: VirtualSize;
  readonly viewport: VirtualRect;
  readonly renderBounds: VirtualRect;
  readonly placements: readonly VirtualPlacement<ID>[];
  readonly anchor: VirtualAnchor<ID> | null;
}
export interface VirtualMeasurementBatch<Measurement, ID extends StableID = StableID> { readonly generation: number; readonly measurements: readonly Measurement[]; readonly anchor?: VirtualAnchor<ID> | null; }
export interface VirtualMutationInput<Mutation, ID extends StableID = StableID> { readonly mutation: Mutation; readonly anchor?: VirtualAnchor<ID> | null; }
export interface VirtualLayoutMutation<State> { readonly state: State; readonly scrollDelta: VirtualPoint; }
export type VirtualScrollAlignment = 'start' | 'center' | 'end' | 'nearest';

export interface VirtualLayoutStrategy<State, ID extends StableID, Measurement, Mutation> {
  readonly kind: string;
  tryQuery(state: State, input: VirtualQueryInput): VirtualResult<VirtualLayoutPlan<ID>>;
  tryMeasure(state: State, batch: VirtualMeasurementBatch<Measurement, ID>): VirtualResult<VirtualLayoutMutation<State>>;
  tryMutate(state: State, input: VirtualMutationInput<Mutation, ID>): VirtualResult<VirtualLayoutMutation<State>>;
  tryScrollTarget(state: State, id: ID, viewport: VirtualRect, alignment?: VirtualScrollAlignment): VirtualResult<VirtualPoint>;
}

export { ZERO_INSETS, ZERO_POINT, pointDelta, rectanglesIntersect };

export function normalizeQuery(input: VirtualQueryInput): VirtualResult<{ readonly viewport: VirtualRect; readonly overscan: VirtualInsets; readonly renderBounds: VirtualRect }> {
  const viewportResult = tryCreateRect(input.viewport);
  if (!viewportResult.ok) return invalidGeometry('Viewport coordinates must be finite and extents must be finite and non-negative.', input.viewport);
  const viewport = viewportResult.value;
  const overscan = normalizeInsets(input.overscan);
  if (overscan === null) return invalidGeometry('Overscan must contain finite non-negative extents.', input.overscan);
  const renderLeft = Math.max(0, viewport.x - overscan.left);
  const renderTop = Math.max(0, viewport.y - overscan.top);
  const renderRight = Math.max(0, viewport.x + viewport.width + overscan.right);
  const renderBottom = Math.max(0, viewport.y + viewport.height + overscan.bottom);
  const renderBounds = tryCreateRect({
    x: renderLeft,
    y: renderTop,
    width: Math.max(0, renderRight - renderLeft),
    height: Math.max(0, renderBottom - renderTop),
  });
  if (!renderBounds.ok) return invalidGeometry('Overscan expansion must produce finite non-negative render bounds.', { viewport, overscan });
  return { ok: true, value: Object.freeze({
    viewport,
    overscan,
    renderBounds: renderBounds.value,
  }) };
}

export function anchorForPlan<ID extends StableID>(viewport: VirtualRect, placements: readonly VirtualPlacement<ID>[]): VirtualAnchor<ID> | null {
  let anchor: VirtualPlacement<ID> | null = null;
  for (const placement of placements) {
    if (!placement.visible) continue;
    if (anchor === null || placement.rect.y < anchor.rect.y || (placement.rect.y === anchor.rect.y && placement.rect.x < anchor.rect.x)) anchor = placement;
  }
  return anchor === null ? null : Object.freeze({ id: anchor.id, viewportOffset: Object.freeze({ x: anchor.rect.x - viewport.x, y: anchor.rect.y - viewport.y }) });
}

export function alignedScrollOffset(itemStart: number, itemExtent: number, viewportStart: number, viewportExtent: number, contentExtent: number, alignment: VirtualScrollAlignment): number {
  const itemEnd = itemStart + itemExtent;
  const viewportEnd = viewportStart + viewportExtent;
  let target: number;
  if (alignment === 'start') target = itemStart;
  else if (alignment === 'center') target = itemStart - (viewportExtent - itemExtent) / 2;
  else if (alignment === 'end') target = itemEnd - viewportExtent;
  else if (itemStart < viewportStart) target = itemStart;
  else if (itemEnd > viewportEnd) target = itemEnd - viewportExtent;
  else target = viewportStart;
  return Math.min(Math.max(0, target), Math.max(0, contentExtent - viewportExtent));
}

function normalizeInsets(value: number | Partial<VirtualInsets> | undefined): VirtualInsets | null {
  if (value === undefined) return ZERO_INSETS;
  const result = tryCreateInsets(value);
  return result.ok ? result.value : null;
}

function invalidGeometry<T>(message: string, value: unknown): VirtualResult<T> {
  return { ok: false, error: { class: 'construction', code: 'virtual-layout-geometry-invalid', message, details: { value } } };
}
