import {
  Fragment, Teleport, computed, defineComponent, h, inject, mergeProps, onBeforeUnmount,
  onMounted, provide, shallowRef, watch, type Component, type ComputedRef, type PropType,
  type ShallowRef, type SlotsType, type VNodeChild,
} from 'vue';
import { createToast, createToastState, type ToastConnection, type ToastInput, type ToastItem } from '@sectile/dom/toast';
import { Primitive, type PrimitiveAs } from './primitive.js';
import { useHostPortalTarget } from './host-provider.js';
import { useControlledStateInvariant } from './internal/controlled-state.js';
import { usePresence } from './internal/presence.js';

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

type ToastRegistrationConnection = Omit<ToastConnection<string>, 'setToastAttributes' | 'setCloseButtonAttributes'> & {
  setToastAttributes(element: HTMLElement | undefined, id: string): void;
  setCloseButtonAttributes(element: HTMLButtonElement | undefined, id: string): void;
};

interface ToastContext {
  readonly state: ShallowRef<{ readonly items: readonly ToastItem<string>[]; readonly paused: boolean }>;
  readonly activeIDs: ShallowRef<ReadonlySet<string>>;
  readonly connection: ShallowRef<ToastConnection<string> | undefined>;
  readonly closeLabel: ComputedRef<string>;
  readonly swipeDirection: ComputedRef<'up' | 'right' | 'down' | 'left'>;
  connect(root: HTMLElement, label: string): void;
  disconnect(): void;
  push(input: ToastInput<string>): void;
  update(id: string, toast: Partial<Omit<ToastInput<string>, 'id'>>): void;
  dismiss(id: string): void;
  dismissAll(): void;
  finishExit(id: string): void;
  registerItem(element: HTMLElement | undefined, id: string): void;
  registerClose(element: HTMLButtonElement | undefined, id: string): void;
}
const key = Symbol('SectileToastProvider');

export const ToastProvider = defineComponent({
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
    const connection = shallowRef<ToastConnection<string>>();
    const pending: Array<(target: ToastConnection<string>) => void> = [];
    const controlled = useControlledStateInvariant('ToastProvider', 'toasts', () => props.toasts);
    const initialState = createToastState(props.toasts ?? props.initialToasts, false, { defaultDurationMs: props.defaultDurationMs, maxVisible: props.maxVisible });
    const state = shallowRef(initialState);
    const activeIDs = shallowRef<ReadonlySet<string>>(new Set(initialState.items.map((item) => item.id)));
    const closeLabel = computed(() => props.closeLabel);
    const swipeDirection = computed(() => props.swipeDirection);
    let activeItems = [...initialState.items];
    let viewport: { readonly root: HTMLElement; readonly label: string } | undefined;
    const exiting = new Map<string, ToastItem<string>>();

    const finishExit = (id: string): void => {
      if (activeIDs.value.has(id) || !exiting.delete(id)) return;
      state.value = { ...state.value, items: Object.freeze(state.value.items.filter((item) => item.id !== id)) };
    };
    const refresh = (): void => {
      const next = connection.value?.getSnapshot().state; if (next === undefined) return;
      const nextIDs = new Set(next.items.map((item) => item.id));
      for (const item of activeItems) if (!nextIDs.has(item.id)) exiting.set(item.id, item);
      for (const item of next.items) exiting.delete(item.id);
      activeItems = [...next.items]; activeIDs.value = nextIDs;
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
    const connect = (root: HTMLElement, label: string): void => {
      viewport = { root, label }; connection.value?.disconnect();
      connection.value = createToast({
        root, ...(controlled ? { items: props.toasts as readonly ToastInput<string>[] } : { initialToasts: activeItems.map(toInput) }),
        label, closeLabel: props.closeLabel, defaultDurationMs: props.defaultDurationMs, maxVisible: props.maxVisible,
        hotkey: props.hotkey, pauseOnWindowBlur: props.pauseOnWindowBlur, dismissOnEscape: props.dismissOnEscape,
        swipeDirection: props.swipeDirection, swipeThreshold: props.swipeThreshold, manageVisibility: false,
        onItemsChange: (items) => { emit('update:toasts', items.map(toInput)); }, onUpdate: refresh,
      });
      for (const send of pending.splice(0)) send(connection.value);
      root.querySelectorAll<HTMLElement>('[data-sectile-toast-item]').forEach((node) => { const id = node.dataset['sectileToastItem']; if (id !== undefined) connection.value?.setToastAttributes(node, id); });
      root.querySelectorAll<HTMLButtonElement>('[data-sectile-toast-close]').forEach((node) => { const id = node.dataset['sectileToastClose']; if (id !== undefined) connection.value?.setCloseButtonAttributes(node, id); });
      refresh();
    };
    const disconnect = (): void => {
      connection.value?.disconnect();
      connection.value = undefined;
      viewport = undefined;
      exiting.clear();
      state.value = { ...state.value, items: Object.freeze([...activeItems]) };
    };
    const send = (event: (target: ToastConnection<string>) => void): void => { const target = connection.value; if (target === undefined) pending.push(event); else event(target); refresh(); };
    const context: ToastContext = {
      state, activeIDs, connection, closeLabel, swipeDirection, connect, disconnect,
      push: (input) => send((target) => { target.push(input); }),
      update: (id, toast) => send((target) => { target.updateToast(id, toast); }),
      dismiss: (id) => send((target) => { target.dismiss(id); }),
      dismissAll: () => send((target) => { target.dismissAll(); }),
      finishExit,
      registerItem: (element, id) => (connection.value as ToastRegistrationConnection | undefined)?.setToastAttributes(element, id),
      registerClose: (element, id) => (connection.value as ToastRegistrationConnection | undefined)?.setCloseButtonAttributes(element, id),
    };
    provide(key, context);
    watch(() => props.toasts, (items) => { if (!controlled || items === undefined || connection.value === undefined) return; const result = connection.value.syncItems(items); if (!result.ok) throw new TypeError(result.error.message); refresh(); });
    watch([() => props.closeLabel, () => props.hotkey, () => props.pauseOnWindowBlur, () => props.dismissOnEscape, () => props.swipeDirection, () => props.swipeThreshold, () => props.defaultDurationMs, () => props.maxVisible], () => { if (viewport !== undefined) connect(viewport.root, viewport.label); });
    onBeforeUnmount(() => { disconnect(); pending.length = 0; exiting.clear(); });
    return (): VNodeChild => h(Fragment as Component, null, slots['default']?.({ toasts: state.value.items, paused: state.value.paused, toast: context.push, update: context.update, dismiss: context.dismiss, dismissAll: context.dismissAll }) ?? []);
  },
});

