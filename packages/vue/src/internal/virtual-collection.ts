import {
  defineComponent,
  h,
  onBeforeUnmount,
  shallowReactive,
  shallowRef,
  type PropType,
  type ShallowRef,
  type SlotsType,
  type VNodeArrayChildren,
  type VNodeChild,
} from 'vue';
import type { StableID } from '@sectile/core';
import type { Sequence } from '@sectile/core/sequence';
import {
  constrainVirtualCollectionDomain,
  createVirtualCollection,
  replaceVirtualCollection,
  type VirtualCollectionIDResolver as OwnerVirtualCollectionIDResolver,
  type VirtualCollectionProjection,
  type VirtualLanePolicy,
  type VirtualSizePolicy,
} from '@sectile/virtual/collection';
import {
  virtualItemStyle,
  type VirtualInsets,
  type VirtualItemStyleOptions,
  type VirtualLayoutPlan,
  type VirtualPlacement,
  type VirtualPoint,
  type VirtualRect,
  type VirtualScrollAlignment,
} from '@sectile/dom/virtual';
import {
  useVirtualizerSurfaceRegistration,
  virtualizerNotConnected,
  type VirtualizerItemSize,
  type VirtualizerOperationResult,
  type VirtualizerRootExpose,
} from './virtual-core.js';

export type VirtualCollectionIDResolver<
  Value,
  ID extends StableID = StableID,
> = OwnerVirtualCollectionIDResolver<Value, ID>;

export type VirtualCollectionItemAttributes<Value> = {
  bivarianceHack(
    value: Value,
    index: number,
  ): Readonly<Record<string, unknown>>;
}['bivarianceHack'];

export type PreparedVirtualCollection<
  Value = unknown,
  ID extends StableID = StableID,
> = VirtualCollectionProjection<Value, ID>;

export interface VirtualCollectionBaseProps<
  Value,
  ID extends StableID = StableID,
> {
  readonly items: readonly Value[];
  readonly getID: VirtualCollectionIDResolver<Value, ID>;
  readonly overscan?: number | Partial<VirtualInsets>;
  readonly viewportInsets?: number | Partial<VirtualInsets>;
  readonly maxItems?: number;
  readonly initialViewport?: VirtualRect;
  readonly as?: string;
  readonly contentAs?: string;
  readonly itemAs?: string;
  readonly itemAttributes?: VirtualCollectionItemAttributes<Value>;
}

export interface VirtualCollectionSizePolicyProps<Value> {
  readonly sizePolicy?: VirtualSizePolicy<Value>;
}

export interface VirtualCollectionLanePolicyProps {
  readonly lanePolicy?: VirtualLanePolicy;
}

export type VirtualCollectionPhase = 'bootstrap' | 'ready' | 'empty';

export interface VirtualCollectionItemSlotProps<
  Value = unknown,
  ID extends StableID = StableID,
> {
  readonly value: Value;
  readonly id: ID;
  readonly index: number;
  readonly placement: VirtualPlacement<ID>;
}

export interface VirtualCollectionSlots<
  Value = unknown,
  ID extends StableID = StableID,
> {
  readonly header?: () => VNodeChild;
  readonly item?: (props: VirtualCollectionItemSlotProps<Value, ID>) => VNodeChild;
  readonly empty?: () => VNodeChild;
  readonly footer?: () => VNodeChild;
}

export interface VirtualCollectionExpose<
  State,
  ID extends StableID = StableID,
> {
  readonly scrollport: ShallowRef<HTMLElement | null | undefined>;
  readonly surface: ShallowRef<HTMLElement | null | undefined>;
  readonly state: State;
  readonly plan: VirtualLayoutPlan<ID> | null;
  readonly phase: VirtualCollectionPhase;
  scrollToID(
    id: ID,
    alignment?: VirtualScrollAlignment,
  ): VirtualizerOperationResult<VirtualPoint>;
  refresh(): void;
  flush(): VirtualizerOperationResult<VirtualLayoutPlan<ID>>;
}

export function prepareVirtualCollection<
  Value,
  ID extends StableID,
>(
  items: readonly Value[],
  getID: VirtualCollectionIDResolver<Value, ID>,
  maxItems = 1_000_000,
): PreparedVirtualCollection<Value, ID> {
  return createVirtualCollection(items, getID, {
    maxItems,
    maxIDCodeUnits: 1_024,
  });
}

export function updatePreparedVirtualCollection<
  Value,
  ID extends StableID,
>(
  previous: PreparedVirtualCollection<Value, ID>,
  items: readonly Value[],
  getID: VirtualCollectionIDResolver<Value, ID>,
): PreparedVirtualCollection<Value, ID> {
  return replaceVirtualCollection(previous, items, getID);
}

