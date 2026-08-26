import { createFacadeConnection, type FacadeConnection } from '@sectile/core/adapter-runtime';
import { unwrap } from '@sectile/core/result';
import type { Result } from '@sectile/core';
import { applyPopoverEvent, tryCreatePopoverState, type PopoverCommand, type PopoverEvent, type PopoverState } from '@sectile/core/popover';
import { createTerminalPopup, type TerminalPopupConnection } from './internal/popup-control.js';
export interface PopoverOptions { readonly open?: boolean; readonly defaultOpen?: boolean; readonly disabled?: boolean; readonly onOpenChange?: (open: boolean) => void; readonly onInitialFocus?: () => void; readonly onFocusRestore?: () => void; readonly onUpdate?: () => void }

export type PopoverOpenChangeHandler = NonNullable<PopoverOptions['onOpenChange']>;
export type PopoverInitialFocusHandler = NonNullable<PopoverOptions['onInitialFocus']>;
export type PopoverFocusRestoreHandler = NonNullable<PopoverOptions['onFocusRestore']>;
export type PopoverUpdateHandler = NonNullable<PopoverOptions['onUpdate']>;
export type PopoverConnection = TerminalPopupConnection<PopoverState, PopoverEvent>;
export function createPopover(options: PopoverOptions = {}): FacadeConnection<PopoverConnection> { return unwrap(tryCreatePopover(options)); }
export function tryCreatePopover(options: PopoverOptions = {}): Result<FacadeConnection<PopoverConnection>> { return createFacadeConnection(options, (normalized) => tryCreatePopoverConnection(normalized)); }
function tryCreatePopoverConnection(options: PopoverOptions): Result<PopoverConnection> { return createTerminalPopup<PopoverState, PopoverEvent, PopoverCommand>({ controlled: options.open !== undefined, initial: tryCreatePopoverState(options.open ?? options.defaultOpen ?? false), reducer: applyPopoverEvent, create: tryCreatePopoverState, read: (state) => state.open, close: 'close', interaction: options, onOpenChange: options.onOpenChange, command: (command) => command.type === 'request-initial-focus' ? options.onInitialFocus?.() : options.onFocusRestore?.(), onUpdate: options.onUpdate }); }
