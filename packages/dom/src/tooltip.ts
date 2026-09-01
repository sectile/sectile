import { createFacadeConnection, type FacadeConnection } from '@sectile/core/adapter-runtime';
import { unwrap } from '@sectile/core/result';
import type { Result } from '@sectile/core';
import { applyTooltipEvent, tryCreateTooltipState, type TooltipCommand, type TooltipEvent, type TooltipState } from '@sectile/core/tooltip';
import type { PositionAlign, PositionOptions, PositionSide } from './position.js';
import { createPosition, manualPositionConnection, type PositionConnection } from './internal/position-connection.js';
import { createDOMPopup, type DOMPopupConnection } from './internal/popup-control.js';

export type TooltipSide = PositionSide;
export type TooltipAlign = PositionAlign;
export interface TooltipOptions extends PositionOptions {
  readonly root: HTMLElement;
  readonly trigger?: HTMLElement;
  readonly anchor?: HTMLElement;
  readonly arrow?: HTMLElement;
  readonly id?: string;
  readonly open?: boolean;
  readonly defaultOpen?: boolean;
  readonly disabled?: boolean;
  readonly onOpenChange?: (open: boolean) => void;
  readonly onUpdate?: () => void;
  readonly manageVisibility?: boolean;
  readonly position?: boolean;
}

export type TooltipOpenChangeHandler = NonNullable<TooltipOptions['onOpenChange']>;
export type TooltipUpdateHandler = NonNullable<TooltipOptions['onUpdate']>;
export interface TooltipConnection extends DOMPopupConnection<TooltipState, TooltipEvent> {
  updatePosition(): void;
}
export function createTooltip(o: TooltipOptions): FacadeConnection<TooltipConnection> {
  return unwrap(tryCreateTooltip(o));
}

export function tryCreateTooltip(o: TooltipOptions): Result<FacadeConnection<TooltipConnection>> {
  return createFacadeConnection(o, (o) => tryCreateTooltipConnection(o));
}

function tryCreateTooltipConnection(o: TooltipOptions): Result<TooltipConnection> {
  let connection: PositionedTooltip | undefined;
  const popup = createDOMPopup<TooltipState, TooltipEvent, TooltipCommand>({
    root: o.root,
    ...(o.trigger === undefined ? {} : { trigger: o.trigger }),
    role: 'tooltip',
    controlled: o.open !== undefined,
    initial: tryCreateTooltipState(o.open ?? o.defaultOpen ?? false),
    open: 'open', toggle: 'toggle', close: 'close',
    reducer: applyTooltipEvent,
    create: tryCreateTooltipState,
    read: (state) => state.open,
    interaction: o,
    triggerMode: 'focus-hover',
    ...(o.manageVisibility === undefined ? {} : { manageVisibility: o.manageVisibility }),
    ...(o.id === undefined ? {} : { tooltipID: o.id }),
    onOpenChange: o.onOpenChange,
    onUpdate: () => { connection?.updatePosition(); o.onUpdate?.(); },
  });
  if (!popup.ok) return popup;
  connection = new PositionedTooltip(popup.value, o);
  connection.updatePosition();
  return { ok: true, value: connection };
}

class PositionedTooltip implements TooltipConnection {
  readonly #popup: DOMPopupConnection<TooltipState, TooltipEvent>;
  readonly #position: PositionConnection;

  public constructor(popup: DOMPopupConnection<TooltipState, TooltipEvent>, options: TooltipOptions) {
    this.#popup = popup;
    this.#position = options.position === false ? manualPositionConnection : createPosition({
      root: options.root,
      reference: options.anchor ?? options.trigger,
      ...(options.arrow === undefined ? {} : { arrow: options.arrow }),
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

  public getSnapshot() { return this.#popup.getSnapshot(); }
  public syncControlledValue(open: boolean) { return this.#popup.syncControlledValue(open); }
  public handleEvent(event: TooltipEvent): boolean { return this.#popup.handleEvent(event); }
  public refresh(): void { this.#popup.refresh(); this.updatePosition(); }
  public disconnect(): void { this.#popup.disconnect(); this.#position.disconnect(); }
  public updatePosition(): void { this.#position.update(); }
}
