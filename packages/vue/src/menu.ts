import {
  Fragment, computed, defineComponent, h, inject, mergeProps, nextTick, onBeforeUnmount, onMounted, provide,
  shallowReactive, shallowRef, watch, type Component, type ComputedRef, type PropType, type ShallowRef, type SlotsType, type VNodeChild,
} from 'vue';
import { tryCreateMenu, type MenuConnection, type MenuItemDefinition, type MenuPolicies } from '@sectile/dom/menu';
import { tryCreateMenuButton } from '@sectile/dom/menu-button';
import { tryCreateContextMenu, type ContextMenuConnection } from '@sectile/dom/context-menu';
import { tryCreateMenubar } from '@sectile/dom/menubar';
import { tryCreateNavigationMenu } from '@sectile/dom/navigation-menu';
import { unwrap } from '@sectile/core/result';
import { stableIDElementToken } from '@sectile/dom/identity';
import { createMenuModel, type MenuModel } from '@sectile/core/menu';
import type { DOMLayerPresentationSnapshot } from '@sectile/dom/dialog';
import type {
  PositionBoundary,
  PositionOptions,
  PositionPadding,
  PositionStrategy,
  PositionTracking,
  PositionRect,
} from '@sectile/dom/position';
import { Primitive, type PrimitiveAs } from './primitive.js';
import { positionProps, positionSources, readPositionOptions } from './internal/position-options.js';
import { provideHostLayerParent, useHostDirection, useHostId, useHostLayer } from './host-provider.js';
import { usePopupPresentation } from './internal/popup-presentation.js';
import { providePortalMove } from './internal/portal-move.js';
import {
  invalidateItemProjection,
  reconcileCollectionState,
  sameIDs,
  type ItemProjection,
} from './internal/collection.js';
import { useControlledStateInvariant } from './internal/controlled-state.js';
import { usePresence } from './presence/presence.js';

type MenuKind = 'menu' | 'menu-button' | 'context-menu' | 'menubar' | 'navigation-menu';
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
export interface ContextMenuRootProps extends Omit<MenuButtonRootProps, 'as' | 'asChild'> {}
export interface MenuRootSlotProps { readonly open: boolean; readonly highlightedValue: string | null; readonly openPath: readonly string[]; readonly disabled: boolean; readonly model: MenuModel<string>; readonly presentation: DOMLayerPresentationSnapshot | undefined }
export interface MenuItemProps { readonly value: string; readonly disabled?: boolean; readonly as?: PrimitiveAs; readonly asChild?: boolean }
export interface MenuItemSlotProps { readonly value: string; readonly highlighted: boolean; readonly open: boolean; readonly disabled: boolean; readonly branch: boolean }
export interface MenuSubContentProps { readonly for: string; readonly as?: PrimitiveAs; readonly asChild?: boolean }
export interface MenuPartProps { readonly as?: PrimitiveAs; readonly asChild?: boolean }

interface Context {
  readonly active: Readonly<ShallowRef<boolean>>;
  readonly presentation: Readonly<ShallowRef<DOMLayerPresentationSnapshot | undefined>>;
  registerPresence(present: ShallowRef<boolean>): () => void;
  readonly state: MenuRootSlotProps;
  readonly kind: MenuKind;
  readonly contentID: string;
  readonly triggerID: string;
  submenuID(id: string): string;
  itemID(id: string): string;
  submenuControlID(id: string): string | undefined;
  readonly label: ComputedRef<string | undefined>;
  readonly direction: ComputedRef<'ltr' | 'rtl'>;
  readonly position: ComputedRef<boolean>;
  readonly strategy: ComputedRef<PositionStrategy>;
  readonly itemProjection: ItemProjection;
  isItemHighlighted(id: string): boolean;
  isItemOpen(id: string): boolean;
  isItemDisabled(id: string): boolean;
  isItemBranch(id: string): boolean;
  registerRoot(element?: HTMLElement): void;
  registerTrigger(element?: HTMLElement): void;
  registerItem(element: HTMLElement | undefined, id: string): void;
  registerSubmenu(element: HTMLElement | undefined, parent: string): void;
  refresh(parentID?: string): void;
}
interface ResolvedRootProps extends PositionOptions {
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
  ...positionProps, align: { ...positionProps.align, default: 'start' },
} as const;
const { as: _contextAs, asChild: _contextAsChild, ...contextOwnerProps } = menuButtonProps;
const contextMenuProps = {
  ...contextOwnerProps,
  align: { type: String as PropType<'start' | 'center' | 'end'>, default: undefined },
  sideOffset: { type: Number, default: 0 },
  strategy: { type: String as PropType<PositionStrategy>, default: 'fixed' },
} as const;

