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
  requireSurfaceFrame(frame);
  const x = scrollportViewport.x + frame.viewportInsets.left - frame.origin.x;
  const y = scrollportViewport.y + frame.viewportInsets.top - frame.origin.y;
  const width = Math.max(
    0,
    scrollportViewport.width
      - frame.viewportInsets.left
      - frame.viewportInsets.right,
  );
  const height = Math.max(
    0,
    scrollportViewport.height
      - frame.viewportInsets.top
      - frame.viewportInsets.bottom,
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
  requireSurfaceFrame(frame);
  return freezePoint(
    surfacePoint.x + frame.origin.x - frame.viewportInsets.left,
    surfacePoint.y + frame.origin.y - frame.viewportInsets.top,
    'Scrollport target projection must remain finite.',
  );
}

export function surfaceFrameScrollDelta(
  previous: VirtualSurfaceFrame,
  next: VirtualSurfaceFrame,
): VirtualPoint {
  requireSurfaceFrame(previous);
  requireSurfaceFrame(next);
  return freezePoint(
    next.origin.x
      - previous.origin.x
      - (next.viewportInsets.left - previous.viewportInsets.left),
    next.origin.y
      - previous.origin.y
      - (next.viewportInsets.top - previous.viewportInsets.top),
    'Virtual surface frame scroll delta must remain finite.',
  );
}

function requireSurfaceFrame(frame: VirtualSurfaceFrame): void {
  if (
    !isRecord(frame)
    || !isFinitePoint(frame.origin)
    || !isInsets(frame.viewportInsets)
  ) {
    geometryFailure(
      'Virtual surface frames require finite origins and finite non-negative viewport insets.',
      frame,
    );
  }
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

function isInsets(value: unknown): value is VirtualInsets {
  return isRecord(value)
    && finiteNonNegative(value['top'])
    && finiteNonNegative(value['right'])
    && finiteNonNegative(value['bottom'])
    && finiteNonNegative(value['left']);
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
