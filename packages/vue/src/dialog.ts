import { createDialog, type DialogConnection, type DialogOptions } from '@sectile/dom/dialog';
import {
  createPopupComponents,
  type PopupFactoryOptions,
  type PopupPartProps,
  type PopupPortalProps,
  type PopupRootProps,
  type PopupRootSlotProps,
} from './internal/popup.js';

const parts = createPopupComponents({
  scope: 'dialog', role: 'dialog', modal: true, triggerMode: 'click',
  create: (options: PopupFactoryOptions): DialogConnection => createDialog(options as DialogOptions),
});

export const DialogRoot = parts.Root;
export type DialogOpenChangeHandler = PopupFactoryOptions['onOpenChange'];
export type DialogPositionChangeHandler = NonNullable<PopupFactoryOptions['onPositionChange']>;
export const DialogTrigger = parts.Trigger;
export const DialogPortal = parts.Portal;
export const DialogOverlay = parts.Overlay;
export const DialogContent = parts.Content;
export const DialogTitle = parts.Title;
export const DialogDescription = parts.Description;
export const DialogClose = parts.Close;
export type DialogRootProps = PopupRootProps;
export type DialogRootSlotProps = PopupRootSlotProps;
export type DialogPartProps = PopupPartProps;
export type DialogPortalProps = PopupPortalProps;