function createRoot<RootProps extends typeof commonProps | typeof menuButtonProps | typeof contextMenuProps>(
  kind: MenuKind,
  rootProps: RootProps,
  providerOnly = false,
) {
  const popup = kind === 'menu-button' || kind === 'context-menu';
  return defineComponent({
    name: kind === 'context-menu' ? 'SectileContextMenuRoot' : kind === 'menu-button' ? 'SectileMenuButtonRoot' : kind === 'menubar' ? 'SectileMenubarRoot' : kind === 'navigation-menu' ? 'SectileNavigationMenuRoot' : 'SectileMenuRoot',
    inheritAttrs: false,
    props: rootProps,
    emits: { 'update:open': (_value: boolean): boolean => true, invoke: (_value: string): boolean => true },
    slots: Object as SlotsType<{ default: (props: MenuRootSlotProps) => VNodeChild }>,
    setup(props, { attrs, emit, slots }) {
      const runtimeProps = props as unknown as ResolvedRootProps;
      const direction = useHostDirection();
      const layerHost = useHostLayer();
      const baseID = useHostId();
      const contentID = `sectile-menu-${baseID}-content`;
      const triggerID = `sectile-menu-${baseID}-trigger`;
      const submenuID = (id: string): string => `sectile-menu-${baseID}-submenu-${stableIDElementToken(id)}`;
      const itemID = (id: string): string => `sectile-menu-${baseID}-item-${stableIDElementToken(id)}`;
      const model = computed(() => createMenuModel(runtimeProps.items));
      const root = shallowRef<HTMLElement>(); const trigger = shallowRef<HTMLElement>(); const connection = shallowRef<MenuConnection<string> | ContextMenuConnection<string>>();
      providePortalMove(() => connection.value);
      let currentAnchorRect: PositionRect | undefined;
      const controlled = useControlledStateInvariant(
        kind === 'context-menu' ? 'ContextMenuRoot' : 'MenuButtonRoot',
        'open',
        () => popup ? runtimeProps.open : undefined,
      );
      let currentOpen = popup ? runtimeProps.open ?? runtimeProps.defaultOpen ?? false : true;
      let currentHighlighted: string | null = runtimeProps.defaultHighlightedValue;
      let currentOpenPath: readonly string[] = [];
      let currentOpenPathSet = new Set<string>();
      let disabledItemSet = new Set(runtimeProps.disabledItems);
      const itemProjection = shallowReactive(new Map<string, true>());
      const state = shallowReactive({
        get model(): MenuModel<string> { return model.value; },
        get presentation(): DOMLayerPresentationSnapshot | undefined { return lifecycle.presentation.value; },
        open: popup && runtimeProps.open !== undefined ? runtimeProps.open : currentOpen,
        highlightedValue: currentHighlighted,
        openPath: currentOpenPath,
        disabled: runtimeProps.disabled,
      });
      const lifecycle = usePopupPresentation({ connection, open: computed(() => state.open), connect: () => connect(), refresh: () => refresh() });
      const position = computed(() => popup ? runtimeProps.position ?? true : false);
      const strategy = computed<PositionStrategy>(() => runtimeProps.strategy ?? (kind === 'context-menu' ? 'fixed' : 'absolute'));
      const publishOpen = (value: boolean): void => {
        currentOpen = value;
        const publicValue = popup && runtimeProps.open !== undefined
          ? runtimeProps.open
          : value;
        if (state.open !== publicValue) state.open = publicValue;
      };
      const publishHighlight = (value: string | null): void => {
        const previous = currentHighlighted;
        if (previous === value) return;
        currentHighlighted = value;
        state.highlightedValue = value;
        invalidateItemProjection(itemProjection, previous);
        invalidateItemProjection(itemProjection, value);
      };
      const publishOpenPath = (value: readonly string[]): void => {
        const previousSet = currentOpenPathSet;
        const nextSet = new Set(value);
        const pathChanged = !sameIDs(currentOpenPath, value);
        currentOpenPath = value;
        currentOpenPathSet = nextSet;
        if (pathChanged) state.openPath = value;
        for (const id of previousSet) if (!nextSet.has(id)) invalidateItemProjection(itemProjection, id);
        for (const id of nextSet) if (!previousSet.has(id)) invalidateItemProjection(itemProjection, id);
      };
      const publishSnapshot = (snapshot: ReturnType<MenuConnection<string>['getSnapshot']>['state']): void => {
        publishOpen(snapshot.open);
        publishHighlight(snapshot.cursor.current);
        publishOpenPath(snapshot.openPath);
      };
      const updateOwnerProjection = (): void => {
        const nextDisabledItems = new Set(runtimeProps.disabledItems);
        if (state.disabled === runtimeProps.disabled) {
          for (const id of disabledItemSet) if (!nextDisabledItems.has(id)) invalidateItemProjection(itemProjection, id);
          for (const id of nextDisabledItems) if (!disabledItemSet.has(id)) invalidateItemProjection(itemProjection, id);
        } else state.disabled = runtimeProps.disabled;
        disabledItemSet = nextDisabledItems;
      };
      const refresh = (): void => {
        const snapshot = connection.value?.getSnapshot().state; if (snapshot !== undefined) publishSnapshot(snapshot);
        lifecycle.update();
      };
      const refreshParts = (): void => {
        if (root.value === undefined || connection.value === undefined) return;
        root.value.querySelectorAll<HTMLElement>('[data-sectile-menu-id]').forEach((element) => { const id = element.dataset['sectileMenuId']; if (id !== undefined) connection.value?.setItemAttributes(element, id); });
        root.value.querySelectorAll<HTMLElement>('[data-sectile-submenu-for]').forEach((element) => { const id = element.dataset['sectileSubmenuFor']; if (id !== undefined) connection.value?.setSubmenuAttributes(element, id); });
      };
      const connect = (): void => {
        const navigation = { defaultOpenPath: currentOpenPath };
        disconnect();
        updateOwnerProjection();
        if (root.value === undefined || (popup && trigger.value === undefined)) return;
        const reconciled = reconcileCollectionState(
          runtimeProps.items.map((item) => item.id),
          [],
          currentHighlighted,
          runtimeProps.disabledItems,
          'single',
          { preserveNullCurrent: true },
        );
        publishHighlight(reconciled.current);
        const options = {
          root: root.value, model: model.value, disabledItems: runtimeProps.disabledItems, disabled: runtimeProps.disabled,
          direction: direction.value, baseID, manageVisibility: false,
          ...(popup ? {
            ...(layerHost.value === undefined ? {} : { layerHost: layerHost.value }),
            ...readPositionOptions(runtimeProps), position: runtimeProps.position ?? true,
            side: runtimeProps.side ?? 'bottom', align: runtimeProps.align ?? (kind === 'context-menu' && direction.value === 'rtl' ? 'end' : 'start'), sideOffset: runtimeProps.sideOffset ?? (kind === 'context-menu' ? 0 : 8),
            strategy: strategy.value, tracking: runtimeProps.tracking ?? 'events',
          } : {}),
          ...(runtimeProps.policies === undefined ? {} : { policies: runtimeProps.policies }),
          defaultHighlightedValue: reconciled.current,
          ...(runtimeProps.label === undefined ? {} : { label: runtimeProps.label }),
          ...(runtimeProps.textValue === undefined ? {} : { typeahead: { textValue: runtimeProps.textValue } }),
          onOpenChange: (value: boolean) => { publishOpen(value); emit('update:open', value); },
          onInvoke: (value: string) => emit('invoke', value), onUpdate: refresh,
        };
        const create = (retained: boolean) => {
          const basis = { ...options, ...(retained ? navigation : { defaultHighlightedValue: null }) };
          if (popup) {
            const popupOptions = { ...basis, trigger: trigger.value as HTMLElement, ...(controlled ? { open: runtimeProps.open as boolean } : { defaultOpen: currentOpen }) };
            return kind === 'context-menu'
              ? tryCreateContextMenu({ ...popupOptions, ...(currentAnchorRect === undefined ? {} : { anchorRect: currentAnchorRect }) })
              : tryCreateMenuButton(popupOptions);
          }
          return kind === 'menubar' ? tryCreateMenubar(basis) : kind === 'navigation-menu' ? tryCreateNavigationMenu(basis) : tryCreateMenu(basis);
        };
        const candidate = create(true);
        connection.value = unwrap(!candidate.ok && (candidate.error.code === 'invalid-menu-open-path'
          || candidate.error.code === 'disconnected-menu-open-path' || candidate.error.code === 'closed-menu-has-active-state'
          || candidate.error.code === 'menu-cursor-hidden') ? create(false) : candidate);
        refreshParts(); refresh();
      };
      const disconnect = (): void => {
        const owner = connection.value;
        if (kind === 'context-menu' && owner !== undefined && 'getAnchorRect' in owner) currentAnchorRect = owner.getAnchorRect();
        lifecycle.release();
        try { connection.value?.disconnect(); } finally { connection.value = undefined; }
      };
      let mounted = false;
      let connectScheduled = false;
      const scheduleConnect = (): void => {
        if (!mounted || connectScheduled) return;
        if (!lifecycle.availability.value) { lifecycle.invalidate(); return; }
        connectScheduled = true;
        void nextTick(() => {
          connectScheduled = false;
          if (mounted) lifecycle.reconnect();
        });
      };
      const registerRoot = (element?: HTMLElement): void => {
        if (root.value === element) return;
        root.value = element;
        if (element === undefined) {
          disconnect();
        } else scheduleConnect();
      };
      const registerTrigger = (element?: HTMLElement): void => {
        if (trigger.value === element) return;
        trigger.value = element;
        if (element === undefined) {
          disconnect();
        } else scheduleConnect();
      };
      provide<Context>(key, {
        active: lifecycle.active, presentation: lifecycle.presentation, registerPresence: lifecycle.registerPresence,
        state, kind, contentID, triggerID, submenuID, itemID,
        submenuControlID: (id) => connection.value === undefined ? submenuID(id) : connection.value.getSubmenuID(id),
        label: computed(() => runtimeProps.label), direction,
        position, strategy, itemProjection,
        isItemHighlighted: (id) => currentHighlighted === id,
        isItemOpen: (id) => currentOpenPathSet.has(id),
        isItemDisabled: (id) => state.disabled || disabledItemSet.has(id),
        isItemBranch: (id) => model.value.tree.isLeaf(id) === false,
        registerRoot, registerTrigger,
        refresh: (parentID) => connection.value?.refresh(parentID ?? null),
        registerItem: (element, id) => connection.value?.setItemAttributes(element, id),
        registerSubmenu: (element, parent) => {
          const owner = connection.value, previous = owner?.getSubmenuID(parent);
          owner?.setSubmenuAttributes(element, parent);
          if (previous !== owner?.getSubmenuID(parent)) invalidateItemProjection(itemProjection, parent);
        },
      });
      onMounted(() => { mounted = true; lifecycle.reconnect(); });
      onBeforeUnmount(() => { mounted = false; disconnect(); });
      watch([() => runtimeProps.items, () => runtimeProps.disabledItems, () => runtimeProps.disabled, () => runtimeProps.label, () => runtimeProps.textValue, () => runtimeProps.policies, direction, ...positionSources(runtimeProps)], lifecycle.reconnect);
      if (popup) watch(layerHost, lifecycle.reconnect, { flush: 'post' });
      watch(() => runtimeProps.open, (value) => {
        if (!controlled || value === undefined) return;
        currentOpen = value;
        state.open = value;
        lifecycle.prepareModelUpdate();
        if (connection.value === undefined) return;
        const result = connection.value.syncControlledValue(value);
        if (!result.ok) throw new TypeError(result.error.message);
        refresh();
      });
      return (): VNodeChild => {
        if (providerOnly) return h(Fragment as Component, null, slots['default']?.(state) ?? []);
        return h(Primitive, mergeProps(attrs, {
          as: runtimeProps.as, asChild: runtimeProps.asChild, elementRef: (node: unknown) => registerRoot(node instanceof HTMLElement ? node : undefined),
          role: kind === 'navigation-menu' ? 'navigation' : kind === 'menubar' ? 'menubar' : 'menu', 'aria-label': runtimeProps.label,
          dir: direction.value,
          ...(!lifecycle.active.value ? { hidden: true, inert: true, 'aria-hidden': 'true' } : {}),
          'data-scope': kind === 'navigation-menu' ? 'navigation-menu' : kind === 'menubar' ? 'menubar' : 'menu', 'data-part': 'root', 'data-state': state.open ? 'open' : 'closed',
        }), { default: () => slots['default']?.(state) });
      };
    },
  });
}

