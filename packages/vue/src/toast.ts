import {
  Fragment, Teleport, computed, defineComponent, h, inject, mergeProps, onBeforeUnmount,
  onMounted, provide, shallowRef, watch, type Component, type ComputedRef, type PropType,
  type ShallowRef, type SlotsType, type VNodeChild,
} from 'vue';
import { createToast, createToastState, type ToastConnection, type ToastInput, type ToastItem } from '@sectile/dom/toast';
import { Primitive, type PrimitiveAs } from './primitive.js';
import { useHostPortalTarget } from './host-provider.js';
import { useControlledStateInvariant } from './internal/controlled-state.js';

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
export interface ToastProviderSlotProps { readonly toasts: readonly ToastItem<string>[]; readonly paused: boolean; toast(input: ToastInput<string>): void; dismiss(id: string): void; dismissAll(): void }
export interface ToastPartProps { readonly as?: PrimitiveAs; readonly asChild?: boolean }
export interface ToastPortalProps { readonly to?: string | HTMLElement; readonly disabled?: boolean; readonly defer?: boolean }
export interface ToastRootProps extends ToastPartProps { readonly value: string }
export interface ToastRootSlotProps { readonly toast: ToastItem<string> | null; readonly open: boolean }

interface ToastContext {
  readonly state: ShallowRef<{ readonly items: readonly ToastItem<string>[]; readonly paused: boolean }>;
  readonly activeIDs: ShallowRef<ReadonlySet<string>>;
  readonly connection: ShallowRef<ToastConnection<string> | undefined>;
  readonly closeLabel: ComputedRef<string>;
  readonly swipeDirection: ComputedRef<'up' | 'right' | 'down' | 'left'>;
  connect(root: HTMLElement, label: string): void;
  disconnect(): void;
  push(input: ToastInput<string>): void;
  dismiss(id: string): void;
  dismissAll(): void;
  registerItem(element: HTMLElement, id: string): void;
  registerClose(element: HTMLButtonElement, id: string): void;
}
const key = Symbol('SectileToastProvider');

