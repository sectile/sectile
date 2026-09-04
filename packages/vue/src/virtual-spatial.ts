import { defineComponent, h, shallowRef, watch, type AllowedComponentProps, type ComponentCustomProps, type PropType, type SlotsType, type VNodeChild, type VNodeProps } from 'vue';
import type { StableID } from '@sectile/core';
import { createSpatialLayout, spatialLayoutStrategy, type SpatialItem, type SpatialLayoutState, type SpatialMeasurement, type SpatialMutation, type SpatialPlacement } from '@sectile/virtual/spatial-layout';
import { type VirtualInsets, type VirtualLayoutPlan, type VirtualLayoutStrategy, type VirtualMeasurementResolver, type VirtualRect, type VirtualizerErrorHandler } from '@sectile/dom/virtual';
import { VirtualizerFooter, VirtualizerHeader, VirtualizerRoot, VirtualizerSurface, type VirtualizerRootExpose, type VirtualizerRootSlotProps } from './internal/virtual-core.js';
import { createVirtualCollectionExpose, prepareVirtualCollection, renderHighLevelItems, updatePreparedVirtualCollection, type PreparedVirtualCollection, type VirtualCollectionBaseProps, type VirtualCollectionIDResolver, type VirtualCollectionItemAttributes, type VirtualCollectionItemSlotProps } from './internal/virtual-collection.js';

export type VirtualSpatialRectResolver<Value> = {
  bivarianceHack(value: Value, index: number): VirtualRect;
}['bivarianceHack'];
export type VirtualSpatialZIndexResolver<Value> = number | {
  bivarianceHack(value: Value, index: number): number;
}['bivarianceHack'];
export type VirtualSpatialSizeOwnership = 'declared' | 'mounted';

export interface VirtualSpatialProps<Value = unknown, ID extends StableID = StableID>
  extends VirtualCollectionBaseProps<Value, ID> {
  readonly getRect: VirtualSpatialRectResolver<Value>;
  readonly getZIndex?: VirtualSpatialZIndexResolver<Value>;
  readonly sizeOwnership: VirtualSpatialSizeOwnership;
}

export type VirtualSpatialPublicProps<Value = unknown, ID extends StableID = StableID> =
  VirtualSpatialProps<Value, ID>
  & VNodeProps
  & AllowedComponentProps
  & ComponentCustomProps
  & {
    readonly onStateChange?: (state: SpatialLayoutState<ID>) => unknown;
    readonly onPlanChange?: (plan: VirtualLayoutPlan<ID>) => unknown;
    readonly onError?: VirtualizerErrorHandler;
  };

export interface VirtualSpatialSlotProps<Value = unknown, ID extends StableID = StableID>
  extends VirtualCollectionItemSlotProps<Value, ID> {
  readonly placement: SpatialPlacement<ID>;
  readonly zIndex: number;
}

export interface VirtualSpatialComponent {
  new <Value = unknown, ID extends StableID = StableID>(props: VirtualSpatialPublicProps<Value, ID>): {
    $props: VirtualSpatialPublicProps<Value, ID>;
    $slots: {
      header?: () => VNodeChild;
      item?: (props: VirtualSpatialSlotProps<Value, ID>) => VNodeChild;
      empty?: () => VNodeChild;
      footer?: () => VNodeChild;
    };
  };
}


