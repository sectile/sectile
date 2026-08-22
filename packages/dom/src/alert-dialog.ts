import type { Result } from '@sectile/core';
import { applyAlertDialogEvent, createAlertDialogState, type AlertDialogCommand, type AlertDialogEvent, type AlertDialogState } from '@sectile/core/alert-dialog';
import { createDOMPopup, type DOMPopupConnection } from './internal/popup-control.js';

export interface AlertDialogOptions {
  readonly root: HTMLElement; readonly trigger?: HTMLElement; readonly open?: boolean; readonly defaultOpen?: boolean; readonly disabled?: boolean;
  readonly label?: string; readonly labelledBy?: string; readonly describedBy?: string; readonly initialFocus?: HTMLElement; readonly autoFocus?: boolean;
  readonly restoreFocus?: boolean; readonly trapFocus?: boolean; readonly onOpenChange?: (open: boolean) => void; readonly onInitialFocus?: () => void;
  readonly onFocusRestore?: () => void; readonly onAnnounce?: () => void; readonly onUpdate?: () => void;
}
export type AlertDialogConnection = DOMPopupConnection<AlertDialogState, AlertDialogEvent>;
export function createAlertDialog(o: AlertDialogOptions): Result<AlertDialogConnection> {
  return createDOMPopup<AlertDialogState, AlertDialogEvent, AlertDialogCommand>({ root: o.root, ...(o.trigger === undefined ? {} : { trigger: o.trigger }), role: 'alertdialog', modal: true, ...(o.label === undefined ? {} : { label: o.label }), ...(o.labelledBy === undefined ? {} : { labelledBy: o.labelledBy }), ...(o.describedBy === undefined ? {} : { describedBy: o.describedBy }), controlled: o.open !== undefined, initial: createAlertDialogState(o.open ?? o.defaultOpen ?? false), open: 'open', toggle: 'toggle', close: 'close', reducer: applyAlertDialogEvent, create: createAlertDialogState, read: (s) => s.open, interaction: o, ...(o.initialFocus === undefined ? {} : { initialFocus: o.initialFocus }), autoFocus: o.autoFocus ?? true, restoreFocus: o.restoreFocus ?? true, trapFocus: o.trapFocus ?? true, onOpenChange: o.onOpenChange, command: (c) => c.type === 'request-initial-focus' ? o.onInitialFocus?.() : c.type === 'request-focus-restore' ? o.onFocusRestore?.() : o.onAnnounce?.(), onUpdate: o.onUpdate });
}