export function constrainPreparedVirtualCollection<
  Value,
  ID extends StableID,
>(
  prepared: PreparedVirtualCollection<Value, ID>,
  maxItems: number,
): Sequence<ID> {
  return constrainVirtualCollectionDomain(prepared, maxItems);
}

const VirtualCollectionProjectionRuntime = /* @__PURE__ */ defineComponent({
  name: 'SectileVirtualCollectionProjection',
  inheritAttrs: false,
  props: {
    scope: { type: String, required: true },
    placements: {
      type: Array as unknown as PropType<readonly VirtualPlacement<StableID>[]>,
      required: true,
    },
    prepared: {
      type: Object as PropType<PreparedVirtualCollection<unknown, StableID>>,
      required: true,
    },
    items: {
      type: Array as unknown as PropType<readonly unknown[]>,
      required: true,
    },
    itemAs: { type: String, required: true },
    itemAttributes: {
      type: Function as PropType<VirtualCollectionItemAttributes<unknown>>,
      default: undefined,
    },
    size: { type: String as PropType<VirtualizerItemSize>, required: true },
  },
  slots: Object as SlotsType<{
    default: (props: VirtualCollectionItemSlotProps<unknown, StableID>) => VNodeChild;
  }>,
  setup(props, { slots }) {
    const surface = useVirtualizerSurfaceRegistration('VirtualCollectionProjection');
    const registrations = new Map<StableID, () => void>();
    const elements = new Map<StableID, HTMLElement>();
    const refs = new Map<StableID, (value: unknown) => void>();

    const itemRef = (id: StableID): ((value: unknown) => void) => {
      const existing = refs.get(id);
      if (existing !== undefined) return existing;
      const callback = (value: unknown): void => {
        const element = value instanceof HTMLElement ? value : null;
        if (element !== null && elements.get(id) === element) return;
        registrations.get(id)?.();
        registrations.delete(id);
        elements.delete(id);
        if (element === null) {
          if (refs.get(id) === callback) refs.delete(id);
          return;
        }
        elements.set(id, element);
        registrations.set(id, surface.registerItem(element, id));
      };
      refs.set(id, callback);
      return callback;
    };

    onBeforeUnmount(() => {
      for (const unregister of registrations.values()) unregister();
      registrations.clear();
      elements.clear();
      refs.clear();
    });

    return (): VNodeArrayChildren => {
      const sizing = itemSizing(props.size);
      const children: VNodeArrayChildren = [];
      for (const placement of props.placements) {
        const index = placement.index;
        if (
          index >= props.items.length
          || props.prepared.domain.at(index) !== placement.id
        ) continue;
        const value = props.items[index];
        const attributes = props.itemAttributes?.(value, index) ?? {};
        const rendered = slots['default']?.({
          value,
          id: placement.id,
          index,
          placement,
        });
        children.push(h(props.itemAs, {
          ...attributes,
          key: placement.id,
          ref: itemRef(placement.id),
          style: [attributes['style'], virtualItemStyle(placement, sizing)],
          'data-scope': props.scope,
          'data-virtual-layout': props.scope,
          'data-part': 'item',
          'data-index': placement.index,
          'data-visible': placement.visible ? '' : undefined,
        }, normalizeChildren(rendered)));
      }
      return children;
    };
  },
});

const VirtualCollectionBootstrapProjectionRuntime = /* @__PURE__ */ defineComponent({
  name: 'SectileVirtualCollectionBootstrapProjection',
  inheritAttrs: false,
  props: {
    scope: { type: String, required: true },
    prepared: {
      type: Object as PropType<PreparedVirtualCollection<unknown, StableID>>,
      required: true,
    },
    items: {
      type: Array as unknown as PropType<readonly unknown[]>,
      required: true,
    },
    count: { type: Number, required: true },
    width: { type: Number, required: true },
    itemAs: { type: String, required: true },
    itemAttributes: {
      type: Function as PropType<VirtualCollectionItemAttributes<unknown>>,
      default: undefined,
    },
    itemRef: {
      type: Function as PropType<(index: number, value: unknown) => void>,
      required: true,
    },
  },
  slots: Object as SlotsType<{
    default: (props: VirtualCollectionItemSlotProps<unknown, StableID>) => VNodeChild;
  }>,
  setup(props, { slots }) {
    const refs = new Map<number, (value: unknown) => void>();
    const bootstrapRef = (index: number): ((value: unknown) => void) => {
      const existing = refs.get(index);
      if (existing !== undefined) return existing;
      const callback = (value: unknown): void => {
        props.itemRef(index, value);
        if (value === null && refs.get(index) === callback) refs.delete(index);
      };
      refs.set(index, callback);
      return callback;
    };
    onBeforeUnmount(() => refs.clear());

    return (): VNodeArrayChildren => {
      const children: VNodeArrayChildren = [];
      const count = Math.min(props.count, props.prepared.domain.size);
      for (let index = 0; index < count; index += 1) {
        const id = props.prepared.domain.at(index)!;
        const value = props.items[index];
        const attributes = props.itemAttributes?.(value, index) ?? {};
        const placement = Object.freeze({
          id,
          index,
          rect: Object.freeze({
            x: index * props.width,
            y: 0,
            width: props.width,
            height: 0,
          }),
          visible: true,
        });
        children.push(h(props.itemAs, {
          ...attributes,
          key: id,
          ref: bootstrapRef(index),
          style: [attributes['style'], { width: `${props.width}px` }],
          'data-scope': props.scope,
          'data-virtual-layout': props.scope,
          'data-part': 'item',
          'data-index': index,
          'data-bootstrap': '',
        }, normalizeChildren(slots['default']?.({
          value,
          id,
          index,
          placement,
        }))));
      }
      return children;
    };
  },
});

