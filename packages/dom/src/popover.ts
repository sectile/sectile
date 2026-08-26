import { applyPopoverEvent, tryCreatePopoverState, type PopoverCommand, type PopoverEvent, type PopoverState } from '@sectile/core/popover';
import { unwrap } from '@sectile/core/result';
import type { Result } from '@sectile/core';
import {
  type AutoUpdateOptions,
  type Boundary,
  type ComputePositionConfig,
  type ComputePositionReturn,
  type Padding,
  type ReferenceElement,
  type Strategy,
} from '@floating-ui/dom';
import { createFacadeConnection, type FacadeConnection } from '@sectile/core/adapter-runtime';
import { createFloatingPosition, type FloatingPositionConnection } from './internal/floating-position.js';
import { createDOMPopup, type DOMPopupConnection } from './internal/popup-control.js';
import type { InteractOutsideHandler } from './interact-outside.js';

export type { InteractOutsideEvent, InteractOutsideHandler } from './interact-outside.js';

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
  type AutoUpdateOptions,
  type AutoPlacementOptions,
  type Boundary,
  type ComputePositionReturn,
  type FlipOptions,
  type HideOptions,
  type InlineOptions,
  type Middleware,
  type OffsetOptions,
  type Padding,
  type ReferenceElement,
  type ShiftOptions,
  type SizeOptions,
  type Strategy,
} from '@floating-ui/dom';

export type PopoverSide = 'top' | 'right' | 'bottom' | 'left';
export type PopoverAlign = 'start' | 'center' | 'end';
export interface PopoverOptions {
  readonly root: HTMLElement;
  readonly trigger?: HTMLElement;
  readonly anchor?: ReferenceElement;
  readonly arrow?: HTMLElement;
  readonly open?: boolean;
  readonly defaultOpen?: boolean;
  readonly disabled?: boolean;
  readonly label?: string;
  readonly labelledBy?: string;
  readonly describedBy?: string;
  readonly initialFocus?: HTMLElement;
  readonly autoFocus?: boolean;
  readonly restoreFocus?: boolean;
  readonly trapFocus?: boolean;
  readonly closeOnInteractOutside?: boolean;
  readonly interactOutsideExclusions?: readonly HTMLElement[];
  readonly onInteractOutside?: InteractOutsideHandler;
  readonly side?: PopoverSide;
  readonly align?: PopoverAlign;
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
  readonly onInitialFocus?: () => void;
  readonly onFocusRestore?: () => void;
  readonly onUpdate?: () => void;
  readonly manageVisibility?: boolean;
}

export type PopoverOpenChangeHandler = NonNullable<PopoverOptions['onOpenChange']>;
export type PopoverPositionChangeHandler = NonNullable<PopoverOptions['onPositionChange']>;
export type PopoverInitialFocusHandler = NonNullable<PopoverOptions['onInitialFocus']>;
export type PopoverFocusRestoreHandler = NonNullable<PopoverOptions['onFocusRestore']>;
export type PopoverInteractOutsideHandler = NonNullable<PopoverOptions['onInteractOutside']>;
export type PopoverUpdateHandler = NonNullable<PopoverOptions['onUpdate']>;
export interface PopoverConnection extends DOMPopupConnection<PopoverState, PopoverEvent> {
  updatePosition(): void;
}

export function createPopover(options: PopoverOptions): FacadeConnection<PopoverConnection> {
  return unwrap(tryCreatePopover(options));
}

export function tryCreatePopover(options: PopoverOptions): Result<FacadeConnection<PopoverConnection>> {
  return createFacadeConnection(options, (normalized) => tryCreatePopoverConnection(normalized));
}

function tryCreatePopoverConnection(options: PopoverOptions): Result<PopoverConnection> {
  let connection: PositionedPopover | undefined;
  const popup = createDOMPopup<PopoverState, PopoverEvent, PopoverCommand>({
    root: options.root,
    ...(options.trigger === undefined ? {} : { trigger: options.trigger }),
    role: 'dialog',
    modal: false,
    ...(options.label === undefined ? {} : { label: options.label }),
    ...(options.labelledBy === undefined ? {} : { labelledBy: options.labelledBy }),
    ...(options.describedBy === undefined ? {} : { describedBy: options.describedBy }),
    controlled: options.open !== undefined,
    initial: tryCreatePopoverState(options.open ?? options.defaultOpen ?? false),
    open: 'open', toggle: 'toggle', close: 'close',
    reducer: applyPopoverEvent,
    create: tryCreatePopoverState,
    read: (state) => state.open,
    interaction: options,
    ...(options.initialFocus === undefined ? {} : { initialFocus: options.initialFocus }),
    autoFocus: options.autoFocus ?? false,
    restoreFocus: options.restoreFocus ?? true,
    trapFocus: options.trapFocus ?? false,
    closeOnInteractOutside: options.closeOnInteractOutside ?? true,
    ...(options.interactOutsideExclusions === undefined ? {} : { interactOutsideExclusions: options.interactOutsideExclusions }),
    ...(options.onInteractOutside === undefined ? {} : { onInteractOutside: options.onInteractOutside }),
    ...(options.manageVisibility === undefined ? {} : { manageVisibility: options.manageVisibility }),
    onOpenChange: options.onOpenChange,
    command: (command) => command.type === 'request-initial-focus' ? options.onInitialFocus?.() : options.onFocusRestore?.(),
    onUpdate: () => { connection?.updatePosition(); options.onUpdate?.(); },
  });
  if (!popup.ok) return popup;
  connection = new PositionedPopover(popup.value, options);
  connection.updatePosition();
  return { ok: true, value: connection };
}

class PositionedPopover implements PopoverConnection {
  readonly #popup: DOMPopupConnection<PopoverState, PopoverEvent>;
  readonly #position: FloatingPositionConnection;

  public constructor(popup: DOMPopupConnection<PopoverState, PopoverEvent>, options: PopoverOptions) {
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
  public handleEvent(event: PopoverEvent): boolean { return this.#popup.handleEvent(event); }
  public refresh(): void { this.#popup.refresh(); this.updatePosition(); }
  public disconnect(): void {
    this.#popup.disconnect();
    this.#position.disconnect();
  }
  public updatePosition(): void { this.#position.update(); }
}
