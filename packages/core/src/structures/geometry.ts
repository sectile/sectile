import { unwrap } from '../result.js';
import type { Result } from '../shared.js';
import { fail, ok } from '../internal/kernel/foundation.js';

export interface Point { readonly x: number; readonly y: number; }
export interface Size { readonly width: number; readonly height: number; }
export interface Rect extends Point, Size {}
export interface Insets { readonly top: number; readonly right: number; readonly bottom: number; readonly left: number; }
export interface RectOverflow extends Insets { readonly total: number; readonly maximum: number; }
export type RectSide = 'top' | 'right' | 'bottom' | 'left';
export type RectAlign = 'start' | 'center' | 'end';

export interface GeometryBoundsOptions { readonly maxRects?: number; }

export const ZERO_POINT: Point = Object.freeze({ x: 0, y: 0 });
export const ZERO_INSETS: Insets = Object.freeze({ top: 0, right: 0, bottom: 0, left: 0 });
export const DEFAULT_MAX_GEOMETRY_RECTS = 100_000;
export const MAX_GEOMETRY_RECTS = 1_000_000;

export function createPoint(input: Point): Point { return unwrap(tryCreatePoint(input)); }
export function createSize(input: Size): Size { return unwrap(tryCreateSize(input)); }
export function createRect(input: Rect): Rect { return unwrap(tryCreateRect(input)); }
export function createInsets(input: number | Partial<Insets> = 0): Insets { return unwrap(tryCreateInsets(input)); }

export function tryCreatePoint(input: Point): Result<Point> {
  return isFinitePoint(input)
    ? ok(Object.freeze({ x: input.x, y: input.y }))
    : invalid('Point coordinates must be finite numbers.', input);
}

export function tryCreateSize(input: Size): Result<Size> {
  return isFiniteSize(input)
    ? ok(Object.freeze({ width: input.width, height: input.height }))
    : invalid('Size extents must be finite non-negative numbers.', input);
}

export function tryCreateRect(input: Rect): Result<Rect> {
  return isFiniteRect(input)
    ? ok(Object.freeze({ x: input.x, y: input.y, width: input.width, height: input.height }))
    : invalid('Rect coordinates must be finite and extents must be finite non-negative numbers.', input);
}

export function tryCreateInsets(input: number | Partial<Insets> = 0): Result<Insets> {
  if (typeof input === 'number') {
    return nonNegative(input)
      ? ok(Object.freeze({ top: input, right: input, bottom: input, left: input }))
      : invalid('Insets must be finite non-negative numbers.', input);
  }
  if (!validObject(input)) return invalid('Insets must be a number or object.', input);
  const top = input.top ?? 0;
  const right = input.right ?? 0;
  const bottom = input.bottom ?? 0;
  const left = input.left ?? 0;
  return nonNegative(top) && nonNegative(right) && nonNegative(bottom) && nonNegative(left)
    ? ok(Object.freeze({ top, right, bottom, left }))
    : invalid('Insets must be finite non-negative numbers.', input);
}

export function rectanglesIntersect(left: Rect, right: Rect): boolean {
  return left.x < right.x + right.width && right.x < left.x + left.width
    && left.y < right.y + right.height && right.y < left.y + left.height;
}

export function intersectRects(left: Rect, right: Rect): Rect | null {
  if (!rectanglesIntersect(left, right)) return null;
  const x = Math.max(left.x, right.x);
  const y = Math.max(left.y, right.y);
  const width = Math.min(left.x + left.width, right.x + right.width) - x;
  const height = Math.min(left.y + left.height, right.y + right.height) - y;
  return Object.freeze({ x, y, width: Math.max(0, width), height: Math.max(0, height) });
}

export function rectContainsPoint(rect: Rect, point: Point): boolean {
  return point.x >= rect.x && point.x <= rect.x + rect.width && point.y >= rect.y && point.y <= rect.y + rect.height;
}

export function rectContainsRect(outer: Rect, inner: Rect): boolean {
  return inner.x >= outer.x && inner.y >= outer.y
    && inner.x + inner.width <= outer.x + outer.width
    && inner.y + inner.height <= outer.y + outer.height;
}

export function boundRects(left: Rect, right: Rect): Rect {
  const x = Math.min(left.x, right.x);
  const y = Math.min(left.y, right.y);
  return Object.freeze({
    x,
    y,
    width: Math.max(left.x + left.width, right.x + right.width) - x,
    height: Math.max(left.y + left.height, right.y + right.height) - y,
  });
}

