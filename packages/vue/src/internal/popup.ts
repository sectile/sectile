import {
  Fragment,
  Teleport,
  computed,
  defineComponent,
  h,
  inject,
  mergeProps,
  nextTick,
  onBeforeUnmount,
  provide,
  ref,
  shallowRef,
  watch,
  type Component,
  type ComputedRef,
  type PropType,
  type SlotsType,
  type VNodeChild,
} from 'vue';
import type {
  PositionBoundary,
  PositionOptions,
  PositionPadding,
  PositionStrategy,
  PositionTracking,
} from '@sectile/dom/position';
import type { InteractOutsideEvent, InteractOutsideHandler } from '@sectile/dom';
import { Primitive, type PrimitiveAs } from '../primitive.js';
import { useHostDirection, useHostId, useHostPortalTarget } from '../host-provider.js';
import { usePresence } from './presence.js';
import { useControlledStateInvariant } from './controlled-state.js';

export interface PopupConnection {
  getSnapshot(): { readonly revision: number };
  syncControlledValue(open: boolean): { readonly ok: boolean };
  handleEvent(event: 'open' | 'close' | 'toggle'): boolean;
  refresh(): void;
  disconnect(): void;
}

export interface PopupFactoryOptions extends PositionOptions {
  readonly root: HTMLElement;
  readonly trigger?: HTMLElement;
  readonly anchor?: HTMLElement;
  readonly arrow?: HTMLElement;
  readonly overlay?: HTMLElement;
  readonly handle?: HTMLElement;
  readonly open?: boolean;
  readonly defaultOpen?: boolean;
  readonly disabled?: boolean;
  readonly modal?: boolean;
  readonly label?: string;
  readonly labelledBy?: string;
  readonly describedBy?: string;
  readonly initialFocus?: HTMLElement;
  readonly autoFocus?: boolean;
  readonly restoreFocus?: boolean;
  readonly trapFocus?: boolean;
  readonly closeOnInteractOutside?: boolean;
  readonly interactOutsideExclusions?: readonly HTMLElement[];
  readonly onInteractOutside?: InteractOutsideHandler;
  readonly swipeToDismiss?: boolean;
  readonly swipeThreshold?: number;
  readonly swipeVelocityThreshold?: number;
  readonly onOpenChange: (open: boolean) => void;
  readonly onUpdate: () => void;
  readonly manageVisibility?: boolean;
}

export interface PopupComponentConfig {
  readonly scope: string;
  readonly role: 'dialog' | 'alertdialog' | 'tooltip';
  readonly modal: boolean;
  readonly triggerMode: 'click' | 'focus-hover';
  readonly closeOnInteractOutside?: boolean;
  readonly positioned?: boolean;
  readonly directional?: boolean;
  readonly defaultSide?: 'top' | 'right' | 'bottom' | 'left';
  create(options: PopupFactoryOptions): PopupConnection;
}

export interface PopupRootSlotProps {
  readonly open: boolean;
  readonly disabled: boolean;
}
export interface PopupRootProps extends PositionOptions {
  readonly open?: boolean;
  readonly defaultOpen?: boolean;
  readonly disabled?: boolean;
  readonly modal?: boolean;
  readonly label?: string;
  readonly initialFocus?: HTMLElement;
  readonly autoFocus?: boolean;
  readonly restoreFocus?: boolean;
  readonly trapFocus?: boolean;
  readonly closeOnInteractOutside?: boolean;
  readonly interactOutsideExclusions?: readonly HTMLElement[];
  readonly unmountOnExit?: boolean;
}
export interface PopupPartProps { readonly as?: PrimitiveAs; readonly asChild?: boolean }
export interface PopupPortalProps { readonly to?: string | HTMLElement; readonly disabled?: boolean; readonly defer?: boolean }

type PopupElementPart = 'trigger' | 'anchor' | 'arrow' | 'overlay' | 'handle' | 'content';

interface PopupContext {
  readonly open: ComputedRef<boolean>;
  readonly disabled: ComputedRef<boolean>;
  readonly modal: ComputedRef<boolean>;
  readonly unmountOnExit: ComputedRef<boolean>;
  readonly label: ComputedRef<string | undefined>;
  readonly contentID: string;
  readonly titleID: string;
  readonly descriptionID: string;
  readonly side: ComputedRef<'top' | 'right' | 'bottom' | 'left'>;
  readonly strategy: ComputedRef<PositionStrategy>;
  registerElement(part: PopupElementPart, element?: HTMLElement): void;
  activateTrigger(event?: Event): void;
  deactivateTrigger(event?: Event): void;
  close(): void;
  refresh(): void;
}

