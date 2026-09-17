import type { VirtualInsets, VirtualRect } from '@sectile/virtual/layout';
import { createVirtualSurfaceFrame } from '@sectile/virtual/surface';

export function normalizeViewportInsets(
  viewportInsets: number | Partial<VirtualInsets> | undefined,
): VirtualInsets {
  return createVirtualSurfaceFrame({
    ...(viewportInsets === undefined ? {} : { viewportInsets }),
  }).viewportInsets;
}

export function sameRect(left: VirtualRect, right: VirtualRect): boolean {
  return left.x === right.x
    && left.y === right.y
    && left.width === right.width
    && left.height === right.height;
}

export function sameInsets(left: VirtualInsets, right: VirtualInsets): boolean {
  return left.top === right.top
    && left.right === right.right
    && left.bottom === right.bottom
    && left.left === right.left;
}

export function sameOverscan(
  left: number | Partial<VirtualInsets> | undefined,
  right: number | Partial<VirtualInsets> | undefined,
): boolean {
  if (Object.is(left, right)) return true;
  return overscanSide(left, 'top') === overscanSide(right, 'top')
    && overscanSide(left, 'right') === overscanSide(right, 'right')
    && overscanSide(left, 'bottom') === overscanSide(right, 'bottom')
    && overscanSide(left, 'left') === overscanSide(right, 'left');
}

function overscanSide(
  overscan: number | Partial<VirtualInsets> | undefined,
  side: keyof VirtualInsets,
): number {
  if (typeof overscan === 'number') return overscan;
  return overscan?.[side] ?? 0;
}
