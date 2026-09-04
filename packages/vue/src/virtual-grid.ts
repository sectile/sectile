import { defineComponent, h, nextTick, onBeforeUnmount, onMounted, shallowRef, watch, type AllowedComponentProps, type ComponentCustomProps, type PropType, type SlotsType, type VNodeChild, type VNodeProps } from 'vue';
import type { StableID } from '@sectile/core';
import { createExtentIndex, createUniformExtentIndex, type Extent, type ExtentIndex } from '@sectile/virtual/extent-index';
import { createDenseTrackGridLayout, trackGridLayoutStrategy, type GridRegion, type GridTrackMeasurement, type TrackGridLayoutState, type TrackGridMutation } from '@sectile/virtual/track-grid-layout';
import { createAxisMeasurementResolver, type VirtualInsets, type VirtualLayoutPlan, type VirtualLayoutStrategy, type VirtualMeasurementResolver, type VirtualRect, type VirtualizerErrorHandler } from '@sectile/dom/virtual';
import { VirtualizerFooter, VirtualizerHeader, VirtualizerRoot, VirtualizerSurface, type VirtualizerRootExpose, type VirtualizerRootSlotProps } from './internal/virtual-core.js';
import { assertLegacyVirtualSizeMode, createVirtualCollectionExpose, estimatedVirtualExtent, exactVirtualExtent, nearlyEqual, prepareVirtualCollection, renderCollectionBootstrapItems, renderHighLevelItems, requireVirtualAutomaticEstimate, requiresVirtualDOMBootstrap, resolveResponsiveLanes, updatePreparedVirtualCollection, type PreparedVirtualCollection, type ResponsiveLaneGeometry, type ResponsiveLaneProps, type VirtualCollectionBaseProps, type VirtualCollectionEstimate, type VirtualCollectionIDResolver, type VirtualCollectionItemAttributes, type VirtualCollectionItemSlotProps } from './internal/virtual-collection.js';

export interface VirtualGridProps<Value = unknown, ID extends StableID = StableID>
  extends VirtualCollectionBaseProps<Value, ID>, ResponsiveLaneProps {
  readonly itemSize?: number;
  readonly estimateSize?: VirtualCollectionEstimate<Value>;
  readonly rowGap?: number;
}

export type VirtualGridPublicProps<Value = unknown, ID extends StableID = StableID> =
  VirtualGridProps<Value, ID>
  & VNodeProps
  & AllowedComponentProps
  & ComponentCustomProps
  & {
    readonly onStateChange?: (state: TrackGridLayoutState<ID>) => unknown;
    readonly onPlanChange?: (plan: VirtualLayoutPlan<ID>) => unknown;
    readonly onError?: VirtualizerErrorHandler;
  };

export interface VirtualGridSlotProps<Value = unknown, ID extends StableID = StableID>
  extends VirtualCollectionItemSlotProps<Value, ID> {
  readonly row: number;
  readonly column: number;
}

export interface VirtualGridComponent {
  new <Value = unknown, ID extends StableID = StableID>(props: VirtualGridPublicProps<Value, ID>): {
    $props: VirtualGridPublicProps<Value, ID>;
    $slots: {
      header?: () => VNodeChild;
      item?: (props: VirtualGridSlotProps<Value, ID>) => VNodeChild;
      empty?: () => VNodeChild;
      footer?: () => VNodeChild;
    };
  };
}