export const MenuRoot = /* @__PURE__ */ createRoot('menu', commonProps);
export const MenubarRoot = /* @__PURE__ */ createRoot('menubar', commonProps);
export const NavigationMenuRoot = /* @__PURE__ */ createRoot('navigation-menu', commonProps);
export const MenuButtonRoot = /* @__PURE__ */ createRoot('menu-button', menuButtonProps, true);
export const ContextMenuRoot = /* @__PURE__ */ createRoot('context-menu', contextMenuProps, true);
export type MenuOpenChangeHandler = NonNullable<InstanceType<typeof MenuRoot>['$props']['onUpdate:open']>;
export type MenuInvokeHandler = NonNullable<InstanceType<typeof MenuRoot>['$props']['onInvoke']>;
export type MenubarOpenChangeHandler = NonNullable<InstanceType<typeof MenubarRoot>['$props']['onUpdate:open']>;
export type MenubarInvokeHandler = NonNullable<InstanceType<typeof MenubarRoot>['$props']['onInvoke']>;
export type NavigationMenuOpenChangeHandler = NonNullable<InstanceType<typeof NavigationMenuRoot>['$props']['onUpdate:open']>;
export type NavigationMenuInvokeHandler = NonNullable<InstanceType<typeof NavigationMenuRoot>['$props']['onInvoke']>;
export type MenuButtonOpenChangeHandler = NonNullable<InstanceType<typeof MenuButtonRoot>['$props']['onUpdate:open']>;
export type MenuButtonInvokeHandler = NonNullable<InstanceType<typeof MenuButtonRoot>['$props']['onInvoke']>;
export type ContextMenuOpenChangeHandler = NonNullable<InstanceType<typeof ContextMenuRoot>['$props']['onUpdate:open']>;
export type ContextMenuInvokeHandler = NonNullable<InstanceType<typeof ContextMenuRoot>['$props']['onInvoke']>;

