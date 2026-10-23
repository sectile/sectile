import {
  Fragment, computed, defineComponent, getCurrentScope, h, inject, mergeProps, onBeforeUnmount,
  onMounted, onActivated, onDeactivated, onScopeDispose, provide, shallowRef, watch, type Component, type ComputedRef, type PropType,
  type ShallowRef, type SlotsType, type VNodeChild,
} from 'vue';
import { createToast, type ToastInput, type ToastItem } from '@sectile/dom/toast';
import { getToastInputs, type ToastState } from '@sectile/core/toast';
import { Primitive, type PrimitiveAs } from './primitive.js';
import { HostPortal } from './host-provider.js';
import { useControlledStateInvariant } from './internal/controlled-state.js';
import { usePresence } from './presence/presence.js';

export interface ToastProviderProps {
  readonly toasts?: readonly ToastInput<string>[];
  readonly initialToasts?: readonly ToastInput<string>[];
  readonly defaultDurationMs?: number | null;
  readonly maxVisible?: number;
  readonly closeLabel?: string;
  readonly hotkey?: readonly string[] | false;
  readonly pauseOnWindowBlur?: boolean;
  readonly dismissOnEscape?: boolean;
  readonly swipeDirection?: 'up' | 'right' | 'down' | 'left';
  readonly swipeThreshold?: number;
}
export interface ToastProviderSlotProps { readonly toasts: readonly ToastItem<string>[]; readonly paused: boolean; toast(input: ToastInput<string>): void; update(id: string, toast: Partial<Omit<ToastInput<string>, 'id'>>): void; dismiss(id: string): void; dismissAll(): void }
export interface UseToastReturn {
  readonly toasts: ComputedRef<readonly ToastItem<string>[]>;
  readonly paused: ComputedRef<boolean>;
  toast(input: ToastInput<string>): void;
  update(id: string, toast: Partial<Omit<ToastInput<string>, 'id'>>): void;
  dismiss(id: string): void;
  dismissAll(): void;
}
export interface ToastPartProps { readonly as?: PrimitiveAs; readonly asChild?: boolean }
export interface ToastPortalProps { readonly to?: string | HTMLElement; readonly disabled?: boolean; readonly defer?: boolean }
export interface ToastRootProps extends ToastPartProps { readonly value: string }
export interface ToastRootSlotProps { readonly toast: ToastItem<string> | null; readonly open: boolean }

type NativeToastConnection = ReturnType<typeof createToast<string>>;

interface ToastContext {
  readonly state: ShallowRef<{ readonly items: readonly ToastItem<string>[]; readonly paused: boolean }>;
  readonly activeItems: ShallowRef<ReadonlyMap<string, ToastItem<string>>>;
  readonly exiting: ReadonlyMap<string, ToastItem<string>>;
  readonly closeLabel: ComputedRef<string>;
  readonly swipeDirection: ComputedRef<'up' | 'right' | 'down' | 'left'>;
  connect(root: HTMLElement, label: string, owner: object): void;
  disconnect(owner: object): void;
  push(input: ToastInput<string>): void;
  update(id: string, toast: Partial<Omit<ToastInput<string>, 'id'>>): void;
  dismiss(id: string): void;
  dismissAll(): void;
  finishExit(id: string): void;
  registerItem(element: HTMLElement | undefined, id: string, owner: object | undefined): void;
  registerClose(element: HTMLButtonElement | undefined, id: string, owner: object | undefined): void;
}
const key = Symbol('SectileToastProvider');
const viewportKey = Symbol('SectileToastViewport');