const VirtualGridRuntime = /* @__PURE__ */ defineComponent({
  name: 'SectileVirtualGrid',
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
    rowGap: { type: Number, default: 0 },
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
    stateChange: (_state: TrackGridLayoutState<StableID>): boolean => true,
    planChange: (_plan: VirtualLayoutPlan<StableID>): boolean => true,
    error: (_error: Parameters<VirtualizerErrorHandler>[0]): boolean => true,
  },
  slots: Object as SlotsType<{
    header: () => VNodeChild;
    item: (props: VirtualGridSlotProps<unknown>) => VNodeChild;
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
    const isBootstrapping = (): boolean => requiresVirtualDOMBootstrap(props.itemSize, props.estimateSize)
      && automaticEstimate.value === undefined
      && prepared.value.domain.size > 0;
    const initialState = requiresVirtualDOMBootstrap(props.itemSize, props.estimateSize)
      ? createVirtualGridState(
          prepareVirtualCollection([], props.getID, props.maxItems),
          [],
          props,
          initialGeometry,
          0,
        )
      : createVirtualGridState(prepared.value, props.items, props, initialGeometry);
    const activeState = shallowRef(initialState);
    const root = shallowRef<VirtualizerRootExpose>();
    const viewportWidth = shallowRef(initialViewport?.width ?? 0);
    const measuredHeights = new Map<StableID, number>();
    const bootstrapElements = new Map<number, HTMLElement>();
    let bootstrapScheduled = false;
    let disposed = false;
    const bootstrapItemRef = (index: number, value: unknown): void => {
      const element = value instanceof HTMLElement ? value : null;
      if (element === null) bootstrapElements.delete(index);
      else {
        bootstrapElements.set(index, element);
        scheduleBootstrap();
      }
    };
    const completeBootstrap = (): void => {
      if (
        automaticEstimate.value !== undefined
        || !requiresVirtualDOMBootstrap(props.itemSize, props.estimateSize)
        || prepared.value.domain.size === 0
      ) return;
      const geometry = resolveResponsiveLanes(
        viewportWidth.value,
        props.laneCount,
        props.minLaneSize,
        props.maxLaneCount,
        props.laneGap,
      );
      const count = Math.min(geometry.count, prepared.value.domain.size);
      let maximum = 0;
      for (let index = 0; index < count; index += 1) {
        const element = bootstrapElements.get(index);
        if (element === undefined) return;
        const height = element.getBoundingClientRect().height;
        if (!Number.isFinite(height) || height <= 0) return;
        maximum = Math.max(maximum, height);
      }
      automaticEstimate.value = maximum;
      bootstrapElements.clear();
      activeState.value = createVirtualGridState(
        prepared.value,
        props.items,
        props,
        geometry,
        maximum,
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
      ? (({ element, placement, state }) => {
          const bounds = element.getBoundingClientRect();
          if (bounds.height <= 0) return null;
          measuredHeights.set(placement.id, bounds.height);
          const grid = state as TrackGridLayoutState<StableID>;
          const region = grid.regions.at(placement.index);
          if (region === undefined) return null;
          const height = gridMeasuredRowHeight(
            region.row,
            grid.columns.size,
            prepared.value,
            props.items,
            props.estimateSize,
            measuredHeights,
            automaticEstimate.value,
          );
          const current = grid.rows.extentAt(region.row);
          if (current?.kind === 'exact' && nearlyEqual(current.value, height)) {
            return null;
          }
          return Object.freeze({
            axis: 'row' as const,
            index: region.row,
            extent: exactVirtualExtent(height),
          });
        }) satisfies VirtualMeasurementResolver<TrackGridLayoutState<StableID>, StableID, GridTrackMeasurement>
      : undefined;

    const sync = (): void => {
      if (requiresVirtualDOMBootstrap(props.itemSize, props.estimateSize) && automaticEstimate.value === undefined) {
        prepared.value = updatePreparedVirtualCollection(prepared.value, props.items, props.getID);
        scheduleBootstrap();
        return;
      }
      const exposed = root.value;
      if (exposed === undefined) return;
      const next = updatePreparedVirtualCollection(prepared.value, props.items, props.getID);
      const geometry = resolveResponsiveLanes(
        viewportWidth.value,
        props.laneCount,
        props.minLaneSize,
        props.maxLaneCount,
        props.laneGap,
      );
      if (measuredHeights.size > 2_048) {
        for (const id of measuredHeights.keys()) {
          if (!next.domain.contains(id)) measuredHeights.delete(id);
        }
      }
      if (syncVirtualGrid(
        exposed,
        prepared.value,
        next,
        props.items,
        props,
        geometry,
        measuredHeights,
        automaticEstimate.value,
      )) {
        prepared.value = next;
      }
    };
    watch(
      () => [
        props.items,
        props.getID,
        props.itemSize,
        props.estimateSize,
        props.laneCount,
        props.minLaneSize,
        props.maxLaneCount,
        props.laneGap,
        props.rowGap,
        viewportWidth.value,
      ] as const,
      sync,
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
      strategy: trackGridLayoutStrategy as unknown as VirtualLayoutStrategy<object, StableID, unknown, unknown>,
      overscan: props.overscan,
      ...(props.viewportInsets === undefined ? {} : { viewportInsets: props.viewportInsets }),
      ...(initialViewport === undefined ? {} : { initialViewport }),
      ...(measure === undefined ? {} : {
        measure: measure as unknown as VirtualMeasurementResolver<object, StableID, unknown>,
      }),
      as: props.as,
      'data-virtual-layout': 'virtual-grid',
      'data-phase': prepared.value.domain.size === 0
        ? 'empty'
        : isBootstrapping()
          ? 'bootstrap'
          : 'ready',
      onStateChange: (state: object) => emit('stateChange', state as TrackGridLayoutState<StableID>),
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
                'virtual-grid',
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
                  placement,
                  row: 0,
                  column: index,
                }),
                bootstrapItemRef,
              )
            : renderHighLevelItems(
                'virtual-grid',
                placements,
                prepared.value,
                props.items,
                props.itemAs,
                props.itemAttributes,
                props.itemSize === undefined ? 'width' : 'both',
                (value, id, index, placement) => {
                  const grid = root.value?.state as TrackGridLayoutState<StableID> | undefined;
                  const region = grid?.regions.at(placement.index);
                  return slots['item']?.({
                    value,
                    id,
                    index,
                    placement,
                    row: region?.row ?? 0,
                    column: region?.column ?? 0,
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

export const VirtualGrid = VirtualGridRuntime as typeof VirtualGridRuntime & VirtualGridComponent;


function createVirtualGridState(
  prepared: PreparedVirtualCollection<unknown, StableID>,
  items: readonly unknown[],
  props: Readonly<{
    itemSize: number | undefined;
    estimateSize: VirtualCollectionEstimate<unknown> | undefined;
    rowGap: number;
    laneGap: number;
    maxItems: number;
  }>,
  geometry: ResponsiveLaneGeometry,
  automaticEstimate?: number,
): TrackGridLayoutState<StableID> {
  const rowCount = Math.ceil(prepared.domain.size / geometry.count);
  return createDenseTrackGridLayout(
    createGridRowExtentIndex(rowCount, geometry.count, items, props, automaticEstimate),
    createUniformExtentIndex(geometry.count, exactVirtualExtent(geometry.extent), { maxItems: props.maxItems }),
    prepared.domain.ids,
    {
      rowGap: props.rowGap,
      columnGap: props.laneGap,
      maxRegions: props.maxItems,
    },
  );
}

function createGridRowExtentIndex(
  rowCount: number,
  columnCount: number,
  items: readonly unknown[],
  props: Readonly<{
    itemSize: number | undefined;
    estimateSize: VirtualCollectionEstimate<unknown> | undefined;
    maxItems: number;
  }>,
  automaticEstimate?: number,
): ExtentIndex {
  const estimate = props.estimateSize ?? automaticEstimate;
  const shared = props.itemSize !== undefined
    ? exactVirtualExtent(props.itemSize)
    : typeof estimate !== 'function'
      ? estimatedVirtualExtent(requireVirtualAutomaticEstimate(estimate), undefined, 0)
      : null;
  return shared === null
    ? createExtentIndex(createGridRowExtents(rowCount, columnCount, items, props, automaticEstimate), { maxItems: props.maxItems })
    : createUniformExtentIndex(rowCount, shared, { maxItems: props.maxItems });
}


function createGridRowExtents(
  rowCount: number,
  columnCount: number,
  items: readonly unknown[],
  props: Readonly<{
    itemSize: number | undefined;
    estimateSize: VirtualCollectionEstimate<unknown> | undefined;
  }>,
  automaticEstimate?: number,
  startRow = 0,
): readonly Extent[] {
  return Object.freeze(Array.from({ length: rowCount }, (_unused, localRow) => {
    const row = startRow + localRow;
    if (props.itemSize !== undefined) return exactVirtualExtent(props.itemSize);
    const estimate = requireVirtualAutomaticEstimate(props.estimateSize ?? automaticEstimate);
    let value = typeof estimate === 'number' ? estimate : 0;
    if (typeof estimate === 'function') {
      const start = row * columnCount;
      const end = Math.min(items.length, start + columnCount);
      for (let index = start; index < end; index += 1)
        value = Math.max(value, estimate(items[index], index));
    }
    return Object.freeze({ kind: 'unknown' as const, fallback: value });
  }));
}

function gridMeasuredRowHeight(
  row: number,
  columnCount: number,
  prepared: PreparedVirtualCollection<unknown, StableID>,
  items: readonly unknown[],
  estimate: VirtualCollectionEstimate<unknown> | undefined,
  measured: ReadonlyMap<StableID, number>,
  automaticEstimate?: number,
): number {
  const start = row * columnCount;
  const end = Math.min(prepared.domain.size, start + columnCount);
  let maximum = 0;
  for (let index = start; index < end; index += 1) {
    const id = prepared.domain.at(index)!;
    const resolvedEstimate = requireVirtualAutomaticEstimate(estimate ?? automaticEstimate);
    const fallback = typeof resolvedEstimate === 'function'
      ? resolvedEstimate(items[index], index)
      : resolvedEstimate;
    maximum = Math.max(maximum, measured.get(id) ?? fallback);
  }
  return maximum;
}


function syncVirtualGrid(
  exposed: VirtualizerRootExpose,
  previous: PreparedVirtualCollection<unknown, StableID>,
  prepared: PreparedVirtualCollection<unknown, StableID>,
  items: readonly unknown[],
  props: Readonly<{
    itemSize: number | undefined;
    estimateSize: VirtualCollectionEstimate<unknown> | undefined;
    rowGap: number;
    laneGap: number;
    maxItems: number;
  }>,
  geometry: ResponsiveLaneGeometry,
  measured: ReadonlyMap<StableID, number>,
  automaticEstimate?: number,
): boolean {
  let state = exposed.state as TrackGridLayoutState<StableID>;
  const rowCount = Math.ceil(prepared.domain.size / geometry.count);
  const currentColumn = state.columns.extentAt(0);
  const itemEstimatesChanged = props.itemSize === undefined
    && typeof props.estimateSize === 'function'
    && previous.items !== items;
  const geometryUnchanged = (
    state.regions.size === prepared.domain.size
    && state.rows.size === rowCount
    && state.columns.size === geometry.count
    && state.rowGap === props.rowGap
    && state.columnGap === props.laneGap
    && currentColumn?.kind === 'exact'
    && nearlyEqual(currentColumn.value, geometry.extent)
    && !itemEstimatesChanged
  );
  if (geometryUnchanged && prepared.change === null) return true;
  const structuralGeometryUnchanged = (
    prepared.change !== null
    && state.columns.size === geometry.count
    && state.rowGap === props.rowGap
    && state.columnGap === props.laneGap
    && currentColumn?.kind === 'exact'
    && nearlyEqual(currentColumn.value, geometry.extent)
    && !itemEstimatesChanged
  );
  if (structuralGeometryUnchanged) {
    const rowPatch = rowCount === state.rows.size
      ? undefined
      : rowCount < state.rows.size
        ? Object.freeze({
            index: rowCount,
            deleteCount: state.rows.size - rowCount,
            inserted: Object.freeze([]),
          })
        : Object.freeze({
            index: state.rows.size,
            deleteCount: 0,
            inserted: createGridRowExtents(
              rowCount - state.rows.size,
              geometry.count,
              items,
              props,
              automaticEstimate,
              state.rows.size,
            ),
          });
    const result = exposed.mutate(Object.freeze({
      type: 'reconfigure-dense',
      ...(rowPatch === undefined ? {} : { rowPatch }),
      regionPatch: Object.freeze({
        type: 'splice',
        index: prepared.change!.index,
        deleteCount: prepared.change!.deleteCount,
        inserted: prepared.change!.inserted,
      }),
    }) satisfies TrackGridMutation<StableID>);
    return result.ok;
  }
  const rowExtents = createGridRowExtents(rowCount, geometry.count, items, props, automaticEstimate).map((extent, row) => {
    if (props.itemSize !== undefined) return extent;
    const measuredHeight = gridMeasuredRowHeight(
      row,
      geometry.count,
      prepared,
      items,
      props.estimateSize,
      measured,
      automaticEstimate,
    );
    return measuredHeight > ('fallback' in extent ? extent.fallback : extent.value)
      ? exactVirtualExtent(measuredHeight)
      : extent;
  });
  const result = exposed.mutate(Object.freeze({
    type: 'reconfigure-dense',
    rowPatch: Object.freeze({
      index: 0,
      deleteCount: state.rows.size,
      inserted: Object.freeze(rowExtents),
    }),
    columnPatch: Object.freeze({
      index: 0,
      deleteCount: state.columns.size,
      inserted: Object.freeze(Array.from(
        { length: geometry.count },
        () => exactVirtualExtent(geometry.extent),
      )),
    }),
    ...(prepared.change === null
      ? {}
      : {
          regionPatch: Object.freeze({
            type: 'splice' as const,
            index: prepared.change.index,
            deleteCount: prepared.change.deleteCount,
            inserted: prepared.change.inserted,
          }),
        }),
  }) satisfies TrackGridMutation<StableID>);
  return result.ok;
}