function createPopupTrigger(scope: 'menu-button' | 'context-menu') { return defineComponent({
  name: scope === 'context-menu' ? 'SectileContextMenuTrigger' : 'SectileMenuButtonTrigger', inheritAttrs: false,
  props: { as: { type: [String, Object, Function] as PropType<PrimitiveAs>, default: 'button' }, asChild: { type: Boolean, default: false } },
  slots: Object as SlotsType<{ default: (props: MenuRootSlotProps) => VNodeChild }>,
  setup(props, { attrs, slots }) { const root = useRoot(scope === 'context-menu' ? 'ContextMenuTrigger' : 'MenuButtonTrigger'); return (): VNodeChild => {
    const borrowed = scope === 'context-menu' && props.asChild;
    if (borrowed && !root.label.value?.trim()) throw new TypeError('ContextMenuRoot requires a nonempty label when its trigger borrows a child.');
    return h(Primitive, mergeProps(attrs, {
    as: props.as, asChild: props.asChild, elementRef: (node: unknown) => root.registerTrigger(node instanceof HTMLElement ? node : undefined),
    ...(borrowed ? {} : { type: props.as === 'button' ? 'button' : undefined, disabled: root.state.disabled,
    id: root.triggerID,
    'aria-haspopup': 'menu', 'aria-expanded': String(root.state.open), 'aria-controls': root.contentID, 'data-scope': scope, 'data-part': 'trigger',
    }),
  }), { default: () => slots['default']?.(root.state) }); }; },
}); }
export const MenuButtonTrigger = /* @__PURE__ */ createPopupTrigger('menu-button');
export const ContextMenuTrigger = /* @__PURE__ */ createPopupTrigger('context-menu');

