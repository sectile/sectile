import {
  computed,
  defineComponent,
  h,
  inject,
  mergeProps,
  onBeforeUnmount,
  onMounted,
  onUpdated,
  onScopeDispose,
  provide,
  shallowRef,
  toValue,
  watch,
  type AllowedComponentProps,
  type ComputedRef,
  type ComponentCustomProps,
  type MaybeRefOrGetter,
  type PropType,
  type Ref,
  type ShallowRef,
  type SlotsType,
  type VNodeArrayChildren,
  type VNodeProps,
  type VNodeChild,
} from 'vue';
import {
  createSequence,
  type BoundaryPolicy,
  type Direction,
  type MoveResult,
  type ScanOptions,
  type Sequence,
} from '@sectile/core/sequence';
import {
  createExtentIndex,
  createUniformExtentIndex,
  type Extent,
  type ExtentIndex,
} from '@sectile/virtual/extent-index';
import {
  linearLayoutStrategy,
  tryApplyLinearPatch,
  createLinearLayout,
  type LinearAxis,
  type LinearLayoutState,
  type LinearMeasurement,
  type LinearPatch,
} from '@sectile/virtual/linear-layout';
import {
  createDenseTrackGridLayout,
  trackGridLayoutStrategy,
  type GridRegion,
  type GridTrackMeasurement,
  type TrackGridLayoutState,
  type TrackGridMutation,
} from '@sectile/virtual/track-grid-layout';
import {
  createMasonryLayout,
  masonryLayoutStrategy,
  type MasonryLayoutState,
  type MasonryMeasurement,
  type MasonryMutation,
  type MasonryPlacement,
  type MasonryPlacementPolicy,
} from '@sectile/virtual/masonry-layout';
import {
  createSpatialLayout,
  spatialLayoutStrategy,
  type SpatialItem,
  type SpatialLayoutState,
  type SpatialMeasurement,
  type SpatialMutation,
  type SpatialPlacement,
} from '@sectile/virtual/spatial-layout';
import {
  createAxisMeasurementResolver,
  createVirtualizer,
  virtualContentStyle,
  virtualItemStyle,
  type VirtualInsets,
  type VirtualItemStyleOptions,
  type VirtualLayoutPlan,
  type VirtualLayoutStrategy,
  type VirtualMeasurementResolver,
  type VirtualPlacement,
  type VirtualRect,
  type VirtualScrollAlignment,
  type VirtualScrollWriter,
  type VirtualViewportReader,
  type VirtualizerConnection,
  type VirtualizerEnvironment,
  type VirtualizerErrorHandler,
} from '@sectile/dom/virtual';
import { Primitive, type PrimitiveAs } from './primitive.js';

export interface UseVirtualizerOptions<
  State,
  ID extends string,
  Measurement,
  Mutation,
> {
  readonly state: Ref<State>;
  readonly strategy: VirtualLayoutStrategy<State, ID, Measurement, Mutation>;
  readonly root?: ShallowRef<HTMLElement | null | undefined>;
  readonly overscan?: MaybeRefOrGetter<
    number | Partial<VirtualInsets> | undefined
  >;
  readonly initialViewport?: VirtualRect;
  readonly measure?: VirtualMeasurementResolver<State, ID, Measurement>;
  readonly readViewport?: VirtualViewportReader;
  readonly writeScroll?: VirtualScrollWriter;
  readonly environment?: VirtualizerEnvironment;
  readonly onPlanChange?: (plan: VirtualLayoutPlan<ID>) => void;
  readonly onStateChange?: (state: State) => void;
  readonly onError?: VirtualizerErrorHandler;
}

export interface UseVirtualizerReturn<
  State,
  ID extends string,
  Measurement,
  Mutation,
> {
  readonly root: ShallowRef<HTMLElement | null | undefined>;
  readonly plan: ShallowRef<VirtualLayoutPlan<ID> | null>;
  readonly connection: ShallowRef<
    VirtualizerConnection<State, ID, Measurement, Mutation> | undefined
  >;
  registerItem(element: HTMLElement, id: ID): () => void;
  measure(
    measurements: readonly Measurement[],
  ): ReturnType<
    VirtualizerConnection<State, ID, Measurement, Mutation>['measure']
  >;
  mutate(
    mutation: Mutation,
  ): ReturnType<
    VirtualizerConnection<State, ID, Measurement, Mutation>['mutate']
  >;
  scrollTo(
    id: ID,
    alignment?: VirtualScrollAlignment,
  ): ReturnType<
    VirtualizerConnection<State, ID, Measurement, Mutation>['scrollTo']
  >;
  refresh(): void;
  flush(): ReturnType<
    VirtualizerConnection<
      LinearLayoutState<string>,
      string,
      { readonly index: number; readonly extent: Extent },
      LinearPatch<string>
    >['flush']
  >;
  flush(): ReturnType<
    VirtualizerConnection<State, ID, Measurement, Mutation>['flush']
  >;
}

export type VirtualizerItemSize = 'none' | 'width' | 'height' | 'both';