const VirtualSpatialRuntime = /* @__PURE__ */ defineComponent({
  name: 'SectileVirtualSpatial',
  inheritAttrs: false,
  props: {
    items: { type: Array as unknown as PropType<readonly unknown[]>, required: true },
    getID: { type: Function as PropType<VirtualCollectionIDResolver<unknown, StableID>>, required: true },
    getRect: { type: Function as PropType<VirtualSpatialRectResolver<unknown>>, required: true },
    getZIndex: { type: [Number, Function] as PropType<VirtualSpatialZIndexResolver<unknown>>, default: 0 },
    sizeOwnership: { type: String as PropType<VirtualSpatialSizeOwnership>, required: true },
    overscan: { type: [Number, Object] as PropType<number | Partial<VirtualInsets>>, default: 240 },
    viewportInsets: { type: [Number, Object] as PropType<number | Partial<VirtualInsets>>, default: undefined },
    maxItems: { type: Number, default: 1_000_000 },
    initialViewport: { type: Object as PropType<VirtualRect>, default: undefined },
    as: { type: String, default: 'div' },
    contentAs: { type: String, default: 'div' },
    itemAs: { type: String, default: 'div' },
    itemAttributes: { type: Function as PropType<VirtualCollectionItemAttributes<unknown>>, default: undefined },
  },
  emits: {
    stateChange: (_state: SpatialLayoutState<StableID>): boolean => true,
    planChange: (_plan: VirtualLayoutPlan<StableID>): boolean => true,
    error: (_error: Parameters<VirtualizerErrorHandler>[0]): boolean => true,
  },
  slots: Object as SlotsType<{
    header: () => VNodeChild;
    item: (props: VirtualSpatialSlotProps<unknown>) => VNodeChild;
    empty: () => VNodeChild;
    footer: () => VNodeChild;
  }>,
  setup(props, { attrs, emit, expose, slots }) {
    const initialViewport = props.initialViewport === undefined
      ? undefined
      : Object.freeze({ ...props.initialViewport });
    const sizeOwnership = props.sizeOwnership;
    const prepared = shallowRef(prepareVirtualCollection(props.items, props.getID, props.maxItems));
    const initialState = createVirtualSpatialState(prepared.value, props.items, props);
    const root = shallowRef<VirtualizerRootExpose>();
    const measure = sizeOwnership === 'mounted'
      ? (({ element, placement, state }) => {
          const bounds = element.getBoundingClientRect();
          if (bounds.width <= 0 || bounds.height <= 0) return null;
          const current = (state as SpatialLayoutState<StableID>).items.at(placement.index);
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
        }) satisfies VirtualMeasurementResolver<SpatialLayoutState<StableID>, StableID, SpatialMeasurement<StableID>>
      : undefined;

    watch(
      () => [props.items, props.getID, props.getRect, props.getZIndex] as const,
      (current, previous) => {
        const exposed = root.value;
        if (exposed === undefined) return;
        const next = updatePreparedVirtualCollection(prepared.value, props.items, props.getID);
        const state = exposed.state as SpatialLayoutState<StableID>;
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
                items: preserveMountedSpatialSizes(
                  createSpatialItems(next, props.items, props),
                  state,
                  sizeOwnership,
                ),
              }) satisfies SpatialMutation<StableID>)
            : null
          : exposed.mutate(Object.freeze({
              type: 'patch',
              patch: Object.freeze({
                type: 'splice',
                index: collectionPatch.index,
                deleteCount: collectionPatch.deleteCount,
                inserted: collectionPatch.inserted,
              }),
              inserted: preserveMountedSpatialSizes(
                createSpatialItemsRange(
                  next,
                  props.items,
                  props,
                  collectionPatch.index,
                  collectionPatch.inserted.length,
                ),
                state,
                sizeOwnership,
              ),
            }) satisfies SpatialMutation<StableID>);
        if (result === null) {
          prepared.value = next;
          return;
        }
        if (result.ok) prepared.value = next;
      },
      { flush: 'post' },
    );

    let sizeOwnershipWarningShown = false;
    watch(
      () => props.sizeOwnership,
      (value) => {
        if (sizeOwnershipWarningShown || value === sizeOwnership) return;
        sizeOwnershipWarningShown = true;
        console.warn(
          '[Sectile] VirtualSpatial sizeOwnership is a construction-time option. Remount the spatial collection to change it.',
        );
      },
      { flush: 'sync' },
    );

    expose(createVirtualCollectionExpose(
      root,
      initialState,
      () => prepared.value.domain.size === 0 ? 'empty' : 'ready',
    ));

    return (): VNodeChild => h(VirtualizerRoot, {
      ...attrs,
      ref: root,
      defaultState: initialState,
      strategy: spatialLayoutStrategy as unknown as VirtualLayoutStrategy<object, StableID, unknown, unknown>,
      overscan: props.overscan,
      ...(props.viewportInsets === undefined ? {} : { viewportInsets: props.viewportInsets }),
      ...(initialViewport === undefined ? {} : { initialViewport }),
      ...(measure === undefined ? {} : {
        measure: measure as unknown as VirtualMeasurementResolver<object, StableID, unknown>,
      }),
      as: props.as,
      'data-virtual-layout': 'virtual-spatial',
      'data-phase': prepared.value.domain.size === 0 ? 'empty' : 'ready',
      onStateChange: (state: object) => emit('stateChange', state as SpatialLayoutState<StableID>),
      onPlanChange: (plan: VirtualLayoutPlan<StableID>) => emit('planChange', plan),
      onError: (error: Parameters<VirtualizerErrorHandler>[0]) => emit('error', error),
    }, {
      default: ({ placements }: VirtualizerRootSlotProps) => [
        slots['header'] === undefined
          ? null
          : h(VirtualizerHeader, {}, { default: () => slots['header']?.() }),
        h(VirtualizerSurface, { as: props.contentAs }, {
          default: () => renderHighLevelItems(
            'virtual-spatial',
            placements,
            prepared.value,
            props.items,
            props.itemAs,
            props.itemAttributes,
            sizeOwnership === 'mounted' ? 'none' : 'both',
            (value, id, index, placement) => {
              const spatialPlacement = placement as SpatialPlacement<StableID>;
              return slots['item']?.({
                value,
                id,
                index,
                placement: spatialPlacement,
                zIndex: spatialPlacement.zIndex,
              });
            },
            slots['empty'],
          ),
        }),
        slots['footer'] === undefined
          ? null
          : h(VirtualizerFooter, {}, { default: () => slots['footer']?.() }),
      ],
    });
  },
});

