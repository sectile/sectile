import { defineComponent, h, shallowRef, watch, type AllowedComponentProps, type ComponentCustomProps, type PropType, type SlotsType, type VNodeChild, type VNodeProps } from 'vue';
import { createSpatialLayout, spatialLayoutStrategy, type SpatialItem, type SpatialLayoutState, type SpatialMeasurement, type SpatialMutation, type SpatialPlacement } from '@sectile/virtual/spatial-layout';
import { type VirtualInsets, type VirtualLayoutPlan, type VirtualLayoutStrategy, type VirtualMeasurementResolver, type VirtualRect, type VirtualizerErrorHandler } from '@sectile/dom/virtual';
import { VirtualizerContent, VirtualizerRoot, type VirtualizerRootExpose, type VirtualizerRootSlotProps } from './internal/virtual-core.js';
import { prepareVirtualList, updatePreparedVirtualList, type PreparedVirtualList, type VirtualListItemAttributes, type VirtualListKeyResolver } from './internal/virtual-collection-model.js';
import type { VirtualListSlotProps } from './internal/virtual-list.js';
import { createHighLevelVirtualExpose, renderHighLevelItems, type VirtualCollectionBaseProps } from './internal/virtual-collection.js';

export type VirtualSpatialRectResolver<Value> = {
  bivarianceHack(value: Value, index: number): VirtualRect;
}['bivarianceHack'];
export type VirtualSpatialZIndexResolver<Value> = number | {
  bivarianceHack(value: Value, index: number): number;
}['bivarianceHack'];

export interface VirtualSpatialProps<Value = unknown>
  extends VirtualCollectionBaseProps<Value> {
  readonly getRect: VirtualSpatialRectResolver<Value>;
  readonly getZIndex?: VirtualSpatialZIndexResolver<Value>;
  readonly measureSize?: boolean;
}

export type VirtualSpatialPublicProps<Value = unknown> =
  VirtualSpatialProps<Value>
  & VNodeProps
  & AllowedComponentProps
  & ComponentCustomProps
  & {
    readonly onStateChange?: (state: SpatialLayoutState<string>) => unknown;
    readonly onPlanChange?: (plan: VirtualLayoutPlan<string>) => unknown;
    readonly onError?: VirtualizerErrorHandler;
  };

export interface VirtualSpatialSlotProps<Value = unknown>
  extends VirtualListSlotProps<Value> {
  readonly placement: SpatialPlacement<string>;
  readonly zIndex: number;
}

export interface VirtualSpatialComponent {
  new <Value = unknown>(props: VirtualSpatialPublicProps<Value>): {
    $props: VirtualSpatialPublicProps<Value>;
    $slots: {
      default?: (props: VirtualSpatialSlotProps<Value>) => VNodeChild;
      empty?: () => VNodeChild;
    };
  };
}