export function useToast(): UseToastReturn {
  const context = useProvider('useToast');
  return Object.freeze({
    toasts: computed(() => context.state.value.items),
    paused: computed(() => context.state.value.paused),
    toast: context.push,
    update: context.update,
    dismiss: context.dismiss,
    dismissAll: context.dismissAll,
  });
}

export const ToastPortal = defineComponent({
  name: 'SectileToastPortal',
  inheritAttrs: false,
  props: {
    to: { type: [String, Object] as PropType<string | HTMLElement>, default: undefined },
    disabled: { type: Boolean, default: false },
    defer: { type: Boolean, default: false },
  },
  setup(props, { slots }) { useProvider('ToastPortal'); const portalTarget = useHostPortalTarget(); return (): VNodeChild => h(Teleport as Component, { to: props.to ?? portalTarget.value ?? 'body', disabled: props.disabled, defer: props.defer }, slots['default']?.()); },
});

export const ToastViewport = defineComponent({
  name: 'SectileToastViewport', inheritAttrs: false,
  props: { label: { type: String, default: 'Notifications' }, as: { type: [String, Object, Function] as PropType<PrimitiveAs>, default: 'ol' }, asChild: { type: Boolean, default: false } },
  setup(props, { attrs, slots }) {
    const root = useProvider('ToastViewport'); const element = shallowRef<HTMLElement>();
    let mounted = false;
    const register = (candidate: unknown): void => {
      const next = candidate instanceof HTMLElement ? candidate : undefined;
      if (element.value === next) return;
      element.value = next;
      if (!mounted) return;
      if (next === undefined) root.disconnect();
      else root.connect(next, props.label);
    };
    onMounted(() => { mounted = true; if (element.value !== undefined) root.connect(element.value, props.label); });
    onBeforeUnmount(() => { mounted = false; root.disconnect(); element.value = undefined; });
    watch(() => props.label, (label) => { if (element.value !== undefined) root.connect(element.value, label); });
    return (): VNodeChild => h(Primitive, mergeProps(attrs, { as: props.as, asChild: props.asChild, elementRef: register, tabindex: -1, role: 'region', 'aria-label': props.label, 'aria-live': 'polite', 'data-scope': 'toast', 'data-part': 'viewport', 'data-paused': String(root.state.value.paused) }), slots);
  },
});

