import { createFacadeConnection, type FacadeConnection } from './internal/facade.js';
import { unwrap } from '@sectile/core/result';
import type { Result } from '@sectile/core';
import { applyTooltipEvent, tryCreateTooltipState, type TooltipCommand, type TooltipEvent, type TooltipState } from '@sectile/core/tooltip';
import { createTerminalPopup, type TerminalPopupConnection } from './internal/popup-control.js';
export interface TooltipOptions { readonly open?: boolean; readonly defaultOpen?: boolean; readonly disabled?: boolean; readonly onOpenChange?: (open: boolean) => void; readonly onUpdate?: () => void }
export type TooltipConnection = TerminalPopupConnection<TooltipState, TooltipEvent>;
export function createTooltip(o: TooltipOptions = {}): FacadeConnection<TooltipConnection> {
  return unwrap(tryCreateTooltip(o));
}

export function tryCreateTooltip(o: TooltipOptions = {}): Result<FacadeConnection<TooltipConnection>> {
  return createFacadeConnection(o, (o) => tryCreateTooltipConnection(o));
}

function tryCreateTooltipConnection(o: TooltipOptions = {}): Result<TooltipConnection> { return createTerminalPopup<TooltipState, TooltipEvent, TooltipCommand>({ controlled: o.open !== undefined, initial: tryCreateTooltipState(o.open ?? o.defaultOpen ?? false), reducer: applyTooltipEvent, create: tryCreateTooltipState, read: (s) => s.open, close: 'close', interaction: o, onOpenChange: o.onOpenChange, onUpdate: o.onUpdate }); }
