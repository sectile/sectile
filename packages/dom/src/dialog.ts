import type { LayerHostConnection, LayerReservation } from './layer-host.js';
import { createFacadeConnection, type FacadeConnection } from '@sectile/core/adapter-runtime';
import { unwrap } from '@sectile/core/result';
import type { Result } from '@sectile/core';
import { applyDialogEvent, tryCreateDialogState, type DialogCommand, type DialogEvent, type DialogState } from '@sectile/core/dialog';
import { createDOMPopup, readPopupOpen, type DOMPopupConnection } from './overlay/popup/connection.js';
import type { InteractOutsideHandler } from './interact-outside.js';
import type { PopupOpenChangeHandler } from './overlay/popup/connection.js';
export type { PopupInputMethod, PopupCloseReason, PopupOpenChangeHandler } from './overlay/popup/connection.js';

export type { InteractOutsideEvent, InteractOutsideHandler } from './interact-outside.js';
export type { PopupDismissalOptions } from './overlay/popup/connection.js';
export type { PopupBehaviorOptions, PopupBehaviorErrorCode } from './overlay/popup/connection.js';
export type { DOMLayerReparentErrorCode, DOMLayerPresentationErrorCode, DOMLayerPresentationSnapshot, DOMLayerPresentationListener, DOMLayerPresentationSubscription } from './overlay/popup/connection.js';

export interface DialogOptions {
  readonly root: HTMLElement; readonly trigger?: HTMLElement; readonly open?: boolean; readonly defaultOpen?: boolean; readonly disabled?: boolean;
  readonly modal?: boolean; readonly label?: string; readonly labelledBy?: string; readonly describedBy?: string; readonly initialFocus?: HTMLElement;
  readonly overlay?: HTMLElement; readonly autoFocus?: boolean; readonly restoreFocus?: boolean; readonly trapFocus?: boolean;
  readonly restoreFocusTarget?: HTMLElement;
  readonly closeOnEscape?: boolean; readonly closeOnInteractOutside?: boolean; readonly interactOutsideExclusions?: readonly HTMLElement[]; readonly onInteractOutside?: InteractOutsideHandler;
  readonly onOpenChange?: PopupOpenChangeHandler;
  readonly onInitialFocus?: () => void; readonly onFocusRestore?: () => void; readonly onUpdate?: () => void; readonly manageVisibility?: boolean;
  readonly retainExit?: boolean;
  readonly layerHost?: LayerHostConnection;
  readonly reservation?: LayerReservation;
}

export type DialogOpenChangeHandler = NonNullable<DialogOptions['onOpenChange']>;
export type DialogInitialFocusHandler = NonNullable<DialogOptions['onInitialFocus']>;
export type DialogFocusRestoreHandler = NonNullable<DialogOptions['onFocusRestore']>;
export type DialogInteractOutsideHandler = NonNullable<DialogOptions['onInteractOutside']>;
export type DialogUpdateHandler = NonNullable<DialogOptions['onUpdate']>;
export type DialogConnection = DOMPopupConnection<DialogState, DialogEvent>;
export function createDialog(o: DialogOptions): FacadeConnection<DialogConnection> {
  return unwrap(tryCreateDialog(o));
}

export function tryCreateDialog(o: DialogOptions): Result<FacadeConnection<DialogConnection>> {
  return createFacadeConnection(o, tryCreateDialogConnection);
}

function tryCreateDialogConnection(o: DialogOptions): Result<DialogConnection> {
  const modal = o.modal ?? true;
  return createDOMPopup<DialogState, DialogEvent, DialogCommand>({ root: o.root, trigger: o.trigger, role: 'dialog', modal, label: o.label, labelledBy: o.labelledBy, describedBy: o.describedBy, controlled: o.open !== undefined, initial: tryCreateDialogState(o.open ?? o.defaultOpen ?? false), open: 'open', toggle: 'toggle', close: 'close', reducer: applyDialogEvent, create: tryCreateDialogState, read: readPopupOpen, interaction: o, initialFocus: o.initialFocus, autoFocus: o.autoFocus ?? true, restoreFocus: o.restoreFocus ?? true, restoreFocusTarget: o.restoreFocusTarget, trapFocus: o.trapFocus ?? modal, closeOnEscape: o.closeOnEscape ?? true, closeOnInteractOutside: o.closeOnInteractOutside ?? true, interactOutsideExclusions: o.interactOutsideExclusions, ...(o.overlay === undefined ? {} : { modalBranches: [o.overlay] }), onInteractOutside: o.onInteractOutside, manageVisibility: o.manageVisibility, retainExit: o.retainExit, layerHost: o.layerHost, reservation: o.reservation, onOpenChange: o.onOpenChange, command: (c) => c.type === 'request-initial-focus' ? o.onInitialFocus?.() : o.onFocusRestore?.(), onUpdate: o.onUpdate });
}
