import { createFacadeConnection, type FacadeConnection } from './internal/facade.js';
import { unwrap } from '@sectile/core/result';
import type { Result } from '@sectile/core';
import { applyDialogEvent, tryCreateDialogState, type DialogCommand, type DialogEvent, type DialogState } from '@sectile/core/dialog';
import { createTerminalPopup, type TerminalPopupConnection } from './internal/popup-control.js';
export interface DialogOptions { readonly open?: boolean; readonly defaultOpen?: boolean; readonly disabled?: boolean; readonly onOpenChange?: (open: boolean) => void; readonly onInitialFocus?: () => void; readonly onFocusRestore?: () => void; readonly onUpdate?: () => void }
export type DialogConnection = TerminalPopupConnection<DialogState, DialogEvent>;
export function createDialog(o: DialogOptions = {}): FacadeConnection<DialogConnection> {
  return unwrap(tryCreateDialog(o));
}

export function tryCreateDialog(o: DialogOptions = {}): Result<FacadeConnection<DialogConnection>> {
  return createFacadeConnection(o, (o) => tryCreateDialogConnection(o));
}

function tryCreateDialogConnection(o: DialogOptions = {}): Result<DialogConnection> { return createTerminalPopup<DialogState, DialogEvent, DialogCommand>({ controlled: o.open !== undefined, initial: tryCreateDialogState(o.open ?? o.defaultOpen ?? false), reducer: applyDialogEvent, create: tryCreateDialogState, read: (s) => s.open, close: 'close', interaction: o, onOpenChange: o.onOpenChange, command: (c) => c.type === 'request-initial-focus' ? o.onInitialFocus?.() : o.onFocusRestore?.(), onUpdate: o.onUpdate }); }
