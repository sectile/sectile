import { Fragment, computed, defineComponent, h, inject, mergeProps, onBeforeUnmount, onMounted, provide, shallowRef, type Component, type ComputedRef, type PropType, type ShallowRef, type SlotsType, type VNodeChild } from 'vue';
import { createToast, type ToastConnection, type ToastInput, type ToastItem } from '@sectile/dom/toast';
import { Primitive, type PrimitiveAs } from './primitive.js';

export interface ToastProviderProps { readonly initialToasts?: readonly ToastInput<string>[]; readonly defaultDurationMs?: number | null; readonly maxVisible?: number }
export interface ToastProviderSlotProps { readonly toasts: readonly ToastItem<string>[]; readonly paused: boolean; toast(input: ToastInput<string>): void; dismiss(id: string): void; dismissAll(): void }
export interface ToastPartProps { readonly as?: PrimitiveAs; readonly asChild?: boolean }
export interface ToastRootProps extends ToastPartProps { readonly value: string }
export interface ToastRootSlotProps { readonly toast: ToastItem<string> | null; readonly open: boolean }

interface ToastContext {
  readonly state: ShallowRef<{ readonly items: readonly ToastItem<string>[]; readonly paused: boolean }>;
  readonly connection: ShallowRef<ToastConnection<string> | undefined>;
  readonly options: { readonly defaultDurationMs?: number | null; readonly maxVisible?: number };
  connect(root: HTMLElement): void;
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
  props: { initialToasts: { type: Array as PropType<readonly ToastInput<string>[]>, default: () => [] }, defaultDurationMs: { type: Number as PropType<number | null>, default: 5_000 }, maxVisible: { type: Number, default: 3 } },
  slots: Object as SlotsType<{ default: (props: ToastProviderSlotProps) => VNodeChild }>,
  setup(props, { slots }) {
    const connection = shallowRef<ToastConnection<string>>();
    const pending: ToastInput<string>[] = [];
    const initialItems = props.initialToasts.map((item): ToastItem<string> => Object.freeze({ id: item.id, title: item.title.trim(), description: item.description?.trim() || null, kind: item.kind ?? 'info', durationMs: item.durationMs === undefined ? props.defaultDurationMs : item.durationMs, remainingMs: item.durationMs === undefined ? props.defaultDurationMs : item.durationMs }));
    const state = shallowRef({ items: Object.freeze(initialItems), paused: false });
    const options = { defaultDurationMs: props.defaultDurationMs, maxVisible: props.maxVisible };
    const refresh = (): void => { const next = connection.value?.getSnapshot().state; if (next !== undefined) state.value = next; };
    const context: ToastContext = {
      state, connection, options,
      connect: (root) => {
        connection.value?.disconnect();
        connection.value = createToast({ root, initialToasts: props.initialToasts, defaultDurationMs: props.defaultDurationMs, maxVisible: props.maxVisible, onUpdate: refresh });
        for (const input of pending.splice(0)) connection.value.push(input);
        root.querySelectorAll<HTMLElement>('[data-sectile-toast-item]').forEach((node) => { const id = node.dataset['sectileToastItem']; if (id !== undefined) connection.value?.setToastAttributes(node, id); });
        root.querySelectorAll<HTMLButtonElement>('[data-sectile-toast-close]').forEach((node) => { const id = node.dataset['sectileToastClose']; if (id !== undefined) connection.value?.setCloseButtonAttributes(node, id); });
        refresh();
      },
      disconnect: () => { connection.value?.disconnect(); connection.value = undefined; },
      push: (input) => { if (connection.value === undefined) pending.push(input); else connection.value.push(input); refresh(); },
      dismiss: (id) => { connection.value?.dismiss(id); refresh(); },
      dismissAll: () => { connection.value?.dismissAll(); refresh(); },
      registerItem: (element, id) => connection.value?.setToastAttributes(element, id),
      registerClose: (element, id) => connection.value?.setCloseButtonAttributes(element, id),
    };
    provide(key, context); onBeforeUnmount(context.disconnect);
    return (): VNodeChild => h(Fragment as Component, null, slots['default']?.({ toasts: state.value.items, paused: state.value.paused, toast: context.push, dismiss: context.dismiss, dismissAll: context.dismissAll }) ?? []);
  },
});