export const ToastProvider = /* @__PURE__ */ defineComponent({
  name: 'SectileToastProvider',
  inheritAttrs: false,
  props: {
    toasts: { type: Array as PropType<readonly ToastInput<string>[]>, default: undefined },
    initialToasts: { type: Array as PropType<readonly ToastInput<string>[]>, default: () => [] },
    defaultDurationMs: { type: Number as PropType<number | null>, default: 5_000 },
    maxVisible: { type: Number, default: 3 },
    closeLabel: { type: String, default: 'Dismiss notification' },
    hotkey: { type: [Array, Boolean] as PropType<readonly string[] | false>, default: () => ['F8'] },
    pauseOnWindowBlur: { type: Boolean, default: true }, dismissOnEscape: { type: Boolean, default: true },
    swipeDirection: { type: String as PropType<'up' | 'right' | 'down' | 'left'>, default: 'right' },
    swipeThreshold: { type: Number, default: 50 },
  },
  emits: { 'update:toasts': (_items: readonly ToastInput<string>[]): boolean => true },
  slots: Object as SlotsType<{ default: (props: ToastProviderSlotProps) => VNodeChild }>,
  setup(props, { emit, slots }) {
    const connection = shallowRef<NativeToastConnection>();
    let disposed = false;
    const controlled = useControlledStateInvariant('ToastProvider', 'toasts', () => props.toasts);
    const state = shallowRef<ToastState<string>>({ items: Object.freeze([]), paused: false });
    const activeByID = shallowRef<ReadonlyMap<string, ToastItem<string>>>(new Map());
    const closeLabel = computed(() => props.closeLabel);
    const swipeDirection = computed(() => props.swipeDirection);
    let activeItems: readonly ToastItem<string>[] = state.value.items;
    let published: ToastState<string> | undefined;
    let viewport: { readonly root: HTMLElement; readonly owner: object } | undefined;
    const exiting = new Map<string, ToastItem<string>>();

    const finishExit = (id: string): void => {
      if (disposed || activeByID.value.has(id) || !exiting.delete(id)) return;
      state.value = { ...state.value, items: Object.freeze(state.value.items.filter((item) => item.id !== id)) };
    };
    const refresh = (): void => {
      const native = connection.value, next = native?.getSnapshot().state;
      if (disposed || next === undefined || next === published) return;
      published = next;
      if (next.items === activeItems) {
        if (state.value.paused !== next.paused) state.value = { items: state.value.items, paused: next.paused };
        return;
      }
      const nextIDs = new Map(next.items.map(item => [item.id, item] as const));
      for (const item of activeItems) if (!nextIDs.has(item.id)) {
        if (viewport !== undefined && native?.getToastElement(item.id) !== undefined) exiting.set(item.id, item);
        else exiting.delete(item.id);
      }
      for (const item of next.items) exiting.delete(item.id);
      activeItems = next.items; activeByID.value = nextIDs;
      const ordered: ToastItem<string>[] = [];
      let activeIndex = 0;
      for (const previous of state.value.items) {
        const exitingItem = exiting.get(previous.id);
        if (exitingItem !== undefined) { ordered.push(exitingItem); continue; }
        if (!nextIDs.has(previous.id)) continue;
        const active = next.items[activeIndex];
        if (active !== undefined) { ordered.push(active); activeIndex += 1; }
      }
      for (; activeIndex < next.items.length; activeIndex += 1) ordered.push(next.items[activeIndex]!);
      state.value = { items: Object.freeze(ordered), paused: next.paused };
    };
    connection.value = createToast<string>({
      ...(controlled ? { items: props.toasts as readonly ToastInput<string>[] } : { initialToasts: props.initialToasts }),
      closeLabel: props.closeLabel, defaultDurationMs: props.defaultDurationMs, maxVisible: props.maxVisible,
      hotkey: props.hotkey, pauseOnWindowBlur: props.pauseOnWindowBlur, dismissOnEscape: props.dismissOnEscape,
      swipeDirection: props.swipeDirection, swipeThreshold: props.swipeThreshold, manageVisibility: false,
      onItemsChange: items => { if (disposed) return; refresh(); if (!disposed) emit('update:toasts', getToastInputs(items)); }, onUpdate: refresh,
    });
    refresh();
    const commands = toastCommands(connection.value);
    const connect = (root: HTMLElement, label: string, owner: object): void => {
      if (disposed || connection.value === undefined) return;
      if (viewport?.root === root && viewport.owner === owner) { connection.value.setViewport(root, label); return; }
      viewport = { root, owner }; exiting.clear(); state.value = { items: activeItems, paused: state.value.paused };
      connection.value.setViewport(root, label);
      if (disposed || viewport?.owner !== owner || connection.value === undefined) return;
      root.querySelectorAll<HTMLElement>('[data-sectile-toast-item]').forEach((node) => { const id = node.dataset['sectileToastItem']; if (id !== undefined) connection.value?.setToastAttributes(node, id); });
      root.querySelectorAll<HTMLButtonElement>('[data-sectile-toast-close]').forEach((node) => { const id = node.dataset['sectileToastClose']; if (id !== undefined) connection.value?.setCloseButtonAttributes(node, id); });
      refresh();
    };
    const disconnect = (owner: object): void => {
      if (disposed || viewport?.owner !== owner) return;
      viewport = undefined;
      connection.value?.setViewport(undefined);
      exiting.clear();
      state.value = { items: activeItems, paused: state.value.paused };
    };
    const context: ToastContext = {
      state, activeItems: activeByID, exiting, closeLabel, swipeDirection, connect, disconnect,
      push: commands.push, update: commands.update, dismiss: commands.dismiss, dismissAll: commands.dismissAll,
      finishExit,
      registerItem: (element, id, owner) => { if (!disposed && (owner === undefined || viewport?.owner === owner)) connection.value?.setToastAttributes(element, id); },
      registerClose: (element, id, owner) => { if (!disposed && (owner === undefined || viewport?.owner === owner)) connection.value?.setCloseButtonAttributes(element, id); },
    };
    provide(key, context);
    watch(() => props.toasts, items => { if (!controlled || items === undefined || disposed) return; const result = connection.value?.syncItems(items); if (result && !result.ok) throw new TypeError(result.error.message); });
    watch([() => props.closeLabel, () => props.hotkey, () => props.pauseOnWindowBlur, () => props.dismissOnEscape, () => props.swipeDirection, () => props.swipeThreshold], () => {
      if (disposed) return;
      const result = connection.value?.syncConfiguration({ closeLabel: props.closeLabel, hotkey: props.hotkey, pauseOnWindowBlur: props.pauseOnWindowBlur,
        dismissOnEscape: props.dismissOnEscape, swipeDirection: props.swipeDirection, swipeThreshold: props.swipeThreshold });
      if (result && !result.ok) throw new TypeError(result.error.message);
    });
    watch([() => props.defaultDurationMs, () => props.maxVisible], (_next, previous) => {
      if (disposed) return;
      const result = connection.value?.syncConfiguration({ defaultDurationMs: props.defaultDurationMs, maxVisible: props.maxVisible });
      if (result && !result.ok) throw new TypeError(result.error.message);
      if (controlled && props.toasts !== undefined && props.maxVisible !== previous[1]) {
        const synchronized = connection.value?.syncItems(props.toasts); if (synchronized && !synchronized.ok) throw new TypeError(synchronized.error.message);
      }
    });
    const dispose = (): void => {
      if (disposed) return; disposed = true;
      connection.value = undefined; viewport = undefined; published = undefined; exiting.clear();
      state.value = { items: activeItems, paused: state.value.paused };
      commands.dispose();
    };
    onBeforeUnmount(dispose); if (getCurrentScope() !== undefined) onScopeDispose(dispose);
    return (): VNodeChild => h(Fragment as Component, null, slots['default']?.({ toasts: state.value.items, paused: state.value.paused, toast: context.push, update: context.update, dismiss: context.dismiss, dismissAll: context.dismissAll }) ?? []);
  },
});

