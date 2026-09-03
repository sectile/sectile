import { defineComponent, h, nextTick, onBeforeUnmount, onMounted, shallowRef, watch, type AllowedComponentProps, type ComponentCustomProps, type PropType, type ShallowRef, type SlotsType, type VNodeArrayChildren, type VNodeChild, type VNodeProps } from 'vue';
import { createSequence, type BoundaryPolicy, type Direction, type MoveResult, type ScanOptions, type Sequence } from '@sectile/core/sequence';
import { createExtentIndex, createUniformExtentIndex, type Extent, type ExtentIndex } from '@sectile/virtual/extent-index';
import { linearLayoutStrategyFor, tryApplyLinearPatch, createLinearLayout, type LinearAxis, type LinearLayoutState, type LinearMeasurement, type LinearPatch } from '@sectile/virtual/linear-layout';
import { createAxisMeasurementResolver, virtualItemStyle, type VirtualInsets, type VirtualLayoutPlan, type VirtualMeasurementResolver, type VirtualPlacement, type VirtualPoint, type VirtualRect, type VirtualScrollAlignment, type VirtualizerErrorHandler } from '@sectile/dom/virtual';
import { Primitive } from '../primitive.js';
import { useVirtualizer, type VirtualizerOperationResult } from './virtual-core.js';
import {
  assertVirtualListSizeMode,
  createPreparedVirtualListSequence,
  estimatedExtent,
  exactExtent,
  prepareVirtualList,
  reconcileVirtualList,
  requireAutomaticEstimate,
  requiresDOMBootstrap,
  updatePreparedVirtualList,
  type PreparedVirtualList,
  type VirtualListEstimate,
  type VirtualListItemAttributes,
  type VirtualListKeyResolver,
} from './virtual-collection-model.js';

export type {
  VirtualListEstimate,
  VirtualListItemAttributes,
  VirtualListKeyResolver,
} from './virtual-collection-model.js';

export interface VirtualListProps<Value = unknown> {
  readonly items: readonly Value[];
  readonly getKey: VirtualListKeyResolver<Value>;
  readonly itemSize?: number;
  readonly estimateSize?: VirtualListEstimate<Value>;
  readonly axis?: LinearAxis;
  readonly gap?: number;
  readonly overscan?: number | Partial<VirtualInsets>;
  readonly maxItems?: number;
  readonly initialViewport?: VirtualRect;
  readonly as?: string;
  readonly contentAs?: string;
  readonly itemAs?: string;
  readonly itemAttributes?: VirtualListItemAttributes<Value>;
}

export type VirtualListPublicProps<Value = unknown> =
  VirtualListProps<Value>
  & VNodeProps
  & AllowedComponentProps
  & ComponentCustomProps
  & {
    readonly onStateChange?: (state: LinearLayoutState<string>) => unknown;
    readonly onPlanChange?: (plan: VirtualLayoutPlan<string>) => unknown;
    readonly onError?: VirtualizerErrorHandler;
  };

export interface VirtualListSlotProps<Value = unknown> {
  readonly value: Value;
  readonly key: string;
  readonly index: number;
  readonly placement: VirtualPlacement<string>;
}

export interface VirtualListExpose {
  readonly root: ShallowRef<HTMLElement | null | undefined>;
  readonly state: LinearLayoutState<string>;
  readonly plan: VirtualLayoutPlan<string> | null;
  scrollTo(
    id: string,
    alignment?: VirtualScrollAlignment,
  ): VirtualizerOperationResult<VirtualPoint>;
  refresh(): void;
  flush(): VirtualizerOperationResult<VirtualLayoutPlan<string>>;
}

export interface VirtualListComponent {
  new <Value = unknown>(
    props: VirtualListPublicProps<Value>,
  ): {
    $props: VirtualListPublicProps<Value>;
    $slots: {
      default?: (props: VirtualListSlotProps<Value>) => VNodeChild;
      empty?: () => VNodeChild;
    };
  };
}