export interface VirtualizerRootProps {
  readonly defaultState: object;
  readonly strategy: VirtualLayoutStrategy<object, string, unknown, unknown>;
  readonly overscan?: number | Partial<VirtualInsets>;
  readonly initialViewport?: VirtualRect;
  readonly measure?: VirtualMeasurementResolver<object, string, unknown>;
  readonly as?: PrimitiveAs;
  readonly asChild?: boolean;
}

export interface VirtualizerRootSlotProps {
  readonly state: object;
  readonly plan: VirtualLayoutPlan<string> | null;
  readonly placements: readonly VirtualPlacement<string>[];
  scrollTo(
    id: string,
    alignment?: VirtualScrollAlignment,
  ): ReturnType<
    VirtualizerConnection<object, string, unknown, unknown>['scrollTo']
  >;
  measure(
    measurements: readonly unknown[],
  ): ReturnType<
    VirtualizerConnection<object, string, unknown, unknown>['measure']
  >;
  mutate(
    mutation: unknown,
  ): ReturnType<
    VirtualizerConnection<object, string, unknown, unknown>['mutate']
  >;
  refresh(): void;
  flush(): ReturnType<
    VirtualizerConnection<object, string, unknown, unknown>['flush']
  >;
}

export interface VirtualizerContentProps {
  readonly as?: PrimitiveAs;
  readonly asChild?: boolean;
}

export interface VirtualizerItemProps {
  readonly placement: VirtualPlacement<string>;
  readonly size?: VirtualizerItemSize;
  readonly as?: PrimitiveAs;
  readonly asChild?: boolean;
}

export interface VirtualizerRootExpose extends VirtualizerRootSlotProps {
  readonly root: ShallowRef<HTMLElement | null | undefined>;
}

export type VirtualListKeyResolver<Value> = {
  bivarianceHack(value: Value, index: number): string;
}['bivarianceHack'];
export type VirtualListEstimate<Value> = number | {
  bivarianceHack(value: Value, index: number): number;
}['bivarianceHack'];
export type VirtualListItemAttributes<Value> = {
  bivarianceHack(
    value: Value,
    index: number,
  ): Readonly<Record<string, unknown>>;
}['bivarianceHack'];

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
  ): ReturnType<
    VirtualizerConnection<
      LinearLayoutState<string>,
      string,
      { readonly index: number; readonly extent: Extent },
      LinearPatch<string>
    >['scrollTo']
  >;
  refresh(): void;
  flush(): ReturnType<
    VirtualizerConnection<
      LinearLayoutState<string>,
      string,
      { readonly index: number; readonly extent: Extent },
      LinearPatch<string>
    >['flush']
  >;
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

interface VirtualCollectionBaseProps<Value> {
  readonly items: readonly Value[];
  readonly getKey: VirtualListKeyResolver<Value>;
  readonly overscan?: number | Partial<VirtualInsets>;
  readonly maxItems?: number;
  readonly initialViewport?: VirtualRect;
  readonly as?: string;
  readonly contentAs?: string;
  readonly itemAs?: string;
  readonly itemAttributes?: VirtualListItemAttributes<Value>;
}

interface ResponsiveLaneProps {
  readonly laneCount?: number;
  readonly minLaneSize?: number;
  readonly maxLaneCount?: number;
  readonly laneGap?: number;
}

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

export interface VirtualCollectionExpose<State> {
  readonly root: ShallowRef<HTMLElement | null | undefined>;
  readonly state: State;
  readonly plan: VirtualLayoutPlan<string> | null;
  scrollTo(
    id: string,
    alignment?: VirtualScrollAlignment,
  ): ReturnType<VirtualizerConnection<object, string, unknown, unknown>['scrollTo']> | undefined;
  refresh(): void;
  flush(): ReturnType<VirtualizerConnection<object, string, unknown, unknown>['flush']> | undefined;
}

interface VirtualizerContext {
  readonly plan: ComputedRef<VirtualLayoutPlan<string> | null>;
  registerItem(element: HTMLElement, id: string): () => void;
}

const virtualizerContextKey = Symbol('SectileVirtualizerRoot');