export const ToastProvider = defineComponent({
  name: 'SectileToastProvider',
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
    const pending: ToastInput<string>[] = [];
    const controlled = useControlledStateInvariant('ToastProvider', 'toasts', () => props.toasts);
    const initialState = createToastState(props.toasts ?? props.initialToasts, false, { defaultDurationMs: props.defaultDurationMs, maxVisible: props.maxVisible });
    const state = shallowRef(initialState);
    const activeIDs = shallowRef<ReadonlySet<string>>(new Set(initialState.items.map((item) => item.id)));
    const closeLabel = computed(() => props.closeLabel);
    const swipeDirection = computed(() => props.swipeDirection);
    let activeItems = [...initialState.items];
    let viewport: { readonly root: HTMLElement; readonly label: string } | undefined;
    const exiting = new Map<string, ToastItem<string>>();
    const elements = new Map<string, HTMLElement>();
    const exitCleanups = new Map<string, () => void>();

    const finishExit = (id: string): void => {
      exitCleanups.get(id)?.(); exitCleanups.delete(id); exiting.delete(id); elements.delete(id);
      state.value = { ...state.value, items: Object.freeze(state.value.items.filter((item) => item.id !== id)) };
    };
    const scheduleExit = (id: string): void => {
      if (exitCleanups.has(id)) return;
      const element = elements.get(id); if (element === undefined) return;
      const start = setTimeout(() => {
        const duration = motionDuration(element);
        if (duration === 0) { finishExit(id); return; }
        const done = (event: Event): void => { if (event.target === element) finishExit(id); };
        element.addEventListener('animationend', done); element.addEventListener('transitionend', done);
        const fallback = setTimeout(() => finishExit(id), duration + 50);
        exitCleanups.set(id, () => { clearTimeout(fallback); element.removeEventListener('animationend', done); element.removeEventListener('transitionend', done); });
      }, 0);
      exitCleanups.set(id, () => { clearTimeout(start); });
    };
    const refresh = (): void => {
      const next = connection.value?.getSnapshot().state; if (next === undefined) return;
      const nextIDs = new Set(next.items.map((item) => item.id));
      for (const item of activeItems) if (!nextIDs.has(item.id)) exiting.set(item.id, item);
      for (const item of next.items) { exiting.delete(item.id); exitCleanups.get(item.id)?.(); exitCleanups.delete(item.id); }
      activeItems = [...next.items]; activeIDs.value = nextIDs;
      const byID = new Map([...next.items, ...exiting.values()].map((item) => [item.id, item]));
      const ordered = [
        ...state.value.items.map((item) => byID.get(item.id)).filter((item): item is ToastItem<string> => item !== undefined),
        ...next.items.filter((item) => !state.value.items.some((previous) => previous.id === item.id)),
      ];
      state.value = { items: Object.freeze(ordered), paused: next.paused };
      for (const id of exiting.keys()) scheduleExit(id);
    };
    const connect = (root: HTMLElement, label: string): void => {
      viewport = { root, label }; connection.value?.disconnect();
      connection.value = createToast({
        root, ...(controlled ? { items: props.toasts as readonly ToastInput<string>[] } : { initialToasts: props.initialToasts }),
        label, closeLabel: props.closeLabel, defaultDurationMs: props.defaultDurationMs, maxVisible: props.maxVisible,
        hotkey: props.hotkey, pauseOnWindowBlur: props.pauseOnWindowBlur, dismissOnEscape: props.dismissOnEscape,
        swipeDirection: props.swipeDirection, swipeThreshold: props.swipeThreshold, manageVisibility: false,
        onItemsChange: (items) => { emit('update:toasts', items.map(toInput)); }, onUpdate: refresh,
      });
      for (const input of pending.splice(0)) connection.value.push(input);
      root.querySelectorAll<HTMLElement>('[data-sectile-toast-item]').forEach((node) => { const id = node.dataset['sectileToastItem']; if (id !== undefined) connection.value?.setToastAttributes(node, id); });
      root.querySelectorAll<HTMLButtonElement>('[data-sectile-toast-close]').forEach((node) => { const id = node.dataset['sectileToastClose']; if (id !== undefined) connection.value?.setCloseButtonAttributes(node, id); });
      refresh();
    };
    const disconnect = (): void => { connection.value?.disconnect(); connection.value = undefined; for (const cleanup of exitCleanups.values()) cleanup(); exitCleanups.clear(); };
    const context: ToastContext = {
      state, activeIDs, connection, closeLabel, swipeDirection, connect, disconnect,
      push: (input) => { if (connection.value === undefined) pending.push(input); else connection.value.push(input); refresh(); },
      dismiss: (id) => { connection.value?.dismiss(id); refresh(); },
      dismissAll: () => { connection.value?.dismissAll(); refresh(); },
      registerItem: (element, id) => { elements.set(id, element); connection.value?.setToastAttributes(element, id); if (!activeIDs.value.has(id)) scheduleExit(id); },
      registerClose: (element, id) => connection.value?.setCloseButtonAttributes(element, id),
    };
    provide(key, context);
    watch(() => props.toasts, (items) => { if (!controlled || items === undefined || connection.value === undefined) return; const result = connection.value.syncItems(items); if (!result.ok) throw new TypeError(result.error.message); refresh(); });
    watch([() => props.closeLabel, () => props.hotkey, () => props.pauseOnWindowBlur, () => props.dismissOnEscape, () => props.swipeDirection, () => props.swipeThreshold, () => props.defaultDurationMs, () => props.maxVisible], () => { if (viewport !== undefined) connect(viewport.root, viewport.label); });
    onBeforeUnmount(disconnect);
    return (): VNodeChild => h(Fragment as Component, null, slots['default']?.({ toasts: state.value.items, paused: state.value.paused, toast: context.push, dismiss: context.dismiss, dismissAll: context.dismissAll }) ?? []);
  },
});

export const ToastPortal = defineComponent({
  name: 'SectileToastPortal',
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
    onMounted(() => { if (element.value !== undefined) root.connect(element.value, props.label); });
    watch(() => props.label, (label) => { if (element.value !== undefined) root.connect(element.value, label); });
    return (): VNodeChild => h(Primitive, mergeProps(attrs, { as: props.as, asChild: props.asChild, elementRef: (candidate: unknown) => { if (candidate instanceof HTMLElement) element.value = candidate; }, tabindex: -1, role: 'region', 'aria-label': props.label, 'aria-live': 'polite', 'data-scope': 'toast', 'data-part': 'viewport', 'data-paused': String(root.state.value.paused) }), slots);
  },
});

