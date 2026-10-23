import type { Insets, Rect, RectAlign, RectSide } from '@sectile/core/geometry';

export type PositionSide = RectSide;
export type PositionAlign = RectAlign;
export type PositionPadding = number | Partial<Insets>;
export type PositionBoundary = 'viewport' | Element;
export type PositionStrategy = 'absolute' | 'fixed';
export type PositionTracking = 'events' | 'animation-frame';
/** A viewport CSS-pixel snapshot. Zero dimensions represent a point. */
export type PositionRect = Rect;

export interface PositionOptions {
  readonly side?: PositionSide;
  readonly align?: PositionAlign;
  readonly sideOffset?: number;
  readonly collisionPadding?: PositionPadding;
  readonly collisionBoundary?: PositionBoundary;
  readonly avoidCollisions?: boolean;
  readonly arrowPadding?: number;
  readonly hideWhenDetached?: boolean;
  readonly strategy?: PositionStrategy;
  readonly tracking?: PositionTracking;
}
