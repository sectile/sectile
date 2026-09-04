import { defineComponent, h, nextTick, onBeforeUnmount, onMounted, shallowRef, watch, type AllowedComponentProps, type Component, type ComponentCustomProps, type PropType, type SlotsType, type VNodeArrayChildren, type VNodeChild, type VNodeProps } from 'vue';
import type { StableID } from '@sectile/core';
import { createSequence } from '@sectile/core/sequence';
import {
  createExactVirtualExtent,
  createVirtualExtent,
  reconcileVirtualCollectionExtents,
  reconcileVirtualCollectionValueExtents,
  virtualSizePolicyRequiresMeasurement,
  type VirtualSizePolicy,
} from '@sectile/virtual/collection';
import { createExtentIndex, createUniformExtentIndex, type ExtentIndex } from '@sectile/virtual/extent-index';
import { createLinearLayout, linearLayoutStrategyFor, setLinearCrossExtent, tryApplyLinearMeasurements, tryApplyLinearPatch, type LinearAxis, type LinearLayoutState, type LinearMeasurement } from '@sectile/virtual/linear-layout';
import { type VirtualInsets, type VirtualLayoutPlan, type VirtualMeasurementResolver, type VirtualRect, type VirtualizerErrorHandler } from '@sectile/dom/virtual';
import { VirtualizerFooter, VirtualizerHeader, VirtualizerRoot, VirtualizerSurface, type VirtualizerItemSize, type VirtualizerRootExpose, type VirtualizerRootProps, type VirtualizerRootSlotProps } from './virtual-core.js';
import {
  constrainPreparedVirtualCollection,
  createVirtualCollectionExpose,
  prepareVirtualCollection,
  renderHighLevelItems,
  updatePreparedVirtualCollection,
  type PreparedVirtualCollection,
  type VirtualCollectionBaseProps,
  type VirtualCollectionExpose,
  type VirtualCollectionIDResolver,
  type VirtualCollectionItemAttributes,
  type VirtualCollectionItemSlotProps,
} from './virtual-collection.js';

export type VirtualListItemAttributes<Value> = VirtualCollectionItemAttributes<Value>;
export type VirtualListIDResolver<Value, ID extends StableID = StableID> = VirtualCollectionIDResolver<Value, ID>;

export interface VirtualListProps<Value = unknown, ID extends StableID = StableID>
  extends VirtualCollectionBaseProps<Value, ID> {
  readonly sizePolicy: VirtualSizePolicy<Value>;
  readonly axis?: LinearAxis;
  readonly gap?: number;
}

export type VirtualListPublicProps<Value = unknown, ID extends StableID = StableID> =
  VirtualListProps<Value, ID>
  & VNodeProps
  & AllowedComponentProps
  & ComponentCustomProps
  & {
    readonly onStateChange?: (state: LinearLayoutState<ID>) => unknown;
    readonly onPlanChange?: (plan: VirtualLayoutPlan<ID>) => unknown;
    readonly onError?: VirtualizerErrorHandler;
  };

export interface VirtualListSlotProps<Value = unknown, ID extends StableID = StableID>
  extends VirtualCollectionItemSlotProps<Value, ID> {}

export type VirtualListExpose<ID extends StableID = StableID> =
  VirtualCollectionExpose<LinearLayoutState<ID>, ID>;

export interface VirtualListComponent {
  new <Value = unknown, ID extends StableID = StableID>(
    props: VirtualListPublicProps<Value, ID>,
  ): {
    $props: VirtualListPublicProps<Value, ID>;
    $slots: {
      header?: () => VNodeChild;
      item?: (props: VirtualListSlotProps<Value, ID>) => VNodeChild;
      empty?: () => VNodeChild;
      footer?: () => VNodeChild;
    };
  };
}



