import {
  Fragment,
  Teleport,
  computed,
  defineComponent,
  h,
  inject,
  mergeProps,
  onBeforeUnmount,
  onMounted,
  provide,
  ref,
  shallowRef,
  watch,
  type Component,
  type ComputedRef,
  type PropType,
  type ShallowRef,
  type SlotsType,
  type VNodeChild,
} from 'vue';
import type { AutoUpdateOptions, Boundary, ComputePositionReturn, Middleware, Padding, Strategy } from '@sectile/dom/popover';
import { Primitive, type PrimitiveAs } from '../primitive.js';

export interface PopupConnection {
  getSnapshot(): { readonly revision: number };
  syncControlledValue(open: boolean): { readonly ok: boolean };
  handleEvent(event: 'open' | 'close' | 'toggle'): boolean;
  disconnect(): void;
}

export interface PopupFactoryOptions {
  readonly root: HTMLElement;
  readonly trigger?: HTMLElement;
  readonly anchor?: HTMLElement;
  readonly arrow?: HTMLElement;
  readonly open?: boolean;
  readonly defaultOpen?: boolean;
  readonly disabled?: boolean;
  readonly modal?: boolean;
  readonly label?: string;
  readonly labelledBy?: string;
  readonly describedBy?: string;
  readonly autoFocus?: boolean;
  readonly restoreFocus?: boolean;
  readonly trapFocus?: boolean;
  readonly closeOnInteractOutside?: boolean;
  readonly side?: 'top' | 'right' | 'bottom' | 'left';
  readonly align?: 'start' | 'center' | 'end';
  readonly sideOffset?: number;
  readonly collisionPadding?: Padding;
  readonly collisionBoundary?: Boundary;
  readonly avoidCollisions?: boolean;
  readonly arrowPadding?: Padding;
  readonly hideWhenDetached?: boolean;
  readonly strategy?: Strategy;
  readonly middleware?: Middleware[];
  readonly autoUpdate?: boolean | AutoUpdateOptions;
  readonly onOpenChange: (open: boolean) => void;
  readonly onPositionChange?: (position: ComputePositionReturn) => void;
  readonly onUpdate: () => void;
}

export interface PopupComponentConfig {
  readonly scope: string;
  readonly role: 'dialog' | 'alertdialog' | 'tooltip';
  readonly modal: boolean;
  readonly triggerMode: 'click' | 'focus-hover';
  readonly closeOnInteractOutside?: boolean;
  create(options: PopupFactoryOptions): PopupConnection;
}

export interface PopupRootSlotProps {
  readonly open: boolean;
  readonly disabled: boolean;
}
export interface PopupRootProps {
  readonly open?: boolean;
  readonly defaultOpen?: boolean;
  readonly disabled?: boolean;
  readonly modal?: boolean;
  readonly label?: string;
  readonly autoFocus?: boolean;
  readonly restoreFocus?: boolean;
  readonly trapFocus?: boolean;
  readonly closeOnInteractOutside?: boolean;
  readonly side?: 'top' | 'right' | 'bottom' | 'left';
  readonly align?: 'start' | 'center' | 'end';
  readonly sideOffset?: number;
  readonly collisionPadding?: Padding;
  readonly collisionBoundary?: Boundary;
  readonly avoidCollisions?: boolean;
  readonly arrowPadding?: Padding;
  readonly hideWhenDetached?: boolean;
  readonly strategy?: Strategy;
  readonly middleware?: Middleware[];
  readonly autoUpdate?: boolean | AutoUpdateOptions;
}
export interface PopupPartProps { readonly as?: PrimitiveAs; readonly asChild?: boolean }
export interface PopupPortalProps { readonly to?: string | HTMLElement; readonly disabled?: boolean }

interface PopupContext {
  readonly open: ComputedRef<boolean>;
  readonly disabled: ComputedRef<boolean>;
  readonly modal: ComputedRef<boolean>;
  readonly contentID: string;
  readonly titleID: string;
  readonly descriptionID: string;
  readonly trigger: ShallowRef<HTMLElement | undefined>;
  readonly anchor: ShallowRef<HTMLElement | undefined>;
  readonly arrow: ShallowRef<HTMLElement | undefined>;
  readonly content: ShallowRef<HTMLElement | undefined>;
  connect(): void;
  disconnect(): void;
  close(): void;
}

