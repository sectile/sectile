import { createFacadeConnection, type FacadeConnection } from './internal/facade.js';
import { unwrap } from '@sectile/core/result';
import type { Result } from '@sectile/core';
import { applyAlertDialogEvent, tryCreateAlertDialogState, type AlertDialogCommand, type AlertDialogEvent, type AlertDialogState } from '@sectile/core/alert-dialog';
import { createTerminalPopup, type TerminalPopupConnection } from './internal/popup-control.js';
export interface AlertDialogOptions { readonly open?: boolean; readonly defaultOpen?: boolean; readonly disabled?: boolean; readonly onOpenChange?: (open: boolean) => void; readonly onInitialFocus?: () => void; readonly onFocusRestore?: () => void; readonly onAnnounce?: () => void; readonly onUpdate?: () => void }

export type AlertDialogOpenChangeHandler = NonNullable<AlertDialogOptions['onOpenChange']>;
export type AlertDialogInitialFocusHandler = NonNullable<AlertDialogOptions['onInitialFocus']>;
export type AlertDialogFocusRestoreHandler = NonNullable<AlertDialogOptions['onFocusRestore']>;
export type AlertDialogAnnounceHandler = NonNullable<AlertDialogOptions['onAnnounce']>;
export type AlertDialogUpdateHandler = NonNullable<AlertDialogOptions['onUpdate']>;
export type AlertDialogConnection = TerminalPopupConnection<AlertDialogState, AlertDialogEvent>;
export function createAlertDialog(o: AlertDialogOptions = {}): FacadeConnection<AlertDialogConnection> {
  return unwrap(tryCreateAlertDialog(o));
}

export function tryCreateAlertDialog(o: AlertDialogOptions = {}): Result<FacadeConnection<AlertDialogConnection>> {
  return createFacadeConnection(o, (o) => tryCreateAlertDialogConnection(o));
}

function tryCreateAlertDialogConnection(o: AlertDialogOptions = {}): Result<AlertDialogConnection> { return createTerminalPopup<AlertDialogState, AlertDialogEvent, AlertDialogCommand>({ controlled: o.open !== undefined, initial: tryCreateAlertDialogState(o.open ?? o.defaultOpen ?? false), reducer: applyAlertDialogEvent, create: tryCreateAlertDialogState, read: (s) => s.open, close: 'close', interaction: o, onOpenChange: o.onOpenChange, command: (c) => c.type === 'request-initial-focus' ? o.onInitialFocus?.() : c.type === 'request-focus-restore' ? o.onFocusRestore?.() : o.onAnnounce?.(), onUpdate: o.onUpdate }); }
