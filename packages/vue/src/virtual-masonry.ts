import { defineComponent, h, nextTick, onBeforeUnmount, onMounted, shallowRef, watch, type AllowedComponentProps, type ComponentCustomProps, type PropType, type SlotsType, type VNodeChild, type VNodeProps } from 'vue';
import { createExtentIndex, createUniformExtentIndex } from '@sectile/virtual/extent-index';
import { createMasonryLayout, masonryLayoutStrategy, type MasonryLayoutState, type MasonryMeasurement, type MasonryMutation, type MasonryPlacement, type MasonryPlacementPolicy } from '@sectile/virtual/masonry-layout';
import { createAxisMeasurementResolver, type VirtualInsets, type VirtualLayoutPlan, type VirtualLayoutStrategy, type VirtualMeasurementResolver, type VirtualRect, type VirtualizerErrorHandler } from '@sectile/dom/virtual';
import { VirtualizerRoot, VirtualizerSurface, type VirtualizerRootExpose, type VirtualizerRootSlotProps } from './internal/virtual-core.js';
import { assertVirtualListSizeMode, createPreparedVirtualListSequence, estimatedExtent, exactExtent, prepareVirtualList, reconcileVirtualList, requireAutomaticEstimate, requiresDOMBootstrap, updatePreparedVirtualList, type PreparedVirtualList, type VirtualListEstimate, type VirtualListItemAttributes, type VirtualListKeyResolver } from './internal/virtual-collection-model.js';
import type { VirtualListSlotProps } from './internal/virtual-list.js';
import { createHighLevelVirtualExpose, nearlyEqual, renderCollectionBootstrapItems, renderHighLevelItems, resolveResponsiveLanes, type ResponsiveLaneGeometry, type ResponsiveLaneProps, type VirtualCollectionBaseProps } from './internal/virtual-collection.js';

export interface VirtualMasonryProps<Value = unknown>
  extends VirtualCollectionBaseProps<Value>, ResponsiveLaneProps {
  readonly itemSize?: number;
  readonly estimateSize?: VirtualListEstimate<Value>;
  readonly itemGap?: number;
  readonly placementPolicy?: MasonryPlacementPolicy;
}

export type VirtualMasonryPublicProps<Value = unknown> =
  VirtualMasonryProps<Value>
  & VNodeProps
  & AllowedComponentProps
  & ComponentCustomProps
  & {
    readonly onStateChange?: (state: MasonryLayoutState<string>) => unknown;
    readonly onPlanChange?: (plan: VirtualLayoutPlan<string>) => unknown;
    readonly onError?: VirtualizerErrorHandler;
  };

export interface VirtualMasonrySlotProps<Value = unknown>
  extends VirtualListSlotProps<Value> {
  readonly placement: MasonryPlacement<string>;
  readonly lane: number;
}

export interface VirtualMasonryComponent {
  new <Value = unknown>(props: VirtualMasonryPublicProps<Value>): {
    $props: VirtualMasonryPublicProps<Value>;
    $slots: {
      default?: (props: VirtualMasonrySlotProps<Value>) => VNodeChild;
      empty?: () => VNodeChild;
    };
  };
}


