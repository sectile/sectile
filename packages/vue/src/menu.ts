import {
  Fragment, computed, defineComponent, h, inject, mergeProps, nextTick, onBeforeUnmount, onMounted, provide,
  shallowRef, watch, type Component, type ComputedRef, type PropType, type SlotsType, type VNodeChild,
} from 'vue';
import { createMenu, type MenuConnection, type MenuItemDefinition, type MenuPolicies } from '@sectile/dom/menu';
import { createMenuButton } from '@sectile/dom/menu-button';
import { createMenubar } from '@sectile/dom/menubar';
import { createNavigationMenu } from '@sectile/dom/navigation-menu';
import type {
  PositionBoundary,
  PositionOptions,
  PositionPadding,
  PositionStrategy,
  PositionTracking,
} from '@sectile/dom/position';
import { Primitive, type PrimitiveAs } from './primitive.js';
import { useHostDirection, useHostId } from './host-provider.js';
import { reconcileCollectionState } from './internal/collection.js';
import { useControlledStateInvariant } from './internal/controlled-state.js';

type MenuKind = 'menu' | 'menu-button' | 'menubar' | 'navigation-menu';
type MenuRegistrationConnection = Omit<MenuConnection<string>, 'setItemAttributes' | 'setSubmenuAttributes'> & {
  setItemAttributes(element: HTMLElement | undefined, id: string): void;
  setSubmenuAttributes(element: HTMLElement | undefined, parentID: string): void;
};
export interface MenuRootProps {
  readonly items: readonly MenuItemDefinition<string>[];
  readonly disabledItems?: readonly string[];
  readonly disabled?: boolean;
  readonly defaultHighlightedValue?: string | null;
  readonly label?: string;
  readonly textValue?: (id: string) => string;
  readonly policies?: MenuPolicies<string>;
  readonly as?: PrimitiveAs;
  readonly asChild?: boolean;
}

export type MenuTextValueResolver = NonNullable<MenuRootProps['textValue']>;
export interface MenuButtonRootProps extends MenuRootProps, Omit<PositionOptions, 'arrowPadding'> {
  readonly open?: boolean;
  readonly defaultOpen?: boolean;
  readonly position?: boolean;
}
export interface MenuRootSlotProps { readonly open: boolean; readonly highlightedValue: string | null; readonly openPath: readonly string[]; readonly disabled: boolean }
export interface MenuItemProps { readonly value: string; readonly disabled?: boolean; readonly as?: PrimitiveAs; readonly asChild?: boolean }
export interface MenuItemSlotProps { readonly value: string; readonly highlighted: boolean; readonly open: boolean; readonly disabled: boolean }
export interface MenuSubContentProps { readonly for: string; readonly as?: PrimitiveAs; readonly asChild?: boolean }
export interface MenuPartProps { readonly as?: PrimitiveAs; readonly asChild?: boolean }

interface Context {
  readonly state: ComputedRef<MenuRootSlotProps>;
  readonly kind: MenuKind;
  readonly label: ComputedRef<string | undefined>;
  readonly disabledItems: ComputedRef<ReadonlySet<string>>;
  readonly direction: ComputedRef<'ltr' | 'rtl'>;
  readonly position: ComputedRef<boolean>;
  readonly strategy: ComputedRef<PositionStrategy>;
  registerRoot(element?: HTMLElement): void;
  registerTrigger(element?: HTMLElement): void;
  registerItem(element: HTMLElement | undefined, id: string): void;
  registerSubmenu(element: HTMLElement | undefined, parent: string): void;
}
interface ResolvedRootProps {
  readonly items: readonly MenuItemDefinition<string>[];
  readonly disabledItems: readonly string[];
  readonly disabled: boolean;
  readonly defaultHighlightedValue: string | null;
  readonly label?: string;
  readonly textValue?: MenuTextValueResolver;
  readonly policies?: MenuPolicies<string>;
  readonly as: PrimitiveAs;
  readonly asChild: boolean;
  readonly open?: boolean;
  readonly defaultOpen?: boolean;
  readonly position?: boolean;
  readonly side?: PositionOptions['side'];
  readonly align?: PositionOptions['align'];
  readonly sideOffset?: number;
  readonly collisionPadding?: PositionPadding;
  readonly collisionBoundary?: PositionBoundary;
  readonly avoidCollisions?: boolean;
  readonly hideWhenDetached?: boolean;
  readonly strategy?: PositionStrategy;
  readonly tracking?: PositionTracking;
}
const key = Symbol('SectileMenuRoot');
const partProps = { as: { type: [String, Object, Function] as PropType<PrimitiveAs>, default: 'div' }, asChild: { type: Boolean, default: false } };

