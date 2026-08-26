import {
  Fragment, computed, defineComponent, h, inject, mergeProps, onBeforeUnmount, onMounted, provide,
  shallowRef, watch, type Component, type ComputedRef, type PropType, type SlotsType, type VNodeChild,
} from 'vue';
import { createMenu, type MenuConnection, type MenuItemDefinition, type MenuPolicies } from '@sectile/dom/menu';
import { createMenuButton } from '@sectile/dom/menu-button';
import { createMenubar } from '@sectile/dom/menubar';
import { createNavigationMenu } from '@sectile/dom/navigation-menu';
import { Primitive, type PrimitiveAs } from './primitive.js';
import { useHostDirection, useHostId } from './host-provider.js';
import { reconcileCollectionState } from './internal/collection.js';
import { useControlledStateInvariant } from './internal/controlled-state.js';

type MenuKind = 'menu' | 'menu-button' | 'menubar' | 'navigation-menu';
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
export interface MenuButtonRootProps extends MenuRootProps { readonly open?: boolean; readonly defaultOpen?: boolean }
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
  registerRoot(element?: HTMLElement): void;
  registerTrigger(element?: HTMLElement): void;
  registerItem(element: HTMLElement, id: string): void;
  registerSubmenu(element: HTMLElement, parent: string): void;
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
      provide<Context>(key, {
        state, kind, label: computed(() => runtimeProps.label), disabledItems: computed(() => new Set(runtimeProps.disabledItems)), direction,
        registerRoot: (element) => { root.value = element; }, registerTrigger: (element) => { trigger.value = element; },
        registerItem: (element, id) => connection.value?.setItemAttributes(element, id),
        registerSubmenu: (element, parent) => connection.value?.setSubmenuAttributes(element, parent),
      });
      onMounted(connect); onBeforeUnmount(() => connection.value?.disconnect());
      watch([() => runtimeProps.items, () => runtimeProps.disabledItems, () => runtimeProps.disabled, () => runtimeProps.label, () => runtimeProps.textValue, () => runtimeProps.policies, direction], connect);
      watch(() => runtimeProps.open, (value) => { if (!controlled || value === undefined || connection.value === undefined) return; const result = connection.value.syncControlledValue(value); if (!result.ok) throw new TypeError(result.error.message); refresh(); });
      return (): VNodeChild => {
        if (providerOnly) return h(Fragment as Component, null, slots['default']?.(state.value) ?? []);
        return h(Primitive, mergeProps(attrs, {
          as: runtimeProps.as, asChild: runtimeProps.asChild, elementRef: (node: unknown) => { root.value = node instanceof HTMLElement ? node : undefined; },
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
  setup(props, { attrs, slots }) { const root = useRoot('MenuButtonContent'); return (): VNodeChild => h(Primitive, mergeProps(attrs, {
    as: props.as, asChild: props.asChild, elementRef: (node: unknown) => root.registerRoot(node instanceof HTMLElement ? node : undefined),
    role: 'menu', hidden: !root.state.value.open, 'aria-label': root.label.value, dir: root.direction.value,
    'data-scope': 'menu-button', 'data-part': 'content', 'data-state': root.state.value.open ? 'open' : 'closed',
  }), { default: () => slots['default']?.(root.state.value) }); },
});

export const MenuItem = defineComponent({
  name: 'SectileMenuItem', inheritAttrs: false,
  props: { value: { type: String, required: true }, disabled: { type: Boolean, default: false }, ...partProps },
  slots: Object as SlotsType<{ default: (props: MenuItemSlotProps) => VNodeChild }>,
  setup(props, { attrs, slots }) { const root = useRoot('MenuItem'); const state = computed<MenuItemSlotProps>(() => ({ value: props.value, highlighted: root.state.value.highlightedValue === props.value, open: root.state.value.openPath.includes(props.value), disabled: root.state.value.disabled || props.disabled || root.disabledItems.value.has(props.value) })); return (): VNodeChild => h(Primitive, mergeProps(attrs, {
    as: props.as, asChild: props.asChild, elementRef: (node: unknown) => { if (node instanceof HTMLElement) root.registerItem(node, props.value); },
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
    as: props.as, asChild: props.asChild, elementRef: (node: unknown) => { if (node instanceof HTMLElement) root.registerSubmenu(node, props.for); },
    role: root.kind === 'navigation-menu' ? undefined : 'menu', hidden: !root.state.value.openPath.includes(props.for), dir: root.direction.value, 'data-sectile-submenu-for': props.for,
    'data-scope': root.kind === 'navigation-menu' ? 'navigation-menu' : 'menu', 'data-part': 'sub-content', 'data-state': root.state.value.openPath.includes(props.for) ? 'open' : 'closed',
  }), { default: () => slots['default']?.(root.state.value) }); },
});

export const MenuSeparator = defineComponent({
  name: 'SectileMenuSeparator', inheritAttrs: false, props: partProps,
  setup(props, { attrs }) { return (): VNodeChild => h(Primitive, mergeProps(attrs, { as: props.as, asChild: props.asChild, role: 'separator', 'data-scope': 'menu', 'data-part': 'separator' })); },
});

function useRoot(part: string): Context { const root = inject<Context>(key); if (root === undefined) throw new TypeError(`${part} must be used inside a menu root.`); return root; }