const VirtualMasonryRuntime = /* @__PURE__ */ defineComponent({
  name: 'SectileVirtualMasonry',
  inheritAttrs: false,
  props: {
    items: { type: Array as unknown as PropType<readonly unknown[]>, required: true },
    getKey: { type: Function as PropType<VirtualListKeyResolver<unknown>>, required: true },
    itemSize: { type: Number, default: undefined },
    estimateSize: { type: [Number, Function] as PropType<VirtualListEstimate<unknown>>, default: undefined },
    laneCount: { type: Number, default: undefined },
    minLaneSize: { type: Number, default: 240 },
    maxLaneCount: { type: Number, default: 12 },
    laneGap: { type: Number, default: 0 },
    itemGap: { type: Number, default: 0 },
    placementPolicy: { type: String as PropType<MasonryPlacementPolicy>, default: 'shortest' },
    overscan: { type: [Number, Object] as PropType<number | Partial<VirtualInsets>>, default: 240 },
    maxItems: { type: Number, default: 1_000_000 },
    initialViewport: { type: Object as PropType<VirtualRect>, default: undefined },
    as: { type: String, default: 'div' },
    contentAs: { type: String, default: 'div' },
    itemAs: { type: String, default: 'div' },
    itemAttributes: { type: Function as PropType<VirtualListItemAttributes<unknown>>, default: undefined },
  },
  emits: {
    stateChange: (_state: MasonryLayoutState<string>): boolean => true,
    planChange: (_plan: VirtualLayoutPlan<string>): boolean => true,
    error: (_error: Parameters<VirtualizerErrorHandler>[0]): boolean => true,
  },
  slots: Object as SlotsType<{
    default: (props: VirtualMasonrySlotProps<unknown>) => VNodeChild;
    empty: () => VNodeChild;
  }>,
  setup(props, { attrs, emit, expose, slots }) {
    assertVirtualListSizeMode(props.itemSize, props.estimateSize);
    const initialViewport = props.initialViewport === undefined
      ? undefined
      : Object.freeze({ ...props.initialViewport });
    const prepared = shallowRef(prepareVirtualList(props.items, props.getKey, props.maxItems));
    const initialGeometry = resolveResponsiveLanes(
      initialViewport?.width ?? 0,
      props.laneCount,
      props.minLaneSize,
      props.maxLaneCount,
      props.laneGap,
    );
    const automaticEstimate = shallowRef<number>();
    const initialState = requiresDOMBootstrap(props.itemSize, props.estimateSize)
      ? createVirtualMasonryState(
          prepareVirtualList([], props.getKey, props.maxItems),
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
    const isBootstrapping = (): boolean => requiresDOMBootstrap(props.itemSize, props.estimateSize)
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
      ? createAxisMeasurementResolver<MasonryLayoutState<string>, string>('vertical')
      : undefined;

    watch(
      () => [props.items, props.getKey] as const,
      () => {
        if (requiresDOMBootstrap(props.itemSize, props.estimateSize) && automaticEstimate.value === undefined) {
          prepared.value = updatePreparedVirtualList(prepared.value, props.items, props.getKey);
          scheduleBootstrap();
          return;
        }
        const exposed = root.value;
        if (exposed === undefined) return;
        const next = updatePreparedVirtualList(prepared.value, props.items, props.getKey);
        const patch = reconcileVirtualList(
          exposed.state as MasonryLayoutState<string>,
          next,
          props.items,
          props,
          automaticEstimate.value,
        );
        if (patch === null) {
          prepared.value = next;
          return;
        }
        const result = exposed.mutate(Object.freeze({ type: 'items', ...patch }) satisfies MasonryMutation<string>);
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
        const state = exposed.state as MasonryLayoutState<string>;
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
        }) satisfies MasonryMutation<string>);
      },
      { flush: 'post' },
    );
    expose(createHighLevelVirtualExpose(root, initialState));

    return (): VNodeChild => h(VirtualizerRoot, {
      ...attrs,
      key: isBootstrapping() ? 'bootstrap' : 'ready',
      ref: root,
      defaultState: activeState.value,
      strategy: masonryLayoutStrategy as unknown as VirtualLayoutStrategy<object, string, unknown, unknown>,
      overscan: props.overscan,
      ...(initialViewport === undefined ? {} : { initialViewport }),
      ...(measure === undefined ? {} : {
        measure: measure as unknown as VirtualMeasurementResolver<object, string, unknown>,
      }),
      as: props.as,
      'data-virtual-layout': 'virtual-masonry',
      onStateChange: (state: object) => emit('stateChange', state as MasonryLayoutState<string>),
      onPlanChange: (plan: VirtualLayoutPlan<string>) => {
        if (plan.viewport.width > 0) viewportWidth.value = plan.viewport.width;
        emit('planChange', plan);
      },
      onError: (error: Parameters<VirtualizerErrorHandler>[0]) => emit('error', error),
    }, {
      default: ({ placements }: VirtualizerRootSlotProps) => h(VirtualizerSurface, { as: props.contentAs }, {
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
              (value, key, index, placement) => slots['default']?.({
                value,
                key,
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
              (value, key, index, placement) => {
                const masonryPlacement = placement as MasonryPlacement<string>;
                return slots['default']?.({
                  value,
                  key,
                  index,
                  placement: masonryPlacement,
                  lane: masonryPlacement.lane,
                });
              },
              slots['empty'],
            ),
      }),
    });
  },
});

export const VirtualMasonry = VirtualMasonryRuntime as typeof VirtualMasonryRuntime & VirtualMasonryComponent;


function createVirtualMasonryState(
  prepared: PreparedVirtualList,
  items: readonly unknown[],
  props: Readonly<{
    itemSize: number | undefined;
    estimateSize: VirtualListEstimate<unknown> | undefined;
    laneGap: number;
    itemGap: number;
    placementPolicy: MasonryPlacementPolicy;
    maxItems: number;
  }>,
  geometry: ResponsiveLaneGeometry,
  automaticEstimate?: number,
): MasonryLayoutState<string> {
  return createMasonryLayout(
    createPreparedVirtualListSequence(prepared, props.maxItems),
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
  prepared: PreparedVirtualList,
  items: readonly unknown[],
  props: Readonly<{
    itemSize: number | undefined;
    estimateSize: VirtualListEstimate<unknown> | undefined;
    maxItems: number;
  }>,
  automaticEstimate?: number,
) {
  const estimate = props.estimateSize ?? automaticEstimate;
  const shared = props.itemSize !== undefined
    ? exactExtent(props.itemSize)
    : typeof estimate !== 'function'
      ? estimatedExtent(requireAutomaticEstimate(estimate), undefined, 0)
      : null;
  return shared === null
    ? createExtentIndex(Array.from({ length: prepared.domain.size }, (_unused, index) => estimatedExtent(estimate!, items[index], index)), { maxItems: props.maxItems })
    : createUniformExtentIndex(prepared.domain.size, shared, { maxItems: props.maxItems });
}
