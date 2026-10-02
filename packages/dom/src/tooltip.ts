import { createFacadeConnection, type FacadeConnection } from '@sectile/core/adapter-runtime';
import { unwrap } from '@sectile/core/result';
import type { Result } from '@sectile/core';
import { applyTooltipEvent, tryCreateTooltipState, type TooltipCommand, type TooltipEvent, type TooltipState } from '@sectile/core/tooltip';
import type { PositionAlign, PositionOptions, PositionSide } from './position.js';
import { PositionedPopup } from './overlay/positioned-popup.js';
import { createDOMPopup, readPopupOpen, type DOMPopupConnection } from './overlay/popup/connection.js';

export type TooltipSide = PositionSide;
export type TooltipAlign = PositionAlign;
export interface TooltipOptions extends PositionOptions {
  readonly root: HTMLElement;
  readonly trigger?: HTMLElement;
  readonly anchor?: HTMLElement;
  readonly arrow?: HTMLElement;
  readonly id?: string;
  readonly open?: boolean;
  readonly defaultOpen?: boolean;
  readonly disabled?: boolean;
  readonly onOpenChange?: (open: boolean) => void;
  readonly onUpdate?: () => void;
  readonly manageVisibility?: boolean;
  readonly position?: boolean;
}

export type TooltipOpenChangeHandler = NonNullable<TooltipOptions['onOpenChange']>;
export type TooltipUpdateHandler = NonNullable<TooltipOptions['onUpdate']>;
export interface TooltipConnection extends DOMPopupConnection<TooltipState, TooltipEvent> {
  updatePosition(): void;
}
export function createTooltip(o: TooltipOptions): FacadeConnection<TooltipConnection> {
  return unwrap(tryCreateTooltip(o));
}

export function tryCreateTooltip(o: TooltipOptions): Result<FacadeConnection<TooltipConnection>> {
  return createFacadeConnection(o, tryCreateTooltipConnection);
}

function tryCreateTooltipConnection(o: TooltipOptions): Result<TooltipConnection> {
  let connection: PositionedPopup<TooltipState, TooltipEvent> | undefined;
  const popup = createDOMPopup<TooltipState, TooltipEvent, TooltipCommand>({
    root: o.root,
    trigger: o.trigger,
    role: 'tooltip',
    controlled: o.open !== undefined,
    initial: tryCreateTooltipState(o.open ?? o.defaultOpen ?? false),
    open: 'open', toggle: 'toggle', close: 'close',
    reducer: applyTooltipEvent,
    create: tryCreateTooltipState,
    read: readPopupOpen,
    interaction: o,
    triggerMode: 'focus-hover',
    manageVisibility: o.manageVisibility,
    tooltipID: o.id,
    onOpenChange: o.onOpenChange,
    onUpdate: () => { connection?.updatePosition(); o.onUpdate?.(); },
  });
  if (!popup.ok) return popup;
  connection = new PositionedPopup<TooltipState, TooltipEvent>(popup.value, o);
  connection.updatePosition();
  return { ok: true, value: connection };
}
