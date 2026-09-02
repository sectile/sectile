import type { RowProfile } from './constants.js';

export interface VisibleContentRange {
  readonly start: number;
  readonly end: number;
}

export function requiresExactTotalHeight(rowProfile: RowProfile): boolean {
  return rowProfile === 'uniform';
}

export function expectedScrollerExtent(contentExtent: number, viewportExtent: number): number {
  return Math.max(contentExtent, viewportExtent);
}

export function expectedScrollerExtentDelta(
  previousContentExtent: number,
  nextContentExtent: number,
  viewportExtent: number,
): number {
  return expectedScrollerExtent(nextContentExtent, viewportExtent)
    - expectedScrollerExtent(previousContentExtent, viewportExtent);
}

export function clampedScrollOffset(
  requestedOffset: number,
  scrollExtent: number,
  viewportExtent: number,
): number {
  return Math.min(
    Math.max(0, scrollExtent - viewportExtent),
    Math.max(0, requestedOffset),
  );
}

export function visibleContentRange(
  contentExtent: number,
  viewportExtent: number,
  scrollOffset: number,
): VisibleContentRange | null {
  const start = Math.max(0, -scrollOffset);
  const end = Math.min(viewportExtent, contentExtent - scrollOffset);
  return end <= start ? null : Object.freeze({ start, end });
}