export interface VirtualCollectionExpose<State> {
  readonly root: ShallowRef<HTMLElement | null | undefined>;
  readonly state: State;
  readonly plan: VirtualLayoutPlan<string> | null;
  scrollTo(
    id: string,
    alignment?: VirtualScrollAlignment,
  ): VirtualizerOperationResult<VirtualPoint> | undefined;
  refresh(): void;
  flush(): VirtualizerOperationResult<VirtualLayoutPlan<string>> | undefined;
}


const VirtualListRuntime = /* @__PURE__ */ defineComponent({
  name: 'SectileVirtualList',
  inheritAttrs: false,
  props: {
    items: {
      type: Array as unknown as PropType<readonly unknown[]>,
      required: true,
    },
    getKey: {
      type: Function as PropType<VirtualListKeyResolver<unknown>>,
      required: true,
    },
    estimateSize: {
      type: [Number, Function] as PropType<VirtualListEstimate<unknown>>,
      default: undefined,
    },
    itemSize: { type: Number, default: undefined },
    axis: {
      type: String as PropType<LinearAxis>,
      default: 'vertical',
    },
    gap: { type: Number, default: 0 },
    overscan: {
      type: [Number, Object] as PropType<number | Partial<VirtualInsets>>,
      default: 240,
    },
    maxItems: { type: Number, default: 1_000_000 },
    initialViewport: {
      type: Object as PropType<VirtualRect>,
      default: undefined,
    },
    as: { type: String, default: 'div' },
    contentAs: { type: String, default: 'div' },
    itemAs: { type: String, default: 'div' },
    itemAttributes: {
      type: Function as PropType<VirtualListItemAttributes<unknown>>,
      default: undefined,
    },
  },
  emits: {
    stateChange: (_state: LinearLayoutState<string>): boolean => true,
    planChange: (_plan: VirtualLayoutPlan<string>): boolean => true,
    error: (_error: Parameters<VirtualizerErrorHandler>[0]): boolean => true,
  },
  slots: Object as SlotsType<{
    default: (props: VirtualListSlotProps<unknown>) => VNodeChild;
    empty: () => VNodeChild;
  }>,
  setup(props, { attrs, emit, expose, slots }) {
    assertVirtualListSizeMode(props.itemSize, props.estimateSize);
    const prepared = shallowRef(prepareVirtualList(props.items, props.getKey, props.maxItems));
    const automaticEstimate = shallowRef<number>();
    const bootstrapCount = shallowRef(
      requiresDOMBootstrap(props.itemSize, props.estimateSize) && prepared.value.domain.size > 0 ? 1 : 0,
    );
    const bootstrapElements = new Map<number, HTMLElement>();
    let bootstrapScheduled = false;
    let disposed = false;
    const state = shallowRef(
      requiresDOMBootstrap(props.itemSize, props.estimateSize)
        ? createEmptyVirtualListState(props)
        : createVirtualListState(prepared.value, props.items, props),
    );
    const measure = props.itemSize === undefined
      ? createVirtualListMeasurementResolver(props.axis)
      : undefined;
    const virtualizer = useVirtualizer({
      state,
      strategy: linearLayoutStrategyFor<string>(),
      overscan: () => props.overscan,
      ...(props.initialViewport === undefined
        ? {}
        : { initialViewport: props.initialViewport }),
      ...(measure === undefined ? {} : { measure }),
      onStateChange: (value) => {
        emit('stateChange', value);
      },
      onPlanChange: (value) => {
        emit('planChange', value);
      },
      onError: (error) => {
        emit('error', error);
      },
    });
    const registrations = new Map<string, () => void>();
    const elements = new Map<string, HTMLElement>();
    const itemRefs = new Map<string, (value: unknown) => void>();
    const pendingMeasurements = new Set<string>();
    const forcedMeasurements = new Set<string>();
    let measurementScheduled = false;
    const setRootElement = (value: unknown): void => {
      virtualizer.scrollport.value = value instanceof HTMLElement ? value : null;
    };
    const setSurfaceElement = (value: unknown): void => {
      virtualizer.surface.value = value instanceof HTMLElement ? value : null;
    };

    const measurePendingItems = (): void => {
      measurementScheduled = false;
      if (disposed || pendingMeasurements.size === 0) return;
      const connection = virtualizer.connection.value;
      if (connection === undefined) return;
      const queued = Array.from(pendingMeasurements);
      pendingMeasurements.clear();
      const measurements: LinearMeasurement[] = [];
      for (const id of queued) {
        const element = elements.get(id);
        const index = state.value.domain.indexOf(id);
        if (element === undefined || index === null) continue;
        const current = state.value.extents.extentAt(index);
        if (current?.kind === 'exact' && !forcedMeasurements.has(id)) continue;
        const measurement = measureVirtualListElement(
          props.axis,
          id,
          element,
          state.value,
        );
        if (measurement !== null) measurements.push(measurement);
      }
      for (const id of queued) forcedMeasurements.delete(id);
      if (measurements.length > 0) connection.measure(measurements);
    };
    const scheduleItemMeasurement = (id: string, force = false): void => {
      if (props.itemSize !== undefined) return;
      pendingMeasurements.add(id);
      if (force) forcedMeasurements.add(id);
      if (measurementScheduled) return;
      measurementScheduled = true;
      void nextTick(measurePendingItems);
    };
    const scheduleChangedRenderedItemMeasurements = (
      previousPrepared: PreparedVirtualList,
      previousState: LinearLayoutState<string>,
      nextPrepared: PreparedVirtualList,
      nextState: LinearLayoutState<string>,
    ): void => {
      if (props.itemSize !== undefined) return;
      for (const id of elements.keys()) {
        const previousIndex = previousState.domain.indexOf(id);
        const nextIndex = nextState.domain.indexOf(id);
        if (
          previousIndex !== null
          && nextIndex !== null
          && !Object.is(
            previousPrepared.items[previousIndex],
            nextPrepared.items[nextIndex],
          )
        ) scheduleItemMeasurement(id, true);
      }
    };

    const itemRef = (id: string): ((value: unknown) => void) => {
      const existing = itemRefs.get(id);
      if (existing !== undefined) return existing;
      const callback = (value: unknown): void => {
        const element = value instanceof HTMLElement ? value : null;
        if (element !== null && elements.get(id) === element) return;
        registrations.get(id)?.();
        registrations.delete(id);
        elements.delete(id);
        if (element !== null) {
          elements.set(id, element);
          registrations.set(id, virtualizer.registerItem(element, id));
          scheduleItemMeasurement(id);
        }
      };
      itemRefs.set(id, callback);
      return callback;
    };

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
        || !requiresDOMBootstrap(props.itemSize, props.estimateSize)
        || prepared.value.domain.size === 0
      ) return;
      const count = Math.min(bootstrapCount.value, prepared.value.domain.size);
      const extents: number[] = [];
      for (let index = 0; index < count; index += 1) {
        const element = bootstrapElements.get(index);
        if (element === undefined) return;
        const bounds = element.getBoundingClientRect();
        const extent = props.axis === 'vertical' ? bounds.height : bounds.width;
        if (!Number.isFinite(extent) || extent <= 0) return;
        extents.push(extent);
      }
      const total = extents.reduce((sum, extent) => sum + extent, 0)
        + props.gap * Math.max(0, extents.length - 1);
      const root = virtualizer.scrollport.value;
      const measuredViewportExtent = props.axis === 'vertical'
        ? root?.clientHeight ?? 0
        : root?.clientWidth ?? 0;
      const viewportExtent = measuredViewportExtent > 0
        ? measuredViewportExtent
        : props.axis === 'vertical'
          ? props.initialViewport?.height ?? 0
          : props.initialViewport?.width ?? 0;
      const target = viewportExtent + bootstrapTrailingOverscanExtent(props.overscan, props.axis);
      const average = extents.reduce((sum, extent) => sum + extent, 0) / extents.length;
      if (target > total && count < prepared.value.domain.size) {
        const nextCount = Math.min(
          prepared.value.domain.size,
          Math.max(count + 1, Math.ceil((target + props.gap) / (average + props.gap))),
        );
        bootstrapCount.value = nextCount;
        return;
      }
      automaticEstimate.value = average;
      bootstrapCount.value = 0;
      bootstrapElements.clear();
      state.value = createVirtualListState(
        prepared.value,
        props.items,
        props,
        automaticEstimate.value,
      );
    };
    function scheduleBootstrap(): void {
      if (
        disposed
        || bootstrapScheduled
        || automaticEstimate.value !== undefined
        || bootstrapCount.value === 0
      ) return;
      bootstrapScheduled = true;
      void nextTick(() => {
        bootstrapScheduled = false;
        if (!disposed) completeBootstrap();
      });
    }
    onMounted(scheduleBootstrap);

    watch(
      () => props.items,
      (items) => {
        const previousPrepared = prepared.value;
        const previousState = state.value;
        const next = updatePreparedVirtualList(previousPrepared, items, props.getKey);
        if (requiresDOMBootstrap(props.itemSize, props.estimateSize) && automaticEstimate.value === undefined) {
          prepared.value = next;
          bootstrapCount.value = next.domain.size > 0 ? 1 : 0;
          scheduleBootstrap();
          return;
        }
        const patch = reconcileVirtualList(
          state.value,
          next,
          items,
          props,
          automaticEstimate.value,
        );
        if (patch === null) {
          scheduleChangedRenderedItemMeasurements(
            previousPrepared,
            previousState,
            next,
            previousState,
          );
          prepared.value = next;
          return;
        }
        const result = virtualizer.connection.value === undefined
          ? tryApplyLinearPatch(state.value, patch)
          : virtualizer.connection.value.mutate(patch);
        if (!result.ok) {
          if (virtualizer.connection.value === undefined) emit('error', result.error);
          return;
        }
        if (virtualizer.connection.value === undefined) state.value = result.value.state;
        scheduleChangedRenderedItemMeasurements(
          previousPrepared,
          previousState,
          next,
          result.value.state,
        );
        for (const id of itemRefs.keys()) {
          if (result.value.state.domain.indexOf(id) === null) itemRefs.delete(id);
        }
        prepared.value = next;
      },
      { flush: 'sync' },
    );

    let constructionWarningShown = false;
    watch(
      () => [
        props.axis,
        props.gap,
        props.maxItems,
        props.itemSize,
        props.estimateSize,
        props.initialViewport?.x,
        props.initialViewport?.y,
        props.initialViewport?.width,
        props.initialViewport?.height,
      ] as const,
      (value, previous) => {
        if (
          constructionWarningShown
          || value.every((item, index) => Object.is(item, previous[index]))
        ) return;
        constructionWarningShown = true;
        console.warn(
          '[Sectile] VirtualList axis, gap, maxItems, itemSize, estimateSize, and initialViewport are construction-time options. Remount the list to change them.',
        );
      },
      { flush: 'sync' },
    );

    onBeforeUnmount(() => {
      disposed = true;
      for (const unregister of registrations.values()) unregister();
      registrations.clear();
      elements.clear();
      itemRefs.clear();
      bootstrapElements.clear();
      pendingMeasurements.clear();
      forcedMeasurements.clear();
    });

    expose(Object.freeze({
      root: virtualizer.scrollport,
      get state() {
        return state.value;
      },
      get plan() {
        return virtualizer.plan.value;
      },
      scrollTo: virtualizer.scrollTo,
      refresh: virtualizer.refresh,
      flush: virtualizer.flush,
    }) satisfies VirtualListExpose);

    return (): VNodeChild => {
      const plan = virtualizer.plan.value;
      const rootStyle = attrs['style'];
      const rootAttributes = { ...attrs };
      delete rootAttributes['style'];
      const bootstrapping = automaticEstimate.value === undefined && bootstrapCount.value > 0;
      const contentStyle = props.axis === 'vertical'
        ? {
            position: 'relative',
            width: '100%',
            ...(bootstrapping ? {} : { height: `${plan?.contentSize.height ?? 0}px` }),
          }
        : {
            position: 'relative',
            height: '100%',
            ...(bootstrapping
              ? { display: 'flex' }
              : { width: `${plan?.contentSize.width ?? 0}px` }),
          };
      const children = (plan?.placements.map((placement) => {
        const index = placement.index;
        const value = props.items[index];
        if (index >= props.items.length || prepared.value.domain.at(index) !== placement.id) return null;
        const itemAttributes = props.itemAttributes?.(value, index) ?? {};
        const itemStyle = virtualItemStyle(placement, props.itemSize === undefined
          ? undefined
          : props.axis === 'vertical'
            ? { height: true }
            : { width: true });
        const rendered = slots['default']?.({
          value,
          key: placement.id,
          index,
          placement,
        });
        const itemChildren = rendered === undefined || rendered === null
          ? []
          : Array.isArray(rendered)
            ? rendered
            : [rendered];
        return h(
          props.itemAs,
          {
            ...itemAttributes,
            key: placement.id,
            ...(props.itemSize === undefined ? { ref: itemRef(placement.id) } : {}),
            style: [
              itemAttributes['style'],
              itemStyle,
              props.axis === 'vertical'
                ? { width: '100%' }
                : { height: '100%' },
            ],
            'data-scope': 'virtual-list',
            'data-part': 'item',
            'data-index': placement.index,
            'data-visible': placement.visible ? '' : undefined,
          },
          itemChildren as VNodeArrayChildren,
        );
      }) ?? []) as VNodeArrayChildren;
      if (automaticEstimate.value === undefined && bootstrapCount.value > 0) {
        children.push(...renderVirtualListBootstrapItems(
          prepared.value,
          props.items,
          bootstrapCount.value,
          props,
          slots['default'],
          bootstrapItemRef,
        ));
      }
      if (prepared.value.domain.size === 0) {
        const empty = slots['empty']?.();
        if (empty !== undefined && empty !== null) children.push(empty);
      }
      return h(
        props.as,
        {
          ...rootAttributes,
          ref: setRootElement,
          style: [{ overflow: 'auto' }, rootStyle],
          'data-scope': 'virtual-list',
          'data-part': 'root',
        },
        [
          h(
            props.contentAs,
            {
              ref: setSurfaceElement,
              style: contentStyle,
              'data-scope': 'virtual-list',
              'data-part': 'surface',
            },
            children,
          ),
        ],
      );
    };
  },
});

