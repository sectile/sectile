import {
  Fragment, computed, defineComponent, h, inject, mergeProps, onBeforeUnmount, onMounted, provide,
  shallowRef, watch, type Component, type ComputedRef, type PropType, type SlotsType, type VNodeChild,
} from 'vue';
import { createMenu, type MenuConnection, type MenuItemDefinition, type MenuPolicies } from '@sectile/dom/menu';
import { createMenuButton } from '@sectile/dom/menu-button';
import { createMenubar } from '@sectile/dom/menubar';
import { Primitive, type PrimitiveAs } from './primitive.js';

type MenuKind = 'menu' | 'menu-button' | 'menubar';
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
  registerRoot(element?: HTMLElement): void;
  registerTrigger(element?: HTMLElement): void;
  registerItem(element: HTMLElement, id: string): void;
  registerSubmenu(element: HTMLElement, parent: string): void;
}
const key = Symbol('SectileMenuRoot');
const partProps = { as: { type: [String, Object, Function] as PropType<PrimitiveAs>, default: 'div' }, asChild: { type: Boolean, default: false } };

const commonProps = {
  items: { type: Array as PropType<readonly MenuItemDefinition<string>[]>, required: true },
  disabledItems: { type: Array as PropType<readonly string[]>, default: () => [] }, disabled: { type: Boolean, default: false },
  defaultHighlightedValue: { type: String as PropType<string | null>, default: null }, label: { type: String, default: undefined },
  textValue: { type: Function as PropType<(id: string) => string>, default: undefined },
  policies: { type: Object as PropType<MenuPolicies<string>>, default: undefined },
  as: { type: [String, Object, Function] as PropType<PrimitiveAs>, default: 'div' }, asChild: { type: Boolean, default: false },
};

function createRoot(kind: MenuKind, providerOnly = false) {
  return defineComponent({
    name: kind === 'menu-button' ? 'SectileMenuButtonRoot' : kind === 'menubar' ? 'SectileMenubarRoot' : 'SectileMenuRoot',
    inheritAttrs: false,
    props: { ...commonProps, open: { type: Boolean, default: undefined }, defaultOpen: { type: Boolean, default: false } },
    emits: { 'update:open': (_value: boolean): boolean => true, invoke: (_value: string): boolean => true },
    slots: Object as SlotsType<{ default: (props: MenuRootSlotProps) => VNodeChild }>,
    setup(props, { attrs, emit, slots }) {
      const root = shallowRef<HTMLElement>(); const trigger = shallowRef<HTMLElement>(); const connection = shallowRef<MenuConnection<string>>();
      const openProp = props.open;
      const open = shallowRef(kind === 'menu-button' ? openProp ?? props.defaultOpen : true);
      const highlighted = shallowRef<string | null>(props.defaultHighlightedValue); const openPath = shallowRef<readonly string[]>([]);
      const controlled = kind === 'menu-button' && openProp !== undefined;
      const state = computed<MenuRootSlotProps>(() => ({
        open: kind === 'menu-button' && props.open !== undefined ? props.open : open.value,
        highlightedValue: highlighted.value, openPath: openPath.value, disabled: props.disabled,
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
        const options = {
          root: root.value, items: props.items as readonly MenuItemDefinition<string>[], disabledItems: props.disabledItems, disabled: props.disabled,
          ...(props.policies === undefined ? {} : { policies: props.policies }),
          defaultHighlightedValue: props.defaultHighlightedValue,
          ...(props.label === undefined ? {} : { label: props.label }),
          ...(props.textValue === undefined ? {} : { typeahead: { textValue: props.textValue } }),
          onOpenChange: (value: boolean) => { open.value = value; emit('update:open', value); },
          onInvoke: (value: string) => emit('invoke', value), onUpdate: refresh,
        };
        connection.value = kind === 'menu-button'
          ? createMenuButton({ ...options, trigger: trigger.value as HTMLElement, ...(controlled ? { open: props.open as boolean } : { defaultOpen: open.value }) })
          : kind === 'menubar' ? createMenubar(options) : createMenu(options);
        refreshParts(); refresh();
      };
      provide<Context>(key, {
        state, kind, label: computed(() => props.label), disabledItems: computed(() => new Set(props.disabledItems)),
        registerRoot: (element) => { root.value = element; }, registerTrigger: (element) => { trigger.value = element; },
        registerItem: (element, id) => connection.value?.setItemAttributes(element, id),
        registerSubmenu: (element, parent) => connection.value?.setSubmenuAttributes(element, parent),
      });
      onMounted(connect); onBeforeUnmount(() => connection.value?.disconnect());
      watch([() => props.items, () => props.disabledItems, () => props.disabled, () => props.label, () => props.textValue, () => props.policies], connect);
      watch(() => props.open, (value) => { if (!controlled || value === undefined || connection.value === undefined) return; const result = connection.value.syncControlledValue(value); if (!result.ok) throw new TypeError(result.error.message); refresh(); });
      return (): VNodeChild => {
        if (providerOnly) return h(Fragment as Component, null, slots['default']?.(state.value) ?? []);
        return h(Primitive, mergeProps(attrs, {
          as: props.as, asChild: props.asChild, elementRef: (node: unknown) => { root.value = node instanceof HTMLElement ? node : undefined; },
          role: kind === 'menubar' ? 'menubar' : 'menu', 'aria-label': props.label,
          'data-scope': kind === 'menubar' ? 'menubar' : 'menu', 'data-part': 'root', 'data-state': state.value.open ? 'open' : 'closed',
        }), { default: () => slots['default']?.(state.value) });
      };
    },
  });
}

export const MenuRoot = createRoot('menu');
export const MenubarRoot = createRoot('menubar');
export const MenuButtonRoot = createRoot('menu-button', true);

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
    role: 'menu', hidden: !root.state.value.open, 'aria-label': root.label.value,
    'data-scope': 'menu-button', 'data-part': 'content', 'data-state': root.state.value.open ? 'open' : 'closed',
  }), { default: () => slots['default']?.(root.state.value) }); },
});