export function useToast(): UseToastReturn {
  const { state, push, update, dismiss, dismissAll } = useProvider('useToast');
  return Object.freeze({
    toasts: computed(() => state.value.items), paused: computed(() => state.value.paused),
    toast: push, update, dismiss, dismissAll,
  });
}

export const ToastPortal = /* @__PURE__ */ defineComponent({
  name: 'SectileToastPortal',
  inheritAttrs: false,
  props: {
    to: { type: [String, Object] as PropType<string | HTMLElement>, default: undefined },
    disabled: { type: Boolean, default: false },
    defer: { type: Boolean, default: false },
  },
  setup(props, { slots }) { useProvider('ToastPortal'); return (): VNodeChild => h(HostPortal as Component, props, slots); },
});

export const ToastViewport = /* @__PURE__ */ defineComponent({
  name: 'SectileToastViewport', inheritAttrs: false,
  props: { label: { type: String, default: 'Notifications' }, as: { type: [String, Object, Function] as PropType<PrimitiveAs>, default: 'ol' }, asChild: { type: Boolean, default: false } },
  setup(props, { attrs, slots }) {
    const root = useProvider('ToastViewport'); const element = shallowRef<HTMLElement>();
    const owner = {}; provide(viewportKey, owner);
    let mounted = false, disposed = false;
    const register = (candidate: unknown): void => {
      if (disposed) return;
      const next = candidate instanceof HTMLElement ? candidate : undefined;
      if (element.value === next) return;
      element.value = next;
      if (!mounted) return;
      if (next === undefined) root.disconnect(owner);
      else root.connect(next, props.label, owner);
    };
    const activate = (): void => { if (disposed) return; mounted = true; if (element.value !== undefined) root.connect(element.value, props.label, owner); };
    onMounted(activate); onActivated(activate);
    onDeactivated(() => { mounted = false; root.disconnect(owner); });
    onBeforeUnmount(() => { disposed = true; mounted = false; root.disconnect(owner); element.value = undefined; });
    watch(() => props.label, (label) => { if (!disposed && mounted && element.value !== undefined) root.connect(element.value, label, owner); });
    return (): VNodeChild => h(Primitive, mergeProps(attrs, { as: props.as, asChild: props.asChild, elementRef: register, tabindex: -1, role: 'region', 'aria-label': props.label, 'aria-live': 'polite', 'data-scope': 'toast', 'data-part': 'viewport', 'data-paused': String(root.state.value.paused) }), slots);
  },
});

