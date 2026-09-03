import type { VirtualPoint, VirtualRect } from '@sectile/virtual/layout';
import {
  createVirtualSurfaceFrame,
  surfaceFrameScrollDelta,
  toScrollportPoint,
  toVirtualViewport,
  type VirtualSurfaceFrame,
  type VirtualSurfaceFrameInput,
} from '@sectile/virtual/surface';

const input = {
  origin: { y: 120 },
  viewportInsets: { top: 16, left: 8 },
} satisfies VirtualSurfaceFrameInput;

const frame = createVirtualSurfaceFrame(input);
frame satisfies VirtualSurfaceFrame;
frame.origin satisfies VirtualPoint;

toVirtualViewport(
  { x: 0, y: 40, width: 320, height: 240 },
  frame,
) satisfies VirtualRect;

toScrollportPoint({ x: 10, y: 20 }, frame) satisfies VirtualPoint;
surfaceFrameScrollDelta(frame, createVirtualSurfaceFrame()) satisfies VirtualPoint;

// @ts-expect-error Surface frame values are immutable.
frame.origin.x = 1;