export const ToastViewport = defineComponent({
  name: 'SectileToastViewport', inheritAttrs: false,
  props: { label: { type: String, default: 'Notifications' }, as: { type: [String, Object, Function] as PropType<PrimitiveAs>, default: 'ol' }, asChild: { type: Boolean, default: false } },
  setup(props, { attrs, slots }) {
    const root = useProvider('ToastViewport');
    const element = shallowRef<HTMLElement>();
    onMounted(() => { if (element.value !== undefined) root.connect(element.value); });
    return (): VNodeChild => h(Primitive, mergeProps(attrs, { as: props.as, asChild: props.asChild, elementRef: (candidate: unknown) => { if (candidate instanceof HTMLElement) element.value = candidate; }, role: 'region', 'aria-label': props.label, 'aria-live': 'polite', 'data-scope': 'toast', 'data-part': 'viewport', 'data-paused': String(root.state.value.paused) }), slots);
  },
});

const toastRootKey = Symbol('SectileToastRoot');
interface ToastRootContext { readonly id: string; readonly item: ComputedRef<ToastItem<string> | null> }
export const ToastRoot = defineComponent({
  name: 'SectileToastRoot', inheritAttrs: false,
  props: { value: { type: String, required: true }, as: { type: [String, Object, Function] as PropType<PrimitiveAs>, default: 'li' }, asChild: { type: Boolean, default: false } },
  slots: Object as SlotsType<{ default: (props: ToastRootSlotProps) => VNodeChild }>,
  setup(props, { attrs, slots }) { const provider = useProvider('ToastRoot'); const item = computed(() => provider.state.value.items.find((candidate) => candidate.id === props.value) ?? null); provide(toastRootKey, { id: props.value, item }); return (): VNodeChild => h(Primitive, mergeProps(attrs, { as: props.as, asChild: props.asChild, elementRef: (element: unknown) => { if (element instanceof HTMLElement) provider.registerItem(element, props.value); }, hidden: item.value === null, role: item.value?.kind === 'error' ? 'alert' : 'status', 'data-sectile-toast-item': props.value, 'data-scope': 'toast', 'data-part': 'root', 'data-state': item.value === null ? 'closed' : 'open', 'data-kind': item.value?.kind }), { default: () => slots['default']?.({ toast: item.value, open: item.value !== null }) }); },
});

export const ToastTitle = toastTextPart('SectileToastTitle', 'title');
export const ToastDescription = toastTextPart('SectileToastDescription', 'description');
export const ToastClose = defineComponent({
  name: 'SectileToastClose', inheritAttrs: false,
  props: { as: { type: [String, Object, Function] as PropType<PrimitiveAs>, default: 'button' }, asChild: { type: Boolean, default: false } },
  setup(props, { attrs, slots }) { const provider = useProvider('ToastClose'); const root = useToastRoot('ToastClose'); return (): VNodeChild => h(Primitive, mergeProps(attrs, { as: props.as, asChild: props.asChild, elementRef: (element: unknown) => { if (element instanceof HTMLButtonElement) provider.registerClose(element, root.id); }, type: props.as === 'button' ? 'button' : undefined, 'aria-label': 'Dismiss notification', 'data-sectile-toast-close': root.id, 'data-scope': 'toast', 'data-part': 'close' }), slots); },
});

function toastTextPart(name: string, part: 'title' | 'description') { return defineComponent({ name, inheritAttrs: false, props: { as: { type: [String, Object, Function] as PropType<PrimitiveAs>, default: part === 'title' ? 'h2' : 'p' }, asChild: { type: Boolean, default: false } }, setup(props, { attrs, slots }) { const root = useToastRoot(name); return (): VNodeChild => h(Primitive, mergeProps(attrs, { as: props.as, asChild: props.asChild, 'data-scope': 'toast', 'data-part': part }), { default: () => slots['default']?.() ?? (part === 'title' ? root.item.value?.title : root.item.value?.description) }); } }); }
function useProvider(part: string): ToastContext { const context = inject<ToastContext>(key); if (context === undefined) throw new TypeError(`${part} must be used inside ToastProvider.`); return context; }
function useToastRoot(part: string): ToastRootContext { const context = inject<ToastRootContext>(toastRootKey); if (context === undefined) throw new TypeError(`${part} must be used inside ToastRoot.`); return context; }