export const VirtualList = VirtualListRuntime as typeof VirtualListRuntime & VirtualListComponent;

export function createVirtualListMeasurementResolver(
  axis: LinearAxis,
): VirtualMeasurementResolver<LinearLayoutState<string>, string, LinearMeasurement> {
  return ({ element, placement, state }) =>
    measureVirtualListElement(axis, placement.id, element, state);
}

function measureVirtualListElement(
  axis: LinearAxis,
  id: string,
  element: HTMLElement,
  state: LinearLayoutState<string>,
): LinearMeasurement | null {
  const index = state.domain.indexOf(id);
  if (index === null) return null;
  const bounds = element.getBoundingClientRect();
  const value = axis === 'vertical' ? bounds.height : bounds.width;
  if (!Number.isFinite(value) || value <= 0) return null;
  const current = state.extents.extentAt(index);
  if (current?.kind === 'exact' && Math.abs(current.value - value) < 0.01) return null;
  return Object.freeze({
    index,
    extent: Object.freeze({ kind: 'exact' as const, value }),
  });
}

export function createVirtualListState(
  prepared: PreparedVirtualList,
  items: readonly unknown[],
  props: Readonly<{
    itemSize: number | undefined;
    estimateSize: VirtualListEstimate<unknown> | undefined;
    axis: LinearAxis;
    gap: number;
    maxItems: number;
  }>,
  automaticEstimate?: number,
): LinearLayoutState<string> {
  const estimate = props.estimateSize ?? automaticEstimate;
  const sharedExtent = props.itemSize !== undefined
    ? exactExtent(props.itemSize)
    : typeof estimate !== 'function'
      ? estimatedExtent(requireAutomaticEstimate(estimate), undefined, 0)
      : null;
  return createLinearLayout(
    createPreparedVirtualListSequence(prepared, props.maxItems),
    sharedExtent === null
      ? createExtentIndex(
          Array.from({ length: prepared.domain.size }, (_unused, index) => estimatedExtent(
            estimate!,
            items[index],
            index,
          )),
          { maxItems: props.maxItems },
        )
      : createUniformExtentIndex(prepared.domain.size, sharedExtent, {
          maxItems: props.maxItems,
        }),
    { axis: props.axis, gap: props.gap, crossExtent: 1 },
  );
}