export function createPopupComponents(config: PopupComponentConfig): Readonly<{
  Root: Component;
  Trigger: Component;
  Anchor: Component;
  Portal: Component;
  Overlay: Component;
  Handle: Component;
  Content: Component;
  Title: Component;
  Description: Component;
  Close: Component;
  Arrow: Component;
}> {
  const contextKey = Symbol(`Sectile${config.scope}Root`);
  const useRoot = (part: string): PopupContext => {
    const context = inject<PopupContext>(contextKey);
    if (context === undefined) throw new TypeError(`${part} must be used inside ${config.scope} Root.`);
    return context;
  };
  const primitiveProps = {
    as: { type: [String, Object, Function] as PropType<PrimitiveAs>, default: 'div' },
    asChild: { type: Boolean, default: false },
  };
  const buttonProps = {
    as: { type: [String, Object, Function] as PropType<PrimitiveAs>, default: 'button' },
    asChild: { type: Boolean, default: false },
  };

  const Root = defineComponent({
    name: `Sectile${pascal(config.scope)}Root`,
    inheritAttrs: false,
    props: {
      open: { type: Boolean, default: undefined },
      defaultOpen: { type: Boolean, default: false },
      disabled: { type: Boolean, default: false },
      modal: { type: Boolean, default: config.modal },
      label: { type: String, default: undefined },
      initialFocus: { type: Object as PropType<HTMLElement>, default: undefined },
      autoFocus: { type: Boolean, default: true },
      restoreFocus: { type: Boolean, default: true },
      trapFocus: { type: Boolean, default: config.modal },
      closeOnInteractOutside: { type: Boolean, default: config.closeOnInteractOutside ?? false },
      interactOutsideExclusions: { type: Array as PropType<readonly HTMLElement[]>, default: undefined },
      side: { type: String as PropType<'top' | 'right' | 'bottom' | 'left'>, default: config.defaultSide ?? 'bottom' },
      swipeToDismiss: { type: Boolean, default: true },
      swipeThreshold: { type: Number, default: 80 },
      swipeVelocityThreshold: { type: Number, default: 0.5 },
      align: { type: String as PropType<'start' | 'center' | 'end'>, default: 'center' },
      sideOffset: { type: Number, default: 8 },
      collisionPadding: { type: [Number, Object] as PropType<PositionPadding>, default: 8 },
      collisionBoundary: { type: [String, Object] as PropType<PositionBoundary>, default: undefined },
      avoidCollisions: { type: Boolean, default: true },
      arrowPadding: { type: Number, default: 8 },
      hideWhenDetached: { type: Boolean, default: false },
      strategy: { type: String as PropType<PositionStrategy>, default: 'absolute' },
      tracking: { type: String as PropType<PositionTracking>, default: 'events' },
      unmountOnExit: { type: Boolean, default: false },
    },
    emits: {
      'update:open': (_open: boolean): boolean => true,
      interactOutside: (_event: InteractOutsideEvent): boolean => true,
    },
    slots: Object as SlotsType<{ default: (props: PopupRootSlotProps) => VNodeChild }>,
    setup(props, { emit, slots }) {
      const controlled = useControlledStateInvariant(`${config.scope}Root`, 'open', () => props.open);
      const localOpen = ref(controlled ? props.open as boolean : props.defaultOpen);
      const trigger = shallowRef<HTMLElement>();
      const anchor = shallowRef<HTMLElement>();
      const arrow = shallowRef<HTMLElement>();
      const overlay = shallowRef<HTMLElement>();
      const handle = shallowRef<HTMLElement>();
      const content = shallowRef<HTMLElement>();
      const connection = shallowRef<PopupConnection>();
      const id = useHostId();
      const contentID = `sectile-${config.scope}-${id}-content`;
      const titleID = `sectile-${config.scope}-${id}-title`;
      const descriptionID = `sectile-${config.scope}-${id}-description`;
      const open = computed(() => localOpen.value);
      const disabled = computed(() => props.disabled);
      const modal = computed(() => props.modal);
      const unmountOnExit = computed(() => props.unmountOnExit);
      const label = computed(() => props.label);
      const side = computed(() => props.side);
      const strategy = computed(() => props.strategy);
      const update = (): void => {
        if (connection.value === undefined) return;
        void connection.value.getSnapshot().revision;
      };
      const disconnect = (): void => {
        connection.value?.disconnect();
        connection.value = undefined;
      };
      const connect = (): void => {
        if (content.value === undefined) return;
        disconnect();
        connection.value = config.create({
          root: content.value,
          ...(trigger.value === undefined ? {} : { trigger: trigger.value }),
          ...(anchor.value === undefined ? {} : { anchor: anchor.value }),
          ...(arrow.value === undefined ? {} : { arrow: arrow.value }),
          ...(overlay.value === undefined ? {} : { overlay: overlay.value }),
          ...(handle.value === undefined ? {} : { handle: handle.value }),
          ...(controlled ? { open: props.open as boolean } : { defaultOpen: localOpen.value }),
          disabled: props.disabled,
          modal: props.modal,
          ...(props.label === undefined ? { labelledBy: titleID } : { label: props.label }),
          describedBy: descriptionID,
          ...(props.initialFocus === undefined ? {} : { initialFocus: props.initialFocus }),
          autoFocus: props.autoFocus,
          restoreFocus: props.restoreFocus,
          trapFocus: props.trapFocus,
          closeOnInteractOutside: props.closeOnInteractOutside,
          ...(props.interactOutsideExclusions === undefined ? {} : { interactOutsideExclusions: props.interactOutsideExclusions }),
          side: props.side,
          swipeToDismiss: props.swipeToDismiss,
          swipeThreshold: props.swipeThreshold,
          swipeVelocityThreshold: props.swipeVelocityThreshold,
          align: props.align,
          sideOffset: props.sideOffset,
          collisionPadding: props.collisionPadding,
          ...(props.collisionBoundary === undefined ? {} : { collisionBoundary: props.collisionBoundary }),
          avoidCollisions: props.avoidCollisions,
          arrowPadding: props.arrowPadding,
          hideWhenDetached: props.hideWhenDetached,
          strategy: props.strategy,
          tracking: props.tracking,
          manageVisibility: false,
          onOpenChange: (next) => {
            if (!controlled) localOpen.value = next;
            emit('update:open', next);
          },
          onInteractOutside: (event) => { emit('interactOutside', event); },
          onUpdate: update,
        });
        update();
      };
      let connectScheduled = false;
      let destroyed = false;
      const scheduleConnect = (): void => {
        if (connectScheduled || destroyed || (props.unmountOnExit && !localOpen.value)) return;
        connectScheduled = true;
        void nextTick(() => {
          connectScheduled = false;
          if (!destroyed) connect();
        });
      };
      const elements = { trigger, anchor, arrow, overlay, handle, content };
      const registerElement = (part: PopupElementPart, element?: HTMLElement): void => {
        const target = elements[part];
        if (target.value === element) return;
        target.value = element;
        if (content.value === undefined) disconnect();
        else scheduleConnect();
      };
      const activateTrigger = (event?: Event): void => {
        if (event?.defaultPrevented === true || connection.value !== undefined || props.disabled || localOpen.value) return;
        if (!controlled) localOpen.value = true;
        emit('update:open', true);
      };
      const deactivateTrigger = (event?: Event): void => {
        if (event?.defaultPrevented === true || connection.value !== undefined || !localOpen.value) return;
        if (!controlled) localOpen.value = false;
        emit('update:open', false);
      };
      watch(() => props.open, (next) => {
        if (!controlled || next === undefined) return;
        if (connection.value === undefined) {
          localOpen.value = next;
          return;
        }
        const result = connection.value.syncControlledValue(next);
        if (!result.ok) throw new TypeError(`${config.scope} controlled open state could not be synchronized.`);
        localOpen.value = next;
      });
      watch([
        () => props.disabled, () => props.modal, () => props.label, () => props.initialFocus,
        () => props.autoFocus, () => props.restoreFocus,
        () => props.trapFocus, () => props.closeOnInteractOutside, () => props.interactOutsideExclusions, () => props.side,
        () => props.swipeToDismiss, () => props.swipeThreshold, () => props.swipeVelocityThreshold, () => props.align,
        () => props.sideOffset, () => props.collisionPadding, () => props.collisionBoundary,
        () => props.avoidCollisions, () => props.arrowPadding, () => props.hideWhenDetached,
        () => props.strategy, () => props.tracking,
      ], connect);
      onBeforeUnmount(() => {
        destroyed = true;
        disconnect();
      });
      provide<PopupContext>(contextKey, {
        open, disabled, modal, unmountOnExit, label, contentID, titleID, descriptionID, side, strategy,
        registerElement, activateTrigger, deactivateTrigger,
        close: () => { connection.value?.handleEvent('close'); },
        refresh: () => { connection.value?.refresh(); },
      });
      return (): VNodeChild => h(Fragment as Component, null, slots['default']?.({ open: open.value, disabled: props.disabled }) ?? []);
    },
  });

  const Trigger = defineComponent({
    name: `Sectile${pascal(config.scope)}Trigger`, inheritAttrs: false, props: buttonProps,
    setup(props, { attrs, slots }) {
      const root = useRoot('Trigger');
      return (): VNodeChild => h(Primitive, mergeProps(attrs, {
        as: props.as, asChild: props.asChild,
        elementRef: (element: unknown) => { root.registerElement('trigger', element instanceof HTMLElement ? element : undefined); },
        ...(config.triggerMode === 'click'
          ? { onClick: root.activateTrigger }
          : { onFocus: root.activateTrigger, onBlur: root.deactivateTrigger, onMouseenter: root.activateTrigger, onMouseleave: root.deactivateTrigger }),
        type: props.as === 'button' ? 'button' : undefined,
        disabled: root.disabled.value,
        'aria-haspopup': config.role === 'tooltip' ? undefined : 'dialog',
        'aria-expanded': config.triggerMode === 'click' ? String(root.open.value) : undefined,
        'aria-controls': config.role === 'tooltip' ? undefined : root.contentID,
        'aria-describedby': config.role === 'tooltip' ? root.contentID : undefined,
        'data-scope': config.scope, 'data-part': 'trigger', 'data-state': root.open.value ? 'open' : 'closed',
      }), slots);
    },
  });

  const Content = defineComponent({
    name: `Sectile${pascal(config.scope)}Content`, inheritAttrs: false, props: primitiveProps,
    setup(props, { attrs, slots }) {
      const root = useRoot('Content');
      const direction = useHostDirection();
      const element = shallowRef<HTMLElement>();
      const present = usePresence(root.open, element);
      watch(present, async () => { await nextTick(); root.refresh(); }, { flush: 'post' });
      return (): VNodeChild => {
        if (root.unmountOnExit.value && !present.value) return null;
        return h(Primitive, mergeProps(attrs, {
          as: props.as, asChild: props.asChild,
          elementRef: (candidate: unknown) => {
            const node = candidate instanceof HTMLElement ? candidate : undefined;
            element.value = node;
            root.registerElement('content', node);
          },
          id: root.contentID, role: config.role, hidden: !present.value, dir: direction.value,
          style: config.positioned === true
            ? { position: root.strategy.value, visibility: element.value === undefined ? 'hidden' : undefined }
            : undefined,
          'aria-modal': config.role === 'tooltip' ? undefined : String(root.modal.value),
          'aria-label': root.label.value, 'aria-labelledby': root.label.value === undefined ? root.titleID : undefined, 'aria-describedby': root.descriptionID,
          'data-scope': config.scope, 'data-part': 'content', 'data-state': root.open.value ? 'open' : 'closed',
          'data-side': config.directional === true ? root.side.value : undefined,
          'data-swipe-direction': config.directional === true ? swipeDirection(root.side.value) : undefined,
        }), slots);
      };
    },
  });

  const Anchor = defineComponent({
    name: `Sectile${pascal(config.scope)}Anchor`, inheritAttrs: false, props: primitiveProps,
    setup(props, { attrs, slots }) {
      const root = useRoot('Anchor');
      return (): VNodeChild => h(Primitive, mergeProps(attrs, {
        as: props.as, asChild: props.asChild,
        elementRef: (element: unknown) => { root.registerElement('anchor', element instanceof HTMLElement ? element : undefined); },
        'data-scope': config.scope, 'data-part': 'anchor',
      }), slots);
    },
  });

  const Arrow = defineComponent({
    name: `Sectile${pascal(config.scope)}Arrow`, inheritAttrs: false, props: primitiveProps,
    setup(props, { attrs, slots }) {
      const root = useRoot('Arrow');
      return (): VNodeChild => h(Primitive, mergeProps(attrs, {
        as: props.as, asChild: props.asChild,
        elementRef: (element: unknown) => { root.registerElement('arrow', element instanceof HTMLElement ? element : undefined); },
        'aria-hidden': 'true', 'data-scope': config.scope, 'data-part': 'arrow',
      }), slots);
    },
  });

  const Overlay = defineComponent({
    name: `Sectile${pascal(config.scope)}Overlay`, inheritAttrs: false, props: primitiveProps,
    setup(props, { attrs, slots }) {
      const root = useRoot('Overlay');
      const element = shallowRef<HTMLElement>();
      const present = usePresence(root.open, element);
      return (): VNodeChild => {
        if (root.unmountOnExit.value && !present.value) return null;
        return h(Primitive, mergeProps(attrs, {
          as: props.as, asChild: props.asChild, elementRef: (candidate: unknown) => { const node = candidate instanceof HTMLElement ? candidate : undefined; element.value = node; root.registerElement('overlay', node); }, hidden: !present.value, 'aria-hidden': 'true',
          'data-scope': config.scope, 'data-part': 'overlay', 'data-state': root.open.value ? 'open' : 'closed',
          'data-side': config.directional === true ? root.side.value : undefined,
          'data-swipe-direction': config.directional === true ? swipeDirection(root.side.value) : undefined,
        }), slots);
      };
    },
  });

  const Handle = defineComponent({
    name: `Sectile${pascal(config.scope)}Handle`, inheritAttrs: false, props: primitiveProps,
    setup(props, { attrs, slots }) {
      const root = useRoot('Handle');
      return (): VNodeChild => h(Primitive, mergeProps(attrs, {
        as: props.as, asChild: props.asChild,
        elementRef: (candidate: unknown) => { root.registerElement('handle', candidate instanceof HTMLElement ? candidate : undefined); },
        'aria-hidden': 'true', 'data-scope': config.scope, 'data-part': 'handle',
        'data-state': root.open.value ? 'open' : 'closed',
        'data-side': config.directional === true ? root.side.value : undefined,
        'data-swipe-direction': config.directional === true ? swipeDirection(root.side.value) : undefined,
      }), slots);
    },
  });

  const Title = createLabelPart('Title', 'title', (root) => root.titleID);
  const Description = createLabelPart('Description', 'description', (root) => root.descriptionID);
  const Close = defineComponent({
    name: `Sectile${pascal(config.scope)}Close`, inheritAttrs: false, props: buttonProps,
    setup(props, { attrs, slots }) {
      const root = useRoot('Close');
      return (): VNodeChild => h(Primitive, mergeProps(attrs, {
        as: props.as, asChild: props.asChild, type: props.as === 'button' ? 'button' : undefined,
        'data-scope': config.scope, 'data-part': 'close', onClick: root.close,
      }), slots);
    },
  });
  const Portal = defineComponent({
    name: `Sectile${pascal(config.scope)}Portal`,
    inheritAttrs: false,
    props: {
      to: { type: [String, Object] as PropType<string | HTMLElement>, default: undefined },
      disabled: { type: Boolean, default: false },
      defer: { type: Boolean, default: false },
    },
    setup(props, { slots }) {
      const portalTarget = useHostPortalTarget();
      return (): VNodeChild => h(Teleport as Component, {
        to: props.to ?? portalTarget.value ?? 'body',
        disabled: props.disabled,
        defer: props.defer,
      }, slots['default']?.());
    },
  });

  function createLabelPart(name: string, part: string, id: (root: PopupContext) => string): Component {
    return defineComponent({
      name: `Sectile${pascal(config.scope)}${name}`, inheritAttrs: false, props: primitiveProps,
      setup(props, { attrs, slots }) {
        const root = useRoot(name);
        return (): VNodeChild => h(Primitive, mergeProps(attrs, {
          as: props.as, asChild: props.asChild, id: id(root), 'data-scope': config.scope, 'data-part': part,
        }), slots);
      },
    });
  }

  return Object.freeze({ Root, Trigger, Anchor, Portal, Overlay, Content, Handle, Title, Description, Close, Arrow });
}

export type { InteractOutsideEvent, InteractOutsideHandler };

function pascal(value: string): string {
  return value.split('-').map((part) => part[0]?.toUpperCase() + part.slice(1)).join('');
}

function swipeDirection(side: 'top' | 'right' | 'bottom' | 'left'): 'up' | 'right' | 'down' | 'left' {
  return side === 'top' ? 'up' : side === 'bottom' ? 'down' : side;
}
