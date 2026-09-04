import { defineComponent, h, nextTick, onBeforeUnmount, onMounted, shallowRef, watch, type AllowedComponentProps, type ComponentCustomProps, type PropType, type SlotsType, type VNodeChild, type VNodeProps } from 'vue';
import type { StableID } from '@sectile/core';
import { createExtentIndex, createUniformExtentIndex } from '@sectile/virtual/extent-index';
import { createMasonryLayout, masonryLayoutStrategy, type MasonryLayoutState, type MasonryMeasurement, type MasonryMutation, type MasonryPlacement, type MasonryPlacementPolicy } from '@sectile/virtual/masonry-layout';
import { createAxisMeasurementResolver, type VirtualInsets, type VirtualLayoutPlan, type VirtualLayoutStrategy, type VirtualMeasurementResolver, type VirtualRect, type VirtualizerErrorHandler } from '@sectile/dom/virtual';
import { VirtualizerFooter, VirtualizerHeader, VirtualizerRoot, VirtualizerSurface, type VirtualizerRootExpose, type VirtualizerRootSlotProps } from './internal/virtual-core.js';
import { assertLegacyVirtualSizeMode, constrainPreparedVirtualCollection, createVirtualCollectionExpose, estimatedVirtualExtent, exactVirtualExtent, nearlyEqual, prepareVirtualCollection, reconcilePreparedVirtualCollection, renderCollectionBootstrapItems, renderHighLevelItems, requireVirtualAutomaticEstimate, requiresVirtualDOMBootstrap, resolveResponsiveLanes, updatePreparedVirtualCollection, type PreparedVirtualCollection, type ResponsiveLaneGeometry, type ResponsiveLaneProps, type VirtualCollectionBaseProps, type VirtualCollectionEstimate, type VirtualCollectionIDResolver, type VirtualCollectionItemAttributes, type VirtualCollectionItemSlotProps } from './internal/virtual-collection.js';

export interface VirtualMasonryProps<Value = unknown, ID extends StableID = StableID>
  extends VirtualCollectionBaseProps<Value, ID>, ResponsiveLaneProps {
  readonly itemSize?: number;
  readonly estimateSize?: VirtualCollectionEstimate<Value>;
  readonly itemGap?: number;
  readonly placementPolicy?: MasonryPlacementPolicy;
}

export type VirtualMasonryPublicProps<Value = unknown, ID extends StableID = StableID> =
  VirtualMasonryProps<Value, ID>
  & VNodeProps
  & AllowedComponentProps
  & ComponentCustomProps
  & {
    readonly onStateChange?: (state: MasonryLayoutState<ID>) => unknown;
    readonly onPlanChange?: (plan: VirtualLayoutPlan<ID>) => unknown;
    readonly onError?: VirtualizerErrorHandler;
  };

export interface VirtualMasonrySlotProps<Value = unknown, ID extends StableID = StableID>
  extends VirtualCollectionItemSlotProps<Value, ID> {
  readonly placement: MasonryPlacement<ID>;
  readonly lane: number;
}

export interface VirtualMasonryComponent {
  new <Value = unknown, ID extends StableID = StableID>(props: VirtualMasonryPublicProps<Value, ID>): {
    $props: VirtualMasonryPublicProps<Value, ID>;
    $slots: {
      header?: () => VNodeChild;
      item?: (props: VirtualMasonrySlotProps<Value, ID>) => VNodeChild;
      empty?: () => VNodeChild;
      footer?: () => VNodeChild;
    };
  };
}