const VirtualListRuntime = /* @__PURE__ */ defineComponent({
  name: 'SectileVirtualList',
  inheritAttrs: false,
  props: {
    items: {
      type: Array as unknown as PropType<readonly unknown[]>,
      required: true,
    },
    getID: {
      type: Function as PropType<VirtualListIDResolver<unknown>>,
      required: true,
    },
    sizePolicy: {
      type: Object as PropType<VirtualSizePolicy<unknown>>,
      required: true,
    },
    axis: {
      type: String as PropType<LinearAxis>,
      default: 'vertical',
    },
    gap: { type: Number, default: 0 },
    overscan: {
      type: [Number, Object] as PropType<number | Partial<VirtualInsets>>,
      default: 240,
    },
    viewportInsets: {
      type: [Number, Object] as PropType<number | Partial<VirtualInsets>>,
      default: undefined,
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
    stateChange: (_state: LinearLayoutState<StableID>): boolean => true,
    planChange: (_plan: VirtualLayoutPlan<StableID>): boolean => true,
    error: (_error: Parameters<VirtualizerErrorHandler>[0]): boolean => true,
  },
  slots: Object as SlotsType<{
    header: () => VNodeChild;
    item: (props: VirtualListSlotProps<unknown>) => VNodeChild;
    empty: () => VNodeChild;
    footer: () => VNodeChild;
  }>,
  setup(props, { attrs, emit, expose, slots }) {
    const axis = props.axis;
    const gap = props.gap;
    const maxItems = props.maxItems;
    const sizePolicy = props.sizePolicy;
    const initialViewport = props.initialViewport === undefined
      ? undefined
      : Object.freeze({ ...props.initialViewport });
    const prepared = shallowRef(
      prepareVirtualCollection(props.items, props.getID, maxItems),
    );
    const automaticEstimate = shallowRef<number>();
    const bootstrapCount = shallowRef(
      virtualSizePolicyRequiresMeasurement(sizePolicy) && prepared.value.domain.size > 0
        ? 1
        : 0,
    );
    const bootstrapElements = new Map<number, HTMLElement>();
    const bootstrapRefs = new Map<number, (value: unknown) => void>();
    let bootstrapScheduled = false;
    let disposed = false;
    const initialCrossExtent = crossExtentForViewport(axis, initialViewport);
    const initialState = virtualSizePolicyRequiresMeasurement(sizePolicy)
      ? createEmptyVirtualListState({ axis, gap, maxItems, crossExtent: initialCrossExtent })
      : createVirtualListState(
          prepared.value,
          props.items,
          { sizePolicy, axis, gap, maxItems, crossExtent: initialCrossExtent },
        );
    const activeState = shallowRef(initialState);
    const root = shallowRef<VirtualizerRootExpose>();
    const measure = sizePolicy.kind === 'fixed'
      ? undefined
      : createVirtualListMeasurementResolver(axis);
    const isBootstrapping = (): boolean =>
      automaticEstimate.value === undefined
      && bootstrapCount.value > 0
      && prepared.value.domain.size > 0;
    const phase = () => prepared.value.domain.size === 0
      ? 'empty' as const
      : isBootstrapping()
        ? 'bootstrap' as const
        : 'ready' as const;
    const currentState = (): LinearLayoutState<StableID> =>
      (root.value?.state as LinearLayoutState<StableID> | undefined) ?? activeState.value;

    const bootstrapItemRef = (index: number): ((value: unknown) => void) => {
      const existing = bootstrapRefs.get(index);
      if (existing !== undefined) return existing;
      const callback = (value: unknown): void => {
        const element = value instanceof HTMLElement ? value : null;
        if (element === null) {
          bootstrapElements.delete(index);
          if (bootstrapRefs.get(index) === callback) bootstrapRefs.delete(index);
          return;
        }
        bootstrapElements.set(index, element);
        scheduleBootstrap();
      };
      bootstrapRefs.set(index, callback);
      return callback;
    };

    const completeBootstrap = (): void => {
      if (!isBootstrapping()) return;
      const count = Math.min(bootstrapCount.value, prepared.value.domain.size);
      const extents: number[] = [];
      for (let index = 0; index < count; index += 1) {
        const element = bootstrapElements.get(index);
        if (element === undefined) return;
        const bounds = element.getBoundingClientRect();
        const extent = axis === 'vertical' ? bounds.height : bounds.width;
        if (!Number.isFinite(extent) || extent <= 0) return;
        extents.push(extent);
      }
      const total = extents.reduce((sum, extent) => sum + extent, 0)
        + gap * Math.max(0, extents.length - 1);
      const scrollport = root.value?.scrollport.value;
      const measuredViewportExtent = axis === 'vertical'
        ? scrollport?.clientHeight ?? 0
        : scrollport?.clientWidth ?? 0;
      const viewportExtent = measuredViewportExtent > 0
        ? measuredViewportExtent
        : axis === 'vertical'
          ? initialViewport?.height ?? 0
          : initialViewport?.width ?? 0;
      const target = viewportExtent + bootstrapTrailingOverscanExtent(props.overscan, axis);
      const average = extents.reduce((sum, extent) => sum + extent, 0) / extents.length;
      if (target > total && count < prepared.value.domain.size) {
        bootstrapCount.value = Math.min(
          prepared.value.domain.size,
          Math.max(count + 1, Math.ceil((target + gap) / (average + gap))),
        );
        return;
      }
      automaticEstimate.value = average;
      bootstrapCount.value = 0;
      bootstrapElements.clear();
      bootstrapRefs.clear();
      activeState.value = createVirtualListState(
        prepared.value,
        props.items,
        {
          sizePolicy,
          axis,
          gap,
          maxItems,
          crossExtent: currentState().crossExtent,
        },
        average,
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
      () => [props.items, props.getID] as const,
      () => {
        const next = updatePreparedVirtualCollection(
          prepared.value,
          props.items,
          props.getID,
        );
        if (
          virtualSizePolicyRequiresMeasurement(sizePolicy)
          && automaticEstimate.value === undefined
        ) {
          prepared.value = next;
          bootstrapCount.value = next.domain.size > 0 ? 1 : 0;
          scheduleBootstrap();
          return;
        }
        let nextState = currentState();
        const exposed = root.value;
        const patch = reconcileVirtualCollectionExtents(
          nextState,
          next,
          sizePolicy,
          automaticEstimate.value,
        );
        if (patch !== null) {
          const result = exposed === undefined
            ? tryApplyLinearPatch(nextState, patch)
            : exposed.mutate(patch);
          if (!result.ok) {
            if (exposed === undefined) {
              emit(
                'error',
                result.error as Parameters<VirtualizerErrorHandler>[0],
              );
            }
            return;
          }
          nextState = result.value.state as LinearLayoutState<StableID>;
          activeState.value = nextState;
        }
        const valueUpdates = reconcileVirtualCollectionValueExtents(
          nextState,
          next,
          sizePolicy,
          automaticEstimate.value,
        );
        if (valueUpdates.length > 0) {
          const result = exposed === undefined
            ? tryApplyLinearMeasurements(nextState, {
                generation: nextState.generation,
                measurements: valueUpdates,
              })
            : exposed.measure(valueUpdates);
          if (!result.ok) {
            if (exposed === undefined) {
              emit(
                'error',
                result.error as Parameters<VirtualizerErrorHandler>[0],
              );
            }
            return;
          }
          nextState = result.value.state as LinearLayoutState<StableID>;
          activeState.value = nextState;
        }
        prepared.value = next;
      },
      { flush: 'sync' },
    );

    const syncCrossExtent = (plan: VirtualLayoutPlan<StableID>): boolean => {
      const crossExtent = axis === 'vertical'
        ? plan.viewport.width
        : plan.viewport.height;
      const state = currentState();
      const next = setLinearCrossExtent(state, crossExtent);
      if (Object.is(next, state)) return false;
      activeState.value = next;
      return true;
    };

    let constructionWarningShown = false;
    watch(
      () => [
        props.axis,
        props.gap,
        props.maxItems,
        props.sizePolicy,
        props.initialViewport?.x,
        props.initialViewport?.y,
        props.initialViewport?.width,
        props.initialViewport?.height,
      ] as const,
      () => {
        if (
          constructionWarningShown
          || (
            props.axis === axis
            && props.gap === gap
            && props.maxItems === maxItems
            && sameVirtualSizePolicy(props.sizePolicy, sizePolicy)
            && sameVirtualRect(props.initialViewport, initialViewport)
          )
        ) return;
        constructionWarningShown = true;
        console.warn(
          '[Sectile] VirtualList axis, gap, maxItems, sizePolicy, and initialViewport are construction-time options. Remount the list to change them.',
        );
      },
      { flush: 'sync' },
    );

    onBeforeUnmount(() => {
      disposed = true;
      bootstrapElements.clear();
      bootstrapRefs.clear();
    });

    expose(createVirtualCollectionExpose(root, initialState, phase));

    return (): VNodeChild => h(VirtualizerRoot as Component, {
      ...attrs,
      ref: root,
      defaultState: activeState.value,
      strategy: linearLayoutStrategyFor<StableID>() as unknown as VirtualizerRootProps['strategy'],
      overscan: props.overscan,
      ...(props.viewportInsets === undefined ? {} : { viewportInsets: props.viewportInsets }),
      ...(initialViewport === undefined ? {} : { initialViewport }),
      ...(measure === undefined ? {} : {
        measure: measure as unknown as VirtualizerRootProps['measure'],
      }),
      as: props.as,
      style: [{ overflow: 'auto' }, attrs['style']],
      'data-virtual-layout': 'virtual-list',
      'data-phase': phase(),
      onStateChange: (value: object) => {
        const state = value as LinearLayoutState<StableID>;
        activeState.value = state;
        emit('stateChange', state);
      },
      onPlanChange: (plan: VirtualLayoutPlan<StableID>) => {
        if (syncCrossExtent(plan)) return;
        emit('planChange', plan);
      },
      onError: (error: Parameters<VirtualizerErrorHandler>[0]) => emit('error', error),
    }, {
      default: ({ placements }: VirtualizerRootSlotProps) => [
        slots['header'] === undefined
          ? null
          : h(VirtualizerHeader, {}, { default: () => slots['header']?.() }),
        h(VirtualizerSurface, {
          as: props.contentAs,
          ...(isBootstrapping() && axis === 'horizontal'
            ? { style: { display: 'flex' } }
            : {}),
        }, {
          default: () => isBootstrapping()
            ? renderVirtualListBootstrapItems(
                prepared.value,
                props.items,
                bootstrapCount.value,
                {
                  axis,
                  gap,
                  crossExtent: currentState().crossExtent,
                  itemAs: props.itemAs,
                  itemAttributes: props.itemAttributes,
                },
                slots['item'],
                bootstrapItemRef,
              )
            : renderHighLevelItems(
                'virtual-list',
                placements,
                prepared.value,
                props.items,
                props.itemAs,
                props.itemAttributes,
                linearItemSize(axis, sizePolicy),
                (value, id, index, placement) => slots['item']?.({
                  value,
                  id,
                  index,
                  placement,
                }),
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

export const VirtualList = VirtualListRuntime as typeof VirtualListRuntime & VirtualListComponent;

export function createVirtualListMeasurementResolver(
  axis: LinearAxis,
): VirtualMeasurementResolver<LinearLayoutState<StableID>, StableID, LinearMeasurement> {
  return ({ element, placement, state }) =>
    measureVirtualListElement(axis, placement.id, element, state);
}

function measureVirtualListElement(
  axis: LinearAxis,
  id: StableID,
  element: HTMLElement,
  state: LinearLayoutState<StableID>,
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
  prepared: PreparedVirtualCollection<unknown, StableID>,
  items: readonly unknown[],
  props: Readonly<{
    sizePolicy: VirtualSizePolicy<unknown>;
    axis: LinearAxis;
    gap: number;
    maxItems: number;
    crossExtent: number;
  }>,
  automaticEstimate?: number,
): LinearLayoutState<StableID> {
  return createLinearLayout(
    constrainPreparedVirtualCollection(prepared, props.maxItems),
    createVirtualListExtentIndex(
      prepared,
      items,
      props.sizePolicy,
      props.maxItems,
      automaticEstimate,
    ),
    {
      axis: props.axis,
      gap: props.gap,
      crossExtent: props.crossExtent,
    },
  );
}

export function createEmptyVirtualListState(
  props: Readonly<{
    axis: LinearAxis;
    gap: number;
    maxItems: number;
    crossExtent: number;
  }>,
): LinearLayoutState<StableID> {
  return createLinearLayout(
    createSequence([], { maxItems: props.maxItems, maxIDCodeUnits: 1_024 }),
    createUniformExtentIndex(0, createExactVirtualExtent(0), {
      maxItems: props.maxItems,
    }),
    {
      axis: props.axis,
      gap: props.gap,
      crossExtent: props.crossExtent,
    },
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
  prepared: PreparedVirtualCollection<unknown, StableID>,
  items: readonly unknown[],
  count: number,
  props: Readonly<{
    axis: LinearAxis;
    gap: number;
    crossExtent: number;
    itemAs: string;
    itemAttributes: VirtualListItemAttributes<unknown> | undefined;
  }>,
  render: ((props: VirtualListSlotProps<unknown, StableID>) => VNodeChild) | undefined,
  itemRef: (index: number) => (value: unknown) => void,
): VNodeArrayChildren {
  return Array.from({ length: Math.min(count, prepared.domain.size) }, (_unused, index) => {
    const value = items[index];
    const id = prepared.domain.at(index)!;
    const attributes = props.itemAttributes?.(value, index) ?? {};
    const placement = Object.freeze({
      id,
      index,
      rect: Object.freeze(props.axis === 'vertical'
        ? { x: 0, y: 0, width: props.crossExtent, height: 0 }
        : { x: 0, y: 0, width: 0, height: props.crossExtent }),
      visible: true,
    });
    const rendered = render?.({ value, id, index, placement });
    const children = rendered === undefined || rendered === null
      ? []
      : Array.isArray(rendered)
        ? rendered
        : [rendered];
    return h(props.itemAs, {
      ...attributes,
      key: id,
      ref: itemRef(index),
      style: [
        attributes['style'],
        props.crossExtent > 0
          ? props.axis === 'vertical'
            ? { width: `${props.crossExtent}px` }
            : { height: `${props.crossExtent}px` }
          : undefined,
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

function createVirtualListExtentIndex(
  prepared: PreparedVirtualCollection<unknown, StableID>,
  items: readonly unknown[],
  sizePolicy: VirtualSizePolicy<unknown>,
  maxItems: number,
  automaticEstimate?: number,
): ExtentIndex {
  if (prepared.domain.size === 0) {
    return createUniformExtentIndex(0, createExactVirtualExtent(0), { maxItems });
  }
  const shared = sizePolicy.kind === 'fixed'
    || sizePolicy.kind === 'measured'
    || (sizePolicy.kind === 'estimated' && typeof sizePolicy.estimate === 'number')
    ? createVirtualExtent(sizePolicy, items[0], 0, automaticEstimate)
    : null;
  return shared === null
    ? createExtentIndex(
        Array.from(
          { length: prepared.domain.size },
          (_unused, index) => createVirtualExtent(
            sizePolicy,
            items[index],
            index,
            automaticEstimate,
          ),
        ),
        { maxItems },
      )
    : createUniformExtentIndex(prepared.domain.size, shared, { maxItems });
}

function linearItemSize(
  axis: LinearAxis,
  sizePolicy: VirtualSizePolicy<unknown>,
): VirtualizerItemSize {
  if (sizePolicy.kind === 'fixed') return 'both';
  return axis === 'vertical' ? 'width' : 'height';
}

function crossExtentForViewport(
  axis: LinearAxis,
  viewport: VirtualRect | undefined,
): number {
  if (viewport === undefined) return 0;
  return axis === 'vertical' ? viewport.width : viewport.height;
}

function sameVirtualSizePolicy(
  left: VirtualSizePolicy<unknown>,
  right: VirtualSizePolicy<unknown>,
): boolean {
  if (left.kind !== right.kind) return false;
  if (left.kind === 'measured' && right.kind === 'measured') return true;
  if (left.kind === 'fixed' && right.kind === 'fixed') {
    return left.extent === right.extent;
  }
  return left.kind === 'estimated'
    && right.kind === 'estimated'
    && Object.is(left.estimate, right.estimate);
}

function sameVirtualRect(
  left: VirtualRect | undefined,
  right: VirtualRect | undefined,
): boolean {
  if (left === undefined || right === undefined) return left === right;
  return left.x === right.x
    && left.y === right.y
    && left.width === right.width
    && left.height === right.height;
}
