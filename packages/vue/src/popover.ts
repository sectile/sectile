import { createPopover, type PopoverConnection, type PopoverOptions } from '@sectile/dom/popover';
import {
  createPopupComponents,
  type PopupFactoryOptions,
  type PopupPartProps,
  type PopupPortalProps,
  type PopupRootProps,
  type PopupRootSlotProps,
} from './internal/popup.js';

const parts = createPopupComponents({
  scope: 'popover', role: 'dialog', modal: false, triggerMode: 'click', closeOnInteractOutside: true, positioned: true,
  create: (options: PopupFactoryOptions): PopoverConnection => createPopover(options as PopoverOptions),
});

export const PopoverRoot = parts.Root;
export type PopoverOpenChangeHandler = PopupFactoryOptions['onOpenChange'];
export type PopoverPositionChangeHandler = NonNullable<PopupFactoryOptions['onPositionChange']>;
export type PopoverInteractOutsideHandler = NonNullable<PopupFactoryOptions['onInteractOutside']>;
export const PopoverTrigger = parts.Trigger;
export const PopoverAnchor = parts.Anchor;
export const PopoverPortal = parts.Portal;
export const PopoverContent = parts.Content;
export const PopoverTitle = parts.Title;
export const PopoverDescription = parts.Description;
export const PopoverClose = parts.Close;
export const PopoverArrow = parts.Arrow;
export type PopoverRootProps = PopupRootProps;
export type PopoverRootSlotProps = PopupRootSlotProps;
export type PopoverPartProps = PopupPartProps;
export type PopoverPortalProps = PopupPortalProps;
