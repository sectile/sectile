import {
  createPosition,
  manualPositionConnection,
  type PositionConnection,
} from './position-connection.js';
import type { PositionOptions } from '../position.js';

export interface PickerPositionOptions extends PositionOptions {
  readonly position?: boolean;
  readonly anchor?: HTMLElement;
}

export function createPickerPosition(
  root: HTMLElement,
  trigger: HTMLElement,
  options: PickerPositionOptions,
): PositionConnection {
  if (options.position === false) return manualPositionConnection;
  return createPosition({
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
    tracking: options.tracking,
  });
}
