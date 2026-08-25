import { createDrawer, type DrawerConnection, type DrawerOptions, type DrawerSide } from '@sectile/dom/drawer';
import {
  createPopupComponents,
  type PopupFactoryOptions,
  type PopupPartProps,
  type PopupPortalProps,
  type PopupRootProps,
  type PopupRootSlotProps,
} from './internal/popup.js';

const parts = createPopupComponents({
  scope: 'drawer',
  role: 'dialog',
  modal: true,
  triggerMode: 'click',
  closeOnInteractOutside: true,
  directional: true,
  defaultSide: 'bottom',
  create: (options: PopupFactoryOptions): DrawerConnection => createDrawer(options as DrawerOptions),
});

export const DrawerRoot = parts.Root;
export const DrawerTrigger = parts.Trigger;
export const DrawerPortal = parts.Portal;
export const DrawerOverlay = parts.Overlay;
export const DrawerContent = parts.Content;
export const DrawerHandle = parts.Handle;
export const DrawerTitle = parts.Title;
export const DrawerDescription = parts.Description;
export const DrawerClose = parts.Close;

export type DrawerOpenChangeHandler = PopupFactoryOptions['onOpenChange'];
export type DrawerInteractOutsideHandler = NonNullable<PopupFactoryOptions['onInteractOutside']>;
export type DrawerRootProps = Omit<PopupRootProps,
  'align' | 'sideOffset' | 'collisionPadding' | 'collisionBoundary' | 'avoidCollisions' |
  'arrowPadding' | 'hideWhenDetached' | 'strategy' | 'middleware' | 'autoUpdate'
> & {
  readonly side?: DrawerSide;
  readonly swipeToDismiss?: boolean;
  readonly swipeThreshold?: number;
  readonly swipeVelocityThreshold?: number;
};
export type DrawerRootSlotProps = PopupRootSlotProps;
export type DrawerPartProps = PopupPartProps;
export type DrawerPortalProps = PopupPortalProps;
export type { DrawerSide };
