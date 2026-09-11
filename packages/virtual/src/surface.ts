import {
  isFinitePoint,
  isFiniteRect,
  tryCreateInsets,
  tryCreatePoint,
} from '@sectile/core/geometry';
import { unwrap } from '@sectile/core/result';
import type {
  VirtualInsets,
  VirtualPoint,
  VirtualRect,
} from './layout.js';
import { fail } from './internal/foundation.js';

export interface VirtualSurfaceFrame {
  readonly origin: VirtualPoint;
  readonly viewportInsets: VirtualInsets;
}

export interface VirtualSurfaceFrameInput {
  readonly origin?: Partial<VirtualPoint>;
  readonly viewportInsets?: number | Partial<VirtualInsets>;
}

export function createVirtualSurfaceFrame(
  input: VirtualSurfaceFrameInput = {},
): VirtualSurfaceFrame {
  const unknownInput: unknown = input;
  if (!isRecord(unknownInput)) {
    return geometryFailure(
      'Virtual surface frame input must be an object.',
      unknownInput,
    );
  }
  const originInput = input.origin;
  if (originInput !== undefined && !isRecord(originInput as unknown)) {
    return geometryFailure(
      'Virtual surface origin must be an object with finite coordinates.',
      originInput,
    );
  }
  const origin = tryCreatePoint({
    x: originInput?.x ?? 0,
    y: originInput?.y ?? 0,
  });
  if (!origin.ok) {
    return geometryFailure(
      'Virtual surface origin coordinates must be finite.',
      originInput,
    );
  }
  const viewportInsets = tryCreateInsets(input.viewportInsets);
  if (!viewportInsets.ok) {
    return geometryFailure(
      'Virtual surface viewport insets must be finite and non-negative.',
      input.viewportInsets,
    );
  }
  return Object.freeze({
    origin: origin.value,
    viewportInsets: viewportInsets.value,
  });
}

export function toVirtualViewport(
  scrollportViewport: VirtualRect,
  frame: VirtualSurfaceFrame,
): VirtualRect {
  if (!isFiniteRect(scrollportViewport)) {
    return geometryFailure(
      'Scrollport viewport coordinates must be finite and extents must be finite and non-negative.',
      scrollportViewport,
    );
  }
  const captured = captureSurfaceFrame(frame);
  const x = scrollportViewport.x + captured.viewportInsets.left - captured.origin.x;
  const y = scrollportViewport.y + captured.viewportInsets.top - captured.origin.y;
  const width = Math.max(
    0,
    scrollportViewport.width
      - captured.viewportInsets.left
      - captured.viewportInsets.right,
  );
  const height = Math.max(
    0,
    scrollportViewport.height
      - captured.viewportInsets.top
      - captured.viewportInsets.bottom,
  );
  return freezeRect(
    x,
    y,
    width,
    height,
    'Virtual surface viewport projection must remain finite.',
  );
}

export function toScrollportPoint(
  surfacePoint: VirtualPoint,
  frame: VirtualSurfaceFrame,
): VirtualPoint {
  if (!isFinitePoint(surfacePoint)) {
    return geometryFailure(
      'Virtual surface target coordinates must be finite.',
      surfacePoint,
    );
  }
  const captured = captureSurfaceFrame(frame);
  return freezePoint(
    surfacePoint.x + captured.origin.x - captured.viewportInsets.left,
    surfacePoint.y + captured.origin.y - captured.viewportInsets.top,
    'Scrollport target projection must remain finite.',
  );
}

export function surfaceFrameScrollDelta(
  previous: VirtualSurfaceFrame,
  next: VirtualSurfaceFrame,
): VirtualPoint {
  const before = captureSurfaceFrame(previous);
  const after = captureSurfaceFrame(next);
  return freezePoint(
    after.origin.x
      - before.origin.x
      - (after.viewportInsets.left - before.viewportInsets.left),
    after.origin.y
      - before.origin.y
      - (after.viewportInsets.top - before.viewportInsets.top),
    'Virtual surface frame scroll delta must remain finite.',
  );
}

function captureSurfaceFrame(frame: VirtualSurfaceFrame): VirtualSurfaceFrame {
  try {
    if (isRecord(frame)) {
      const origin = frame.origin;
      const viewportInsets = frame.viewportInsets;
      if (origin !== undefined && viewportInsets !== undefined) {
        return createVirtualSurfaceFrame({ origin, viewportInsets });
      }
    }
  } catch {
    // Map unreadable external geometry to the Virtual geometry boundary below.
  }
  return geometryFailure(
    'Virtual surface frames require finite origins and finite non-negative viewport insets.',
    frame,
  );
}

function freezePoint(
  x: number,
  y: number,
  message: string,
): VirtualPoint {
  if (!finite(x) || !finite(y)) {
    return geometryFailure(message, { x, y });
  }
  return Object.freeze({ x, y });
}

function freezeRect(
  x: number,
  y: number,
  width: number,
  height: number,
  message: string,
): VirtualRect {
  if (
    !finite(x)
    || !finite(y)
    || !finiteNonNegative(width)
    || !finiteNonNegative(height)
  ) {
    return geometryFailure(message, { x, y, width, height });
  }
  return Object.freeze({ x, y, width, height });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function finite(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function finiteNonNegative(value: unknown): value is number {
  return finite(value) && value >= 0;
}

function geometryFailure(message: string, value: unknown): never {
  return unwrap(fail<never>(
    'construction',
    'virtual-layout-geometry-invalid',
    message,
    { value },
  ));
}