export const VirtualSpatial = VirtualSpatialRuntime as typeof VirtualSpatialRuntime & VirtualSpatialComponent;


function createVirtualSpatialState(
  prepared: PreparedVirtualCollection<unknown, StableID>,
  items: readonly unknown[],
  props: Readonly<{
    getRect: VirtualSpatialRectResolver<unknown>;
    getZIndex: VirtualSpatialZIndexResolver<unknown>;
    maxItems: number;
  }>,
): SpatialLayoutState<StableID> {
  return createSpatialLayout(createSpatialItems(prepared, items, props), {
    maxItems: props.maxItems,
    domain: prepared.domain,
  });
}


function createSpatialItems(
  prepared: PreparedVirtualCollection<unknown, StableID>,
  items: readonly unknown[],
  props: Readonly<{
    getRect: VirtualSpatialRectResolver<unknown>;
    getZIndex: VirtualSpatialZIndexResolver<unknown>;
  }>,
): readonly SpatialItem<StableID>[] {
  return createSpatialItemsRange(prepared, items, props, 0, prepared.domain.size);
}

function createSpatialItemsRange(
  prepared: PreparedVirtualCollection<unknown, StableID>,
  items: readonly unknown[],
  props: Readonly<{
    getRect: VirtualSpatialRectResolver<unknown>;
    getZIndex: VirtualSpatialZIndexResolver<unknown>;
  }>,
  start: number,
  count: number,
): readonly SpatialItem<StableID>[] {
  const spatialItems = Array<SpatialItem<StableID>>(count);
  for (let localIndex = 0; localIndex < count; localIndex += 1) {
    const index = start + localIndex;
    spatialItems[localIndex] = {
      id: prepared.domain.at(index)!,
      rect: props.getRect(items[index], index),
      zIndex: typeof props.getZIndex === 'number'
        ? props.getZIndex
        : props.getZIndex(items[index], index),
    };
  }
  return spatialItems;
}

function preserveMountedSpatialSizes(
  items: readonly SpatialItem<StableID>[],
  state: SpatialLayoutState<StableID>,
  sizeOwnership: VirtualSpatialSizeOwnership,
): readonly SpatialItem<StableID>[] {
  if (sizeOwnership !== 'mounted') return items;
  return items.map((item) => {
    const previousIndex = state.domain.indexOf(item.id);
    const previous = previousIndex === null ? undefined : state.items.at(previousIndex);
    return previous === undefined
      ? item
      : {
          ...item,
          rect: {
            ...item.rect,
            width: previous.rect.width,
            height: previous.rect.height,
          },
        };
  });
}
