import { defineComponent, h, nextTick, onBeforeUnmount, onMounted, shallowRef, watch, type AllowedComponentProps, type ComponentCustomProps, type PropType, type SlotsType, type VNodeChild, type VNodeProps } from 'vue';
import type { StableID } from '@sectile/core';
import {
  createExactVirtualExtent,
  createVirtualExtent,
  resolveVirtualLaneGeometry,
  virtualSizePolicyRequiresMeasurement,
  type VirtualLaneGeometry,
  type VirtualLanePolicy,
  type VirtualSizePolicy,
} from '@sectile/virtual/collection';
import { createExtentIndex, createUniformExtentIndex, type Extent, type ExtentIndex } from '@sectile/virtual/extent-index';
import { createDenseTrackGridLayout, trackGridLayoutStrategy, type GridTrackMeasurement, type TrackGridLayoutState, type TrackGridMutation } from '@sectile/virtual/track-grid-layout';
import { type VirtualInsets, type VirtualLayoutPlan, type VirtualLayoutStrategy, type VirtualMeasurementResolver, type VirtualRect, type VirtualizerErrorHandler } from '@sectile/dom/virtual';
import { VirtualizerFooter, VirtualizerHeader, VirtualizerRoot, VirtualizerSurface, type VirtualizerRootExpose, type VirtualizerRootSlotProps } from './internal/virtual-core.js';
import { createVirtualCollectionExpose, nearlyEqual, prepareVirtualCollection, renderCollectionBootstrapItems, renderHighLevelItems, updatePreparedVirtualCollection, type PreparedVirtualCollection, type VirtualCollectionBaseProps, type VirtualCollectionIDResolver, type VirtualCollectionItemAttributes, type VirtualCollectionItemSlotProps } from './internal/virtual-collection.js';

export interface VirtualGridProps<Value = unknown, ID extends StableID = StableID>
  extends VirtualCollectionBaseProps<Value, ID> {
  readonly sizePolicy: VirtualSizePolicy<Value>;
  readonly lanePolicy: VirtualLanePolicy;
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
    sizePolicy: { type: Object as PropType<VirtualSizePolicy<unknown>>, required: true },
    lanePolicy: { type: Object as PropType<VirtualLanePolicy>, required: true },
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
    const initialViewport = props.initialViewport === undefined
      ? undefined
      : Object.freeze({ ...props.initialViewport });
    const prepared = shallowRef(prepareVirtualCollection(props.items, props.getID, props.maxItems));
    const initialGeometry = resolveVirtualLaneGeometry(
      initialViewport?.width ?? 0,
      props.lanePolicy,
    );
    const automaticEstimate = shallowRef<number>();
    const isBootstrapping = (): boolean => virtualSizePolicyRequiresMeasurement(props.sizePolicy)
      && automaticEstimate.value === undefined
      && prepared.value.domain.size > 0;
    const initialState = virtualSizePolicyRequiresMeasurement(props.sizePolicy)
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
      if (!isBootstrapping()) return;
      const geometry = resolveVirtualLaneGeometry(
        viewportWidth.value,
        props.lanePolicy,
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
    const measure = props.sizePolicy.kind === 'fixed'
      ? undefined
      : (({ element, placement, state }) => {
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
            props.sizePolicy,
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
            extent: createExactVirtualExtent(height),
          });
        }) satisfies VirtualMeasurementResolver<TrackGridLayoutState<StableID>, StableID, GridTrackMeasurement>;

    const sync = (): void => {
      if (virtualSizePolicyRequiresMeasurement(props.sizePolicy) && automaticEstimate.value === undefined) {
        prepared.value = updatePreparedVirtualCollection(prepared.value, props.items, props.getID);
        scheduleBootstrap();
        return;
      }
      const exposed = root.value;
      if (exposed === undefined) return;
      const next = updatePreparedVirtualCollection(prepared.value, props.items, props.getID);
      const geometry = resolveVirtualLaneGeometry(viewportWidth.value, props.lanePolicy);
      if (next.valueChange !== null && props.sizePolicy.kind !== 'fixed') {
        const end = next.valueChange.index + next.valueChange.count;
        for (let index = next.valueChange.index; index < end; index += 1) {
          const id = next.domain.at(index);
          if (id !== null) measuredHeights.delete(id);
        }
      }
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
        props.sizePolicy,
        props.lanePolicy,
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
        viewportWidth.value = plan.viewport.width;
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
                  resolveVirtualLaneGeometry(
                    viewportWidth.value,
                    props.lanePolicy,
                  ).count,
                  prepared.value.domain.size,
                ),
                resolveVirtualLaneGeometry(
                  viewportWidth.value,
                  props.lanePolicy,
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
                props.sizePolicy.kind === 'fixed' ? 'both' : 'width',
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
    sizePolicy: VirtualSizePolicy<unknown>;
    rowGap: number;
    maxItems: number;
  }>,
  geometry: VirtualLaneGeometry,
  automaticEstimate?: number,
): TrackGridLayoutState<StableID> {
  const rowCount = Math.ceil(prepared.domain.size / geometry.count);
  return createDenseTrackGridLayout(
    createGridRowExtentIndex(rowCount, geometry.count, items, props, automaticEstimate),
    createUniformExtentIndex(
      geometry.count,
      createExactVirtualExtent(geometry.extent),
      { maxItems: props.maxItems },
    ),
    prepared.domain.ids,
    {
      rowGap: props.rowGap,
      columnGap: geometry.gap,
      maxRegions: props.maxItems,
    },
  );
}

