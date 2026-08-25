import type { Result } from '@sectile/core';
import {
  applyDrawerEvent,
  tryCreateDrawerState,
  type DrawerCommand,
  type DrawerEvent,
  type DrawerSide,
  type DrawerState,
} from '@sectile/core/drawer';
import { unwrap } from '@sectile/core/result';
import { createFacadeConnection, type FacadeConnection } from './internal/facade.js';
import { createTerminalPopup, type TerminalPopupConnection } from './internal/popup-control.js';

export type { DrawerSide } from '@sectile/core/drawer';

export interface DrawerOptions {
  readonly open?: boolean;
  readonly defaultOpen?: boolean;
  readonly side?: DrawerSide;
  readonly disabled?: boolean;
  readonly onOpenChange?: (open: boolean) => void;
  readonly onInitialFocus?: () => void;
  readonly onFocusRestore?: () => void;
  readonly onUpdate?: () => void;
}

export type DrawerOpenChangeHandler = NonNullable<DrawerOptions['onOpenChange']>;
export type DrawerInitialFocusHandler = NonNullable<DrawerOptions['onInitialFocus']>;
export type DrawerFocusRestoreHandler = NonNullable<DrawerOptions['onFocusRestore']>;
export type DrawerUpdateHandler = NonNullable<DrawerOptions['onUpdate']>;
export type DrawerConnection = TerminalPopupConnection<DrawerState, DrawerEvent>;

export function createDrawer(options: DrawerOptions = {}): FacadeConnection<DrawerConnection> {
  return unwrap(tryCreateDrawer(options));
}

export function tryCreateDrawer(options: DrawerOptions = {}): Result<FacadeConnection<DrawerConnection>> {
  return createFacadeConnection(options, (normalized) => tryCreateDrawerConnection(normalized));
}

function tryCreateDrawerConnection(options: DrawerOptions): Result<DrawerConnection> {
  const side = options.side ?? 'bottom';
  return createTerminalPopup<DrawerState, DrawerEvent, DrawerCommand>({
    controlled: options.open !== undefined,
    initial: tryCreateDrawerState(options.open ?? options.defaultOpen ?? false, side),
    reducer: applyDrawerEvent,
    create: (open, state) => tryCreateDrawerState(open, state.side),
    read: (state) => state.open,
    close: 'close',
    interaction: options,
    onOpenChange: options.onOpenChange,
    command: (command) => command.type === 'request-initial-focus' ? options.onInitialFocus?.() : options.onFocusRestore?.(),
    onUpdate: options.onUpdate,
  });
}
