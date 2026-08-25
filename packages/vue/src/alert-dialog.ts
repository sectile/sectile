import { createAlertDialog, type AlertDialogConnection, type AlertDialogOptions } from '@sectile/dom/alert-dialog';
import {
  createPopupComponents,
  type PopupFactoryOptions,
  type PopupPartProps,
  type PopupPortalProps,
  type PopupRootProps,
  type PopupRootSlotProps,
} from './internal/popup.js';

const parts = createPopupComponents({
  scope: 'alert-dialog', role: 'alertdialog', modal: true, triggerMode: 'click',
  create: (options: PopupFactoryOptions): AlertDialogConnection => {
    const { modal: _modal, ...alertOptions } = options;
    return createAlertDialog(alertOptions as AlertDialogOptions);
  },
});

export const AlertDialogRoot = parts.Root;
export type AlertDialogOpenChangeHandler = PopupFactoryOptions['onOpenChange'];
export type AlertDialogPositionChangeHandler = NonNullable<PopupFactoryOptions['onPositionChange']>;
export type AlertDialogInteractOutsideHandler = NonNullable<PopupFactoryOptions['onInteractOutside']>;
export const AlertDialogTrigger = parts.Trigger;
export const AlertDialogPortal = parts.Portal;
export const AlertDialogOverlay = parts.Overlay;
export const AlertDialogContent = parts.Content;
export const AlertDialogTitle = parts.Title;
export const AlertDialogDescription = parts.Description;
export const AlertDialogClose = parts.Close;
export type AlertDialogRootProps = Omit<PopupRootProps, 'modal'>;
export type AlertDialogRootSlotProps = PopupRootSlotProps;
export type AlertDialogPartProps = PopupPartProps;
export type AlertDialogPortalProps = PopupPortalProps;
