import type {
  AutoUpdateOptions,
  Boundary,
  ComputePositionReturn,
  Middleware,
  Padding,
  ReferenceElement,
  Strategy,
} from '@floating-ui/dom';
import {
  createFloatingPosition,
  type FloatingAlign,
  type FloatingPositionConnection,
  type FloatingSide,
} from './floating-position.js';

export interface PickerPositionOptions {
  readonly position?: boolean;
  readonly anchor?: ReferenceElement;
  readonly side?: FloatingSide;
  readonly align?: FloatingAlign;
  readonly sideOffset?: number;
  readonly collisionPadding?: Padding;
  readonly collisionBoundary?: Boundary;
  readonly avoidCollisions?: boolean;
  readonly hideWhenDetached?: boolean;
  readonly strategy?: Strategy;
  readonly middleware?: Middleware[];
  readonly autoUpdate?: boolean | AutoUpdateOptions;
  readonly onPositionChange?: (position: ComputePositionReturn) => void;
}

const manualPosition = Object.freeze({ update(): void {}, disconnect(): void {} });

export function createPickerPosition(
  root: HTMLElement,
  trigger: HTMLElement,
  options: PickerPositionOptions,
): FloatingPositionConnection {
  if (options.position === false) return manualPosition;
  return createFloatingPosition({
    root,
    reference: options.anchor ?? trigger,
    side: options.side,
    align: options.align,
    sideOffset: options.sideOffset,
    collisionPadding: options.collisionPadding,
    collisionBoundary: options.collisionBoundary,
    avoidCollisions: options.avoidCollisions,
    hideWhenDetached: options.hideWhenDetached,
    strategy: options.strategy,
    middleware: options.middleware,
    autoUpdate: options.autoUpdate,
    onPositionChange: options.onPositionChange,
  });
}