export function useVirtualizer<State, ID extends string, Measurement, Mutation>(
  options: UseVirtualizerOptions<State, ID, Measurement, Mutation>,
): UseVirtualizerReturn<State, ID, Measurement, Mutation> {
  const root = options.root ?? shallowRef<HTMLElement | null>(null);
  const plan = shallowRef<VirtualLayoutPlan<ID> | null>(null);
  const connection =
    shallowRef<VirtualizerConnection<State, ID, Measurement, Mutation>>();
  const items = new Map<HTMLElement, ID>();
  const registrations = new Map<HTMLElement, () => void>();

  const report = (error: Parameters<VirtualizerErrorHandler>[0]): void => {
    options.onError?.(error);
  };
  const updateInitialPlan = (): void => {
    if (options.initialViewport === undefined) {
      plan.value = null;
      return;
    }
    const overscan = toValue(options.overscan);
    const result = options.strategy.tryQuery(options.state.value, {
      viewport: options.initialViewport,
      ...(overscan === undefined ? {} : { overscan }),
    });
    if (!result.ok) {
      report(result.error);
      return;
    }
    plan.value = result.value;
    options.onPlanChange?.(result.value);
  };
  updateInitialPlan();

  const disconnect = (): void => {
    registrations.clear();
    connection.value?.disconnect();
    connection.value = undefined;
  };
  const connect = (element: HTMLElement | null | undefined): void => {
    disconnect();
    if (element === null || element === undefined) {
      updateInitialPlan();
      return;
    }
    const overscan = toValue(options.overscan);
    const next = createVirtualizer({
      root: element,
      state: options.state.value,
      strategy: options.strategy,
      ...(overscan === undefined ? {} : { overscan }),
      ...(options.measure === undefined ? {} : { measure: options.measure }),
      ...(options.readViewport === undefined
        ? {}
        : { readViewport: options.readViewport }),
      ...(options.writeScroll === undefined
        ? {}
        : { writeScroll: options.writeScroll }),
      ...(options.environment === undefined
        ? {}
        : { environment: options.environment }),
      onPlanChange: (value) => {
        plan.value = value;
        options.onPlanChange?.(value);
      },
      onStateChange: (value) => {
        options.state.value = value;
        options.onStateChange?.(value);
      },
      onError: report,
    });
    connection.value = next;
    for (const [item, id] of items)
      registrations.set(item, next.registerItem(item, id));
  };

  watch(root, connect, { flush: 'post', immediate: true });
  watch(
    options.state,
    (value) => {
      if (connection.value === undefined) updateInitialPlan();
      else connection.value.setState(value);
    },
    { flush: 'sync' },
  );
  watch(
    () => toValue(options.overscan),
    (value) => {
      if (connection.value === undefined) updateInitialPlan();
      else connection.value.setOverscan(value);
    },
    { deep: true, flush: 'sync' },
  );
  onScopeDispose(disconnect);

  const requireConnection = (): VirtualizerConnection<
    State,
    ID,
    Measurement,
    Mutation
  > => {
    if (connection.value === undefined)
      throw new TypeError('Virtualizer must be mounted before this operation.');
    return connection.value;
  };
  return Object.freeze({
    root,
    plan,
    connection,
    registerItem: (element: HTMLElement, id: ID): (() => void) => {
      registrations.get(element)?.();
      items.set(element, id);
      if (connection.value !== undefined) {
        registrations.set(element, connection.value.registerItem(element, id));
      }
      return (): void => {
        if (items.get(element) !== id) return;
        registrations.get(element)?.();
        registrations.delete(element);
        items.delete(element);
      };
    },
    measure: (measurements: readonly Measurement[]) =>
      requireConnection().measure(measurements),
    mutate: (mutation: Mutation) => requireConnection().mutate(mutation),
    scrollTo: (id: ID, alignment?: VirtualScrollAlignment) =>
      requireConnection().scrollTo(id, alignment),
    refresh: (): void => {
      connection.value?.refresh();
    },
    flush: () => requireConnection().flush(),
  });
}

interface PreparedVirtualList {
  readonly items: readonly unknown[];
  readonly ids: readonly string[];
  readonly getKey: VirtualListKeyResolver<unknown>;
  readonly change: PreparedVirtualListChange | null;
  readonly initialIndex: ReadonlyMap<string, number> | null;
}

interface PreparedVirtualListChange {
  readonly index: number;
  readonly deleteCount: number;
  readonly inserted: readonly string[];
}

const VirtualListRuntime = defineComponent({
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
    const prepared = shallowRef(prepareVirtualList(props.items, props.getKey));
    const automaticEstimate = shallowRef<number>();
    const bootstrapCount = shallowRef(
      requiresDOMBootstrap(props.itemSize, props.estimateSize) && prepared.value.ids.length > 0 ? 1 : 0,
    );
    const bootstrapElements = new Map<number, HTMLElement>();
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
      strategy: linearLayoutStrategy,
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
    const setRootElement = (value: unknown): void => {
      virtualizer.root.value = value instanceof HTMLElement ? value : null;
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
        }
      };
      itemRefs.set(id, callback);
      return callback;
    };

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
      const count = Math.min(bootstrapCount.value, prepared.value.ids.length);
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
      const root = virtualizer.root.value;
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
      if (target > total && count < prepared.value.ids.length) {
        const nextCount = Math.min(
          prepared.value.ids.length,
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
    onMounted(completeBootstrap);
    onUpdated(completeBootstrap);

    watch(
      () => props.items,
      (items) => {
        const next = updatePreparedVirtualList(prepared.value, items, props.getKey);
        if (requiresDOMBootstrap(props.itemSize, props.estimateSize) && automaticEstimate.value === undefined) {
          prepared.value = next;
          bootstrapElements.clear();
          bootstrapCount.value = next.ids.length > 0 ? 1 : 0;
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
      for (const unregister of registrations.values()) unregister();
      registrations.clear();
      elements.clear();
      itemRefs.clear();
      bootstrapElements.clear();
    });

    onUpdated(() => {
      if (props.itemSize !== undefined) return;
      const measurements: { readonly index: number; readonly extent: Extent }[] = [];
      for (const [id, element] of elements) {
        const index = state.value.domain.indexOf(id);
        if (index === null) continue;
        const bounds = element.getBoundingClientRect();
        const value = props.axis === 'vertical' ? bounds.height : bounds.width;
        if (value <= 0) continue;
        const current = state.value.extents.extentAt(index);
        if (
          current?.kind === 'exact'
          && Math.abs(current.value - value) < 0.01
        ) continue;
        measurements.push(Object.freeze({
          index,
          extent: Object.freeze({ kind: 'exact', value }),
        }));
      }
      if (measurements.length > 0) virtualizer.measure(measurements);
    });

    expose(Object.freeze({
      root: virtualizer.root,
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
        if (index >= props.items.length || prepared.value.ids[index] !== placement.id) return null;
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
      if (prepared.value.ids.length === 0) {
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
              style: contentStyle,
              'data-scope': 'virtual-list',
              'data-part': 'content',
            },
            children,
          ),
        ],
      );
    };
  },
});

