import { createFacadeConnection, type FacadeConnection } from '@sectile/core/adapter-runtime';
import { unwrap } from '@sectile/core/result';
import type { Result } from '@sectile/core';
import { applyTooltipEvent, tryCreateTooltipState, type TooltipCommand, type TooltipEvent, type TooltipState } from '@sectile/core/tooltip';
import type {
  AutoUpdateOptions,
  Boundary,
  ComputePositionConfig,
  ComputePositionReturn,
  Padding,
  ReferenceElement,
  Strategy,
} from '@floating-ui/dom';
import { createFloatingPosition, type FloatingPositionConnection, type FloatingSide, type FloatingAlign } from './internal/floating-position.js';
import { createDOMPopup, type DOMPopupConnection } from './internal/popup-control.js';

export {
  arrow,
  autoPlacement,
  flip,
  hide,
  inline,
  limitShift,
  offset,
  shift,
  size,
  type ArrowOptions,
  type AutoPlacementOptions,
  type FlipOptions,
  type HideOptions,
  type InlineOptions,
  type Middleware,
  type OffsetOptions,
  type ShiftOptions,
  type SizeOptions,
} from '@floating-ui/dom';

export type TooltipSide = FloatingSide;
export type TooltipAlign = FloatingAlign;
export interface TooltipOptions {
  readonly root: HTMLElement;
  readonly trigger?: HTMLElement;
  readonly anchor?: ReferenceElement;
  readonly arrow?: HTMLElement;
  readonly id?: string;
  readonly open?: boolean;
  readonly defaultOpen?: boolean;
  readonly disabled?: boolean;
  readonly side?: TooltipSide;
  readonly align?: TooltipAlign;
  readonly sideOffset?: number;
  readonly collisionPadding?: Padding;
  readonly collisionBoundary?: Boundary;
  readonly avoidCollisions?: boolean;
  readonly arrowPadding?: Padding;
  readonly hideWhenDetached?: boolean;
  readonly strategy?: Strategy;
  /** Replaces the built-in offset, flip, shift, size, arrow, and hide middleware. */
  readonly middleware?: ComputePositionConfig['middleware'];
  /** Set to false to position only when updatePosition is called. */
  readonly autoUpdate?: boolean | AutoUpdateOptions;
  readonly onOpenChange?: (open: boolean) => void;
  readonly onPositionChange?: (position: ComputePositionReturn) => void;
  readonly onUpdate?: () => void;
  readonly manageVisibility?: boolean;
}

export type TooltipOpenChangeHandler = NonNullable<TooltipOptions['onOpenChange']>;
export type TooltipPositionChangeHandler = NonNullable<TooltipOptions['onPositionChange']>;
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
  readonly #position: FloatingPositionConnection;

  public constructor(popup: DOMPopupConnection<TooltipState, TooltipEvent>, options: TooltipOptions) {
    this.#popup = popup;
    this.#position = createFloatingPosition({
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
      middleware: options.middleware,
      autoUpdate: options.autoUpdate,
      onPositionChange: options.onPositionChange,
    });
  }

  public getSnapshot() { return this.#popup.getSnapshot(); }
  public syncControlledValue(open: boolean) { return this.#popup.syncControlledValue(open); }
  public handleEvent(event: TooltipEvent): boolean { return this.#popup.handleEvent(event); }
  public refresh(): void { this.#popup.refresh(); this.updatePosition(); }
  public disconnect(): void { this.#popup.disconnect(); this.#position.disconnect(); }
  public updatePosition(): void { this.#position.update(); }
}
