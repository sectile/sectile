import { unwrap } from '../result.js';
import type { Result } from '../shared.js';
import { fail, ok } from '../internal/kernel/foundation.js';
import {
  createInsets,
  intersectRects,
  tryCreateRect,
  tryCreateSize,
  type Insets,
  type Point,
  type Rect,
  type RectAlign,
  type RectOverflow,
  type RectSide,
  type Size,
} from './geometry.js';

export interface AnchoredLayoutOptions {
  readonly side?: RectSide;
  readonly align?: RectAlign;
  readonly offset?: number;
  readonly padding?: number | Partial<Insets>;
  readonly flip?: boolean;
  readonly shift?: boolean;
  readonly arrow?: Size | null;
  readonly arrowPadding?: number;
}

export interface AnchoredLayoutInput extends AnchoredLayoutOptions {
  readonly reference: Rect;
  readonly floating: Size;
  readonly boundary: Rect;
}

export interface AnchoredArrowLayout extends Point { readonly centerOffset: number; }

export interface AnchoredLayout {
  readonly rect: Rect;
  readonly side: RectSide;
  readonly align: RectAlign;
  readonly overflow: RectOverflow;
  readonly availableSize: Size;
  readonly arrow: AnchoredArrowLayout | null;
  readonly referenceHidden: boolean;
  readonly candidateCount: number;
}

export const MAX_ANCHORED_LAYOUT_CANDIDATES = 4;

export function solveAnchoredLayout(input: AnchoredLayoutInput): AnchoredLayout {
  return unwrap(trySolveAnchoredLayout(input));
}

export function trySolveAnchoredLayout(input: AnchoredLayoutInput): Result<AnchoredLayout> {
  if (input === null || typeof input !== 'object') return invalid('Anchored layout input must be an object.', input);
  const referenceResult = tryCreateRect(input.reference);
  if (!referenceResult.ok) return referenceResult;
  const floatingResult = tryCreateSize(input.floating);
  if (!floatingResult.ok) return floatingResult;
  const boundaryResult = tryCreateRect(input.boundary);
  if (!boundaryResult.ok) return boundaryResult;
  const side = input.side ?? 'bottom';
  const align = input.align ?? 'center';
  if (!SIDES.includes(side) || !ALIGNS.includes(align)) return invalid('Anchored side or alignment is invalid.', { side, align });
  const offset = input.offset ?? 0;
  const arrowPadding = input.arrowPadding ?? 0;
  if (!Number.isFinite(offset) || !nonNegative(arrowPadding)) return invalid('Anchored offsets must be finite and arrowPadding non-negative.', { offset, arrowPadding });
  let padding: Insets;
  try { padding = createInsets(input.padding); } catch (error) { return asFailure(error); }
  let arrow: Size | null = null;
  if (input.arrow !== null && input.arrow !== undefined) {
    const checked = tryCreateSize(input.arrow);
    if (!checked.ok) return checked;
    arrow = checked.value;
  }
  const reference = referenceResult.value;
  const floating = floatingResult.value;
  const boundary = boundaryResult.value;
  const innerX = boundary.x + Math.min(boundary.width, padding.left);
  const innerY = boundary.y + Math.min(boundary.height, padding.top);
  const innerWidth = Math.max(0, boundary.width - padding.left - padding.right);
  const innerHeight = Math.max(0, boundary.height - padding.top - padding.bottom);
  const candidateLimit = input.flip === false ? 1 : MAX_ANCHORED_LAYOUT_CANDIDATES;
  let bestSide = side;
  let bestX = 0;
  let bestY = 0;
  let bestOverflow = Number.POSITIVE_INFINITY;
  const crossX = align === 'start' ? reference.x : align === 'end' ? reference.x + reference.width - floating.width : reference.x + (reference.width - floating.width) / 2;
  const crossY = align === 'start' ? reference.y : align === 'end' ? reference.y + reference.height - floating.height : reference.y + (reference.height - floating.height) / 2;
  for (let candidate = 0; candidate < candidateLimit; candidate += 1) {
    const candidateSide = candidateSideAt(side, candidate);
    let candidateX: number;
    let candidateY: number;
    if (candidateSide === 'top') {
      candidateX = crossX;
      candidateY = reference.y - floating.height - offset;
    } else if (candidateSide === 'bottom') {
      candidateX = crossX;
      candidateY = reference.y + reference.height + offset;
    } else if (candidateSide === 'left') {
      candidateX = reference.x - floating.width - offset;
      candidateY = crossY;
    } else {
      candidateX = reference.x + reference.width + offset;
      candidateY = crossY;
    }
    const overflow = overflowTotal(candidateX, candidateY, floating.width, floating.height, innerX, innerY, innerWidth, innerHeight);
    if (overflow < bestOverflow) {
      bestOverflow = overflow;
      bestSide = candidateSide;
      bestX = candidateX;
      bestY = candidateY;
    }
  }
  if (input.shift !== false) {
    const maxX = innerX + innerWidth - floating.width;
    const maxY = innerY + innerHeight - floating.height;
    bestX = maxX < innerX ? innerX : Math.min(Math.max(bestX, innerX), maxX);
    bestY = maxY < innerY ? innerY : Math.min(Math.max(bestY, innerY), maxY);
  }
  const rect = Object.freeze({ x: bestX, y: bestY, width: floating.width, height: floating.height });
  const overflow = overflowRecord(rect, innerX, innerY, innerWidth, innerHeight);
  const availableSize = available(reference, boundary, padding, bestSide, offset);
  return ok(Object.freeze({
    rect,
    side: bestSide,
    align,
    overflow,
    availableSize,
    arrow: arrow === null ? null : arrowLayout(reference, rect, bestSide, arrow, arrowPadding),
    referenceHidden: intersectRects(reference, boundary) === null,
    candidateCount: candidateLimit,
  }));
}