const commonProps = {
  items: { type: Array as PropType<readonly MenuItemDefinition<string>[]>, required: true },
  disabledItems: { type: Array as PropType<readonly string[]>, default: () => [] }, disabled: { type: Boolean, default: false },
  defaultHighlightedValue: { type: String as PropType<string | null>, default: null }, label: { type: String, default: undefined },
  textValue: { type: Function as PropType<MenuTextValueResolver>, default: undefined },
  policies: { type: Object as PropType<MenuPolicies<string>>, default: undefined },
  as: { type: [String, Object, Function] as PropType<PrimitiveAs>, default: 'div' }, asChild: { type: Boolean, default: false },
} as const;

const menuButtonProps = {
  ...commonProps,
  open: { type: Boolean, default: undefined },
  defaultOpen: { type: Boolean, default: false },
  position: { type: Boolean, default: true },
  side: { type: String as PropType<'top' | 'right' | 'bottom' | 'left'>, default: 'bottom' },
  align: { type: String as PropType<'start' | 'center' | 'end'>, default: 'start' },
  sideOffset: { type: Number, default: 8 }, collisionPadding: { type: [Number, Object] as PropType<PositionPadding>, default: 8 },
  collisionBoundary: { type: [String, Object] as PropType<PositionBoundary>, default: undefined }, avoidCollisions: { type: Boolean, default: true },
  hideWhenDetached: { type: Boolean, default: false }, strategy: { type: String as PropType<PositionStrategy>, default: 'absolute' },
  tracking: { type: String as PropType<PositionTracking>, default: 'events' },
} as const;

