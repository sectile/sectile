import { defineComponent, h, onMounted, onUpdated, shallowRef, watch, type AllowedComponentProps, type ComponentCustomProps, type PropType, type SlotsType, type VNodeChild, type VNodeProps } from 'vue';
import { createExtentIndex, createUniformExtentIndex, type Extent, type ExtentIndex } from '@sectile/virtual/extent-index';
import { createDenseTrackGridLayout, trackGridLayoutStrategy, type GridRegion, type GridTrackMeasurement, type TrackGridLayoutState, type TrackGridMutation } from '@sectile/virtual/track-grid-layout';
import { createAxisMeasurementResolver, type VirtualInsets, type VirtualLayoutPlan, type VirtualLayoutStrategy, type VirtualMeasurementResolver, type VirtualRect, type VirtualizerErrorHandler } from '@sectile/dom/virtual';
import { VirtualizerContent, VirtualizerRoot, type VirtualizerRootExpose, type VirtualizerRootSlotProps } from './internal/virtual-core.js';
import { assertVirtualListSizeMode, createPreparedVirtualListSequence, exactExtent, estimatedExtent, prepareVirtualList, requireAutomaticEstimate, requiresDOMBootstrap, updatePreparedVirtualList, type PreparedVirtualList, type VirtualListEstimate, type VirtualListItemAttributes, type VirtualListKeyResolver } from './internal/virtual-collection-model.js';
import type { VirtualListSlotProps } from './internal/virtual-list.js';
import { createHighLevelVirtualExpose, nearlyEqual, renderCollectionBootstrapItems, renderHighLevelItems, resolveResponsiveLanes, type ResponsiveLaneGeometry, type ResponsiveLaneProps, type VirtualCollectionBaseProps } from './internal/virtual-collection.js';

export interface VirtualGridProps<Value = unknown>
  extends VirtualCollectionBaseProps<Value>, ResponsiveLaneProps {
  readonly itemSize?: number;
  readonly estimateSize?: VirtualListEstimate<Value>;
  readonly rowGap?: number;
}

export type VirtualGridPublicProps<Value = unknown> =
  VirtualGridProps<Value>
  & VNodeProps
  & AllowedComponentProps
  & ComponentCustomProps
  & {
    readonly onStateChange?: (state: TrackGridLayoutState<string>) => unknown;
    readonly onPlanChange?: (plan: VirtualLayoutPlan<string>) => unknown;
    readonly onError?: VirtualizerErrorHandler;
  };

export interface VirtualGridSlotProps<Value = unknown>
  extends VirtualListSlotProps<Value> {
  readonly row: number;
  readonly column: number;
}

export interface VirtualGridComponent {
  new <Value = unknown>(props: VirtualGridPublicProps<Value>): {
    $props: VirtualGridPublicProps<Value>;
    $slots: {
      default?: (props: VirtualGridSlotProps<Value>) => VNodeChild;
      empty?: () => VNodeChild;
    };
  };
}


