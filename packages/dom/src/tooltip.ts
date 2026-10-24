import type { LayerHostConnection } from './layer-host.js';
import { createFacadeConnection, type FacadeConnection } from '@sectile/core/adapter-runtime';
import type { InteractOutsideHandler } from './interact-outside.js';
export type { InteractOutsideEvent, InteractOutsideHandler } from './interact-outside.js';
import { unwrap } from '@sectile/core/result';
import type { Result } from '@sectile/core';
import { applyTooltipEvent, tryCreateTooltipState, type TooltipCommand, type TooltipEvent, type TooltipState } from '@sectile/core/tooltip';
import type { PositionAlign, PositionOptions, PositionRect, PositionSide } from './position.js';
import { PositionedPopup, snapshotPositionRect } from './overlay/positioned-popup.js';
export type { PopupPositionOptions } from './overlay/positioned-popup.js';
import { createDOMPopup, readPopupOpen, type DOMPopupConnection, type PopupBehaviorOptions, type PopupBehaviorErrorCode } from './overlay/popup/connection.js';
import { connectTooltipInteraction } from './overlay/tooltip-interaction.js';
import type { TooltipTimingOptions } from './overlay/tooltip-interaction.js';
export { createTooltipGroup, type TooltipGroup, type TooltipTimingOptions } from './overlay/tooltip-interaction.js';
export { getTooltipTriggerAttributes, connectTooltipDescription, type TooltipTriggerAttributes, type TooltipTriggerAttributesOptions } from './overlay/tooltip-interaction.js';

export type TooltipSide = PositionSide;
export type { PopupDismissalOptions } from './overlay/popup/connection.js';
export type { PopupBehaviorOptions, PopupBehaviorErrorCode } from './overlay/popup/connection.js';
export type TooltipAlign = PositionAlign;
export interface TooltipOptions extends PositionOptions, TooltipTimingOptions {
  readonly root: HTMLElement;
  readonly trigger?: HTMLElement;
  readonly anchor?: HTMLElement;
  /** Viewport snapshot; trigger/anchor remains the document and lifecycle context. */
  readonly anchorRect?: PositionRect;
  readonly arrow?: HTMLElement;
  readonly id?: string;
  readonly open?: boolean;
  readonly defaultOpen?: boolean;
  readonly disabled?: boolean;
  readonly closeOnEscape?: boolean;
  readonly closeOnInteractOutside?: boolean;
  readonly interactOutsideExclusions?: readonly HTMLElement[];
  readonly onInteractOutside?: InteractOutsideHandler;
  readonly onOpenChange?: import('./overlay/popup/connection.js').PopupOpenChangeHandler;
  readonly onUpdate?: () => void;
  readonly manageVisibility?: boolean;
  readonly retainExit?: boolean;
  readonly layerHost?: LayerHostConnection;
  readonly position?: boolean;
}

export type TooltipOpenChangeHandler = NonNullable<TooltipOptions['onOpenChange']>;
export type { PopupInputMethod, PopupCloseReason, PopupOpenChangeHandler } from './overlay/popup/connection.js';
export type TooltipUpdateHandler = NonNullable<TooltipOptions['onUpdate']>;
export type TooltipBehaviorOptions = PopupBehaviorOptions & {
  readonly modal: false;
  readonly autoFocus: false;
  readonly restoreFocus: false;
  readonly trapFocus: false;
};
export interface TooltipConnection extends DOMPopupConnection<TooltipState, TooltipEvent> {
  syncBehavior(options: TooltipBehaviorOptions): Result<void, PopupBehaviorErrorCode>;
  updatePosition(): void;
  syncPosition(options: import('./overlay/positioned-popup.js').PopupPositionOptions): void;
}
export function createTooltip(o: TooltipOptions): FacadeConnection<TooltipConnection> {
  return unwrap(tryCreateTooltip(o));
}

export function tryCreateTooltip(o: TooltipOptions): Result<FacadeConnection<TooltipConnection>> {
  return createFacadeConnection(o, tryCreateTooltipConnection);
}

function tryCreateTooltipConnection(o: TooltipOptions): Result<TooltipConnection> {
  if (o.anchorRect !== undefined) o = { ...o, anchorRect: snapshotPositionRect(o.anchorRect)! };
  let connection: PositionedPopup<TooltipState, TooltipEvent> | undefined;
  const popup = createDOMPopup<TooltipState, TooltipEvent, TooltipCommand>({
    root: o.root,
    trigger: o.trigger,
    role: 'tooltip',
    controlled: o.open !== undefined,
    initial: tryCreateTooltipState(o.open ?? o.defaultOpen ?? false),
    open: 'open', toggle: 'toggle', close: 'close',
    reducer: applyTooltipEvent,
    create: tryCreateTooltipState,
    read: readPopupOpen,
    interaction: o,
    closeOnEscape: o.closeOnEscape ?? true,
    closeOnInteractOutside: o.closeOnInteractOutside ?? false,
    interactOutsideExclusions: o.interactOutsideExclusions,
    onInteractOutside: o.onInteractOutside,
    triggerMode: 'focus-hover',
    manageVisibility: o.manageVisibility,
    retainExit: o.retainExit, layerHost: o.layerHost,
    bindFocusHover: hooks => connectTooltipInteraction({ root: o.root, trigger: o.trigger, id: o.id,
      ...(o.openDelay === undefined ? {} : { openDelay: o.openDelay }), ...(o.closeDelay === undefined ? {} : { closeDelay: o.closeDelay }),
      ...(o.group === undefined ? {} : { group: o.group }) }, hooks),
    onOpenChange: o.onOpenChange,
    onPresentationSuspend: () => { connection?.suspendResources(); },
    onPresentationResume: () => { connection?.resumeResources(); },
    onUpdate: () => { connection?.updatePosition(); o.onUpdate?.(); },
  });
  if (!popup.ok) return popup;
  connection = new PositionedPopup<TooltipState, TooltipEvent>(popup.value, o);
  connection.updatePosition();
  return { ok: true, value: connection };
}
export type { DOMLayerReparentErrorCode, DOMLayerPresentationErrorCode, DOMLayerPresentationSnapshot, DOMLayerPresentationListener, DOMLayerPresentationSubscription } from './overlay/popup/connection.js';