const toastRootKey = Symbol('SectileToastRoot');
interface ToastRootContext { readonly id: string; readonly item: ComputedRef<ToastItem<string> | null> }
export const ToastRoot = defineComponent({
  name: 'SectileToastRoot', inheritAttrs: false,
  props: { value: { type: String, required: true }, as: { type: [String, Object, Function] as PropType<PrimitiveAs>, default: 'li' }, asChild: { type: Boolean, default: false } },
  slots: Object as SlotsType<{ default: (props: ToastRootSlotProps) => VNodeChild }>,
  setup(props, { attrs, slots }) {
    const provider = useProvider('ToastRoot'); const item = computed(() => provider.state.value.items.find((candidate) => candidate.id === props.value) ?? null); const open = computed(() => provider.activeIDs.value.has(props.value));
    provide(toastRootKey, { id: props.value, item });
    return (): VNodeChild => h(Primitive, mergeProps(attrs, { as: props.as, asChild: props.asChild, elementRef: (element: unknown) => { if (element instanceof HTMLElement) provider.registerItem(element, props.value); }, hidden: item.value === null, role: item.value?.kind === 'error' ? 'alert' : 'status', 'data-sectile-toast-item': props.value, 'data-scope': 'toast', 'data-part': 'root', 'data-state': open.value ? 'open' : 'closed', 'data-swipe-direction': provider.swipeDirection.value, 'data-kind': item.value?.kind }), { default: () => slots['default']?.({ toast: item.value, open: open.value }) });
  },
});

export const ToastTitle = toastTextPart('SectileToastTitle', 'title');
export const ToastDescription = toastTextPart('SectileToastDescription', 'description');
export const ToastClose = defineComponent({
  name: 'SectileToastClose', inheritAttrs: false,
  props: { as: { type: [String, Object, Function] as PropType<PrimitiveAs>, default: 'button' }, asChild: { type: Boolean, default: false } },
  setup(props, { attrs, slots }) { const provider = useProvider('ToastClose'); const root = useToastRoot('ToastClose'); return (): VNodeChild => h(Primitive, mergeProps(attrs, { as: props.as, asChild: props.asChild, elementRef: (element: unknown) => { if (element instanceof HTMLButtonElement) provider.registerClose(element, root.id); }, type: props.as === 'button' ? 'button' : undefined, 'aria-label': provider.closeLabel.value, 'data-sectile-toast-close': root.id, 'data-scope': 'toast', 'data-part': 'close' }), slots); },
});

function toastTextPart(name: string, part: 'title' | 'description') { return defineComponent({ name, inheritAttrs: false, props: { as: { type: [String, Object, Function] as PropType<PrimitiveAs>, default: part === 'title' ? 'h2' : 'p' }, asChild: { type: Boolean, default: false } }, setup(props, { attrs, slots }) { const root = useToastRoot(name); return (): VNodeChild => h(Primitive, mergeProps(attrs, { as: props.as, asChild: props.asChild, 'data-scope': 'toast', 'data-part': part }), { default: () => slots['default']?.() ?? (part === 'title' ? root.item.value?.title : root.item.value?.description) }); } }); }
function useProvider(part: string): ToastContext { const context = inject<ToastContext>(key); if (context === undefined) throw new TypeError(`${part} must be used inside ToastProvider.`); return context; }
function useToastRoot(part: string): ToastRootContext { const context = inject<ToastRootContext>(toastRootKey); if (context === undefined) throw new TypeError(`${part} must be used inside ToastRoot.`); return context; }
function toInput(item: ToastItem<string>): ToastInput<string> { return Object.freeze({ id: item.id, title: item.title, ...(item.description === null ? {} : { description: item.description }), kind: item.kind, durationMs: item.durationMs }); }
function motionDuration(element: HTMLElement): number { const view = element.ownerDocument?.defaultView; if (view === null || view === undefined) return 0; const style = view.getComputedStyle(element); return Math.max(totalMotion(style.animationDuration, style.animationDelay), totalMotion(style.transitionDuration, style.transitionDelay)); }
function totalMotion(durations: string, delays: string): number { const durationValues = durations.split(',').map(timeMs); const delayValues = delays.split(',').map(timeMs); return durationValues.reduce((maximum, duration, index) => Math.max(maximum, duration + (delayValues[index % Math.max(1, delayValues.length)] ?? 0)), 0); }
function timeMs(value: string): number { const text = value.trim(); return text.endsWith('ms') ? Number.parseFloat(text) || 0 : (Number.parseFloat(text) || 0) * 1_000; }
