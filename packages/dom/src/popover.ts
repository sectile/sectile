import { applyPopoverEvent, tryCreatePopoverState, type PopoverCommand, type PopoverEvent, type PopoverState } from '@sectile/core/popover';
import { unwrap } from '@sectile/core/result';
import type { Result } from '@sectile/core';
import { createFacadeConnection, type FacadeConnection } from '@sectile/core/adapter-runtime';
import type { PositionAlign, PositionOptions, PositionSide } from './position.js';
import { PositionedPopup } from './overlay/positioned-popup.js';
import { createDOMPopup, readPopupOpen, type DOMPopupConnection } from './overlay/popup/connection.js';
import type { InteractOutsideHandler } from './interact-outside.js';

export type { InteractOutsideEvent, InteractOutsideHandler } from './interact-outside.js';

export type PopoverSide = PositionSide;
export type PopoverAlign = PositionAlign;
export interface PopoverOptions extends PositionOptions {
  readonly root: HTMLElement;
  readonly trigger?: HTMLElement;
  readonly anchor?: HTMLElement;
  readonly arrow?: HTMLElement;
  readonly open?: boolean;
  readonly defaultOpen?: boolean;
  readonly disabled?: boolean;
  readonly modal?: boolean;
  readonly label?: string;
  readonly labelledBy?: string;
  readonly describedBy?: string;
  readonly initialFocus?: HTMLElement;
  readonly autoFocus?: boolean;
  readonly restoreFocus?: boolean;
  readonly trapFocus?: boolean;
  readonly closeOnInteractOutside?: boolean;
  readonly interactOutsideExclusions?: readonly HTMLElement[];
  readonly onInteractOutside?: InteractOutsideHandler;
  readonly onOpenChange?: (open: boolean) => void;
  readonly onInitialFocus?: () => void;
  readonly onFocusRestore?: () => void;
  readonly onUpdate?: () => void;
  readonly manageVisibility?: boolean;
  readonly position?: boolean;
}

export type PopoverOpenChangeHandler = NonNullable<PopoverOptions['onOpenChange']>;
export type PopoverInitialFocusHandler = NonNullable<PopoverOptions['onInitialFocus']>;
export type PopoverFocusRestoreHandler = NonNullable<PopoverOptions['onFocusRestore']>;
export type PopoverInteractOutsideHandler = NonNullable<PopoverOptions['onInteractOutside']>;
export type PopoverUpdateHandler = NonNullable<PopoverOptions['onUpdate']>;
export interface PopoverConnection extends DOMPopupConnection<PopoverState, PopoverEvent> {
  updatePosition(): void;
}

export function createPopover(options: PopoverOptions): FacadeConnection<PopoverConnection> {
  return unwrap(tryCreatePopover(options));
}

export function tryCreatePopover(options: PopoverOptions): Result<FacadeConnection<PopoverConnection>> {
  return createFacadeConnection(options, tryCreatePopoverConnection);
}

function tryCreatePopoverConnection(options: PopoverOptions): Result<PopoverConnection> {
  let connection: PositionedPopup<PopoverState, PopoverEvent> | undefined;
  const modal = options.modal ?? false;
  const popup = createDOMPopup<PopoverState, PopoverEvent, PopoverCommand>({
    root: options.root,
    trigger: options.trigger,
    role: 'dialog',
    modal,
    label: options.label,
    labelledBy: options.labelledBy,
    describedBy: options.describedBy,
    controlled: options.open !== undefined,
    initial: tryCreatePopoverState(options.open ?? options.defaultOpen ?? false),
    open: 'open', toggle: 'toggle', close: 'close',
    reducer: applyPopoverEvent,
    create: tryCreatePopoverState,
    read: readPopupOpen,
    interaction: options,
    initialFocus: options.initialFocus,
    autoFocus: options.autoFocus ?? false,
    restoreFocus: options.restoreFocus ?? true,
    trapFocus: options.trapFocus ?? modal,
    closeOnInteractOutside: options.closeOnInteractOutside ?? true,
    interactOutsideExclusions: options.interactOutsideExclusions,
    onInteractOutside: options.onInteractOutside,
    manageVisibility: options.manageVisibility,
    onOpenChange: options.onOpenChange,
    command: (command) => command.type === 'request-initial-focus' ? options.onInitialFocus?.() : options.onFocusRestore?.(),
    onUpdate: () => { connection?.updatePosition(); options.onUpdate?.(); },
  });
  if (!popup.ok) return popup;
  connection = new PositionedPopup<PopoverState, PopoverEvent>(popup.value, options);
  connection.updatePosition();
  return { ok: true, value: connection };
}
