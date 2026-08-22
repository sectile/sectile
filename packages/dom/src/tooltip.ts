import type { Result } from '@sectile/core';
import { applyTooltipEvent, createTooltipState, type TooltipCommand, type TooltipEvent, type TooltipState } from '@sectile/core/tooltip';
import { createDOMPopup, type DOMPopupConnection } from './internal/popup-control.js';

export interface TooltipOptions { readonly root: HTMLElement; readonly trigger?: HTMLElement; readonly id?: string; readonly open?: boolean; readonly defaultOpen?: boolean; readonly disabled?: boolean; readonly onOpenChange?: (open: boolean) => void; readonly onUpdate?: () => void }
export type TooltipConnection = DOMPopupConnection<TooltipState, TooltipEvent>;
export function createTooltip(o: TooltipOptions): Result<TooltipConnection> {
  return createDOMPopup<TooltipState, TooltipEvent, TooltipCommand>({ root: o.root, ...(o.trigger === undefined ? {} : { trigger: o.trigger }), role: 'tooltip', controlled: o.open !== undefined, initial: createTooltipState(o.open ?? o.defaultOpen ?? false), open: 'open', toggle: 'toggle', close: 'close', reducer: applyTooltipEvent, create: createTooltipState, read: (s) => s.open, interaction: o, triggerMode: 'focus-hover', ...(o.id === undefined ? {} : { tooltipID: o.id }), onOpenChange: o.onOpenChange, onUpdate: o.onUpdate });
}