export function boundsOfRects(rects: readonly Rect[], options: GeometryBoundsOptions = {}): Rect | null {
  if (!Array.isArray(rects)) return unwrap(invalid('Rect bounds input must be an array.', rects));
  const maxRects = options.maxRects ?? DEFAULT_MAX_GEOMETRY_RECTS;
  if (!Number.isSafeInteger(maxRects) || maxRects < 0) return unwrap(invalid('maxRects must be a non-negative safe integer.', maxRects));
  if (maxRects > MAX_GEOMETRY_RECTS || rects.length > maxRects) {
    return unwrap(fail('resource-rejection', 'item-ceiling-exceeded', 'Rect bounds input exceeds maxRects.', { size: rects.length, maxRects, hardCeiling: MAX_GEOMETRY_RECTS }));
  }
  if (rects.length === 0) return null;
  let left = Number.POSITIVE_INFINITY;
  let top = Number.POSITIVE_INFINITY;
  let right = Number.NEGATIVE_INFINITY;
  let bottom = Number.NEGATIVE_INFINITY;
  for (const rect of rects) {
    if (!isFiniteRect(rect)) return unwrap(invalid('Rect bounds input contains an invalid rectangle.', rect));
    left = Math.min(left, rect.x);
    top = Math.min(top, rect.y);
    right = Math.max(right, rect.x + rect.width);
    bottom = Math.max(bottom, rect.y + rect.height);
  }
  return Object.freeze({ x: left, y: top, width: right - left, height: bottom - top });
}

export function insetRect(rect: Rect, insets: Insets): Rect {
  const xInset = Math.min(rect.width, insets.left);
  const yInset = Math.min(rect.height, insets.top);
  return Object.freeze({
    x: rect.x + xInset,
    y: rect.y + yInset,
    width: Math.max(0, rect.width - insets.left - insets.right),
    height: Math.max(0, rect.height - insets.top - insets.bottom),
  });
}

export function outsetRect(rect: Rect, insets: Insets): Rect {
  return Object.freeze({
    x: rect.x - insets.left,
    y: rect.y - insets.top,
    width: rect.width + insets.left + insets.right,
    height: rect.height + insets.top + insets.bottom,
  });
}

export function rectOverflow(rect: Rect, boundary: Rect, padding: Insets = ZERO_INSETS): RectOverflow {
  const inner = insetRect(boundary, padding);
  const top = Math.max(0, inner.y - rect.y);
  const right = Math.max(0, rect.x + rect.width - inner.x - inner.width);
  const bottom = Math.max(0, rect.y + rect.height - inner.y - inner.height);
  const left = Math.max(0, inner.x - rect.x);
  return Object.freeze({ top, right, bottom, left, total: top + right + bottom + left, maximum: Math.max(top, right, bottom, left) });
}

export function clampRect(rect: Rect, boundary: Rect, padding: Insets = ZERO_INSETS): Rect {
  const inner = insetRect(boundary, padding);
  const maxX = inner.x + inner.width - rect.width;
  const maxY = inner.y + inner.height - rect.height;
  return Object.freeze({
    x: maxX < inner.x ? inner.x : Math.min(Math.max(rect.x, inner.x), maxX),
    y: maxY < inner.y ? inner.y : Math.min(Math.max(rect.y, inner.y), maxY),
    width: rect.width,
    height: rect.height,
  });
}

export function alignRect(reference: Rect, size: Size, side: RectSide, align: RectAlign = 'center', offset = 0): Rect {
  if (!finite(offset)) return unwrap(invalid('Alignment offset must be finite.', offset));
  const crossX = align === 'start' ? reference.x : align === 'end' ? reference.x + reference.width - size.width : reference.x + (reference.width - size.width) / 2;
  const crossY = align === 'start' ? reference.y : align === 'end' ? reference.y + reference.height - size.height : reference.y + (reference.height - size.height) / 2;
  if (side === 'top') return Object.freeze({ x: crossX, y: reference.y - size.height - offset, ...size });
  if (side === 'bottom') return Object.freeze({ x: crossX, y: reference.y + reference.height + offset, ...size });
  if (side === 'left') return Object.freeze({ x: reference.x - size.width - offset, y: crossY, ...size });
  return Object.freeze({ x: reference.x + reference.width + offset, y: crossY, ...size });
}

export function pointDelta(before: Point, after: Point): Point {
  return Object.freeze({ x: after.x - before.x, y: after.y - before.y });
}

export function isFinitePoint(value: unknown): value is Point {
  return validObject(value) && finite(value['x']) && finite(value['y']);
}

export function isFiniteSize(value: unknown): value is Size {
  return validObject(value) && nonNegative(value['width']) && nonNegative(value['height']);
}

export function isFiniteRect(value: unknown): value is Rect {
  return validObject(value) && finite(value['x']) && finite(value['y'])
    && nonNegative(value['width']) && nonNegative(value['height']);
}

function validObject(value: unknown): value is Record<string, unknown> { return value !== null && typeof value === 'object'; }
function finite(value: unknown): value is number { return typeof value === 'number' && Number.isFinite(value); }
function nonNegative(value: unknown): value is number { return finite(value) && value >= 0; }
function invalid<T>(message: string, value: unknown): Result<T> { return fail('construction', 'invalid-boundary', message, { value }); }