const toastRootKey = Symbol('SectileToastRoot');
interface ToastRootContext { readonly id: ComputedRef<string>; readonly item: ComputedRef<ToastItem<string> | null> }
export const ToastRoot = /* @__PURE__ */ defineComponent({
  name: 'SectileToastRoot', inheritAttrs: false,
  props: { value: { type: String, required: true }, as: { type: [String, Object, Function] as PropType<PrimitiveAs>, default: 'li' }, asChild: { type: Boolean, default: false } },
  slots: Object as SlotsType<{ default: (props: ToastRootSlotProps) => VNodeChild }>,
  setup(props, { attrs, slots }) {
    const provider = useProvider('ToastRoot');
    const owner = inject<object | undefined>(viewportKey, undefined);
    const id = computed(() => props.value);
    const item = computed(() => {
      const active = provider.activeItems.value.get(id.value); if (active !== undefined) return active;
      void provider.state.value; return provider.exiting.get(id.value) ?? null;
    });
    const open = computed(() => provider.activeItems.value.has(id.value));
    const element = shallowRef<HTMLElement>();
    const present = usePresence(open, element);
    let registeredID: string | undefined;
    let alive = true;
    const register = (candidate: unknown): void => {
      if (!alive) return;
      const next = candidate instanceof HTMLElement ? candidate : undefined;
      if (element.value === next && registeredID === (next === undefined ? undefined : id.value)) return;
      if (registeredID !== undefined) provider.registerItem(undefined, registeredID, owner);
      element.value = next;
      registeredID = next === undefined ? undefined : id.value;
      if (next !== undefined) provider.registerItem(next, id.value, owner);
    };
    watch(id, (next) => {
      if (element.value === undefined || registeredID === next) return;
      if (registeredID !== undefined) provider.registerItem(undefined, registeredID, owner);
      registeredID = next;
      provider.registerItem(element.value, next, owner);
    });
    watch([open, present], ([active, rendered]) => {
      if (!active && !rendered) provider.finishExit(id.value);
    }, { flush: 'post' });
    onBeforeUnmount(() => {
      alive = false;
      if (registeredID !== undefined) provider.registerItem(undefined, registeredID, owner);
      registeredID = undefined;
      element.value = undefined;
    });
    provide(toastRootKey, { id, item });
    return (): VNodeChild => {
      const exiting = !open.value && present.value;
      return h(Primitive, mergeProps(attrs, {
        as: props.as, asChild: props.asChild, elementRef: register, hidden: !present.value,
        ...(exiting ? { inert: true, 'aria-hidden': 'true' } : {}),
        role: item.value?.kind === 'error' ? 'alert' : 'status', 'data-sectile-toast-item': id.value,
        'data-scope': 'toast', 'data-part': 'root', 'data-state': open.value ? 'open' : 'closed',
        'data-swipe-direction': provider.swipeDirection.value, 'data-kind': item.value?.kind,
      }), { default: () => slots['default']?.({ toast: item.value, open: open.value }) });
    };
  },
});

