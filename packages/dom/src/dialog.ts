import type { Result } from '@sectile/primitives';
import { applyDialogEvent, createDialogState, type DialogCommand, type DialogEvent, type DialogState } from '@sectile/primitives/dialog';
import { createDOMPopup, type DOMPopupConnection } from './internal/popup-control.js';

export interface DialogOptions {
  readonly root: HTMLElement; readonly trigger?: HTMLElement; readonly open?: boolean; readonly defaultOpen?: boolean; readonly disabled?: boolean;
  readonly modal?: boolean; readonly label?: string; readonly labelledBy?: string; readonly describedBy?: string; readonly initialFocus?: HTMLElement;
  readonly autoFocus?: boolean; readonly restoreFocus?: boolean; readonly trapFocus?: boolean; readonly onOpenChange?: (open: boolean) => void;
  readonly onInitialFocus?: () => void; readonly onFocusRestore?: () => void; readonly onUpdate?: () => void;
}
export type DialogConnection = DOMPopupConnection<DialogState, DialogEvent>;
export function createDialog(o: DialogOptions): Result<DialogConnection> {
  const modal = o.modal ?? true;
  return createDOMPopup<DialogState, DialogEvent, DialogCommand>({ root: o.root, ...(o.trigger === undefined ? {} : { trigger: o.trigger }), role: 'dialog', modal, ...(o.label === undefined ? {} : { label: o.label }), ...(o.labelledBy === undefined ? {} : { labelledBy: o.labelledBy }), ...(o.describedBy === undefined ? {} : { describedBy: o.describedBy }), controlled: o.open !== undefined, initial: createDialogState(o.open ?? o.defaultOpen ?? false), open: 'open', toggle: 'toggle', close: 'close', reducer: applyDialogEvent, create: createDialogState, read: (s) => s.open, interaction: o, ...(o.initialFocus === undefined ? {} : { initialFocus: o.initialFocus }), autoFocus: o.autoFocus ?? true, restoreFocus: o.restoreFocus ?? true, trapFocus: o.trapFocus ?? modal, onOpenChange: o.onOpenChange, command: (c) => c.type === 'request-initial-focus' ? o.onInitialFocus?.() : o.onFocusRestore?.(), onUpdate: o.onUpdate });
}