export function renderHighLevelItems(
  scope: string,
  placements: readonly VirtualPlacement<StableID>[],
  prepared: PreparedVirtualCollection<unknown, StableID>,
  items: readonly unknown[],
  itemAs: string,
  itemAttributes: VirtualCollectionItemAttributes<unknown> | undefined,
  size: VirtualizerItemSize,
  render: (
    value: unknown,
    id: StableID,
    index: number,
    placement: VirtualPlacement<StableID>,
  ) => VNodeChild,
  empty: (() => VNodeChild) | undefined,
): VNodeArrayChildren {
  if (prepared.domain.size === 0) {
    const child = empty?.();
    return child === undefined || child === null ? [] : [child];
  }
  return [h(VirtualCollectionProjectionRuntime, {
    scope,
    placements,
    prepared,
    items,
    itemAs,
    ...(itemAttributes === undefined ? {} : { itemAttributes }),
    size,
  }, {
    default: ({ value, id, index, placement }: VirtualCollectionItemSlotProps<unknown, StableID>) =>
      render(value, id, index, placement),
  })];
}

export function renderCollectionBootstrapItems(
  scope: string,
  prepared: PreparedVirtualCollection<unknown, StableID>,
  items: readonly unknown[],
  count: number,
  width: number,
  itemAs: string,
  itemAttributes: VirtualCollectionItemAttributes<unknown> | undefined,
  render: (
    value: unknown,
    id: StableID,
    index: number,
    placement: VirtualPlacement<StableID>,
  ) => VNodeChild,
  itemRef: (index: number, value: unknown) => void,
): VNodeArrayChildren {
  return [h(VirtualCollectionBootstrapProjectionRuntime, {
    scope,
    prepared,
    items,
    count,
    width,
    itemAs,
    ...(itemAttributes === undefined ? {} : { itemAttributes }),
    itemRef,
  }, {
    default: ({ value, id, index, placement }: VirtualCollectionItemSlotProps<unknown, StableID>) =>
      render(value, id, index, placement),
  })];
}

export function createVirtualCollectionExpose<State>(
  root: ShallowRef<VirtualizerRootExpose | undefined>,
  initialState: State,
  phase: () => VirtualCollectionPhase,
): VirtualCollectionExpose<State, StableID> {
  const emptyScrollport = shallowRef<HTMLElement | null>(null);
  const emptySurface = shallowRef<HTMLElement | null>(null);
  return shallowReactive({
    get scrollport() { return root.value?.scrollport ?? emptyScrollport; },
    get surface() { return root.value?.surface ?? emptySurface; },
    get state() { return (root.value?.state as State | undefined) ?? initialState; },
    get plan() { return root.value?.plan ?? null; },
    get phase() { return phase(); },
    scrollToID: (id: StableID, alignment?: VirtualScrollAlignment) =>
      root.value?.scrollTo(id, alignment) ?? virtualizerNotConnected(),
    refresh: () => root.value?.refresh(),
    flush: () => root.value?.flush() ?? virtualizerNotConnected(),
  });
}

export function nearlyEqual(left: number, right: number): boolean {
  return Math.abs(left - right) < 0.01;
}

function itemSizing(size: VirtualizerItemSize): VirtualItemStyleOptions {
  return Object.freeze({
    width: size === 'width' || size === 'both',
    height: size === 'height' || size === 'both',
  });
}

function normalizeChildren(rendered: VNodeChild | undefined): VNodeArrayChildren {
  if (rendered === undefined || rendered === null) return [];
  return Array.isArray(rendered) ? rendered : [rendered];
}
