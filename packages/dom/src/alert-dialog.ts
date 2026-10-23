import type { LayerHostConnection, LayerReservation } from './layer-host.js';
import { createFacadeConnection, type FacadeConnection } from '@sectile/core/adapter-runtime';
import { unwrap } from '@sectile/core/result';
import type { Result } from '@sectile/core';
import { applyAlertDialogEvent, tryCreateAlertDialogState, type AlertDialogCommand, type AlertDialogEvent, type AlertDialogState } from '@sectile/core/alert-dialog';
import { createDOMPopup, readPopupOpen, type DOMPopupConnection, type PopupBehaviorOptions, type PopupBehaviorErrorCode } from './overlay/popup/connection.js';
import type { InteractOutsideHandler } from './interact-outside.js';
import type { PopupOpenChangeHandler } from './overlay/popup/connection.js';
export type { PopupInputMethod, PopupCloseReason, PopupOpenChangeHandler } from './overlay/popup/connection.js';

export type { InteractOutsideEvent, InteractOutsideHandler } from './interact-outside.js';
export type { PopupDismissalOptions } from './overlay/popup/connection.js';
export type { PopupBehaviorOptions, PopupBehaviorErrorCode } from './overlay/popup/connection.js';

export interface AlertDialogOptions {
  readonly root: HTMLElement; readonly trigger?: HTMLElement; readonly open?: boolean; readonly defaultOpen?: boolean; readonly disabled?: boolean;
  readonly label?: string; readonly labelledBy?: string; readonly describedBy?: string; readonly initialFocus?: HTMLElement; readonly autoFocus?: boolean;
  readonly overlay?: HTMLElement; readonly restoreFocus?: boolean; readonly restoreFocusTarget?: HTMLElement; readonly trapFocus?: boolean; readonly closeOnEscape?: boolean; readonly closeOnInteractOutside?: boolean;
  readonly interactOutsideExclusions?: readonly HTMLElement[]; readonly onInteractOutside?: InteractOutsideHandler;
  readonly onOpenChange?: PopupOpenChangeHandler; readonly onInitialFocus?: () => void;
  readonly onFocusRestore?: () => void; readonly onAnnounce?: () => void; readonly onUpdate?: () => void; readonly manageVisibility?: boolean;
  readonly retainExit?: boolean;
  readonly layerHost?: LayerHostConnection;
  readonly reservation?: LayerReservation;
}

export type AlertDialogOpenChangeHandler = NonNullable<AlertDialogOptions['onOpenChange']>;
export type AlertDialogInitialFocusHandler = NonNullable<AlertDialogOptions['onInitialFocus']>;
export type AlertDialogFocusRestoreHandler = NonNullable<AlertDialogOptions['onFocusRestore']>;
export type AlertDialogAnnounceHandler = NonNullable<AlertDialogOptions['onAnnounce']>;
export type AlertDialogInteractOutsideHandler = NonNullable<AlertDialogOptions['onInteractOutside']>;
export type AlertDialogUpdateHandler = NonNullable<AlertDialogOptions['onUpdate']>;
export type AlertDialogBehaviorOptions = PopupBehaviorOptions & { readonly modal: true };
export interface AlertDialogConnection extends DOMPopupConnection<AlertDialogState, AlertDialogEvent> {
  syncBehavior(options: AlertDialogBehaviorOptions): Result<void, PopupBehaviorErrorCode>;
}
export function createAlertDialog(o: AlertDialogOptions): FacadeConnection<AlertDialogConnection> {
  return unwrap(tryCreateAlertDialog(o));
}

export function tryCreateAlertDialog(o: AlertDialogOptions): Result<FacadeConnection<AlertDialogConnection>> {
  return createFacadeConnection(o, tryCreateAlertDialogConnection);
}

function tryCreateAlertDialogConnection(o: AlertDialogOptions): Result<AlertDialogConnection> {
  return createDOMPopup<AlertDialogState, AlertDialogEvent, AlertDialogCommand>({ root: o.root, trigger: o.trigger, role: 'alertdialog', modal: true, label: o.label, labelledBy: o.labelledBy, describedBy: o.describedBy, controlled: o.open !== undefined, initial: tryCreateAlertDialogState(o.open ?? o.defaultOpen ?? false), open: 'open', toggle: 'toggle', close: 'close', reducer: applyAlertDialogEvent, create: tryCreateAlertDialogState, read: readPopupOpen, interaction: o, initialFocus: o.initialFocus, autoFocus: o.autoFocus ?? true, restoreFocus: o.restoreFocus ?? true, restoreFocusTarget: o.restoreFocusTarget, trapFocus: o.trapFocus ?? true, closeOnEscape: o.closeOnEscape ?? true, closeOnInteractOutside: o.closeOnInteractOutside ?? false, interactOutsideExclusions: o.interactOutsideExclusions, ...(o.overlay === undefined ? {} : { modalBranches: [o.overlay] }), onInteractOutside: o.onInteractOutside, manageVisibility: o.manageVisibility, retainExit: o.retainExit, layerHost: o.layerHost, reservation: o.reservation, onOpenChange: o.onOpenChange, command: (c) => c.type === 'request-initial-focus' ? o.onInitialFocus?.() : c.type === 'request-focus-restore' ? o.onFocusRestore?.() : o.onAnnounce?.(), onUpdate: o.onUpdate });
}
export type { DOMLayerReparentErrorCode, DOMLayerPresentationErrorCode, DOMLayerPresentationSnapshot, DOMLayerPresentationListener, DOMLayerPresentationSubscription } from './overlay/popup/connection.js';