export const MenuItem = defineComponent({
  name: 'SectileMenuItem', inheritAttrs: false,
  props: { value: { type: String, required: true }, disabled: { type: Boolean, default: false }, ...partProps },
  slots: Object as SlotsType<{ default: (props: MenuItemSlotProps) => VNodeChild }>,
  setup(props, { attrs, slots }) { const root = useRoot('MenuItem'); const state = computed<MenuItemSlotProps>(() => ({ value: props.value, highlighted: root.state.value.highlightedValue === props.value, open: root.state.value.openPath.includes(props.value), disabled: root.state.value.disabled || props.disabled || root.disabledItems.value.has(props.value) })); return (): VNodeChild => h(Primitive, mergeProps(attrs, {
    as: props.as, asChild: props.asChild, elementRef: (node: unknown) => { if (node instanceof HTMLElement) root.registerItem(node, props.value); },
    role: 'menuitem', 'aria-disabled': state.value.disabled ? 'true' : undefined, 'data-sectile-menu-id': props.value,
    'data-scope': root.kind === 'menubar' ? 'menubar' : 'menu', 'data-part': 'item', 'data-highlighted': state.value.highlighted ? '' : undefined,
    'data-state': state.value.open ? 'open' : 'closed',
  }), { default: () => slots['default']?.(state.value) }); },
});

export const MenuSubContent = defineComponent({
  name: 'SectileMenuSubContent', inheritAttrs: false,
  props: { for: { type: String, required: true }, ...partProps },
  slots: Object as SlotsType<{ default: (props: MenuRootSlotProps) => VNodeChild }>,
  setup(props, { attrs, slots }) { const root = useRoot('MenuSubContent'); return (): VNodeChild => h(Primitive, mergeProps(attrs, {
    as: props.as, asChild: props.asChild, elementRef: (node: unknown) => { if (node instanceof HTMLElement) root.registerSubmenu(node, props.for); },
    role: 'menu', hidden: !root.state.value.openPath.includes(props.for), 'data-sectile-submenu-for': props.for,
    'data-scope': 'menu', 'data-part': 'sub-content', 'data-state': root.state.value.openPath.includes(props.for) ? 'open' : 'closed',
  }), { default: () => slots['default']?.(root.state.value) }); },
});

export const MenuSeparator = defineComponent({
  name: 'SectileMenuSeparator', inheritAttrs: false, props: partProps,
  setup(props, { attrs }) { return (): VNodeChild => h(Primitive, mergeProps(attrs, { as: props.as, asChild: props.asChild, role: 'separator', 'data-scope': 'menu', 'data-part': 'separator' })); },
});

function useRoot(part: string): Context { const root = inject<Context>(key); if (root === undefined) throw new TypeError(`${part} must be used inside a menu root.`); return root; }
