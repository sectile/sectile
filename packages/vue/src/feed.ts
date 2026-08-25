import {
  computed, defineComponent, h, inject, mergeProps, onBeforeUnmount, onMounted, provide,
  shallowRef, watch, type ComputedRef, type PropType, type SlotsType, type VNodeChild,
} from 'vue';
import { createFeed, type FeedConnection, type FeedDirection } from '@sectile/dom/feed';
import { Primitive, type PrimitiveAs } from './primitive.js';

export interface FeedRootProps {
  readonly items: readonly string[];
  readonly revision?: number;
  readonly requestGeneration?: number;
  readonly defaultHighlightedValue?: string | null;
  readonly disabled?: boolean;
  readonly label?: string;
  readonly setSize?: number;
  readonly getPosition?: (id: string) => number;
  readonly as?: PrimitiveAs;
  readonly asChild?: boolean;
}

export type FeedPositionResolver = NonNullable<FeedRootProps['getPosition']>;
export interface FeedRootSlotProps { readonly highlightedValue: string | null; readonly pending: FeedDirection | null; readonly revision: number; readonly requestGeneration: number; readonly disabled: boolean }
export interface FeedItemSlotProps extends FeedRootSlotProps { readonly value: string; readonly highlighted: boolean }
export interface FeedPartProps { readonly as?: PrimitiveAs; readonly asChild?: boolean }

interface Context {
  readonly state: ComputedRef<FeedRootSlotProps>;
  registerItem(element: HTMLElement, id: string): void;
  request(direction: FeedDirection): void;
}
const key = Symbol('SectileFeedRoot');

export const FeedRoot = defineComponent({
  name: 'SectileFeedRoot', inheritAttrs: false,
  props: {
    items: { type: Array as PropType<readonly string[]>, required: true }, revision: { type: Number, default: 0 }, requestGeneration: { type: Number, default: undefined },
    defaultHighlightedValue: { type: String as PropType<string | null>, default: null }, disabled: { type: Boolean, default: false },
    label: { type: String, default: undefined }, setSize: { type: Number, default: undefined }, getPosition: { type: Function as PropType<FeedPositionResolver>, default: undefined },
    as: { type: [String, Object, Function] as PropType<PrimitiveAs>, default: 'div' }, asChild: { type: Boolean, default: false },
  },
  emits: { highlight: (_value: string | null): boolean => true, 'request-window': (_direction: FeedDirection, _anchor: string | null, _revision: number, _requestGeneration: number): boolean => true },
  slots: Object as SlotsType<{ default: (props: FeedRootSlotProps) => VNodeChild }>,
  setup(props, { attrs, emit, slots }) {
    const element = shallowRef<HTMLElement>(); const connection = shallowRef<FeedConnection<string>>();
    const highlighted = shallowRef<string | null>(props.defaultHighlightedValue ?? props.items[0] ?? null); const pending = shallowRef<FeedDirection | null>(null); const currentRevision = shallowRef(props.revision); const currentRequestGeneration = shallowRef(props.requestGeneration ?? 0);
    const state = computed<FeedRootSlotProps>(() => Object.freeze({ highlightedValue: highlighted.value, pending: pending.value, revision: currentRevision.value, requestGeneration: currentRequestGeneration.value, disabled: props.disabled }));
    const refreshParts = (): void => {
      if (element.value === undefined || connection.value === undefined) return;
      element.value.querySelectorAll<HTMLElement>('[data-sectile-feed-item]').forEach((node) => { const id = node.dataset['sectileFeedItem']; if (id !== undefined) connection.value?.setItemAttributes(node, id); });
    };
    const refresh = (): void => { const snapshot = connection.value?.getSnapshot().state; if (snapshot === undefined) return; highlighted.value = snapshot.cursor.current; pending.value = snapshot.pending; currentRevision.value = snapshot.revision; currentRequestGeneration.value = snapshot.requestGeneration; refreshParts(); };
    const connect = (): void => {
      connection.value?.disconnect(); if (element.value === undefined) return;
      connection.value = createFeed({
        root: element.value, items: props.items, revision: props.revision, defaultHighlightedValue: highlighted.value,
        disabled: props.disabled, ...(props.label === undefined ? {} : { label: props.label }), ...(props.setSize === undefined ? {} : { setSize: props.setSize }),
        ...(props.getPosition === undefined ? {} : { getPosition: props.getPosition }), onHighlightedValueChange: (value) => { highlighted.value = value; emit('highlight', value); },
        onRequestWindow: (direction, anchor, revision, requestGeneration) => { pending.value = direction; currentRequestGeneration.value = requestGeneration; emit('request-window', direction, anchor, revision, requestGeneration); }, onUpdate: refresh,
      });
      refreshParts(); refresh();
    };
    provide<Context>(key, { state, registerItem: (node, id) => connection.value?.setItemAttributes(node, id), request: (direction) => { connection.value?.handleEvent(direction === 'before' ? 'request-before' : 'request-after'); refresh(); } });
    onMounted(connect); onBeforeUnmount(() => connection.value?.disconnect());
    watch([() => props.disabled, () => props.label, () => props.setSize, () => props.getPosition], connect);
    watch([() => props.items, () => props.revision, () => props.requestGeneration], () => {
      if (connection.value === undefined) return;
      if (props.revision <= currentRevision.value) { connect(); return; }
      const result = connection.value.syncWindow({ items: props.items, revision: props.revision, ...(props.requestGeneration === undefined ? {} : { requestGeneration: props.requestGeneration }), highlightedValue: highlighted.value });
      if (!result.ok) throw new TypeError(result.error.message); refresh();
    });
    return (): VNodeChild => h(Primitive, mergeProps(attrs, {
      as: props.as, asChild: props.asChild, elementRef: (node: unknown) => { element.value = node instanceof HTMLElement ? node : undefined; },
      'data-scope': 'feed', 'data-part': 'root', 'aria-busy': state.value.pending === null ? undefined : 'true',
    }), { default: () => slots['default']?.(state.value) });
  },
});

