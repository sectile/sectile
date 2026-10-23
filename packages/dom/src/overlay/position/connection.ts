import type { PositionOptions, PositionRect } from '../../position.js';
export { assertPositionOptions, snapshotPositionRect } from './engine.js';
import {
  createPositionEngine,
  selectPositionRoute,
  snapshotPositionRect,
  type PositionEngineConnection,
  type PositionEngineOptions,
} from './engine.js';

export interface DOMPositionOptions {
  readonly root: HTMLElement;
  readonly onPositioned?: () => void;
  readonly reference?: HTMLElement | undefined;
  readonly anchorRect?: PositionRect | undefined;
  /** Internal live geometry owner; unavailable geometry hides the floating surface. */
  readonly measureAnchorRect?: (() => PositionRect | undefined) | undefined;
  readonly arrow?: HTMLElement | undefined;
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
  syncAnchorRect(rect: PositionRect | undefined): void;
  disconnect(): void;
}

export const manualPositionConnection: PositionConnection = Object.freeze({
  update(): void {},
  syncAnchorRect(): void {},
  disconnect(): void {},
});

export function createPosition(options: DOMPositionOptions): PositionConnection {
  let engine: PositionEngineConnection | undefined;
  let anchorRect = options.anchorRect;

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
      const engineOptions: PositionEngineOptions = {
        root: options.root,
        reference,
        anchorRect,
        measureAnchorRect: options.measureAnchorRect,
        arrow: options.arrow,
        side: options.side,
        align: options.align,
        sideOffset: options.sideOffset,
        collisionPadding: options.collisionPadding,
        collisionBoundary: options.collisionBoundary,
        avoidCollisions: options.avoidCollisions,
        arrowPadding: options.arrowPadding,
        hideWhenDetached: options.hideWhenDetached,
        strategy: options.strategy,
        tracking: options.tracking,
      };
      // Keep CSS anchoring eligible: it has no asynchronous layout to await.
      engine = createPositionEngine(options.onPositioned !== undefined
        && selectPositionRoute(engineOptions) === 'javascript'
        ? { ...engineOptions, onLayout: options.onPositioned }
        : engineOptions);
      engine.connect();
      if (engine.route === 'css-anchor') options.onPositioned?.();
      return;
    }
    engine.update();
    if (engine.route === 'css-anchor') options.onPositioned?.();
  };

  return Object.freeze({ update, disconnect, syncAnchorRect(rect: PositionRect | undefined): void {
    const next = snapshotPositionRect(rect);
    disconnect();
    anchorRect = next;
    update();
  } });
}

function canPosition(root: HTMLElement, reference: HTMLElement): boolean {
  const document = root.ownerDocument;
  return document !== undefined
    && document.defaultView != null
    && document === reference.ownerDocument
    && typeof root.getBoundingClientRect === 'function'
    && typeof reference.getBoundingClientRect === 'function';
}
