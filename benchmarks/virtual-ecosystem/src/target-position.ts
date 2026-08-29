import type { MutationLocation } from './mutations.js';

interface TargetScrollGeometry {
  readonly targetIndex: number;
  readonly itemCount: number;
  readonly scrollHeight: number;
  readonly targetHeight: number;
  readonly location: MutationLocation;
  readonly viewportHeight: number;
}

export interface TargetPositionGeometry {
  readonly scrollTop: number;
  readonly scrollHeight: number;
  readonly targetViewportTop: number;
  readonly targetHeight: number;
}

export function initialTargetScroll(geometry: TargetScrollGeometry): number {
  return Math.max(0, estimatedAbsoluteTop(geometry, geometry.targetIndex) - targetViewportOffset(
    geometry.targetHeight,
    geometry.location,
    geometry.viewportHeight,
  ));
}

export function correctedTargetScroll(options: TargetScrollGeometry & {
  readonly referenceIndex: number;
  readonly referenceViewportTop: number;
  readonly currentScrollTop: number;
}): number {
  const referenceAbsoluteTop = options.currentScrollTop + options.referenceViewportTop;
  const estimatedSize = options.scrollHeight / Math.max(1, options.itemCount);
  const targetAbsoluteTop = referenceAbsoluteTop
    + (options.targetIndex - options.referenceIndex) * estimatedSize;
  return Math.max(0, targetAbsoluteTop - targetViewportOffset(
    options.targetHeight,
    options.location,
    options.viewportHeight,
  ));
}

export function targetViewportOffset(
  targetHeight: number,
  location: MutationLocation,
  viewportHeight: number,
): number {
  if (location === 'start') return 0;
  if (location === 'end') return Math.max(0, viewportHeight - targetHeight);
  return Math.max(0, (viewportHeight - targetHeight) / 2);
}

export function intersectsViewportGeometry(
  rowTop: number,
  rowBottom: number,
  viewportTop: number,
  viewportBottom: number,
  tolerance: number,
): boolean {
  return rowBottom > viewportTop + tolerance
    && rowTop < viewportBottom - tolerance;
}

export function sameTargetPositionGeometry(
  previous: TargetPositionGeometry,
  current: TargetPositionGeometry,
  tolerance: number,
): boolean {
  return Math.abs(previous.scrollTop - current.scrollTop) <= tolerance
    && Math.abs(previous.scrollHeight - current.scrollHeight) <= tolerance
    && Math.abs(previous.targetViewportTop - current.targetViewportTop) <= tolerance
    && Math.abs(previous.targetHeight - current.targetHeight) <= tolerance;
}

function estimatedAbsoluteTop(geometry: TargetScrollGeometry, index: number): number {
  return index * geometry.scrollHeight / Math.max(1, geometry.itemCount);
}