function createRoot<RootProps extends typeof commonProps | typeof menuButtonProps>(
  kind: MenuKind,
  rootProps: RootProps,
  providerOnly = false,
) {
  return defineComponent({
    name: kind === 'menu-button' ? 'SectileMenuButtonRoot' : kind === 'menubar' ? 'SectileMenubarRoot' : kind === 'navigation-menu' ? 'SectileNavigationMenuRoot' : 'SectileMenuRoot',
    inheritAttrs: false,
    props: rootProps,
    emits: { 'update:open': (_value: boolean): boolean => true, invoke: (_value: string): boolean => true },
    slots: Object as SlotsType<{ default: (props: MenuRootSlotProps) => VNodeChild }>,
    setup(props, { attrs, emit, slots }) {
      const runtimeProps = props as unknown as ResolvedRootProps;
      const direction = useHostDirection();
      const baseID = useHostId();
      const root = shallowRef<HTMLElement>(); const trigger = shallowRef<HTMLElement>(); const connection = shallowRef<MenuConnection<string>>();
      const openProp = runtimeProps.open;
      const open = shallowRef(kind === 'menu-button' ? openProp ?? runtimeProps.defaultOpen ?? false : true);
      const highlighted = shallowRef<string | null>(runtimeProps.defaultHighlightedValue); const openPath = shallowRef<readonly string[]>([]);
      const controlled = useControlledStateInvariant(
        'MenuButtonRoot',
        'open',
        () => kind === 'menu-button' ? runtimeProps.open : undefined,
      );
      const position = computed(() => kind === 'menu-button' ? runtimeProps.position ?? true : false);
      const strategy = computed<PositionStrategy>(() => runtimeProps.strategy ?? 'absolute');
      const state = computed<MenuRootSlotProps>(() => ({
        open: kind === 'menu-button' && runtimeProps.open !== undefined ? runtimeProps.open : open.value,
        highlightedValue: highlighted.value, openPath: openPath.value, disabled: runtimeProps.disabled,
      }));
      const refresh = (): void => {
        const snapshot = connection.value?.getSnapshot().state; if (snapshot === undefined) return;
        open.value = snapshot.open; highlighted.value = snapshot.cursor.current; openPath.value = snapshot.openPath;
        refreshParts();
      };
      const refreshParts = (): void => {
        if (root.value === undefined || connection.value === undefined) return;
        root.value.querySelectorAll<HTMLElement>('[data-sectile-menu-id]').forEach((element) => { const id = element.dataset['sectileMenuId']; if (id !== undefined) connection.value?.setItemAttributes(element, id); });
        root.value.querySelectorAll<HTMLElement>('[data-sectile-submenu-for]').forEach((element) => { const id = element.dataset['sectileSubmenuFor']; if (id !== undefined) connection.value?.setSubmenuAttributes(element, id); });
      };
      const connect = (): void => {
        connection.value?.disconnect(); if (root.value === undefined || (kind === 'menu-button' && trigger.value === undefined)) return;
        const reconciled = reconcileCollectionState(
          runtimeProps.items.map((item) => item.id),
          [],
          highlighted.value,
          runtimeProps.disabledItems,
          'single',
          { preserveNullCurrent: true },
        );
        highlighted.value = reconciled.current;
        const options = {
          root: root.value, items: runtimeProps.items, disabledItems: runtimeProps.disabledItems, disabled: runtimeProps.disabled,
          direction: direction.value, baseID,
          ...(kind === 'menu-button' ? {
            position: runtimeProps.position ?? true,
            side: runtimeProps.side ?? 'bottom', align: runtimeProps.align ?? 'start', sideOffset: runtimeProps.sideOffset ?? 8,
            collisionPadding: runtimeProps.collisionPadding ?? 8,
            ...(runtimeProps.collisionBoundary === undefined ? {} : { collisionBoundary: runtimeProps.collisionBoundary }),
            avoidCollisions: runtimeProps.avoidCollisions ?? true, hideWhenDetached: runtimeProps.hideWhenDetached ?? false,
            strategy: runtimeProps.strategy ?? 'absolute', tracking: runtimeProps.tracking ?? 'events',
          } : {}),
          ...(runtimeProps.policies === undefined ? {} : { policies: runtimeProps.policies }),
          defaultHighlightedValue: reconciled.current,
          ...(runtimeProps.label === undefined ? {} : { label: runtimeProps.label }),
          ...(runtimeProps.textValue === undefined ? {} : { typeahead: { textValue: runtimeProps.textValue } }),
          onOpenChange: (value: boolean) => { open.value = value; emit('update:open', value); },
          onInvoke: (value: string) => emit('invoke', value), onUpdate: refresh,
        };
        connection.value = kind === 'menu-button'
          ? createMenuButton({ ...options, trigger: trigger.value as HTMLElement, ...(controlled ? { open: runtimeProps.open as boolean } : { defaultOpen: open.value }) })
          : kind === 'menubar' ? createMenubar(options) : kind === 'navigation-menu' ? createNavigationMenu(options) : createMenu(options);
        refreshParts(); refresh();
      };
      let mounted = false;
      let connectScheduled = false;
      const scheduleConnect = (): void => {
        if (!mounted || connectScheduled) return;
        connectScheduled = true;
        void nextTick(() => {
          connectScheduled = false;
          if (mounted) connect();
        });
      };
      const registerRoot = (element?: HTMLElement): void => {
        if (root.value === element) return;
        root.value = element;
        if (element === undefined) {
          connection.value?.disconnect();
          connection.value = undefined;
        } else scheduleConnect();
      };
      const registerTrigger = (element?: HTMLElement): void => {
        if (trigger.value === element) return;
        trigger.value = element;
        if (element === undefined) {
          connection.value?.disconnect();
          connection.value = undefined;
        } else scheduleConnect();
      };
      provide<Context>(key, {
        state, kind, label: computed(() => runtimeProps.label), disabledItems: computed(() => new Set(runtimeProps.disabledItems)), direction,
        position, strategy, registerRoot, registerTrigger,
        registerItem: (element, id) => (connection.value as MenuRegistrationConnection | undefined)?.setItemAttributes(element, id),
        registerSubmenu: (element, parent) => (connection.value as MenuRegistrationConnection | undefined)?.setSubmenuAttributes(element, parent),
      });
      onMounted(() => { mounted = true; connect(); });
      onBeforeUnmount(() => { mounted = false; connection.value?.disconnect(); });
      watch([() => runtimeProps.items, () => runtimeProps.disabledItems, () => runtimeProps.disabled, () => runtimeProps.label, () => runtimeProps.textValue, () => runtimeProps.policies, direction, () => runtimeProps.position, () => runtimeProps.side, () => runtimeProps.align, () => runtimeProps.sideOffset, () => runtimeProps.collisionPadding, () => runtimeProps.collisionBoundary, () => runtimeProps.avoidCollisions, () => runtimeProps.hideWhenDetached, () => runtimeProps.strategy, () => runtimeProps.tracking], connect);
      watch(() => runtimeProps.open, (value) => { if (!controlled || value === undefined || connection.value === undefined) return; const result = connection.value.syncControlledValue(value); if (!result.ok) throw new TypeError(result.error.message); refresh(); });
      return (): VNodeChild => {
        if (providerOnly) return h(Fragment as Component, null, slots['default']?.(state.value) ?? []);
        return h(Primitive, mergeProps(attrs, {
          as: runtimeProps.as, asChild: runtimeProps.asChild, elementRef: (node: unknown) => registerRoot(node instanceof HTMLElement ? node : undefined),
          role: kind === 'navigation-menu' ? 'navigation' : kind === 'menubar' ? 'menubar' : 'menu', 'aria-label': runtimeProps.label,
          dir: direction.value,
          'data-scope': kind === 'navigation-menu' ? 'navigation-menu' : kind === 'menubar' ? 'menubar' : 'menu', 'data-part': 'root', 'data-state': state.value.open ? 'open' : 'closed',
        }), { default: () => slots['default']?.(state.value) });
      };
    },
  });
}