function createPopupContent(scope: 'menu-button' | 'context-menu') { return defineComponent({
  name: scope === 'context-menu' ? 'SectileContextMenuContent' : 'SectileMenuButtonContent', inheritAttrs: false, props: partProps,
  slots: Object as SlotsType<{ default: (props: MenuRootSlotProps) => VNodeChild }>,
  setup(props, { attrs, slots }) {
    const root = useRoot(scope === 'context-menu' ? 'ContextMenuContent' : 'MenuButtonContent');
    const element = shallowRef<HTMLElement>();
    const open = computed(() => root.state.open);
    provideHostLayerParent({ element, open, active: root.active, presentation: root.presentation });
    const present = useMenuPresence(open, element, root.refresh, root.active);
    onBeforeUnmount(root.registerPresence(present));
    return (): VNodeChild => {
      const exiting = !open.value && present.value;
      return h(Primitive, mergeProps(attrs, {
        as: props.as, asChild: props.asChild, elementRef: (node: unknown) => { const content = node instanceof HTMLElement ? node : undefined; element.value = content; root.registerRoot(content); },
        id: root.contentID, role: 'menu', hidden: !root.active.value || !present.value, 'aria-label': root.label.value,
        'aria-labelledby': root.label.value === undefined ? root.triggerID : undefined, dir: root.direction.value,
        ...(exiting || !root.active.value ? { inert: true, 'aria-hidden': 'true' } : {}),
        style: root.position.value ? { position: root.strategy.value, visibility: element.value === undefined ? 'hidden' : undefined } : undefined,
        'data-scope': scope, 'data-part': 'content', 'data-state': open.value ? 'open' : 'closed',
      }), { default: () => slots['default']?.(root.state) });
    };
  },
}); }
export const MenuButtonContent = /* @__PURE__ */ createPopupContent('menu-button');
export const ContextMenuContent = /* @__PURE__ */ createPopupContent('context-menu');