const VirtualSpatialRuntime = /* @__PURE__ */ defineComponent({
  name: 'SectileVirtualSpatial',
  inheritAttrs: false,
  props: {
    items: { type: Array as unknown as PropType<readonly unknown[]>, required: true },
    getKey: { type: Function as PropType<VirtualListKeyResolver<unknown>>, required: true },
    getRect: { type: Function as PropType<VirtualSpatialRectResolver<unknown>>, required: true },
    getZIndex: { type: [Number, Function] as PropType<VirtualSpatialZIndexResolver<unknown>>, default: 0 },
    measureSize: { type: Boolean, default: true },
    overscan: { type: [Number, Object] as PropType<number | Partial<VirtualInsets>>, default: 240 },
    maxItems: { type: Number, default: 1_000_000 },
    initialViewport: { type: Object as PropType<VirtualRect>, default: undefined },
    as: { type: String, default: 'div' },
    contentAs: { type: String, default: 'div' },
    itemAs: { type: String, default: 'div' },
    itemAttributes: { type: Function as PropType<VirtualListItemAttributes<unknown>>, default: undefined },
  },
  emits: {
    stateChange: (_state: SpatialLayoutState<string>): boolean => true,
    planChange: (_plan: VirtualLayoutPlan<string>): boolean => true,
    error: (_error: Parameters<VirtualizerErrorHandler>[0]): boolean => true,
  },
  slots: Object as SlotsType<{
    default: (props: VirtualSpatialSlotProps<unknown>) => VNodeChild;
    empty: () => VNodeChild;
  }>,
  setup(props, { attrs, emit, expose, slots }) {
    const initialViewport = props.initialViewport === undefined
      ? undefined
      : Object.freeze({ ...props.initialViewport });
    const prepared = shallowRef(prepareVirtualList(props.items, props.getKey, props.maxItems));
    const initialState = createVirtualSpatialState(prepared.value, props.items, props);
    const root = shallowRef<VirtualizerRootExpose>();
    const measure = props.measureSize
      ? (({ element, placement, state }) => {
          const bounds = element.getBoundingClientRect();
          if (bounds.width <= 0 || bounds.height <= 0) return null;
          const current = (state as SpatialLayoutState<string>).items.at(placement.index);
          if (current === undefined) return null;
          if (
            current.rect.width === bounds.width
            && current.rect.height === bounds.height
          ) return null;
          return Object.freeze({
            id: placement.id,
            rect: Object.freeze({
              x: current.rect.x,
              y: current.rect.y,
              width: bounds.width,
              height: bounds.height,
            }),
          });
        }) satisfies VirtualMeasurementResolver<SpatialLayoutState<string>, string, SpatialMeasurement<string>>
      : undefined;

    watch(
      () => [props.items, props.getKey, props.getRect, props.getZIndex] as const,
      (current, previous) => {
        const exposed = root.value;
        if (exposed === undefined) return;
        const next = updatePreparedVirtualList(prepared.value, props.items, props.getKey);
        const state = exposed.state as SpatialLayoutState<string>;
        const resolverChanged = current[2] !== previous[2] || current[3] !== previous[3];
        const valuePatch = next.valueChange === null
          ? null
          : Object.freeze({
              index: next.valueChange.index,
              deleteCount: next.valueChange.count,
              inserted: Object.freeze(next.domain.ids.slice(
                next.valueChange.index,
                next.valueChange.index + next.valueChange.count,
              )),
            });
        const collectionPatch = next.change ?? valuePatch;
        const result = resolverChanged || collectionPatch === null
          ? resolverChanged
            ? exposed.mutate(Object.freeze({
                type: 'replace',
                items: preserveSpatialMeasurements(
                  createSpatialItems(next, props.items, props),
                  state,
                  props.measureSize,
                ),
              }) satisfies SpatialMutation<string>)
            : null
          : exposed.mutate(Object.freeze({
              type: 'patch',
              patch: Object.freeze({
                type: 'splice',
                index: collectionPatch.index,
                deleteCount: collectionPatch.deleteCount,
                inserted: collectionPatch.inserted,
              }),
              inserted: preserveSpatialMeasurements(
                createSpatialItemsRange(
                  next,
                  props.items,
                  props,
                  collectionPatch.index,
                  collectionPatch.inserted.length,
                ),
                state,
                props.measureSize,
              ),
            }) satisfies SpatialMutation<string>);
        if (result === null) {
          prepared.value = next;
          return;
        }
        if (result.ok) prepared.value = next;
      },
      { flush: 'post' },
    );
    expose(createHighLevelVirtualExpose(root, initialState));

    return (): VNodeChild => h(VirtualizerRoot, {
      ...attrs,
      ref: root,
      defaultState: initialState,
      strategy: spatialLayoutStrategy as unknown as VirtualLayoutStrategy<object, string, unknown, unknown>,
      overscan: props.overscan,
      ...(initialViewport === undefined ? {} : { initialViewport }),
      ...(measure === undefined ? {} : {
        measure: measure as unknown as VirtualMeasurementResolver<object, string, unknown>,
      }),
      as: props.as,
      'data-virtual-layout': 'virtual-spatial',
      onStateChange: (state: object) => emit('stateChange', state as SpatialLayoutState<string>),
      onPlanChange: (plan: VirtualLayoutPlan<string>) => emit('planChange', plan),
      onError: (error: Parameters<VirtualizerErrorHandler>[0]) => emit('error', error),
    }, {
      default: ({ placements }: VirtualizerRootSlotProps) => h(VirtualizerContent, { as: props.contentAs }, {
        default: () => renderHighLevelItems(
          'virtual-spatial',
          placements,
          prepared.value,
          props.items,
          props.itemAs,
          props.itemAttributes,
          props.measureSize ? 'none' : 'both',
          (value, key, index, placement) => {
            const spatialPlacement = placement as SpatialPlacement<string>;
            return slots['default']?.({
              value,
              key,
              index,
              placement: spatialPlacement,
              zIndex: spatialPlacement.zIndex,
            });
          },
          slots['empty'],
        ),
      }),
    });
  },
});

export const VirtualSpatial = VirtualSpatialRuntime as typeof VirtualSpatialRuntime & VirtualSpatialComponent;


function createVirtualSpatialState(
  prepared: PreparedVirtualList,
  items: readonly unknown[],
  props: Readonly<{
    getRect: VirtualSpatialRectResolver<unknown>;
    getZIndex: VirtualSpatialZIndexResolver<unknown>;
    maxItems: number;
  }>,
): SpatialLayoutState<string> {
  return createSpatialLayout(createSpatialItems(prepared, items, props), { maxItems: props.maxItems });
}


function createSpatialItems(
  prepared: PreparedVirtualList,
  items: readonly unknown[],
  props: Readonly<{
    getRect: VirtualSpatialRectResolver<unknown>;
    getZIndex: VirtualSpatialZIndexResolver<unknown>;
  }>,
): readonly SpatialItem<string>[] {
  return createSpatialItemsRange(prepared, items, props, 0, prepared.domain.size);
}

function createSpatialItemsRange(
  prepared: PreparedVirtualList,
  items: readonly unknown[],
  props: Readonly<{
    getRect: VirtualSpatialRectResolver<unknown>;
    getZIndex: VirtualSpatialZIndexResolver<unknown>;
  }>,
  start: number,
  count: number,
): readonly SpatialItem<string>[] {
  return Object.freeze(Array.from({ length: count }, (_unused, localIndex) => {
    const index = start + localIndex;
    return Object.freeze({
      id: prepared.domain.at(index)!,
      rect: Object.freeze({ ...props.getRect(items[index], index) }),
      zIndex: typeof props.getZIndex === 'number'
        ? props.getZIndex
        : props.getZIndex(items[index], index),
    });
  }));
}

function preserveSpatialMeasurements(
  items: readonly SpatialItem<string>[],
  state: SpatialLayoutState<string>,
  preserve: boolean,
): readonly SpatialItem<string>[] {
  if (!preserve) return items;
  return Object.freeze(items.map((item) => {
    const previousIndex = state.domain.indexOf(item.id);
    const previous = previousIndex === null ? undefined : state.items.at(previousIndex);
    return previous === undefined
      ? item
      : Object.freeze({
          ...item,
          rect: Object.freeze({
            ...item.rect,
            width: previous.rect.width,
            height: previous.rect.height,
          }),
        });
  }));
}
