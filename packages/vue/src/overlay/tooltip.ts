import { createTooltip, getTooltipTriggerAttributes, type TooltipConnection, type TooltipOptions, type PopupCloseReason, type InteractOutsideEvent } from '@sectile/dom/tooltip';
import type { DefineSetupFnComponent, EmitsToProps, PublicProps, SlotsType, VNodeChild } from 'vue';
import {
  createPopupComponents,
  type PopupFactoryOptions,
  type PopupPartProps,
  type PopupPortalProps,
  type PopupRootProps,
  type PopupRootSlotProps,
  type PopupRootExpose,
} from './popup.js';

const parts = createPopupComponents({
  scope: 'tooltip', role: 'tooltip', modal: false, triggerMode: 'focus-hover', positioned: true,
  describeTrigger: (describedBy, id, active) => getTooltipTriggerAttributes({ describedBy, id, active })['aria-describedby'],
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

export type TooltipRootEmits = { 'update:open': [open: boolean]; afterClose: []; closeRequest: [reason: PopupCloseReason]; interactOutside: [event: InteractOutsideEvent] };
type TooltipEmits = TooltipRootEmits;
type Props = TooltipRootProps & PublicProps & EmitsToProps<TooltipEmits>;
type Instance = InstanceType<DefineSetupFnComponent<TooltipRootProps, TooltipEmits, SlotsType<{ default: (state: TooltipRootSlotProps) => VNodeChild }>>>;
export const TooltipRoot: new (props: Props) => Omit<Instance, '$props'> & { readonly $props: Props } & TooltipRootExpose = parts.Root as unknown as new (props: Props) => Omit<Instance, '$props'> & { readonly $props: Props } & TooltipRootExpose;
export type TooltipOpenChangeHandler = PopupFactoryOptions['onOpenChange'];
export const TooltipTrigger = parts.Trigger;
export const TooltipPortal = parts.Portal;
export const TooltipContent = parts.Content;
export const TooltipArrow = parts.Arrow;
export interface TooltipRootProps {
  readonly open?: PopupRootProps['open']; readonly defaultOpen?: PopupRootProps['defaultOpen'];
  readonly disabled?: PopupRootProps['disabled']; readonly closeOnEscape?: PopupRootProps['closeOnEscape'];
  readonly position?: PopupRootProps['position']; readonly side?: PopupRootProps['side'];
  readonly align?: PopupRootProps['align']; readonly sideOffset?: PopupRootProps['sideOffset'];
  readonly collisionPadding?: PopupRootProps['collisionPadding']; readonly collisionBoundary?: PopupRootProps['collisionBoundary'];
  readonly avoidCollisions?: PopupRootProps['avoidCollisions']; readonly arrowPadding?: PopupRootProps['arrowPadding'];
  readonly hideWhenDetached?: PopupRootProps['hideWhenDetached']; readonly strategy?: PopupRootProps['strategy'];
  readonly tracking?: PopupRootProps['tracking']; readonly unmountOnExit?: PopupRootProps['unmountOnExit'];
}
export type TooltipRootSlotProps = PopupRootSlotProps;
export type TooltipRootExpose = PopupRootExpose;
export type TooltipPartProps = PopupPartProps;
export type TooltipPortalProps = PopupPortalProps;