export const MenuItem = defineComponent({
  name: 'SectileMenuItem', inheritAttrs: false,
  props: { value: { type: String, required: true }, disabled: { type: Boolean, default: false }, ...partProps },
  slots: Object as SlotsType<{ default: (props: MenuItemSlotProps) => VNodeChild }>,
  setup(props, { attrs, slots }) {
    const root = useRoot('MenuItem');
    const state: MenuItemSlotProps = Object.freeze({
      get value() { return props.value; },
      get highlighted() { root.itemProjection.get(props.value); return root.isItemHighlighted(props.value); },
      get open() { root.itemProjection.get(props.value); return root.isItemOpen(props.value); },
      get disabled() { root.itemProjection.get(props.value); return props.disabled || root.isItemDisabled(props.value); },
      get branch() { return root.isItemBranch(props.value); },
    });
    return (): VNodeChild => h(Primitive, mergeProps(attrs, {
      as: props.as, asChild: props.asChild, elementRef: (node: unknown) => { root.registerItem(node instanceof HTMLElement ? node : undefined, props.value); },
      role: root.kind === 'navigation-menu' ? undefined : 'menuitem', 'aria-disabled': state.disabled ? 'true' : undefined, 'data-sectile-menu-id': props.value,
      id: state.branch && root.kind !== 'navigation-menu' ? root.itemID(props.value) : undefined,
      'aria-haspopup': state.branch && root.kind !== 'navigation-menu' ? 'menu' : undefined, 'aria-expanded': state.branch ? String(state.open) : undefined,
      'aria-controls': state.branch ? root.submenuControlID(props.value) : undefined,
      'data-scope': root.kind === 'navigation-menu' ? 'navigation-menu' : root.kind === 'menubar' ? 'menubar' : 'menu', 'data-part': 'item', 'data-highlighted': state.highlighted ? '' : undefined,
      'data-state': state.open ? 'open' : 'closed',
    }), { default: () => slots['default']?.(state) });
  },
});