let popupID = 0;

export function createPopupComponents(config: PopupComponentConfig): Readonly<{
  Root: Component;
  Trigger: Component;
  Anchor: Component;
  Portal: Component;
  Overlay: Component;
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
    props: {
      open: { type: Boolean, default: undefined },
      defaultOpen: { type: Boolean, default: false },
      disabled: { type: Boolean, default: false },
      modal: { type: Boolean, default: config.modal },
      label: { type: String, default: undefined },
      autoFocus: { type: Boolean, default: true },
      restoreFocus: { type: Boolean, default: true },
      trapFocus: { type: Boolean, default: config.modal },
      closeOnInteractOutside: { type: Boolean, default: config.closeOnInteractOutside ?? false },
      side: { type: String as PropType<'top' | 'right' | 'bottom' | 'left'>, default: 'bottom' },
      align: { type: String as PropType<'start' | 'center' | 'end'>, default: 'center' },
      sideOffset: { type: Number, default: 8 },
      collisionPadding: { type: [Number, Object] as PropType<Padding>, default: 8 },
      collisionBoundary: { type: [String, Object, Array] as PropType<Boundary>, default: undefined },
      avoidCollisions: { type: Boolean, default: true },
      arrowPadding: { type: [Number, Object] as PropType<Padding>, default: 8 },
      hideWhenDetached: { type: Boolean, default: true },
      strategy: { type: String as PropType<Strategy>, default: 'fixed' },
      middleware: { type: Array as PropType<Middleware[]>, default: undefined },
      autoUpdate: { type: [Boolean, Object] as PropType<boolean | AutoUpdateOptions>, default: undefined },
    },
    emits: {
      'update:open': (_open: boolean): boolean => true,
      'position-change': (_position: ComputePositionReturn): boolean => true,
    },
    slots: Object as SlotsType<{ default: (props: PopupRootSlotProps) => VNodeChild }>,
    setup(props, { emit, slots }) {
      const controlled = props.open !== undefined;
      const localOpen = ref(controlled ? props.open as boolean : props.defaultOpen);
      const trigger = shallowRef<HTMLElement>();
      const anchor = shallowRef<HTMLElement>();
      const arrow = shallowRef<HTMLElement>();
      const content = shallowRef<HTMLElement>();
      const connection = shallowRef<PopupConnection>();
      const id = ++popupID;
      const contentID = `sectile-${config.scope}-${id}-content`;
      const titleID = `sectile-${config.scope}-${id}-title`;
      const descriptionID = `sectile-${config.scope}-${id}-description`;
      const open = computed(() => localOpen.value);
      const disabled = computed(() => props.disabled);
      const modal = computed(() => props.modal);
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
          ...(controlled ? { open: props.open as boolean } : { defaultOpen: localOpen.value }),
          disabled: props.disabled,
          modal: props.modal,
          ...(props.label === undefined ? { labelledBy: titleID } : { label: props.label }),
          describedBy: descriptionID,
          autoFocus: props.autoFocus,
          restoreFocus: props.restoreFocus,
          trapFocus: props.trapFocus,
          closeOnInteractOutside: props.closeOnInteractOutside,
          side: props.side,
          align: props.align,
          sideOffset: props.sideOffset,
          collisionPadding: props.collisionPadding,
          ...(props.collisionBoundary === undefined ? {} : { collisionBoundary: props.collisionBoundary }),
          avoidCollisions: props.avoidCollisions,
          arrowPadding: props.arrowPadding,
          hideWhenDetached: props.hideWhenDetached,
          strategy: props.strategy,
          ...(props.middleware === undefined ? {} : { middleware: props.middleware }),
          ...(props.autoUpdate === undefined ? {} : { autoUpdate: props.autoUpdate }),
          onOpenChange: (next) => {
            if (!controlled) localOpen.value = next;
            emit('update:open', next);
          },
          onPositionChange: (position) => { emit('position-change', position); },
          onUpdate: update,
        });
        update();
      };
      watch(() => props.open, (next) => {
        if (!controlled || next === undefined || connection.value === undefined) return;
        const result = connection.value.syncControlledValue(next);
        if (!result.ok) throw new TypeError(`${config.scope} controlled open state could not be synchronized.`);
        localOpen.value = next;
      });
      onBeforeUnmount(disconnect);
      provide<PopupContext>(contextKey, {
        open, disabled, modal, contentID, titleID, descriptionID, trigger, anchor, arrow, content, connect, disconnect,
        close: () => { connection.value?.handleEvent('close'); },
      });
      return (): VNodeChild => h(Fragment as Component, null, slots['default']?.({ open: open.value, disabled: props.disabled }) ?? []);
    },
  });

  const Trigger = defineComponent({
    name: `Sectile${pascal(config.scope)}Trigger`, inheritAttrs: false, props: buttonProps,
    setup(props, { attrs, slots }) {
      const root = useRoot('Trigger');
      onMounted(root.connect);
      return (): VNodeChild => h(Primitive, mergeProps(attrs, {
        as: props.as, asChild: props.asChild,
        elementRef: (element: unknown) => { root.trigger.value = element instanceof HTMLElement ? element : undefined; },
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
      onMounted(root.connect);
      onBeforeUnmount(root.disconnect);
      return (): VNodeChild => h(Primitive, mergeProps(attrs, {
        as: props.as, asChild: props.asChild,
        elementRef: (element: unknown) => { root.content.value = element instanceof HTMLElement ? element : undefined; },
        id: root.contentID, role: config.role, hidden: !root.open.value,
        'aria-modal': config.role === 'tooltip' ? undefined : String(root.modal.value),
        'aria-labelledby': root.titleID, 'aria-describedby': root.descriptionID,
        'data-scope': config.scope, 'data-part': 'content', 'data-state': root.open.value ? 'open' : 'closed',
      }), slots);
    },
  });

  const Anchor = defineComponent({
    name: `Sectile${pascal(config.scope)}Anchor`, inheritAttrs: false, props: primitiveProps,
    setup(props, { attrs, slots }) {
      const root = useRoot('Anchor');
      onMounted(root.connect);
      return (): VNodeChild => h(Primitive, mergeProps(attrs, {
        as: props.as, asChild: props.asChild,
        elementRef: (element: unknown) => { root.anchor.value = element instanceof HTMLElement ? element : undefined; },
        'data-scope': config.scope, 'data-part': 'anchor',
      }), slots);
    },
  });

  const Arrow = defineComponent({
    name: `Sectile${pascal(config.scope)}Arrow`, inheritAttrs: false, props: primitiveProps,
    setup(props, { attrs, slots }) {
      const root = useRoot('Arrow');
      onMounted(root.connect);
      return (): VNodeChild => h(Primitive, mergeProps(attrs, {
        as: props.as, asChild: props.asChild,
        elementRef: (element: unknown) => { root.arrow.value = element instanceof HTMLElement ? element : undefined; },
        'aria-hidden': 'true', 'data-scope': config.scope, 'data-part': 'arrow',
      }), slots);
    },
  });

  const Overlay = defineComponent({
    name: `Sectile${pascal(config.scope)}Overlay`, inheritAttrs: false, props: primitiveProps,
    setup(props, { attrs, slots }) {
      const root = useRoot('Overlay');
      return (): VNodeChild => h(Primitive, mergeProps(attrs, {
        as: props.as, asChild: props.asChild, hidden: !root.open.value, 'aria-hidden': 'true',
        'data-scope': config.scope, 'data-part': 'overlay', 'data-state': root.open.value ? 'open' : 'closed',
        onClick: (event: MouseEvent) => { if (event.target === event.currentTarget) root.close(); },
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
    props: { to: { type: [String, Object] as PropType<string | HTMLElement>, default: 'body' }, disabled: { type: Boolean, default: false } },
    setup(props, { slots }) {
      return (): VNodeChild => h(Teleport as Component, { to: props.to, disabled: props.disabled }, slots['default']?.());
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

  return Object.freeze({ Root, Trigger, Anchor, Portal, Overlay, Content, Title, Description, Close, Arrow });
}

function pascal(value: string): string {
  return value.split('-').map((part) => part[0]?.toUpperCase() + part.slice(1)).join('');
}
