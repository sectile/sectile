import type { PositionOptions } from '../position.js';
import type { DOMPopupConnection } from './popup/connection.js';
import type { Result } from '@sectile/core';
import type { RevisionSnapshot } from '@sectile/core/revision';
import { createPosition, manualPositionConnection, type PositionConnection } from './position/connection.js';

interface PositionedPopupOptions extends PositionOptions {
  readonly root: HTMLElement;
  readonly anchor?: HTMLElement;
  readonly trigger?: HTMLElement;
  readonly arrow?: HTMLElement;
  readonly position?: boolean;
}

export class PositionedPopup<State, Event> implements DOMPopupConnection<State, Event> {
  readonly #popup: DOMPopupConnection<State, Event>;
  readonly #position: PositionConnection;

  public constructor(popup: DOMPopupConnection<State, Event>, options: PositionedPopupOptions) {
    this.#popup = popup;
    this.#position = options.position === false ? manualPositionConnection : createPosition({
      root: options.root,
      reference: options.anchor ?? options.trigger,
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
    });
  }
  public getSnapshot(): RevisionSnapshot<State> { return this.#popup.getSnapshot(); }
  public syncControlledValue(open: boolean): Result<RevisionSnapshot<State>> { return this.#popup.syncControlledValue(open); }
  public handleEvent(event: Event): boolean { return this.#popup.handleEvent(event); }
  public refresh(): void { this.#popup.refresh(); this.updatePosition(); }
  public disconnect(): void { this.#popup.disconnect(); this.#position.disconnect(); }
  public updatePosition(): void { this.#position.update(); }
}
