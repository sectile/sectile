import { createFacadeConnection, type FacadeConnection } from './internal/facade.js';
import { unwrap } from '@sectile/core/result';
import type { Result } from '@sectile/core';
import { applyDialogEvent, tryCreateDialogState, type DialogCommand, type DialogEvent, type DialogState } from '@sectile/core/dialog';
import { createDOMPopup, type DOMPopupConnection } from './internal/popup-control.js';
import type { InteractOutsideHandler } from './interact-outside.js';

export type { InteractOutsideEvent, InteractOutsideHandler } from './interact-outside.js';

export interface DialogOptions {
  readonly root: HTMLElement; readonly trigger?: HTMLElement; readonly open?: boolean; readonly defaultOpen?: boolean; readonly disabled?: boolean;
  readonly modal?: boolean; readonly label?: string; readonly labelledBy?: string; readonly describedBy?: string; readonly initialFocus?: HTMLElement;
  readonly overlay?: HTMLElement; readonly autoFocus?: boolean; readonly restoreFocus?: boolean; readonly trapFocus?: boolean;
  readonly closeOnInteractOutside?: boolean; readonly interactOutsideExclusions?: readonly HTMLElement[]; readonly onInteractOutside?: InteractOutsideHandler;
  readonly onOpenChange?: (open: boolean) => void;
  readonly onInitialFocus?: () => void; readonly onFocusRestore?: () => void; readonly onUpdate?: () => void; readonly manageVisibility?: boolean;
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
  return createFacadeConnection(o, (o) => tryCreateDialogConnection(o));
}

function tryCreateDialogConnection(o: DialogOptions): Result<DialogConnection> {
  const modal = o.modal ?? true;
  return createDOMPopup<DialogState, DialogEvent, DialogCommand>({ root: o.root, ...(o.trigger === undefined ? {} : { trigger: o.trigger }), role: 'dialog', modal, ...(o.label === undefined ? {} : { label: o.label }), ...(o.labelledBy === undefined ? {} : { labelledBy: o.labelledBy }), ...(o.describedBy === undefined ? {} : { describedBy: o.describedBy }), controlled: o.open !== undefined, initial: tryCreateDialogState(o.open ?? o.defaultOpen ?? false), open: 'open', toggle: 'toggle', close: 'close', reducer: applyDialogEvent, create: tryCreateDialogState, read: (s) => s.open, interaction: o, ...(o.initialFocus === undefined ? {} : { initialFocus: o.initialFocus }), autoFocus: o.autoFocus ?? true, restoreFocus: o.restoreFocus ?? true, trapFocus: o.trapFocus ?? modal, closeOnInteractOutside: o.closeOnInteractOutside ?? true, ...(o.interactOutsideExclusions === undefined ? {} : { interactOutsideExclusions: o.interactOutsideExclusions }), ...(o.overlay === undefined ? {} : { modalBranches: [o.overlay] }), ...(o.onInteractOutside === undefined ? {} : { onInteractOutside: o.onInteractOutside }), ...(o.manageVisibility === undefined ? {} : { manageVisibility: o.manageVisibility }), onOpenChange: o.onOpenChange, command: (c) => c.type === 'request-initial-focus' ? o.onInitialFocus?.() : o.onFocusRestore?.(), onUpdate: o.onUpdate });
}