function createGridRowExtentIndex(
  rowCount: number,
  columnCount: number,
  items: readonly unknown[],
  props: Readonly<{
    sizePolicy: VirtualSizePolicy<unknown>;
    maxItems: number;
  }>,
  automaticEstimate?: number,
): ExtentIndex {
  const shared = props.sizePolicy.kind === 'fixed'
    || props.sizePolicy.kind === 'measured'
    || (
      props.sizePolicy.kind === 'estimated'
      && typeof props.sizePolicy.estimate === 'number'
    )
    ? createVirtualExtent(
        props.sizePolicy,
        items[0],
        0,
        automaticEstimate,
      )
    : null;
  return shared === null
    ? createExtentIndex(
        createGridRowExtents(
          rowCount,
          columnCount,
          items,
          props,
          automaticEstimate,
        ),
        { maxItems: props.maxItems },
      )
    : createUniformExtentIndex(rowCount, shared, { maxItems: props.maxItems });
}

function createGridRowExtents(
  rowCount: number,
  columnCount: number,
  items: readonly unknown[],
  props: Readonly<{
    sizePolicy: VirtualSizePolicy<unknown>;
  }>,
  automaticEstimate?: number,
  startRow = 0,
): readonly Extent[] {
  return Object.freeze(Array.from({ length: rowCount }, (_unused, localRow) => {
    const row = startRow + localRow;
    if (props.sizePolicy.kind === 'fixed') {
      return createExactVirtualExtent(props.sizePolicy.extent);
    }
    const start = row * columnCount;
    const end = Math.min(items.length, start + columnCount);
    let maximum = 0;
    for (let index = start; index < end; index += 1) {
      maximum = Math.max(
        maximum,
        extentValue(createVirtualExtent(
          props.sizePolicy,
          items[index],
          index,
          automaticEstimate,
        )),
      );
    }
    return Object.freeze({ kind: 'unknown' as const, fallback: maximum });
  }));
}

function gridMeasuredRowHeight(
  row: number,
  columnCount: number,
  prepared: PreparedVirtualCollection<unknown, StableID>,
  items: readonly unknown[],
  sizePolicy: VirtualSizePolicy<unknown>,
  measured: ReadonlyMap<StableID, number>,
  automaticEstimate?: number,
): number {
  const start = row * columnCount;
  const end = Math.min(prepared.domain.size, start + columnCount);
  let maximum = 0;
  for (let index = start; index < end; index += 1) {
    const id = prepared.domain.at(index)!;
    const fallback = extentValue(createVirtualExtent(
      sizePolicy,
      items[index],
      index,
      automaticEstimate,
    ));
    maximum = Math.max(maximum, measured.get(id) ?? fallback);
  }
  return maximum;
}

function extentValue(extent: Extent): number {
  return extent.kind === 'unknown' ? extent.fallback : extent.value;
}

