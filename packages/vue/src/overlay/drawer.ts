import { createDrawer, type DrawerConnection, type DrawerOptions, type DrawerSide, type PopupCloseReason } from '@sectile/dom/drawer';
export type { PopupCloseReason } from '@sectile/dom/drawer';
import type { DefineSetupFnComponent, EmitsToProps, PublicProps, SlotsType, VNodeChild } from 'vue';
import type { InteractOutsideEvent } from '@sectile/dom/drawer';
import {
  createPopupComponents,
  type PopupFactoryOptions,
  type PopupPartProps,
  type PopupPortalProps,
  type PopupRootProps,
  type PopupRootSlotProps,
} from './popup.js';

const parts = createPopupComponents({
  scope: 'drawer',
  role: 'dialog',
  modal: true,
  triggerMode: 'click',
  closeOnInteractOutside: true,
  directional: true,
  defaultSide: 'bottom',
  inlinePresentation: true,
  create: (options: PopupFactoryOptions): DrawerConnection => createDrawer(options as DrawerOptions),
});

type DrawerEmits = { 'update:open': [open: boolean]; closeRequest: [reason: PopupCloseReason]; afterClose: []; interactOutside: [event: InteractOutsideEvent] };
type Props = DrawerRootProps & PublicProps & EmitsToProps<DrawerEmits>;
type Instance = InstanceType<DefineSetupFnComponent<DrawerRootProps, DrawerEmits, SlotsType<{ default: (state: DrawerRootSlotProps) => VNodeChild }>>>;
export const DrawerRoot: new (props: Props) => Omit<Instance, '$props'> & { readonly $props: Props; requestClose(): void } = parts.Root as unknown as new (props: Props) => Omit<Instance, '$props'> & { readonly $props: Props; requestClose(): void };
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
export type DrawerPresentation = 'overlay' | 'inline';
export type DrawerRootProps = Omit<PopupRootProps,
  'align' | 'sideOffset' | 'collisionPadding' | 'collisionBoundary' | 'avoidCollisions' |
  'arrowPadding' | 'hideWhenDetached' | 'position' | 'strategy' | 'tracking' |
  'open' | 'defaultOpen' | 'unmountOnExit'
> & {
  readonly side?: DrawerSide;
  readonly swipeToDismiss?: boolean;
  readonly swipeThreshold?: number;
  readonly swipeVelocityThreshold?: number;
} & (
  | { readonly presentation?: 'overlay'; readonly open?: boolean; readonly defaultOpen?: boolean; readonly unmountOnExit?: boolean }
  | { readonly presentation: 'inline'; readonly open?: false; readonly defaultOpen?: false; readonly unmountOnExit: false }
);
export type DrawerRootSlotProps = PopupRootSlotProps & { readonly placement: DrawerPresentation };
export type DrawerPartProps = PopupPartProps;
export type DrawerPortalProps = PopupPortalProps;
export type { DrawerSide };