export function createEmptyVirtualListState(
  props: Readonly<{
    axis: LinearAxis;
    gap: number;
    maxItems: number;
  }>,
): LinearLayoutState<string> {
  return createLinearLayout(
    createSequence([], { maxItems: props.maxItems, maxIDCodeUnits: 1_024 }),
    createUniformExtentIndex(0, exactExtent(0), { maxItems: props.maxItems }),
    { axis: props.axis, gap: props.gap, crossExtent: 1 },
  );
}

export function bootstrapTrailingOverscanExtent(
  overscan: number | Partial<VirtualInsets>,
  axis: LinearAxis,
): number {
  if (typeof overscan === 'number') return overscan;
  return axis === 'vertical'
    ? overscan.bottom ?? 0
    : overscan.right ?? 0;
}

export function renderVirtualListBootstrapItems(
  prepared: PreparedVirtualList,
  items: readonly unknown[],
  count: number,
  props: Readonly<{
    axis: LinearAxis;
    gap: number;
    itemAs: string;
    itemAttributes: VirtualListItemAttributes<unknown> | undefined;
  }>,
  render: ((props: VirtualListSlotProps<unknown>) => VNodeChild) | undefined,
  itemRef: (index: number, value: unknown) => void,
): VNodeArrayChildren {
  return Array.from({ length: Math.min(count, prepared.domain.size) }, (_unused, index) => {
    const value = items[index];
    const id = prepared.domain.at(index)!;
    const attributes = props.itemAttributes?.(value, index) ?? {};
    const placement = Object.freeze({
      id,
      index,
      rect: Object.freeze({ x: 0, y: 0, width: 0, height: 0 }),
      visible: true,
    });
    const rendered = render?.({ value, key: id, index, placement });
    const children = rendered === undefined || rendered === null
      ? []
      : Array.isArray(rendered)
        ? rendered
        : [rendered];
    return h(props.itemAs, {
      ...attributes,
      key: id,
      ref: (element: unknown) => itemRef(index, element),
      style: [
        attributes['style'],
        props.axis === 'vertical' ? { width: '100%' } : { height: '100%' },
        props.gap > 0 && index > 0
          ? props.axis === 'vertical'
            ? { marginTop: `${props.gap}px` }
            : { marginLeft: `${props.gap}px` }
          : undefined,
      ],
      'data-scope': 'virtual-list',
      'data-part': 'item',
      'data-index': index,
      'data-visible': '',
      'data-bootstrap': '',
    }, children as VNodeArrayChildren);
  });
}