export const VirtualList = VirtualListRuntime as typeof VirtualListRuntime & VirtualListComponent;

function prepareVirtualList(
  items: readonly unknown[],
  getKey: VirtualListKeyResolver<unknown>,
): PreparedVirtualList {
  const ids: string[] = [];
  const indexByID = new Map<string, number>();
  for (let index = 0; index < items.length; index += 1) {
    const value = items[index];
    const id = getKey(value, index);
    if (typeof id !== 'string' || id.length === 0) {
      throw new TypeError('VirtualList getKey must return a non-empty string.');
    }
    if (id.length > 1_024) {
      throw new TypeError('VirtualList keys must contain at most 1,024 UTF-16 code units.');
    }
    if (!isWellFormedVirtualListKey(id)) {
      throw new TypeError('VirtualList keys must be well-formed UTF-16 strings.');
    }
    if (indexByID.has(id)) {
      throw new TypeError(`VirtualList getKey returned the duplicate key ${JSON.stringify(id)}.`);
    }
    ids.push(id);
    indexByID.set(id, index);
  }
  return Object.freeze({
    items,
    ids: Object.freeze(ids),
    getKey,
    change: null,
    initialIndex: indexByID,
  });
}

function updatePreparedVirtualList(
  previous: PreparedVirtualList,
  items: readonly unknown[],
  getKey: VirtualListKeyResolver<unknown>,
): PreparedVirtualList {
  if (previous.items === items && previous.getKey === getKey) return previous;
  if (previous.getKey !== getKey) {
    const prepared = prepareVirtualList(items, getKey);
    return Object.freeze({
      ...prepared,
      change: Object.freeze({
        index: 0,
        deleteCount: previous.ids.length,
        inserted: prepared.ids,
      }),
    });
  }
  let prefix = 0;
  while (
    prefix < previous.items.length
    && prefix < items.length
    && Object.is(previous.items[prefix], items[prefix])
  ) prefix += 1;
  let suffix = 0;
  while (
    suffix < previous.items.length - prefix
    && suffix < items.length - prefix
    && Object.is(
      previous.items[previous.items.length - suffix - 1],
      items[items.length - suffix - 1],
    )
  ) suffix += 1;
  if (prefix === previous.items.length && prefix === items.length) {
    return Object.freeze({
      items,
      ids: previous.ids,
      getKey,
      change: null,
      initialIndex: previous.initialIndex,
    });
  }
  const changedEnd = items.length - suffix;
  if (previous.items.length === items.length) {
    let sameDomain = true;
    for (let index = prefix; index < changedEnd; index += 1) {
      if (validateVirtualListKey(getKey(items[index], index)) !== previous.ids[index]) {
        sameDomain = false;
        break;
      }
    }
    if (sameDomain) {
      return Object.freeze({
        items,
        ids: previous.ids,
        getKey,
        change: null,
        initialIndex: previous.initialIndex,
      });
    }
  }
  const inserted: string[] = [];
  const insertedIDs = new Set<string>();
  for (let index = prefix; index < changedEnd; index += 1) {
    const id = validateVirtualListKey(getKey(items[index], index));
    if (insertedIDs.has(id)) {
      throw new TypeError(`VirtualList getKey returned the duplicate key ${JSON.stringify(id)}.`);
    }
    inserted.push(id);
    insertedIDs.add(id);
  }
  const frozenInserted = Object.freeze(inserted);
  return Object.freeze({
    items,
    ids: Object.freeze([
      ...previous.ids.slice(0, prefix),
      ...frozenInserted,
      ...previous.ids.slice(previous.ids.length - suffix),
    ]),
    getKey,
    initialIndex: null,
    change: Object.freeze({
      index: prefix,
      deleteCount: previous.ids.length - prefix - suffix,
      inserted: frozenInserted,
    }),
  });
}

function createVirtualListMeasurementResolver(
  axis: LinearAxis,
): VirtualMeasurementResolver<LinearLayoutState<string>, string, LinearMeasurement> {
  return ({ element, placement, state }) => {
    const bounds = element.getBoundingClientRect();
    const value = axis === 'vertical' ? bounds.height : bounds.width;
    const current = state.extents.extentAt(placement.index);
    if (current?.kind === 'exact' && Math.abs(current.value - value) < 0.01) return null;
    return Object.freeze({
      index: placement.index,
      extent: Object.freeze({ kind: 'exact' as const, value }),
    });
  };
}