export const MenuRoot = createRoot('menu', commonProps);
export const MenubarRoot = createRoot('menubar', commonProps);
export const NavigationMenuRoot = createRoot('navigation-menu', commonProps);
export const MenuButtonRoot = createRoot('menu-button', menuButtonProps, true);
export type MenuOpenChangeHandler = NonNullable<InstanceType<typeof MenuRoot>['$props']['onUpdate:open']>;
export type MenuInvokeHandler = NonNullable<InstanceType<typeof MenuRoot>['$props']['onInvoke']>;
export type MenubarOpenChangeHandler = NonNullable<InstanceType<typeof MenubarRoot>['$props']['onUpdate:open']>;
export type MenubarInvokeHandler = NonNullable<InstanceType<typeof MenubarRoot>['$props']['onInvoke']>;
export type NavigationMenuOpenChangeHandler = NonNullable<InstanceType<typeof NavigationMenuRoot>['$props']['onUpdate:open']>;
export type NavigationMenuInvokeHandler = NonNullable<InstanceType<typeof NavigationMenuRoot>['$props']['onInvoke']>;
export type MenuButtonOpenChangeHandler = NonNullable<InstanceType<typeof MenuButtonRoot>['$props']['onUpdate:open']>;
export type MenuButtonInvokeHandler = NonNullable<InstanceType<typeof MenuButtonRoot>['$props']['onInvoke']>;

export const MenuButtonTrigger = defineComponent({
  name: 'SectileMenuButtonTrigger', inheritAttrs: false,
  props: { as: { type: [String, Object, Function] as PropType<PrimitiveAs>, default: 'button' }, asChild: { type: Boolean, default: false } },
  slots: Object as SlotsType<{ default: (props: MenuRootSlotProps) => VNodeChild }>,
  setup(props, { attrs, slots }) { const root = useRoot('MenuButtonTrigger'); return (): VNodeChild => h(Primitive, mergeProps(attrs, {
    as: props.as, asChild: props.asChild, elementRef: (node: unknown) => root.registerTrigger(node instanceof HTMLElement ? node : undefined),
    type: props.as === 'button' ? 'button' : undefined, disabled: root.state.value.disabled,
    'aria-haspopup': 'menu', 'aria-expanded': String(root.state.value.open), 'data-scope': 'menu-button', 'data-part': 'trigger',
  }), { default: () => slots['default']?.(root.state.value) }); },
});