export const ToastTitle = /* @__PURE__ */ toastTextPart('SectileToastTitle', 'title');
export const ToastDescription = /* @__PURE__ */ toastTextPart('SectileToastDescription', 'description');
export const ToastClose = /* @__PURE__ */ defineComponent({
  name: 'SectileToastClose', inheritAttrs: false,
  props: { as: { type: [String, Object, Function] as PropType<PrimitiveAs>, default: 'button' }, asChild: { type: Boolean, default: false } },
  setup(props, { attrs, slots }) {
    const provider = useProvider('ToastClose'); const root = useToastRoot('ToastClose');
    const owner = inject<object | undefined>(viewportKey, undefined);
    const element = shallowRef<HTMLButtonElement>();
    let registeredID: string | undefined;
    let alive = true;
    const register = (candidate: unknown): void => {
      if (!alive) return;
      const next = candidate instanceof HTMLButtonElement ? candidate : undefined;
      if (element.value === next && registeredID === (next === undefined ? undefined : root.id.value)) return;
      if (registeredID !== undefined) provider.registerClose(undefined, registeredID, owner);
      element.value = next;
      registeredID = next === undefined ? undefined : root.id.value;
      if (next !== undefined) provider.registerClose(next, root.id.value, owner);
    };
    watch(root.id, (next) => {
      if (element.value === undefined || registeredID === next) return;
      if (registeredID !== undefined) provider.registerClose(undefined, registeredID, owner);
      registeredID = next;
      provider.registerClose(element.value, next, owner);
    });
    onBeforeUnmount(() => {
      alive = false;
      if (registeredID !== undefined) provider.registerClose(undefined, registeredID, owner);
      registeredID = undefined;
      element.value = undefined;
    });
    return (): VNodeChild => h(Primitive, mergeProps(attrs, { as: props.as, asChild: props.asChild, elementRef: register, type: props.as === 'button' ? 'button' : undefined, 'aria-label': provider.closeLabel.value, 'data-sectile-toast-close': root.id.value, 'data-scope': 'toast', 'data-part': 'close' }), slots);
  },
});

function toastTextPart(name: string, part: 'title' | 'description') { return defineComponent({ name, inheritAttrs: false, props: { as: { type: [String, Object, Function] as PropType<PrimitiveAs>, default: part === 'title' ? 'h2' : 'p' }, asChild: { type: Boolean, default: false } }, setup(props, { attrs, slots }) { const root = useToastRoot(name); return (): VNodeChild => h(Primitive, mergeProps(attrs, { as: props.as, asChild: props.asChild, 'data-scope': 'toast', 'data-part': part }), { default: () => slots['default']?.() ?? (part === 'title' ? root.item.value?.title : root.item.value?.description) }); } }); }
function useProvider(part: string): ToastContext { const context = inject<ToastContext>(key); if (context === undefined) throw new TypeError(`${part} must be used inside ToastProvider.`); return context; }
function useToastRoot(part: string): ToastRootContext { const context = inject<ToastRootContext>(toastRootKey); if (context === undefined) throw new TypeError(`${part} must be used inside ToastRoot.`); return context; }
function toastCommands(connection: NativeToastConnection | undefined) {
  return {
    push(input: ToastInput<string>): void { connection?.push(input); },
    update(id: string, toast: Partial<Omit<ToastInput<string>, 'id'>>): void { connection?.updateToast(id, toast); },
    dismiss(id: string): void { connection?.dismiss(id); },
    dismissAll(): void { connection?.dismissAll(); },
    dispose(): void { const owned = connection; connection = undefined; owned?.destroy(); },
  };
}