export const MenuSubContent = defineComponent({
  name: 'SectileMenuSubContent', inheritAttrs: false,
  props: { for: { type: String, required: true }, ...partProps },
  slots: Object as SlotsType<{ default: (props: MenuRootSlotProps) => VNodeChild }>,
  setup(props, { attrs, slots }) {
    const root = useRoot('MenuSubContent');
    const element = shallowRef<HTMLElement>();
    const open = computed(() => {
      root.itemProjection.get(props.for);
      return root.state.open && root.isItemOpen(props.for);
    });
    const present = useMenuPresence(open, element, () => root.refresh(props.for), root.active);
    return (): VNodeChild => {
      const exiting = !open.value && present.value;
      return h(Primitive, mergeProps(attrs, {
        as: props.as, asChild: props.asChild, elementRef: (node: unknown) => { const submenu = node instanceof HTMLElement ? node : undefined; element.value = submenu; root.registerSubmenu(submenu, props.for); },
        id: root.submenuID(props.for), role: root.kind === 'navigation-menu' ? undefined : 'menu', hidden: !root.active.value || !present.value, dir: root.direction.value, 'data-sectile-submenu-for': props.for,
        'aria-labelledby': root.kind === 'navigation-menu' ? undefined : root.itemID(props.for),
        ...(exiting || !root.active.value ? { inert: true, 'aria-hidden': 'true' } : {}),
        'data-scope': root.kind === 'navigation-menu' ? 'navigation-menu' : 'menu', 'data-part': 'sub-content', 'data-state': open.value ? 'open' : 'closed',
      }), { default: () => slots['default']?.(root.state) });
    };
  },
});

export const MenuSeparator = defineComponent({
  name: 'SectileMenuSeparator', inheritAttrs: false, props: partProps,
  setup(props, { attrs }) { return (): VNodeChild => h(Primitive, mergeProps(attrs, { as: props.as, asChild: props.asChild, role: 'separator', 'data-scope': 'menu', 'data-part': 'separator' })); },
});

function useMenuPresence(
  open: ComputedRef<boolean>,
  element: ShallowRef<HTMLElement | undefined>,
  refresh: () => void,
  active: Readonly<ShallowRef<boolean>>,
): ShallowRef<boolean> {
  const retainedReopen = shallowRef(0);
  const present = usePresence(open, element, () => { retainedReopen.value += 1; }, active);
  watch([present, retainedReopen, element, active], async (_next, _previous, onCleanup): Promise<void> => {
    let active = true;
    onCleanup(() => { active = false; });
    await nextTick();
    // Retry geometry and pending focus after Vue attaches or reveals the surface.
    if (active) refresh();
  }, { flush: 'post' });
  return present;
}

function useRoot(part: string): Context { const root = inject<Context>(key); if (root === undefined) throw new TypeError(`${part} must be used inside a menu root.`); return root; }
