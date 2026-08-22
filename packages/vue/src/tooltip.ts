import { createTooltip, type TooltipConnection, type TooltipOptions } from '@sectile/dom/tooltip';
import {
  createPopupComponents,
  type PopupFactoryOptions,
  type PopupPartProps,
  type PopupPortalProps,
  type PopupRootProps,
  type PopupRootSlotProps,
} from './internal/popup.js';

const parts = createPopupComponents({
  scope: 'tooltip', role: 'tooltip', modal: false, triggerMode: 'focus-hover',
  create: (options: PopupFactoryOptions): TooltipConnection => {
    const {
      modal: _modal,
      label: _label,
      labelledBy: _labelledBy,
      describedBy: _describedBy,
      autoFocus: _autoFocus,
      restoreFocus: _restoreFocus,
      trapFocus: _trapFocus,
      ...tooltipOptions
    } = options;
    return createTooltip({ ...tooltipOptions, id: options.root.id } as TooltipOptions);
  },
});

export const TooltipRoot = parts.Root;
export const TooltipTrigger = parts.Trigger;
export const TooltipPortal = parts.Portal;
export const TooltipContent = parts.Content;
export type TooltipRootProps = Pick<PopupRootProps, 'open' | 'defaultOpen' | 'disabled'>;
export type TooltipRootSlotProps = PopupRootSlotProps;
export type TooltipPartProps = PopupPartProps;
export type TooltipPortalProps = PopupPortalProps;
