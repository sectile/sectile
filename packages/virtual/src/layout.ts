import type { Result, StableID } from '@sectile/core';

export interface VirtualPoint { readonly x: number; readonly y: number; }
export interface VirtualSize { readonly width: number; readonly height: number; }
export interface VirtualRect extends VirtualPoint, VirtualSize {}
export interface VirtualInsets { readonly top: number; readonly right: number; readonly bottom: number; readonly left: number; }
export interface VirtualQueryInput { readonly viewport: VirtualRect; readonly overscan?: number | Partial<VirtualInsets>; }
export interface VirtualPlacement<ID extends StableID = StableID> { readonly id: ID; readonly index: number; readonly rect: VirtualRect; readonly visible: boolean; }
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
  tryQuery(state: State, input: VirtualQueryInput): Result<VirtualLayoutPlan<ID>>;
  tryMeasure(state: State, batch: VirtualMeasurementBatch<Measurement, ID>): Result<VirtualLayoutMutation<State>>;
  tryMutate(state: State, input: VirtualMutationInput<Mutation, ID>): Result<VirtualLayoutMutation<State>>;
  tryScrollTarget(state: State, id: ID, viewport: VirtualRect, alignment?: VirtualScrollAlignment): Result<VirtualPoint>;
}

export const ZERO_POINT: VirtualPoint = Object.freeze({ x: 0, y: 0 });
export const ZERO_INSETS: VirtualInsets = Object.freeze({ top: 0, right: 0, bottom: 0, left: 0 });

export function normalizeQuery(input: VirtualQueryInput): Result<{ readonly viewport: VirtualRect; readonly overscan: VirtualInsets; readonly renderBounds: VirtualRect }> {
  const viewport = freezeRect(input.viewport);
  if (viewport === null) return invalidGeometry('Viewport coordinates and extents must be finite and non-negative.', input.viewport);
  const overscan = normalizeInsets(input.overscan);
  if (overscan === null) return invalidGeometry('Overscan must contain finite non-negative extents.', input.overscan);
  const renderX = Math.max(0, viewport.x - overscan.left);
  const renderY = Math.max(0, viewport.y - overscan.top);
  return { ok: true, value: Object.freeze({
    viewport,
    overscan,
    renderBounds: Object.freeze({
      x: renderX,
      y: renderY,
      width: viewport.x + viewport.width + overscan.right - renderX,
      height: viewport.y + viewport.height + overscan.bottom - renderY,
    }),
  }) };
}

export function rectanglesIntersect(left: VirtualRect, right: VirtualRect): boolean {
  return left.x < right.x + right.width && right.x < left.x + left.width
    && left.y < right.y + right.height && right.y < left.y + left.height;
}

export function pointDelta(before: VirtualRect, after: VirtualRect): VirtualPoint {
  return Object.freeze({ x: after.x - before.x, y: after.y - before.y });
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

function freezeRect(value: VirtualRect): VirtualRect | null {
  if (value === null || typeof value !== 'object' || !Number.isFinite(value.x) || !Number.isFinite(value.y)
    || !Number.isFinite(value.width) || !Number.isFinite(value.height) || value.x < 0 || value.y < 0 || value.width < 0 || value.height < 0) return null;
  return Object.freeze({ x: value.x, y: value.y, width: value.width, height: value.height });
}

function normalizeInsets(value: number | Partial<VirtualInsets> | undefined): VirtualInsets | null {
  if (value === undefined) return ZERO_INSETS;
  if (typeof value === 'number') return Number.isFinite(value) && value >= 0 ? Object.freeze({ top: value, right: value, bottom: value, left: value }) : null;
  const result = { top: value.top ?? 0, right: value.right ?? 0, bottom: value.bottom ?? 0, left: value.left ?? 0 };
  return Object.values(result).every((item) => Number.isFinite(item) && item >= 0) ? Object.freeze(result) : null;
}

function invalidGeometry<T>(message: string, value: unknown): Result<T> {
  return { ok: false, error: { class: 'construction', code: 'virtual-layout-geometry-invalid', message, details: { value } } };
}