export const MenuButtonContent = defineComponent({
  name: 'SectileMenuButtonContent', inheritAttrs: false, props: partProps,
  slots: Object as SlotsType<{ default: (props: MenuRootSlotProps) => VNodeChild }>,
  setup(props, { attrs, slots }) { const root = useRoot('MenuButtonContent'); const element = shallowRef<HTMLElement>(); return (): VNodeChild => h(Primitive, mergeProps(attrs, {
    as: props.as, asChild: props.asChild, elementRef: (node: unknown) => { const content = node instanceof HTMLElement ? node : undefined; element.value = content; root.registerRoot(content); },
    role: 'menu', hidden: !root.state.value.open, 'aria-label': root.label.value, dir: root.direction.value,
    style: root.position.value ? { position: root.strategy.value, visibility: element.value === undefined ? 'hidden' : undefined } : undefined,
    'data-scope': 'menu-button', 'data-part': 'content', 'data-state': root.state.value.open ? 'open' : 'closed',
  }), { default: () => slots['default']?.(root.state.value) }); },
});

export const MenuItem = defineComponent({
  name: 'SectileMenuItem', inheritAttrs: false,
  props: { value: { type: String, required: true }, disabled: { type: Boolean, default: false }, ...partProps },
  slots: Object as SlotsType<{ default: (props: MenuItemSlotProps) => VNodeChild }>,
  setup(props, { attrs, slots }) { const root = useRoot('MenuItem'); const state = computed<MenuItemSlotProps>(() => ({ value: props.value, highlighted: root.state.value.highlightedValue === props.value, open: root.state.value.openPath.includes(props.value), disabled: root.state.value.disabled || props.disabled || root.disabledItems.value.has(props.value) })); return (): VNodeChild => h(Primitive, mergeProps(attrs, {
    as: props.as, asChild: props.asChild, elementRef: (node: unknown) => { root.registerItem(node instanceof HTMLElement ? node : undefined, props.value); },
    role: root.kind === 'navigation-menu' ? undefined : 'menuitem', 'aria-disabled': state.value.disabled ? 'true' : undefined, 'data-sectile-menu-id': props.value,
    'data-scope': root.kind === 'navigation-menu' ? 'navigation-menu' : root.kind === 'menubar' ? 'menubar' : 'menu', 'data-part': 'item', 'data-highlighted': state.value.highlighted ? '' : undefined,
    'data-state': state.value.open ? 'open' : 'closed',
  }), { default: () => slots['default']?.(state.value) }); },
});

export const MenuSubContent = defineComponent({
  name: 'SectileMenuSubContent', inheritAttrs: false,
  props: { for: { type: String, required: true }, ...partProps },
  slots: Object as SlotsType<{ default: (props: MenuRootSlotProps) => VNodeChild }>,
  setup(props, { attrs, slots }) { const root = useRoot('MenuSubContent'); return (): VNodeChild => h(Primitive, mergeProps(attrs, {
    as: props.as, asChild: props.asChild, elementRef: (node: unknown) => { root.registerSubmenu(node instanceof HTMLElement ? node : undefined, props.for); },
    role: root.kind === 'navigation-menu' ? undefined : 'menu', hidden: !root.state.value.openPath.includes(props.for), dir: root.direction.value, 'data-sectile-submenu-for': props.for,
    'data-scope': root.kind === 'navigation-menu' ? 'navigation-menu' : 'menu', 'data-part': 'sub-content', 'data-state': root.state.value.openPath.includes(props.for) ? 'open' : 'closed',
  }), { default: () => slots['default']?.(root.state.value) }); },
});

export const MenuSeparator = defineComponent({
  name: 'SectileMenuSeparator', inheritAttrs: false, props: partProps,
  setup(props, { attrs }) { return (): VNodeChild => h(Primitive, mergeProps(attrs, { as: props.as, asChild: props.asChild, role: 'separator', 'data-scope': 'menu', 'data-part': 'separator' })); },
});

function useRoot(part: string): Context { const root = inject<Context>(key); if (root === undefined) throw new TypeError(`${part} must be used inside a menu root.`); return root; }