const toastRootKey = Symbol('SectileToastRoot');
interface ToastRootContext { readonly id: ComputedRef<string>; readonly item: ComputedRef<ToastItem<string> | null> }
export const ToastRoot = defineComponent({
  name: 'SectileToastRoot', inheritAttrs: false,
  props: { value: { type: String, required: true }, as: { type: [String, Object, Function] as PropType<PrimitiveAs>, default: 'li' }, asChild: { type: Boolean, default: false } },
  slots: Object as SlotsType<{ default: (props: ToastRootSlotProps) => VNodeChild }>,
  setup(props, { attrs, slots }) {
    const provider = useProvider('ToastRoot');
    const id = computed(() => props.value);
    const item = computed(() => provider.state.value.items.find((candidate) => candidate.id === id.value) ?? null);
    const open = computed(() => provider.activeIDs.value.has(id.value));
    const element = shallowRef<HTMLElement>();
    const present = usePresence(open, element);
    let registeredID: string | undefined;
    const register = (candidate: unknown): void => {
      const next = candidate instanceof HTMLElement ? candidate : undefined;
      if (element.value === next && registeredID === (next === undefined ? undefined : id.value)) return;
      if (registeredID !== undefined) provider.registerItem(undefined, registeredID);
      element.value = next;
      registeredID = next === undefined ? undefined : id.value;
      if (next !== undefined) provider.registerItem(next, id.value);
    };
    watch(id, (next) => {
      if (element.value === undefined || registeredID === next) return;
      if (registeredID !== undefined) provider.registerItem(undefined, registeredID);
      registeredID = next;
      provider.registerItem(element.value, next);
    });
    watch([open, present], ([active, rendered]) => {
      if (!active && !rendered) provider.finishExit(id.value);
    }, { flush: 'post' });
    onBeforeUnmount(() => {
      if (registeredID !== undefined) provider.registerItem(undefined, registeredID);
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

export const ToastTitle = toastTextPart('SectileToastTitle', 'title');
export const ToastDescription = toastTextPart('SectileToastDescription', 'description');
export const ToastClose = defineComponent({
  name: 'SectileToastClose', inheritAttrs: false,
  props: { as: { type: [String, Object, Function] as PropType<PrimitiveAs>, default: 'button' }, asChild: { type: Boolean, default: false } },
  setup(props, { attrs, slots }) {
    const provider = useProvider('ToastClose'); const root = useToastRoot('ToastClose');
    const element = shallowRef<HTMLButtonElement>();
    let registeredID: string | undefined;
    const register = (candidate: unknown): void => {
      const next = candidate instanceof HTMLButtonElement ? candidate : undefined;
      if (element.value === next && registeredID === (next === undefined ? undefined : root.id.value)) return;
      if (registeredID !== undefined) provider.registerClose(undefined, registeredID);
      element.value = next;
      registeredID = next === undefined ? undefined : root.id.value;
      if (next !== undefined) provider.registerClose(next, root.id.value);
    };
    watch(root.id, (next) => {
      if (element.value === undefined || registeredID === next) return;
      if (registeredID !== undefined) provider.registerClose(undefined, registeredID);
      registeredID = next;
      provider.registerClose(element.value, next);
    });
    onBeforeUnmount(() => {
      if (registeredID !== undefined) provider.registerClose(undefined, registeredID);
      registeredID = undefined;
      element.value = undefined;
    });
    return (): VNodeChild => h(Primitive, mergeProps(attrs, { as: props.as, asChild: props.asChild, elementRef: register, type: props.as === 'button' ? 'button' : undefined, 'aria-label': provider.closeLabel.value, 'data-sectile-toast-close': root.id.value, 'data-scope': 'toast', 'data-part': 'close' }), slots);
  },
});

function toastTextPart(name: string, part: 'title' | 'description') { return defineComponent({ name, inheritAttrs: false, props: { as: { type: [String, Object, Function] as PropType<PrimitiveAs>, default: part === 'title' ? 'h2' : 'p' }, asChild: { type: Boolean, default: false } }, setup(props, { attrs, slots }) { const root = useToastRoot(name); return (): VNodeChild => h(Primitive, mergeProps(attrs, { as: props.as, asChild: props.asChild, 'data-scope': 'toast', 'data-part': part }), { default: () => slots['default']?.() ?? (part === 'title' ? root.item.value?.title : root.item.value?.description) }); } }); }
function useProvider(part: string): ToastContext { const context = inject<ToastContext>(key); if (context === undefined) throw new TypeError(`${part} must be used inside ToastProvider.`); return context; }
function useToastRoot(part: string): ToastRootContext { const context = inject<ToastRootContext>(toastRootKey); if (context === undefined) throw new TypeError(`${part} must be used inside ToastRoot.`); return context; }
function toInput(item: ToastItem<string>): ToastInput<string> { return Object.freeze({ id: item.id, title: item.title, ...(item.description === null ? {} : { description: item.description }), kind: item.kind, durationMs: item.durationMs }); }
