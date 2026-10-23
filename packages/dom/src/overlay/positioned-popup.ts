import type { PositionOptions, PositionRect } from '../position.js';
export { snapshotPositionRect } from './position/connection.js';
import type { PopupBehaviorErrorCode, PopupBehaviorOptions, PopupDismissalOptions } from './popup/connection.js';
import { assertPopupWritable, type DOMPopupConnection, type DOMLayerReparentErrorCode, type DOMLayerPresentationListener, type DOMLayerPresentationSubscription, type LayerHostConnection, type LayerHostTransferErrorCode } from './popup/connection.js';
import type { Result } from '@sectile/core';
import type { RevisionSnapshot } from '@sectile/core/revision';
import { assertPositionOptions, snapshotPositionRect, createPosition, manualPositionConnection, type PositionConnection } from './position/connection.js';

/** Replacement positioning options. Omitted fields use the construction defaults. */
export interface PopupPositionOptions extends PositionOptions {
  readonly position?: boolean;
  /** Omit to retain the reference; null restores the original trigger fallback. */
  readonly anchor?: HTMLElement | null;
  /** Omit to retain the viewport snapshot; null restores live element geometry. */
  readonly anchorRect?: PositionRect | null;
}

interface PositionedPopupOptions extends PositionOptions {
  readonly root: HTMLElement;
  readonly anchor?: HTMLElement;
  readonly anchorRect?: PositionRect;
  readonly trigger?: HTMLElement;
  readonly arrow?: HTMLElement;
  readonly position?: boolean;
}

export class PositionedPopup<State, Event> implements DOMPopupConnection<State, Event> {
  readonly #popup: DOMPopupConnection<State, Event>;
  #position: PositionConnection;
  readonly #root: HTMLElement;
  #reference: HTMLElement | undefined;
  #anchorRect: PositionRect | undefined;
  readonly #trigger: HTMLElement | undefined;
  readonly #arrow: HTMLElement | undefined;
  #suspended = false;
  #connected = true;

  public constructor(popup: DOMPopupConnection<State, Event>, options: PositionedPopupOptions) {
    this.#popup = popup;
    this.#suspended = !popup.getActive();
    this.#root = options.root;
    this.#trigger = options.trigger;
    this.#reference = options.anchor ?? options.trigger;
    this.#anchorRect = snapshotPositionRect(options.anchorRect);
    this.#arrow = options.arrow;
    this.#position = this.#createPosition(options, this.#reference, this.#anchorRect);
  }

  #createPosition(options: PopupPositionOptions, reference: HTMLElement | undefined, anchorRect: PositionRect | undefined): PositionConnection {
    return options.position === false ? manualPositionConnection : createPosition({
      root: this.#root,
      reference,
      anchorRect,
      arrow: this.#arrow,
      side: options.side,
      align: options.align,
      sideOffset: options.sideOffset,
      collisionPadding: typeof options.collisionPadding === 'object' ? {
        ...(options.collisionPadding.top === undefined ? {} : { top: options.collisionPadding.top }),
        ...(options.collisionPadding.right === undefined ? {} : { right: options.collisionPadding.right }),
        ...(options.collisionPadding.bottom === undefined ? {} : { bottom: options.collisionPadding.bottom }),
        ...(options.collisionPadding.left === undefined ? {} : { left: options.collisionPadding.left }),
      } : options.collisionPadding,
      collisionBoundary: options.collisionBoundary,
      avoidCollisions: options.avoidCollisions,
      arrowPadding: options.arrowPadding,
      hideWhenDetached: options.hideWhenDetached,
      strategy: options.strategy,
      tracking: options.tracking,
    });
  }
  public getSnapshot(): RevisionSnapshot<State> { return this.#popup.getSnapshot(); }
  public getActive(): boolean { return this.#popup.getActive(); }
  public getLayerOrder(): number | null { return this.#popup.getLayerOrder(); }
  public subscribeLayerPresentation(listener: DOMLayerPresentationListener): DOMLayerPresentationSubscription { return this.#popup.subscribeLayerPresentation(listener); }
  public completeLayerExit(generation: number): Result<void> { return this.#popup.completeLayerExit(generation); }
  public syncLayerParent(parent: HTMLElement | null): Result<void, DOMLayerReparentErrorCode> { return this.#popup.syncLayerParent(parent); }
  public syncLayerHost(host: LayerHostConnection | undefined): Result<void, LayerHostTransferErrorCode> { return this.#popup.syncLayerHost(host); }
  public syncDismissal(options: PopupDismissalOptions): Result<void> { return this.#popup.syncDismissal(options); }
  public syncBehavior(options: PopupBehaviorOptions): Result<void, PopupBehaviorErrorCode> { return this.#popup.syncBehavior(options); }
  public syncDisabled(disabled: boolean): Result<void> { return this.#popup.syncDisabled(disabled); }
  public syncControlledValue(open: boolean): Result<RevisionSnapshot<State>> { return this.#popup.syncControlledValue(open); }
  public handleEvent(event: Event, inputMethod?: import('./popup/connection.js').PopupInputMethod, reason?: import('./popup/connection.js').PopupCloseReason): boolean { return this.#popup.handleEvent(event, inputMethod, reason); }
  public refresh(): void { this.#popup.refresh(); this.updatePosition(); }
  public prepareMove(): void { this.#popup.prepareMove(); }
  public completeMove(restoreFocus = true): void { this.#popup.completeMove(restoreFocus); if (restoreFocus) this.updatePosition(); }
  public suspend(): void { this.#popup.suspend(); }
  public resume(): void { this.#popup.resume(); }
  public suspendResources(): void { this.#suspended = true; this.#position.disconnect(); }
  public resumeResources(): void { if (this.#connected) { this.#suspended = false; this.updatePosition(); } }
  public disconnect(): void {
    assertPopupWritable(this.#root);
    this.#connected = false;
    try { this.#popup.disconnect(); } finally { this.#position.disconnect(); }
  }
  public updatePosition(): void { if (this.#connected && !this.#suspended && this.#popup.getActive()) this.#position.update(); }
  public syncPosition(options: PopupPositionOptions): void {
    assertPopupWritable(this.#root);
    assertPositionOptions(options);
    if (options.position !== undefined && typeof options.position !== 'boolean') throw new TypeError('Position opt-out must be boolean.');
    const anchor = options.anchor;
    if (anchor != null && (anchor.nodeType !== 1 || typeof anchor.getBoundingClientRect !== 'function' || anchor.ownerDocument == null)) {
      throw new TypeError('Popup anchor must be an element reference or null.');
    }
    const reference = anchor === null ? this.#trigger : anchor ?? this.#reference;
    const anchorRect = options.anchorRect === undefined ? this.#anchorRect : snapshotPositionRect(options.anchorRect);
    const next = this.#createPosition(options, reference, anchorRect);
    this.#position.disconnect();
    this.#reference = reference;
    this.#anchorRect = anchorRect;
    this.#position = next;
    this.updatePosition();
  }
}