function validateVirtualListKey(id: string): string {
  if (typeof id !== 'string' || id.length === 0) {
    throw new TypeError('VirtualList getKey must return a non-empty string.');
  }
  if (id.length > 1_024) {
    throw new TypeError('VirtualList keys must contain at most 1,024 UTF-16 code units.');
  }
  if (!isWellFormedVirtualListKey(id)) {
    throw new TypeError('VirtualList keys must be well-formed UTF-16 strings.');
  }
  return id;
}

function createVirtualListState(
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
          prepared.ids.map((_id, index) => estimatedExtent(
            estimate!,
            items[index],
            index,
          )),
          { maxItems: props.maxItems },
        )
      : createUniformExtentIndex(prepared.ids.length, sharedExtent, {
          maxItems: props.maxItems,
        }),
    { axis: props.axis, gap: props.gap, crossExtent: 1 },
  );
}

function createEmptyVirtualListState(
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

function createPreparedVirtualListSequence(
  prepared: PreparedVirtualList,
  maxItems: number,
): Sequence<string> {
  if (!Number.isSafeInteger(maxItems) || maxItems < 0) {
    throw new TypeError('VirtualList maxItems must be a non-negative safe integer.');
  }
  if (prepared.ids.length > maxItems) {
    throw new RangeError(`VirtualList received ${prepared.ids.length} items, exceeding maxItems ${maxItems}.`);
  }
  const index = prepared.initialIndex;
  if (index === null) return createSequence(prepared.ids, { maxItems, maxIDCodeUnits: 1_024 });
  let materialized: Sequence<string> | undefined;
  const complete = (): Sequence<string> => {
    materialized ??= createSequence(prepared.ids, { maxItems, maxIDCodeUnits: 1_024 });
    return materialized;
  };
  return Object.freeze({
    size: prepared.ids.length,
    ids: prepared.ids,
    maxItems,
    maxIDCodeUnits: 1_024,
    at: (position: number): string | null => (
      Number.isSafeInteger(position) && position >= 0 && position < prepared.ids.length
        ? prepared.ids[position] ?? null
        : null
    ),
    indexOf: (id: string): number | null => index.get(id) ?? null,
    contains: (id: string): boolean => index.has(id),
    compare: (left: string, right: string): -1 | 0 | 1 | null => {
      const leftIndex = index.get(left);
      const rightIndex = index.get(right);
      if (leftIndex === undefined || rightIndex === undefined) return null;
      return leftIndex === rightIndex ? 0 : leftIndex < rightIndex ? -1 : 1;
    },
    project: (predicate: (id: string, position: number) => boolean): Sequence<string> =>
      complete().project(predicate),
    move: (
      current: string,
      direction: Direction,
      boundary?: BoundaryPolicy,
      options?: ScanOptions<string>,
    ): MoveResult<string> => complete().move(current, direction, boundary, options),
  });
}

function isWellFormedVirtualListKey(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (next < 0xdc00 || next > 0xdfff) return false;
      index += 1;
    } else if (code >= 0xdc00 && code <= 0xdfff) return false;
  }
  return true;
}

function reconcileVirtualList(
  state: Pick<LinearLayoutState<string>, 'domain' | 'extents'>,
  next: PreparedVirtualList,
  items: readonly unknown[],
  props: Readonly<{
    itemSize: number | undefined;
    estimateSize: VirtualListEstimate<unknown> | undefined;
  }>,
  automaticEstimate?: number,
): LinearPatch<string> | null {
  const change = next.change;
  if (change === null) return null;
  const inserted = change.inserted;
  return Object.freeze({
    patch: Object.freeze({
      type: 'splice',
      index: change.index,
      deleteCount: change.deleteCount,
      inserted,
    }),
    insertedExtents: Object.freeze(inserted.map((id, localIndex) => {
      const nextIndex = change.index + localIndex;
      const previousIndex = state.domain.indexOf(id);
      return (previousIndex === null ? null : state.extents.extentAt(previousIndex))
        ?? initialExtent(props, items[nextIndex], nextIndex, automaticEstimate);
    })),
  });
}

function assertVirtualListSizeMode(
  itemSize: number | undefined,
  estimateSize: VirtualListEstimate<unknown> | undefined,
): void {
  if (itemSize !== undefined && estimateSize !== undefined) {
    throw new TypeError('VirtualList itemSize and estimateSize are mutually exclusive.');
  }
}

function initialExtent(
  props: Readonly<{
    itemSize: number | undefined;
    estimateSize: VirtualListEstimate<unknown> | undefined;
  }>,
  value: unknown,
  index: number,
  automaticEstimate?: number,
): Extent {
  return props.itemSize === undefined
    ? estimatedExtent(requireAutomaticEstimate(props.estimateSize ?? automaticEstimate), value, index)
    : exactExtent(props.itemSize);
}

function requireAutomaticEstimate(
  estimate: VirtualListEstimate<unknown> | undefined,
): VirtualListEstimate<unknown> {
  if (estimate === undefined) {
    throw new TypeError('Automatic virtual size must be measured before layout initialization.');
  }
  return estimate;
}

function requiresDOMBootstrap(
  itemSize: number | undefined,
  estimateSize: VirtualListEstimate<unknown> | undefined,
): boolean {
  return itemSize === undefined && estimateSize === undefined;
}