export type FeedHighlightHandler = (value: string | null) => void;
export type FeedRequestWindowHandler = (direction: FeedDirection, anchor: string | null, revision: number, requestGeneration: number) => void;

export const FeedItem = defineComponent({
  name: 'SectileFeedItem', inheritAttrs: false,
  props: { value: { type: String, required: true }, as: { type: [String, Object, Function] as PropType<PrimitiveAs>, default: 'article' }, asChild: { type: Boolean, default: false } },
  slots: Object as SlotsType<{ default: (props: FeedItemSlotProps) => VNodeChild }>,
  setup(props, { attrs, slots }) { const root = useRoot('FeedItem'); const state = computed<FeedItemSlotProps>(() => ({ ...root.state.value, value: props.value, highlighted: root.state.value.highlightedValue === props.value })); return (): VNodeChild => h(Primitive, mergeProps(attrs, {
    as: props.as, asChild: props.asChild, elementRef: (node: unknown) => { if (node instanceof HTMLElement) root.registerItem(node, props.value); },
    'data-sectile-feed-item': props.value, 'data-scope': 'feed', 'data-part': 'item', 'data-highlighted': state.value.highlighted ? '' : undefined,
  }), { default: () => slots['default']?.(state.value) }); },
});

export const FeedLoadEarlier = requestPart('SectileFeedLoadEarlier', 'before', 'load-earlier');
export const FeedLoadNewer = requestPart('SectileFeedLoadNewer', 'after', 'load-newer');

function requestPart(name: string, direction: FeedDirection, dataPart: string) { return defineComponent({ name, inheritAttrs: false, props: { as: { type: [String, Object, Function] as PropType<PrimitiveAs>, default: 'button' }, asChild: { type: Boolean, default: false } }, slots: Object as SlotsType<{ default: (props: FeedRootSlotProps) => VNodeChild }>, setup(props, { attrs, slots }) { const root = useRoot(name); return (): VNodeChild => h(Primitive, mergeProps(attrs, { as: props.as, asChild: props.asChild, type: props.as === 'button' ? 'button' : undefined, disabled: root.state.value.disabled || root.state.value.pending !== null, onClick: () => root.request(direction), 'data-scope': 'feed', 'data-part': dataPart }), { default: () => slots['default']?.(root.state.value) }); } }); }
function useRoot(part: string): Context { const root = inject<Context>(key); if (root === undefined) throw new TypeError(`${part} must be used inside FeedRoot.`); return root; }
export type { FeedDirection };