const VirtualGridRuntime = /* @__PURE__ */ defineComponent({
  name: 'SectileVirtualGrid',
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
    rowGap: { type: Number, default: 0 },
    overscan: { type: [Number, Object] as PropType<number | Partial<VirtualInsets>>, default: 240 },
    maxItems: { type: Number, default: 1_000_000 },
    initialViewport: { type: Object as PropType<VirtualRect>, default: undefined },
    as: { type: String, default: 'div' },
    contentAs: { type: String, default: 'div' },
    itemAs: { type: String, default: 'div' },
    itemAttributes: { type: Function as PropType<VirtualListItemAttributes<unknown>>, default: undefined },
  },
  emits: {
    stateChange: (_state: TrackGridLayoutState<string>): boolean => true,
    planChange: (_plan: VirtualLayoutPlan<string>): boolean => true,
    error: (_error: Parameters<VirtualizerErrorHandler>[0]): boolean => true,
  },
  slots: Object as SlotsType<{
    default: (props: VirtualGridSlotProps<unknown>) => VNodeChild;
    empty: () => VNodeChild;
  }>,
  setup(props, { attrs, emit, expose, slots }) {
    assertVirtualListSizeMode(props.itemSize, props.estimateSize);
    const initialViewport = props.initialViewport === undefined
      ? undefined
      : Object.freeze({ ...props.initialViewport });
    const prepared = shallowRef(prepareVirtualList(props.items, props.getKey));
    const initialGeometry = resolveResponsiveLanes(
      initialViewport?.width ?? 0,
      props.laneCount,
      props.minLaneSize,
      props.maxLaneCount,
      props.laneGap,
    );
    const automaticEstimate = shallowRef<number>();
    const isBootstrapping = (): boolean => requiresDOMBootstrap(props.itemSize, props.estimateSize)
      && automaticEstimate.value === undefined
      && prepared.value.ids.length > 0;
    const initialState = requiresDOMBootstrap(props.itemSize, props.estimateSize)
      ? createVirtualGridState(
          prepareVirtualList([], props.getKey),
          [],
          props,
          initialGeometry,
          0,
        )
      : createVirtualGridState(prepared.value, props.items, props, initialGeometry);
    const activeState = shallowRef(initialState);
    const root = shallowRef<VirtualizerRootExpose>();
    const viewportWidth = shallowRef(initialViewport?.width ?? 0);
    const measuredHeights = new Map<string, number>();
    const bootstrapElements = new Map<number, HTMLElement>();
    const bootstrapItemRef = (index: number, value: unknown): void => {
      const element = value instanceof HTMLElement ? value : null;
      if (element === null) bootstrapElements.delete(index);
      else bootstrapElements.set(index, element);
    };
    const completeBootstrap = (): void => {
      if (
        automaticEstimate.value !== undefined
        || !requiresDOMBootstrap(props.itemSize, props.estimateSize)
        || prepared.value.ids.length === 0
      ) return;
      const geometry = resolveResponsiveLanes(
        viewportWidth.value,
        props.laneCount,
        props.minLaneSize,
        props.maxLaneCount,
        props.laneGap,
      );
      const count = Math.min(geometry.count, prepared.value.ids.length);
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
    onMounted(completeBootstrap);
    onUpdated(completeBootstrap);
    const measure = props.itemSize === undefined
      ? (({ element, placement, state }) => {
          const bounds = element.getBoundingClientRect();
          if (bounds.height <= 0) return null;
          measuredHeights.set(placement.id, bounds.height);
          const grid = state as TrackGridLayoutState<string>;
          const region = grid.regions.at(placement.index);
          if (region === undefined) return null;
          return Object.freeze({
            axis: 'row' as const,
            index: region.row,
            extent: exactExtent(gridMeasuredRowHeight(
              region.row,
              grid.columns.size,
              prepared.value,
              props.items,
              props.estimateSize,
              measuredHeights,
              automaticEstimate.value,
            )),
          });
        }) satisfies VirtualMeasurementResolver<TrackGridLayoutState<string>, string, GridTrackMeasurement>
      : undefined;

    const sync = (): void => {
      if (requiresDOMBootstrap(props.itemSize, props.estimateSize) && automaticEstimate.value === undefined) {
        prepared.value = updatePreparedVirtualList(prepared.value, props.items, props.getKey);
        bootstrapElements.clear();
        return;
      }
      const exposed = root.value;
      if (exposed === undefined) return;
      const next = updatePreparedVirtualList(prepared.value, props.items, props.getKey);
      const geometry = resolveResponsiveLanes(
        viewportWidth.value,
        props.laneCount,
        props.minLaneSize,
        props.maxLaneCount,
        props.laneGap,
      );
      if (measuredHeights.size > 2_048) {
        const active = new Set(next.ids);
        for (const id of measuredHeights.keys()) if (!active.has(id)) measuredHeights.delete(id);
      }
      if (syncVirtualGrid(
        exposed,
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
        props.getKey,
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
    expose(createHighLevelVirtualExpose(root, initialState));

    return (): VNodeChild => h(VirtualizerRoot, {
      ...attrs,
      key: isBootstrapping() ? 'bootstrap' : 'ready',
      ref: root,
      defaultState: activeState.value,
      strategy: trackGridLayoutStrategy as unknown as VirtualLayoutStrategy<object, string, unknown, unknown>,
      overscan: props.overscan,
      ...(initialViewport === undefined ? {} : { initialViewport }),
      ...(measure === undefined ? {} : {
        measure: measure as unknown as VirtualMeasurementResolver<object, string, unknown>,
      }),
      as: props.as,
      'data-virtual-layout': 'virtual-grid',
      onStateChange: (state: object) => emit('stateChange', state as TrackGridLayoutState<string>),
      onPlanChange: (plan: VirtualLayoutPlan<string>) => {
        if (plan.viewport.width > 0) viewportWidth.value = plan.viewport.width;
        emit('planChange', plan);
      },
      onError: (error: Parameters<VirtualizerErrorHandler>[0]) => emit('error', error),
    }, {
      default: ({ placements }: VirtualizerRootSlotProps) => h(VirtualizerContent, { as: props.contentAs }, {
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
                prepared.value.ids.length,
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
              (value, key, index, placement) => {
                const grid = (root.value?.state as TrackGridLayoutState<string> | undefined);
                const region = grid?.regions.at(placement.index);
                return slots['default']?.({
                  value,
                  key,
                  index,
                  placement,
                  row: region?.row ?? 0,
                  column: region?.column ?? 0,
                });
              },
              slots['empty'],
            ),
      }),
    });
  },
});

export const VirtualGrid = VirtualGridRuntime as typeof VirtualGridRuntime & VirtualGridComponent;


function createVirtualGridState(
  prepared: PreparedVirtualList,
  items: readonly unknown[],
  props: Readonly<{
    itemSize: number | undefined;
    estimateSize: VirtualListEstimate<unknown> | undefined;
    rowGap: number;
    laneGap: number;
    maxItems: number;
  }>,
  geometry: ResponsiveLaneGeometry,
  automaticEstimate?: number,
): TrackGridLayoutState<string> {
  const rowCount = Math.ceil(prepared.ids.length / geometry.count);
  return createDenseTrackGridLayout(
    createGridRowExtentIndex(rowCount, geometry.count, items, props, automaticEstimate),
    createUniformExtentIndex(geometry.count, exactExtent(geometry.extent), { maxItems: props.maxItems }),
    prepared.ids,
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
    estimateSize: VirtualListEstimate<unknown> | undefined;
    maxItems: number;
  }>,
  automaticEstimate?: number,
): ExtentIndex {
  const estimate = props.estimateSize ?? automaticEstimate;
  const shared = props.itemSize !== undefined
    ? exactExtent(props.itemSize)
    : typeof estimate !== 'function'
      ? estimatedExtent(requireAutomaticEstimate(estimate), undefined, 0)
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
    estimateSize: VirtualListEstimate<unknown> | undefined;
  }>,
  automaticEstimate?: number,
): readonly Extent[] {
  return Object.freeze(Array.from({ length: rowCount }, (_unused, row) => {
    if (props.itemSize !== undefined) return exactExtent(props.itemSize);
    const estimate = requireAutomaticEstimate(props.estimateSize ?? automaticEstimate);
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
  prepared: PreparedVirtualList,
  items: readonly unknown[],
  estimate: VirtualListEstimate<unknown> | undefined,
  measured: ReadonlyMap<string, number>,
  automaticEstimate?: number,
): number {
  const start = row * columnCount;
  const end = Math.min(prepared.ids.length, start + columnCount);
  let maximum = 0;
  for (let index = start; index < end; index += 1) {
    const id = prepared.ids[index]!;
    const resolvedEstimate = requireAutomaticEstimate(estimate ?? automaticEstimate);
    const fallback = typeof resolvedEstimate === 'function'
      ? resolvedEstimate(items[index], index)
      : resolvedEstimate;
    maximum = Math.max(maximum, measured.get(id) ?? fallback);
  }
  return maximum;
}


function syncVirtualGrid(
  exposed: VirtualizerRootExpose,
  prepared: PreparedVirtualList,
  items: readonly unknown[],
  props: Readonly<{
    itemSize: number | undefined;
    estimateSize: VirtualListEstimate<unknown> | undefined;
    rowGap: number;
    laneGap: number;
    maxItems: number;
  }>,
  geometry: ResponsiveLaneGeometry,
  measured: ReadonlyMap<string, number>,
  automaticEstimate?: number,
): boolean {
  let state = exposed.state as TrackGridLayoutState<string>;
  const rowCount = Math.ceil(prepared.ids.length / geometry.count);
  const currentColumn = state.columns.extentAt(0);
  if (
    state.regions.size === prepared.ids.length
    && prepared.change === null
    && state.rows.size === rowCount
    && state.columns.size === geometry.count
    && state.rowGap === props.rowGap
    && state.columnGap === props.laneGap
    && currentColumn?.kind === 'exact'
    && nearlyEqual(currentColumn.value, geometry.extent)
  ) return true;
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
      ? exactExtent(measuredHeight)
      : extent;
  });
  let valid = true;
  const mutate = (mutation: TrackGridMutation<string>): void => {
    if (!valid) return;
    const result = exposed.mutate(mutation);
    if (!result.ok) {
      valid = false;
      return;
    }
    state = exposed.state as TrackGridLayoutState<string>;
  };
  if (geometry.count > state.columns.size) mutate(Object.freeze({
    type: 'splice-tracks', axis: 'column', index: state.columns.size, deleteCount: 0,
    inserted: Object.freeze(Array.from({ length: geometry.count - state.columns.size }, () => exactExtent(geometry.extent))),
  }));
  if (rowCount > state.rows.size) mutate(Object.freeze({
    type: 'splice-tracks', axis: 'row', index: state.rows.size, deleteCount: 0,
    inserted: Object.freeze(rowExtents.slice(state.rows.size)),
  }));
  if (prepared.change !== null) mutate(Object.freeze({
    type: 'patch-dense-regions',
    patch: Object.freeze({
      type: 'splice',
      index: prepared.change.index,
      deleteCount: prepared.change.deleteCount,
      inserted: prepared.change.inserted,
    }),
  }));
  if (rowCount < state.rows.size) mutate(Object.freeze({
    type: 'splice-tracks', axis: 'row', index: rowCount, deleteCount: state.rows.size - rowCount, inserted: Object.freeze([]),
  }));
  if (geometry.count < state.columns.size) mutate(Object.freeze({
    type: 'splice-tracks', axis: 'column', index: geometry.count, deleteCount: state.columns.size - geometry.count, inserted: Object.freeze([]),
  }));
  if (rowCount > 0) mutate(Object.freeze({
    type: 'splice-tracks', axis: 'row', index: 0, deleteCount: rowCount, inserted: Object.freeze(rowExtents),
  }));
  if (geometry.count > 0) mutate(Object.freeze({
    type: 'splice-tracks', axis: 'column', index: 0, deleteCount: geometry.count,
    inserted: Object.freeze(Array.from({ length: geometry.count }, () => exactExtent(geometry.extent))),
  }));
  return valid;
}