const VirtualMasonryRuntime = /* @__PURE__ */ defineComponent({
  name: 'SectileVirtualMasonry',
  inheritAttrs: false,
  props: {
    items: { type: Array as unknown as PropType<readonly unknown[]>, required: true },
    getID: { type: Function as PropType<VirtualCollectionIDResolver<unknown, StableID>>, required: true },
    itemSize: { type: Number, default: undefined },
    estimateSize: { type: [Number, Function] as PropType<VirtualCollectionEstimate<unknown>>, default: undefined },
    laneCount: { type: Number, default: undefined },
    minLaneSize: { type: Number, default: 240 },
    maxLaneCount: { type: Number, default: 12 },
    laneGap: { type: Number, default: 0 },
    itemGap: { type: Number, default: 0 },
    placementPolicy: { type: String as PropType<MasonryPlacementPolicy>, default: 'shortest' },
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
    stateChange: (_state: MasonryLayoutState<StableID>): boolean => true,
    planChange: (_plan: VirtualLayoutPlan<StableID>): boolean => true,
    error: (_error: Parameters<VirtualizerErrorHandler>[0]): boolean => true,
  },
  slots: Object as SlotsType<{
    header: () => VNodeChild;
    item: (props: VirtualMasonrySlotProps<unknown>) => VNodeChild;
    empty: () => VNodeChild;
    footer: () => VNodeChild;
  }>,
  setup(props, { attrs, emit, expose, slots }) {
    assertLegacyVirtualSizeMode(props.itemSize, props.estimateSize);
    const initialViewport = props.initialViewport === undefined
      ? undefined
      : Object.freeze({ ...props.initialViewport });
    const prepared = shallowRef(prepareVirtualCollection(props.items, props.getID, props.maxItems));
    const initialGeometry = resolveResponsiveLanes(
      initialViewport?.width ?? 0,
      props.laneCount,
      props.minLaneSize,
      props.maxLaneCount,
      props.laneGap,
    );
    const automaticEstimate = shallowRef<number>();
    const initialState = requiresVirtualDOMBootstrap(props.itemSize, props.estimateSize)
      ? createVirtualMasonryState(
          prepareVirtualCollection([], props.getID, props.maxItems),
          [],
          props,
          initialGeometry,
          0,
        )
      : createVirtualMasonryState(prepared.value, props.items, props, initialGeometry);
    const activeState = shallowRef(initialState);
    const root = shallowRef<VirtualizerRootExpose>();
    const viewportWidth = shallowRef(initialViewport?.width ?? 0);
    const bootstrapElements = new Map<number, HTMLElement>();
    let bootstrapScheduled = false;
    let disposed = false;
    const isBootstrapping = (): boolean => requiresVirtualDOMBootstrap(props.itemSize, props.estimateSize)
      && automaticEstimate.value === undefined
      && prepared.value.domain.size > 0;
    const bootstrapItemRef = (index: number, value: unknown): void => {
      const element = value instanceof HTMLElement ? value : null;
      if (element === null) bootstrapElements.delete(index);
      else {
        bootstrapElements.set(index, element);
        scheduleBootstrap();
      }
    };
    const completeBootstrap = (): void => {
      if (!isBootstrapping()) return;
      const geometry = resolveResponsiveLanes(
        viewportWidth.value,
        props.laneCount,
        props.minLaneSize,
        props.maxLaneCount,
        props.laneGap,
      );
      const count = Math.min(geometry.count, prepared.value.domain.size);
      let total = 0;
      for (let index = 0; index < count; index += 1) {
        const element = bootstrapElements.get(index);
        if (element === undefined) return;
        const height = element.getBoundingClientRect().height;
        if (!Number.isFinite(height) || height <= 0) return;
        total += height;
      }
      const estimate = total / count;
      automaticEstimate.value = estimate;
      bootstrapElements.clear();
      activeState.value = createVirtualMasonryState(
        prepared.value,
        props.items,
        props,
        geometry,
        estimate,
      );
    };
    function scheduleBootstrap(): void {
      if (
        disposed
        || bootstrapScheduled
        || automaticEstimate.value !== undefined
        || prepared.value.domain.size === 0
      ) return;
      bootstrapScheduled = true;
      void nextTick(() => {
        bootstrapScheduled = false;
        if (!disposed) completeBootstrap();
      });
    }
    onMounted(scheduleBootstrap);
    onBeforeUnmount(() => {
      disposed = true;
      bootstrapElements.clear();
    });
    const measure = props.itemSize === undefined
      ? createAxisMeasurementResolver<MasonryLayoutState<StableID>, StableID>('vertical')
      : undefined;

    watch(
      () => [props.items, props.getID] as const,
      () => {
        if (requiresVirtualDOMBootstrap(props.itemSize, props.estimateSize) && automaticEstimate.value === undefined) {
          prepared.value = updatePreparedVirtualCollection(prepared.value, props.items, props.getID);
          scheduleBootstrap();
          return;
        }
        const exposed = root.value;
        if (exposed === undefined) return;
        const next = updatePreparedVirtualCollection(prepared.value, props.items, props.getID);
        const patch = reconcilePreparedVirtualCollection(
          exposed.state as MasonryLayoutState<StableID>,
          next,
          props,
          automaticEstimate.value,
        );
        if (patch === null) {
          prepared.value = next;
          return;
        }
        const result = exposed.mutate(Object.freeze({ type: 'items', ...patch }) satisfies MasonryMutation<StableID>);
        if (result.ok) prepared.value = next;
      },
      { flush: 'post' },
    );
    watch(
      () => [
        props.laneCount,
        props.minLaneSize,
        props.maxLaneCount,
        props.laneGap,
        props.itemGap,
        props.placementPolicy,
        viewportWidth.value,
      ] as const,
      () => {
        const exposed = root.value;
        if (exposed === undefined) return;
        const geometry = resolveResponsiveLanes(
          viewportWidth.value,
          props.laneCount,
          props.minLaneSize,
          props.maxLaneCount,
          props.laneGap,
        );
        const state = exposed.state as MasonryLayoutState<StableID>;
        if (
          state.laneCount === geometry.count
          && nearlyEqual(state.laneExtent, geometry.extent)
          && state.laneGap === props.laneGap
          && state.itemGap === props.itemGap
          && state.placementPolicy === props.placementPolicy
        ) return;
        exposed.mutate(Object.freeze({
          type: 'geometry',
          laneCount: geometry.count,
          laneExtent: geometry.extent,
          laneGap: props.laneGap,
          itemGap: props.itemGap,
          placementPolicy: props.placementPolicy,
        }) satisfies MasonryMutation<StableID>);
      },
      { flush: 'post' },
    );
    expose(createVirtualCollectionExpose(
      root,
      initialState,
      () => prepared.value.domain.size === 0
        ? 'empty'
        : isBootstrapping()
          ? 'bootstrap'
          : 'ready',
    ));

    return (): VNodeChild => h(VirtualizerRoot, {
      ...attrs,
      ref: root,
      defaultState: activeState.value,
      strategy: masonryLayoutStrategy as unknown as VirtualLayoutStrategy<object, StableID, unknown, unknown>,
      overscan: props.overscan,
      ...(props.viewportInsets === undefined ? {} : { viewportInsets: props.viewportInsets }),
      ...(initialViewport === undefined ? {} : { initialViewport }),
      ...(measure === undefined ? {} : {
        measure: measure as unknown as VirtualMeasurementResolver<object, StableID, unknown>,
      }),
      as: props.as,
      'data-virtual-layout': 'virtual-masonry',
      'data-phase': prepared.value.domain.size === 0
        ? 'empty'
        : isBootstrapping()
          ? 'bootstrap'
          : 'ready',
      onStateChange: (state: object) => emit('stateChange', state as MasonryLayoutState<StableID>),
      onPlanChange: (plan: VirtualLayoutPlan<StableID>) => {
        if (plan.viewport.width > 0) viewportWidth.value = plan.viewport.width;
        emit('planChange', plan);
      },
      onError: (error: Parameters<VirtualizerErrorHandler>[0]) => emit('error', error),
    }, {
      default: ({ placements }: VirtualizerRootSlotProps) => [
        slots['header'] === undefined
          ? null
          : h(VirtualizerHeader, {}, { default: () => slots['header']?.() }),
        h(VirtualizerSurface, { as: props.contentAs }, {
          default: () => isBootstrapping()
            ? renderCollectionBootstrapItems(
                'virtual-masonry',
                prepared.value,
                props.items,
                Math.min(
                  resolveResponsiveLanes(
                    viewportWidth.value,
                    props.laneCount,
                    props.minLaneSize,
                    props.maxLaneCount,
                    props.laneGap,
                  ).count,
                  prepared.value.domain.size,
                ),
                resolveResponsiveLanes(
                  viewportWidth.value,
                  props.laneCount,
                  props.minLaneSize,
                  props.maxLaneCount,
                  props.laneGap,
                ).extent,
                props.itemAs,
                props.itemAttributes,
                (value, id, index, placement) => slots['item']?.({
                  value,
                  id,
                  index,
                  placement: Object.freeze({ ...placement, lane: index }),
                  lane: index,
                }),
                bootstrapItemRef,
              )
            : renderHighLevelItems(
                'virtual-masonry',
                placements,
                prepared.value,
                props.items,
                props.itemAs,
                props.itemAttributes,
                props.itemSize === undefined ? 'width' : 'both',
                (value, id, index, placement) => {
                  const masonryPlacement = placement as MasonryPlacement<StableID>;
                  return slots['item']?.({
                    value,
                    id,
                    index,
                    placement: masonryPlacement,
                    lane: masonryPlacement.lane,
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

export const VirtualMasonry = VirtualMasonryRuntime as typeof VirtualMasonryRuntime & VirtualMasonryComponent;


function createVirtualMasonryState(
  prepared: PreparedVirtualCollection<unknown, StableID>,
  items: readonly unknown[],
  props: Readonly<{
    itemSize: number | undefined;
    estimateSize: VirtualCollectionEstimate<unknown> | undefined;
    laneGap: number;
    itemGap: number;
    placementPolicy: MasonryPlacementPolicy;
    maxItems: number;
  }>,
  geometry: ResponsiveLaneGeometry,
  automaticEstimate?: number,
): MasonryLayoutState<StableID> {
  return createMasonryLayout(
    constrainPreparedVirtualCollection(prepared, props.maxItems),
    createCollectionExtents(prepared, items, props, automaticEstimate),
    {
      laneCount: geometry.count,
      laneExtent: geometry.extent,
      laneGap: props.laneGap,
      itemGap: props.itemGap,
      placementPolicy: props.placementPolicy,
      maxLanes: Math.max(geometry.count, 1_024),
    },
  );
}


function createCollectionExtents(
  prepared: PreparedVirtualCollection<unknown, StableID>,
  items: readonly unknown[],
  props: Readonly<{
    itemSize: number | undefined;
    estimateSize: VirtualCollectionEstimate<unknown> | undefined;
    maxItems: number;
  }>,
  automaticEstimate?: number,
) {
  const estimate = props.estimateSize ?? automaticEstimate;
  const shared = props.itemSize !== undefined
    ? exactVirtualExtent(props.itemSize)
    : typeof estimate !== 'function'
      ? estimatedVirtualExtent(requireVirtualAutomaticEstimate(estimate), undefined, 0)
      : null;
  return shared === null
    ? createExtentIndex(Array.from({ length: prepared.domain.size }, (_unused, index) => estimatedVirtualExtent(estimate!, items[index], index)), { maxItems: props.maxItems })
    : createUniformExtentIndex(prepared.domain.size, shared, { maxItems: props.maxItems });
}