function bootstrapTrailingOverscanExtent(
  overscan: number | Partial<VirtualInsets>,
  axis: LinearAxis,
): number {
  if (typeof overscan === 'number') return overscan;
  return axis === 'vertical'
    ? overscan.bottom ?? 0
    : overscan.right ?? 0;
}

function renderVirtualListBootstrapItems(
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
  return Array.from({ length: Math.min(count, prepared.ids.length) }, (_unused, index) => {
    const value = items[index];
    const id = prepared.ids[index]!;
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

function exactExtent(value: number): Extent {
  return Object.freeze({ kind: 'exact', value });
}

function estimatedExtent(
  estimate: VirtualListEstimate<unknown>,
  value: unknown,
  index: number,
): Extent {
  return Object.freeze({
    kind: 'unknown',
    fallback: typeof estimate === 'number' ? estimate : estimate(value, index),
  });
}

const VirtualGridRuntime = defineComponent({
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
          const region = grid.regions[placement.index];
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
                const region = grid?.regions[placement.index];
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

const VirtualMasonryRuntime = defineComponent({
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
    const prepared = shallowRef(prepareVirtualList(props.items, props.getKey));
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
          prepareVirtualList([], props.getKey),
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
    const isBootstrapping = (): boolean => requiresDOMBootstrap(props.itemSize, props.estimateSize)
      && automaticEstimate.value === undefined
      && prepared.value.ids.length > 0;
    const bootstrapItemRef = (index: number, value: unknown): void => {
      const element = value instanceof HTMLElement ? value : null;
      if (element === null) bootstrapElements.delete(index);
      else bootstrapElements.set(index, element);
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
      const count = Math.min(geometry.count, prepared.value.ids.length);
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
    onMounted(completeBootstrap);
    onUpdated(completeBootstrap);
    const measure = props.itemSize === undefined
      ? createAxisMeasurementResolver<MasonryLayoutState<string>, string>('vertical')
      : undefined;

    watch(
      () => [props.items, props.getKey] as const,
      () => {
        if (requiresDOMBootstrap(props.itemSize, props.estimateSize) && automaticEstimate.value === undefined) {
          prepared.value = updatePreparedVirtualList(prepared.value, props.items, props.getKey);
          bootstrapElements.clear();
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
      default: ({ placements }: VirtualizerRootSlotProps) => h(VirtualizerContent, { as: props.contentAs }, {
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

const VirtualSpatialRuntime = defineComponent({
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
    const prepared = shallowRef(prepareVirtualList(props.items, props.getKey));
    const initialState = createVirtualSpatialState(prepared.value, props.items, props);
    const root = shallowRef<VirtualizerRootExpose>();
    const measure = props.measureSize
      ? (({ element, placement, state }) => {
          const bounds = element.getBoundingClientRect();
          if (bounds.width <= 0 || bounds.height <= 0) return null;
          const current = (state as SpatialLayoutState<string>).items[placement.index];
          if (current === undefined) return null;
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
        const result = resolverChanged || next.change === null
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
                index: next.change.index,
                deleteCount: next.change.deleteCount,
                inserted: next.change.inserted,
              }),
              inserted: preserveSpatialMeasurements(
                createSpatialItemsRange(
                  next,
                  props.items,
                  props,
                  next.change.index,
                  next.change.inserted.length,
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

interface ResponsiveLaneGeometry {
  readonly count: number;
  readonly extent: number;
}

function resolveResponsiveLanes(
  crossExtent: number,
  requestedCount: number | undefined,
  minLaneSize: number,
  maxLaneCount: number,
  laneGap: number,
): ResponsiveLaneGeometry {
  if (!Number.isFinite(minLaneSize) || minLaneSize <= 0)
    throw new TypeError('minLaneSize must be a positive finite number.');
  if (!Number.isSafeInteger(maxLaneCount) || maxLaneCount < 1)
    throw new TypeError('maxLaneCount must be a positive safe integer.');
  if (!Number.isFinite(laneGap) || laneGap < 0)
    throw new TypeError('laneGap must be a non-negative finite number.');
  if (requestedCount !== undefined && (!Number.isSafeInteger(requestedCount) || requestedCount < 1))
    throw new TypeError('laneCount must be a positive safe integer.');
  const available = Number.isFinite(crossExtent) && crossExtent > 0 ? crossExtent : minLaneSize;
  const count = requestedCount ?? Math.max(
    1,
    Math.min(maxLaneCount, Math.floor((available + laneGap) / (minLaneSize + laneGap))),
  );
  return Object.freeze({
    count,
    extent: Math.max(1, (available - laneGap * (count - 1)) / count),
  });
}

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
    ? createExtentIndex(prepared.ids.map((_id, index) => estimatedExtent(estimate!, items[index], index)), { maxItems: props.maxItems })
    : createUniformExtentIndex(prepared.ids.length, shared, { maxItems: props.maxItems });
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

function createSpatialItems(
  prepared: PreparedVirtualList,
  items: readonly unknown[],
  props: Readonly<{
    getRect: VirtualSpatialRectResolver<unknown>;
    getZIndex: VirtualSpatialZIndexResolver<unknown>;
  }>,
): readonly SpatialItem<string>[] {
  return createSpatialItemsRange(prepared, items, props, 0, prepared.ids.length);
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
      id: prepared.ids[index]!,
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
    const previous = previousIndex === null ? undefined : state.items[previousIndex];
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
    state.regions.length === prepared.ids.length
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

function renderHighLevelItems(
  scope: string,
  placements: readonly VirtualPlacement<string>[],
  prepared: PreparedVirtualList,
  items: readonly unknown[],
  itemAs: string,
  itemAttributes: VirtualListItemAttributes<unknown> | undefined,
  size: VirtualizerItemSize,
  render: (value: unknown, key: string, index: number, placement: VirtualPlacement<string>) => VNodeChild,
  empty: (() => VNodeChild) | undefined,
): VNodeArrayChildren {
  if (prepared.ids.length === 0) {
    const child = empty?.();
    return child === undefined || child === null ? [] : [child];
  }
  return placements.flatMap((placement) => {
    const index = placement.index;
    if (index >= items.length || prepared.ids[index] !== placement.id) return [];
    const value = items[index];
    const attributes = itemAttributes?.(value, index) ?? {};
    return [h(VirtualizerItem, {
      ...attributes,
      key: placement.id,
      placement,
      size,
      as: itemAs,
      style: attributes['style'],
      'data-scope': scope,
      'data-virtual-layout': scope,
      'data-part': 'item',
    }, { default: () => render(value, placement.id, index, placement) })];
  }) as VNodeArrayChildren;
}

function renderCollectionBootstrapItems(
  scope: string,
  prepared: PreparedVirtualList,
  items: readonly unknown[],
  count: number,
  width: number,
  itemAs: string,
  itemAttributes: VirtualListItemAttributes<unknown> | undefined,
  render: (value: unknown, key: string, index: number, placement: VirtualPlacement<string>) => VNodeChild,
  itemRef: (index: number, value: unknown) => void,
): VNodeArrayChildren {
  return Array.from({ length: Math.min(count, prepared.ids.length) }, (_unused, index) => {
    const id = prepared.ids[index]!;
    const value = items[index];
    const attributes = itemAttributes?.(value, index) ?? {};
    const placement = Object.freeze({
      id,
      index,
      rect: Object.freeze({ x: index * width, y: 0, width, height: 0 }),
      visible: true,
    });
    const rendered = render(value, id, index, placement);
    const children = rendered === undefined || rendered === null
      ? []
      : Array.isArray(rendered)
        ? rendered
        : [rendered];
    return h(itemAs, {
      ...attributes,
      key: id,
      ref: (element: unknown) => itemRef(index, element),
      style: [attributes['style'], { width: `${width}px` }],
      'data-scope': scope,
      'data-virtual-layout': scope,
      'data-part': 'item',
      'data-index': index,
      'data-bootstrap': '',
    }, children as VNodeArrayChildren);
  });
}

function createHighLevelVirtualExpose<State>(
  root: ShallowRef<VirtualizerRootExpose | undefined>,
  initialState: State,
): VirtualCollectionExpose<State> {
  const emptyRoot = shallowRef<HTMLElement | null>(null);
  return Object.freeze({
    get root() { return root.value?.root ?? emptyRoot; },
    get state() { return (root.value?.state as State | undefined) ?? initialState; },
    get plan() { return root.value?.plan ?? null; },
    scrollTo: (id: string, alignment?: VirtualScrollAlignment) => root.value?.scrollTo(id, alignment),
    refresh: () => root.value?.refresh(),
    flush: () => root.value?.flush(),
  });
}

function nearlyEqual(left: number, right: number): boolean {
  return Math.abs(left - right) < 0.01;
}

export const VirtualizerRoot = defineComponent({
  name: 'SectileVirtualizerRoot',
  inheritAttrs: false,
  props: {
    defaultState: { type: Object as PropType<object>, required: true },
    strategy: {
      type: Object as PropType<
        VirtualLayoutStrategy<object, string, unknown, unknown>
      >,
      required: true,
    },
    overscan: {
      type: [Number, Object] as PropType<number | Partial<VirtualInsets>>,
      default: undefined,
    },
    initialViewport: {
      type: Object as PropType<VirtualRect>,
      default: undefined,
    },
    measure: {
      type: Function as PropType<
        VirtualMeasurementResolver<object, string, unknown>
      >,
      default: undefined,
    },
    as: {
      type: [String, Object, Function] as PropType<PrimitiveAs>,
      default: 'div',
    },
    asChild: { type: Boolean, default: false },
  },
  emits: {
    stateChange: (_state: object): boolean => true,
    planChange: (_plan: VirtualLayoutPlan<string>): boolean => true,
    error: (_error: Parameters<VirtualizerErrorHandler>[0]): boolean => true,
  },
  slots: Object as SlotsType<{
    default: (props: VirtualizerRootSlotProps) => VNodeChild;
  }>,
  setup(props, { attrs, emit, expose, slots }) {
    const state = shallowRef(props.defaultState);
    const virtualizer = useVirtualizer({
      state,
      strategy: props.strategy,
      overscan: () => props.overscan,
      ...(props.initialViewport === undefined
        ? {}
        : { initialViewport: props.initialViewport }),
      ...(props.measure === undefined ? {} : { measure: props.measure }),
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
    let constructionWarningShown = false;
    watch(
      () => [props.strategy, props.measure, props.initialViewport] as const,
      (value, previous) => {
        if (
          constructionWarningShown
          || value.every((item, index) => Object.is(item, previous[index]))
        ) return;
        constructionWarningShown = true;
        console.warn(
          '[Sectile] VirtualizerRoot strategy, measure, and initialViewport are construction-time options. Remount the root to change them.',
        );
      },
      { flush: 'sync' },
    );
    const slotProps = computed<VirtualizerRootSlotProps>(() =>
      Object.freeze({
        state: state.value,
        plan: virtualizer.plan.value,
        placements: virtualizer.plan.value?.placements ?? Object.freeze([]),
        scrollTo: virtualizer.scrollTo,
        measure: virtualizer.measure,
        mutate: virtualizer.mutate,
        refresh: virtualizer.refresh,
        flush: virtualizer.flush,
      }),
    );
    provide<VirtualizerContext>(virtualizerContextKey, {
      plan: computed(() => virtualizer.plan.value),
      registerItem: virtualizer.registerItem,
    });
    expose(
      Object.freeze({
        root: virtualizer.root,
        get state() {
          return slotProps.value.state;
        },
        get plan() {
          return slotProps.value.plan;
        },
        get placements() {
          return slotProps.value.placements;
        },
        scrollTo: virtualizer.scrollTo,
        measure: virtualizer.measure,
        mutate: virtualizer.mutate,
        refresh: virtualizer.refresh,
        flush: virtualizer.flush,
      }) satisfies VirtualizerRootExpose,
    );
    return (): VNodeChild =>
      h(
        Primitive,
        mergeProps(attrs, {
          as: props.as,
          asChild: props.asChild,
          elementRef: (element: unknown) => {
            virtualizer.root.value =
              element instanceof HTMLElement ? element : null;
          },
          'data-scope': 'virtualizer',
          'data-part': 'root',
        }),
        { default: () => slots['default']?.(slotProps.value) },
      );
  },
});

export const VirtualizerContent = defineComponent({
  name: 'SectileVirtualizerContent',
  inheritAttrs: false,
  props: {
    as: {
      type: [String, Object, Function] as PropType<PrimitiveAs>,
      default: 'div',
    },
    asChild: { type: Boolean, default: false },
  },
  slots: Object as SlotsType<{
    default: (plan: VirtualLayoutPlan<string> | null) => VNodeChild;
  }>,
  setup(props, { attrs, slots }) {
    const root = useVirtualizerRoot('VirtualizerContent');
    const style = computed(() =>
      root.plan.value === null
        ? Object.freeze({ position: 'relative' })
        : virtualContentStyle(root.plan.value),
    );
    return (): VNodeChild =>
      h(
        Primitive,
        mergeProps(attrs, {
          as: props.as,
          asChild: props.asChild,
          style: style.value,
          'data-scope': 'virtualizer',
          'data-part': 'content',
        }),
        { default: () => slots['default']?.(root.plan.value) },
      );
  },
});

export const VirtualizerItem = defineComponent({
  name: 'SectileVirtualizerItem',
  inheritAttrs: false,
  props: {
    placement: {
      type: Object as PropType<VirtualPlacement<string>>,
      required: true,
    },
    size: { type: String as PropType<VirtualizerItemSize>, default: 'none' },
    as: {
      type: [String, Object, Function] as PropType<PrimitiveAs>,
      default: 'div',
    },
    asChild: { type: Boolean, default: false },
  },
  slots: Object as SlotsType<{
    default: (placement: VirtualPlacement<string>) => VNodeChild;
  }>,
  setup(props, { attrs, slots }) {
    const root = useVirtualizerRoot('VirtualizerItem');
    let unregister: (() => void) | undefined;
    onBeforeUnmount(() => {
      unregister?.();
    });
    const sizing = computed<VirtualItemStyleOptions>(() =>
      Object.freeze({
        width: props.size === 'width' || props.size === 'both',
        height: props.size === 'height' || props.size === 'both',
      }),
    );
    return (): VNodeChild =>
      h(
        Primitive,
        mergeProps(attrs, {
          as: props.as,
          asChild: props.asChild,
          elementRef: (element: unknown) => {
            unregister?.();
            unregister =
              element instanceof HTMLElement
                ? root.registerItem(element, props.placement.id)
                : undefined;
          },
          style: virtualItemStyle(props.placement, sizing.value),
          'data-scope': 'virtualizer',
          'data-part': 'item',
          'data-index': props.placement.index,
          'data-visible': props.placement.visible ? '' : undefined,
        }),
        { default: () => slots['default']?.(props.placement) },
      );
  },
});

function useVirtualizerRoot(part: string): VirtualizerContext {
  const root = inject<VirtualizerContext>(virtualizerContextKey);
  if (root === undefined)
    throw new TypeError(`${part} must be used inside VirtualizerRoot.`);
  return root;
}

export type {
  VirtualInsets,
  VirtualLayoutPlan,
  VirtualLayoutStrategy,
  VirtualMeasurementResolver,
  VirtualPlacement,
  VirtualRect,
  VirtualScrollAlignment,
  VirtualizerConnection,
  VirtualizerEnvironment,
};

export { createAxisMeasurementResolver, virtualContentStyle, virtualItemStyle };