function createResolvedGridRowExtents(
  rowCount: number,
  columnCount: number,
  prepared: PreparedVirtualCollection<unknown, StableID>,
  items: readonly unknown[],
  props: Readonly<{ sizePolicy: VirtualSizePolicy<unknown> }>,
  measured: ReadonlyMap<StableID, number>,
  automaticEstimate?: number,
  startRow = 0,
): readonly Extent[] {
  const extents = createGridRowExtents(
    rowCount,
    columnCount,
    items,
    props,
    automaticEstimate,
    startRow,
  );
  if (props.sizePolicy.kind === 'fixed') return extents;
  return Object.freeze(extents.map((extent, localRow) => {
    const row = startRow + localRow;
    const measuredHeight = gridMeasuredRowHeight(
      row,
      columnCount,
      prepared,
      items,
      props.sizePolicy,
      measured,
      automaticEstimate,
    );
    return measuredHeight > extentValue(extent)
      ? createExactVirtualExtent(measuredHeight)
      : extent;
  }));
}

function syncVirtualGrid(
  exposed: VirtualizerRootExpose,
  _previous: PreparedVirtualCollection<unknown, StableID>,
  prepared: PreparedVirtualCollection<unknown, StableID>,
  items: readonly unknown[],
  props: Readonly<{
    sizePolicy: VirtualSizePolicy<unknown>;
    rowGap: number;
    maxItems: number;
  }>,
  geometry: VirtualLaneGeometry,
  measured: ReadonlyMap<StableID, number>,
  automaticEstimate?: number,
): boolean {
  const state = exposed.state as TrackGridLayoutState<StableID>;
  const rowCount = Math.ceil(prepared.domain.size / geometry.count);
  const currentColumn = state.columns.extentAt(0);
  const geometryUnchanged = (
    state.columns.size === geometry.count
    && state.rowGap === props.rowGap
    && state.columnGap === geometry.gap
    && currentColumn?.kind === 'exact'
    && nearlyEqual(currentColumn.value, geometry.extent)
  );

  if (geometryUnchanged && prepared.change === null && prepared.valueChange === null) {
    return state.regions.size === prepared.domain.size && state.rows.size === rowCount;
  }

  if (geometryUnchanged && prepared.change === null && prepared.valueChange !== null) {
    if (props.sizePolicy.kind === 'fixed') return true;
    const startRow = Math.floor(prepared.valueChange.index / geometry.count);
    const endRow = Math.min(
      rowCount,
      Math.ceil(
        (prepared.valueChange.index + prepared.valueChange.count) / geometry.count,
      ),
    );
    if (endRow <= startRow) return true;
    const result = exposed.mutate(Object.freeze({
      type: 'reconfigure-dense',
      rowPatch: Object.freeze({
        index: startRow,
        deleteCount: endRow - startRow,
        inserted: createResolvedGridRowExtents(
          endRow - startRow,
          geometry.count,
          prepared,
          items,
          props,
          measured,
          automaticEstimate,
          startRow,
        ),
      }),
    }) satisfies TrackGridMutation<StableID>);
    return result.ok;
  }

  if (geometryUnchanged && prepared.change !== null) {
    const rowPatch = props.sizePolicy.kind === 'fixed'
      ? rowCount === state.rows.size
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
            })
      : (() => {
          const startRow = Math.floor(prepared.change!.index / geometry.count);
          return Object.freeze({
            index: startRow,
            deleteCount: Math.max(0, state.rows.size - startRow),
            inserted: createResolvedGridRowExtents(
              Math.max(0, rowCount - startRow),
              geometry.count,
              prepared,
              items,
              props,
              measured,
              automaticEstimate,
              startRow,
            ),
          });
        })();
    const result = exposed.mutate(Object.freeze({
      type: 'reconfigure-dense',
      ...(rowPatch === undefined ? {} : { rowPatch }),
      regionPatch: Object.freeze({
        type: 'splice',
        index: prepared.change.index,
        deleteCount: prepared.change.deleteCount,
        inserted: prepared.change.inserted,
      }),
    }) satisfies TrackGridMutation<StableID>);
    return result.ok;
  }

  const rowExtents = createResolvedGridRowExtents(
    rowCount,
    geometry.count,
    prepared,
    items,
    props,
    measured,
    automaticEstimate,
  );
  const result = exposed.mutate(Object.freeze({
    type: 'reconfigure-dense',
    rowPatch: Object.freeze({
      index: 0,
      deleteCount: state.rows.size,
      inserted: rowExtents,
    }),
    columnPatch: Object.freeze({
      index: 0,
      deleteCount: state.columns.size,
      inserted: Object.freeze(Array.from(
        { length: geometry.count },
        () => createExactVirtualExtent(geometry.extent),
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