const SIDES: readonly RectSide[] = ['top', 'right', 'bottom', 'left'];
const ALIGNS: readonly RectAlign[] = ['start', 'center', 'end'];

function candidateSideAt(preferred: RectSide, candidate: number): RectSide {
  const preferredIndex = SIDES.indexOf(preferred);
  if (candidate === 0) return preferred;
  if (candidate === 1) return SIDES[(preferredIndex + 2) % 4] as RectSide;
  if (candidate === 2) return SIDES[(preferredIndex + 1) % 4] as RectSide;
  return SIDES[(preferredIndex + 3) % 4] as RectSide;
}

function overflowTotal(x: number, y: number, width: number, height: number, bx: number, by: number, bw: number, bh: number): number {
  return Math.max(0, by - y) + Math.max(0, x + width - bx - bw) + Math.max(0, y + height - by - bh) + Math.max(0, bx - x);
}

function overflowRecord(rect: Rect, x: number, y: number, width: number, height: number): RectOverflow {
  const top = Math.max(0, y - rect.y);
  const right = Math.max(0, rect.x + rect.width - x - width);
  const bottom = Math.max(0, rect.y + rect.height - y - height);
  const left = Math.max(0, x - rect.x);
  return Object.freeze({ top, right, bottom, left, total: top + right + bottom + left, maximum: Math.max(top, right, bottom, left) });
}

function available(reference: Rect, boundary: Rect, padding: Insets, side: RectSide, offset: number): Size {
  const left = boundary.x + padding.left;
  const top = boundary.y + padding.top;
  const right = boundary.x + boundary.width - padding.right;
  const bottom = boundary.y + boundary.height - padding.bottom;
  if (side === 'top') return Object.freeze({ width: Math.max(0, right - left), height: Math.max(0, reference.y - offset - top) });
  if (side === 'bottom') return Object.freeze({ width: Math.max(0, right - left), height: Math.max(0, bottom - reference.y - reference.height - offset) });
  if (side === 'left') return Object.freeze({ width: Math.max(0, reference.x - offset - left), height: Math.max(0, bottom - top) });
  return Object.freeze({ width: Math.max(0, right - reference.x - reference.width - offset), height: Math.max(0, bottom - top) });
}

function arrowLayout(reference: Rect, floating: Rect, side: RectSide, arrow: Size, padding: number): AnchoredArrowLayout {
  if (side === 'top' || side === 'bottom') {
    const ideal = reference.x + reference.width / 2 - floating.x - arrow.width / 2;
    const maximum = Math.max(padding, floating.width - arrow.width - padding);
    const x = Math.min(Math.max(ideal, padding), maximum);
    return Object.freeze({ x, y: side === 'top' ? floating.height - arrow.height / 2 : -arrow.height / 2, centerOffset: ideal - x });
  }
  const ideal = reference.y + reference.height / 2 - floating.y - arrow.height / 2;
  const maximum = Math.max(padding, floating.height - arrow.height - padding);
  const y = Math.min(Math.max(ideal, padding), maximum);
  return Object.freeze({ x: side === 'left' ? floating.width - arrow.width / 2 : -arrow.width / 2, y, centerOffset: ideal - y });
}

function nonNegative(value: unknown): value is number { return typeof value === 'number' && Number.isFinite(value) && value >= 0; }
function invalid<T>(message: string, value: unknown): Result<T> { return fail('construction', 'invalid-boundary', message, { value }); }
function asFailure<T>(error: unknown): Result<T> {
  return error !== null && typeof error === 'object' && 'code' in error
    ? { ok: false, error: error as never }
    : invalid('Anchored layout normalization failed.', error);
}
