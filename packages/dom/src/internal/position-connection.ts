import type { PositionOptions } from '../position.js';
import {
  createPositionEngine,
  type PositionEngineConnection,
} from './positioning/engine.js';

export interface DOMPositionOptions {
  readonly root: HTMLElement;
  readonly reference?: HTMLElement | undefined;
  readonly arrow?: HTMLElement;
  readonly side?: PositionOptions['side'] | undefined;
  readonly align?: PositionOptions['align'] | undefined;
  readonly sideOffset?: PositionOptions['sideOffset'] | undefined;
  readonly collisionPadding?: PositionOptions['collisionPadding'] | undefined;
  readonly collisionBoundary?: PositionOptions['collisionBoundary'] | undefined;
  readonly avoidCollisions?: PositionOptions['avoidCollisions'] | undefined;
  readonly arrowPadding?: PositionOptions['arrowPadding'] | undefined;
  readonly hideWhenDetached?: PositionOptions['hideWhenDetached'] | undefined;
  readonly strategy?: PositionOptions['strategy'] | undefined;
  readonly tracking?: PositionOptions['tracking'] | undefined;
}

export interface PositionConnection {
  update(): void;
  disconnect(): void;
}

export const manualPositionConnection: PositionConnection = Object.freeze({
  update(): void {},
  disconnect(): void {},
});

export function createPosition(options: DOMPositionOptions): PositionConnection {
  let engine: PositionEngineConnection | undefined;

  const disconnect = (): void => {
    engine?.disconnect();
    engine = undefined;
  };
  const update = (): void => {
    const reference = options.reference;
    if (options.root.hidden || reference === undefined || !canPosition(options.root, reference)) {
      disconnect();
      return;
    }
    if (engine === undefined) {
      engine = createPositionEngine({
        root: options.root,
        reference,
        ...(options.arrow === undefined ? {} : { arrow: options.arrow }),
        ...(options.side === undefined ? {} : { side: options.side }),
        ...(options.align === undefined ? {} : { align: options.align }),
        ...(options.sideOffset === undefined ? {} : { sideOffset: options.sideOffset }),
        ...(options.collisionPadding === undefined
          ? {}
          : { collisionPadding: options.collisionPadding }),
        ...(options.collisionBoundary === undefined
          ? {}
          : { collisionBoundary: options.collisionBoundary }),
        ...(options.avoidCollisions === undefined
          ? {}
          : { avoidCollisions: options.avoidCollisions }),
        ...(options.arrowPadding === undefined ? {} : { arrowPadding: options.arrowPadding }),
        ...(options.hideWhenDetached === undefined
          ? {}
          : { hideWhenDetached: options.hideWhenDetached }),
        ...(options.strategy === undefined ? {} : { strategy: options.strategy }),
        ...(options.tracking === undefined ? {} : { tracking: options.tracking }),
      });
      engine.connect();
      return;
    }
    engine.update();
  };

  return Object.freeze({ update, disconnect });
}

function canPosition(root: HTMLElement, reference: HTMLElement): boolean {
  return root.ownerDocument.defaultView !== null
    && root.ownerDocument === reference.ownerDocument
    && typeof root.getBoundingClientRect === 'function'
    && typeof reference.getBoundingClientRect === 'function';
}
