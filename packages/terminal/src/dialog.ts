import type { Result } from '@sectile/primitives';
import { applyDialogEvent, createDialogState, type DialogCommand, type DialogEvent, type DialogState } from '@sectile/primitives/dialog';
import { createTerminalPopup, type TerminalPopupConnection } from './internal/popup-control.js';
export interface DialogOptions { readonly open?: boolean; readonly defaultOpen?: boolean; readonly disabled?: boolean; readonly onOpenChange?: (open: boolean) => void; readonly onInitialFocus?: () => void; readonly onFocusRestore?: () => void; readonly onUpdate?: () => void }
export type DialogConnection = TerminalPopupConnection<DialogState, DialogEvent>;
export function createDialog(o: DialogOptions = {}): Result<DialogConnection> { return createTerminalPopup<DialogState, DialogEvent, DialogCommand>({ controlled: o.open !== undefined, initial: createDialogState(o.open ?? o.defaultOpen ?? false), reducer: applyDialogEvent, create: createDialogState, read: (s) => s.open, close: 'close', interaction: o, onOpenChange: o.onOpenChange, command: (c) => c.type === 'request-initial-focus' ? o.onInitialFocus?.() : o.onFocusRestore?.(), onUpdate: o.onUpdate }); }
