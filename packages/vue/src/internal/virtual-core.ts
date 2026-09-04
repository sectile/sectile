import {
  computed,
  defineComponent,
  h,
  inject,
  mergeProps,
  onBeforeUnmount,
  onScopeDispose,
  provide,
  shallowRef,
  toValue,
  watch,
  type ComputedRef,
  type MaybeRefOrGetter,
  type PropType,
  type Ref,
  type ShallowRef,
  type SlotsType,
  type VNodeChild,
} from 'vue';
import type { Result, StableID } from '@sectile/core';
import type { VirtualErrorCode } from '@sectile/virtual';
import {
  createAxisMeasurementResolver,
  createVirtualizer,
  virtualItemStyle,
  virtualSurfaceStyle,
  type VirtualInsets,
  type VirtualItemStyleOptions,
  type VirtualLayoutMutation,
  type VirtualLayoutPlan,
  type VirtualLayoutStrategy,
  type VirtualMeasurementResolver,
  type VirtualPlacement,
  type VirtualPoint,
  type VirtualRect,
  type VirtualScrollAlignment,
  type VirtualScrollWriter,
  type VirtualViewportReader,
  type VirtualizerConnection,
  type VirtualizerEnvironment,
  type VirtualizerErrorHandler,
} from '@sectile/dom/virtual';
import { Primitive, type PrimitiveAs } from '../primitive.js';

export type VirtualizerHostErrorCode = 'virtualizer-not-connected';
export type VirtualizerOperationResult<T> = Result<
  T,
  VirtualErrorCode | VirtualizerHostErrorCode
>;

export interface UseVirtualizerOptions<
  State,
  ID extends StableID,
  Measurement,
  Mutation,
> {
  readonly state: Ref<State>;
  readonly strategy: VirtualLayoutStrategy<State, ID, Measurement, Mutation>;
  readonly scrollport?: ShallowRef<HTMLElement | null | undefined>;
  readonly surface?: ShallowRef<HTMLElement | null | undefined>;
  readonly overscan?: MaybeRefOrGetter<
    number | Partial<VirtualInsets> | undefined
  >;
  readonly viewportInsets?: MaybeRefOrGetter<
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
  ID extends StableID,
  Measurement,
  Mutation,
> {
  readonly scrollport: ShallowRef<HTMLElement | null | undefined>;
  readonly surface: ShallowRef<HTMLElement | null | undefined>;
  readonly plan: ShallowRef<VirtualLayoutPlan<ID> | null>;
  readonly connection: ShallowRef<
    VirtualizerConnection<State, ID, Measurement, Mutation> | undefined
  >;
  registerFrame(element: HTMLElement): () => void;
  registerItem(element: HTMLElement, id: ID): () => void;
  measure(
    measurements: readonly Measurement[],
  ): VirtualizerOperationResult<VirtualLayoutMutation<State>>;
  mutate(
    mutation: Mutation,
  ): VirtualizerOperationResult<VirtualLayoutMutation<State>>;
  scrollTo(
    id: ID,
    alignment?: VirtualScrollAlignment,
  ): VirtualizerOperationResult<VirtualPoint>;
  refresh(): void;
  flush(): VirtualizerOperationResult<VirtualLayoutPlan<ID>>;
}

export type VirtualizerItemSize = 'none' | 'width' | 'height' | 'both';

export interface VirtualizerRootProps {
  readonly defaultState: object;
  readonly strategy: VirtualLayoutStrategy<object, StableID, unknown, unknown>;
  readonly overscan?: number | Partial<VirtualInsets>;
  readonly viewportInsets?: number | Partial<VirtualInsets>;
  readonly initialViewport?: VirtualRect;
  readonly measure?: VirtualMeasurementResolver<object, StableID, unknown>;
  readonly as?: PrimitiveAs;
  readonly asChild?: boolean;
}

export interface VirtualizerRootSlotProps {
  readonly state: object;
  readonly plan: VirtualLayoutPlan<StableID> | null;
  readonly placements: readonly VirtualPlacement<StableID>[];
  scrollTo(
    id: StableID,
    alignment?: VirtualScrollAlignment,
  ): VirtualizerOperationResult<VirtualPoint>;
  measure(
    measurements: readonly unknown[],
  ): VirtualizerOperationResult<VirtualLayoutMutation<object>>;
  mutate(
    mutation: unknown,
  ): VirtualizerOperationResult<VirtualLayoutMutation<object>>;
  refresh(): void;
  flush(): VirtualizerOperationResult<VirtualLayoutPlan<StableID>>;
}

export interface VirtualizerFrameProps {
  readonly as?: PrimitiveAs;
  readonly asChild?: boolean;
}

export interface VirtualizerSurfaceProps {
  readonly as?: PrimitiveAs;
  readonly asChild?: boolean;
}

export interface VirtualizerItemProps {
  readonly placement: VirtualPlacement<StableID>;
  readonly size?: VirtualizerItemSize;
  readonly as?: PrimitiveAs;
  readonly asChild?: boolean;
}

export interface VirtualizerRootExpose extends VirtualizerRootSlotProps {
  readonly scrollport: ShallowRef<HTMLElement | null | undefined>;
  readonly surface: ShallowRef<HTMLElement | null | undefined>;
}

interface DesiredItem<ID extends StableID> {
  readonly id: ID;
  readonly token: object;
}

interface VirtualizerContext {
  readonly plan: ComputedRef<VirtualLayoutPlan<StableID> | null>;
  readonly surface: ShallowRef<HTMLElement | null | undefined>;
  registerFrame(element: HTMLElement): () => void;
  registerItem(element: HTMLElement, id: StableID): () => void;
}

export interface VirtualizerSurfaceRegistration {
  registerItem(element: HTMLElement, id: StableID): () => void;
}

type VirtualizerSurfaceContext = VirtualizerSurfaceRegistration;

const virtualizerContextKey = Symbol('SectileVirtualizerRoot');
const virtualizerSurfaceContextKey = Symbol('SectileVirtualizerSurface');

export function useVirtualizer<State, ID extends StableID, Measurement, Mutation>(
  options: UseVirtualizerOptions<State, ID, Measurement, Mutation>,
): UseVirtualizerReturn<State, ID, Measurement, Mutation> {
  const scrollport = options.scrollport
    ?? shallowRef<HTMLElement | null | undefined>(null);
  const surface = options.surface
    ?? shallowRef<HTMLElement | null | undefined>(null);
  const plan = shallowRef<VirtualLayoutPlan<ID> | null>(null);
  const connection =
    shallowRef<VirtualizerConnection<State, ID, Measurement, Mutation>>();
  const frames = new Map<HTMLElement, object>();
  const frameRegistrations = new Map<HTMLElement, () => void>();
  const items = new Map<HTMLElement, DesiredItem<ID>>();
  const itemRegistrations = new Map<HTMLElement, () => void>();
  let disposed = false;

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

  const disconnectConnection = (): void => {
    frameRegistrations.clear();
    itemRegistrations.clear();
    connection.value?.disconnect();
    connection.value = undefined;
  };
  const connect = (): void => {
    if (disposed) return;
    disconnectConnection();
    const currentScrollport = scrollport.value;
    const currentSurface = surface.value;
    if (
      currentScrollport === null
      || currentScrollport === undefined
      || currentSurface === null
      || currentSurface === undefined
    ) {
      updateInitialPlan();
      return;
    }
    const overscan = toValue(options.overscan);
    const viewportInsets = toValue(options.viewportInsets);
    const next = createVirtualizer({
      scrollport: currentScrollport,
      surface: currentSurface,
      state: options.state.value,
      strategy: options.strategy,
      ...(overscan === undefined ? {} : { overscan }),
      ...(viewportInsets === undefined ? {} : { viewportInsets }),
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
    for (const frame of frames.keys()) {
      frameRegistrations.set(frame, next.registerFrame(frame));
    }
    for (const [item, desired] of items) {
      itemRegistrations.set(item, next.registerItem(item, desired.id));
    }
  };

  watch([scrollport, surface], connect, { flush: 'post', immediate: true });
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
  watch(
    () => toValue(options.viewportInsets),
    (value) => {
      connection.value?.setViewportInsets(value);
    },
    { deep: true, flush: 'sync' },
  );
  onScopeDispose(() => {
    disposed = true;
    disconnectConnection();
    frames.clear();
    items.clear();
  });

  const currentConnection = (): VirtualizerConnection<
    State,
    ID,
    Measurement,
    Mutation
  > | undefined => connection.value;

  return Object.freeze({
    scrollport,
    surface,
    plan,
    connection,
    registerFrame: (element: HTMLElement): (() => void) => {
      const token = Object.freeze({});
      frameRegistrations.get(element)?.();
      frameRegistrations.delete(element);
      frames.set(element, token);
      if (connection.value !== undefined) {
        frameRegistrations.set(
          element,
          connection.value.registerFrame(element),
        );
      }
      return (): void => {
        if (frames.get(element) !== token) return;
        frameRegistrations.get(element)?.();
        frameRegistrations.delete(element);
        frames.delete(element);
      };
    },
    registerItem: (element: HTMLElement, id: ID): (() => void) => {
      const token = Object.freeze({});
      itemRegistrations.get(element)?.();
      itemRegistrations.delete(element);
      items.set(element, Object.freeze({ id, token }));
      if (connection.value !== undefined) {
        itemRegistrations.set(
          element,
          connection.value.registerItem(element, id),
        );
      }
      return (): void => {
        if (items.get(element)?.token !== token) return;
        itemRegistrations.get(element)?.();
        itemRegistrations.delete(element);
        items.delete(element);
      };
    },
    measure: (
      measurements: readonly Measurement[],
    ): VirtualizerOperationResult<VirtualLayoutMutation<State>> => {
      const active = currentConnection();
      return active === undefined
        ? virtualizerNotConnected()
        : active.measure(measurements);
    },
    mutate: (
      mutation: Mutation,
    ): VirtualizerOperationResult<VirtualLayoutMutation<State>> => {
      const active = currentConnection();
      return active === undefined
        ? virtualizerNotConnected()
        : active.mutate(mutation);
    },
    scrollTo: (
      id: ID,
      alignment?: VirtualScrollAlignment,
    ): VirtualizerOperationResult<VirtualPoint> => {
      const active = currentConnection();
      return active === undefined
        ? virtualizerNotConnected()
        : active.scrollTo(id, alignment);
    },
    refresh: (): void => {
      connection.value?.refresh();
    },
    flush: (): VirtualizerOperationResult<VirtualLayoutPlan<ID>> => {
      const active = currentConnection();
      return active === undefined
        ? virtualizerNotConnected()
        : active.flush();
    },
  });
}

export const VirtualizerRoot = /* @__PURE__ */ defineComponent({
  name: 'SectileVirtualizerRoot',
  inheritAttrs: false,
  props: {
    defaultState: { type: Object as PropType<object>, required: true },
    strategy: {
      type: Object as PropType<
        VirtualLayoutStrategy<object, StableID, unknown, unknown>
      >,
      required: true,
    },
    overscan: {
      type: [Number, Object] as PropType<number | Partial<VirtualInsets>>,
      default: undefined,
    },
    viewportInsets: {
      type: [Number, Object] as PropType<number | Partial<VirtualInsets>>,
      default: undefined,
    },
    initialViewport: {
      type: Object as PropType<VirtualRect>,
      default: undefined,
    },
    measure: {
      type: Function as PropType<
        VirtualMeasurementResolver<object, StableID, unknown>
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
    planChange: (_plan: VirtualLayoutPlan<StableID>): boolean => true,
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
      viewportInsets: () => props.viewportInsets,
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
    watch(
      () => props.defaultState,
      (value) => {
        if (!Object.is(state.value, value)) state.value = value;
      },
      { flush: 'sync' },
    );
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
      surface: virtualizer.surface,
      registerFrame: virtualizer.registerFrame,
      registerItem: virtualizer.registerItem,
    });
    expose(
      Object.freeze({
        scrollport: virtualizer.scrollport,
        surface: virtualizer.surface,
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
            virtualizer.scrollport.value =
              element instanceof HTMLElement ? element : null;
          },
          'data-scope': 'virtualizer',
          'data-part': 'root',
        }),
        { default: () => slots['default']?.(slotProps.value) },
      );
  },
});

export const VirtualizerHeader = /* @__PURE__ */ defineComponent({
  name: 'SectileVirtualizerHeader',
  inheritAttrs: false,
  props: {
    as: {
      type: [String, Object, Function] as PropType<PrimitiveAs>,
      default: 'div',
    },
    asChild: { type: Boolean, default: false },
  },
  slots: Object as SlotsType<{ default: () => VNodeChild }>,
  setup(props, { attrs, slots }) {
    const root = useVirtualizerRoot('VirtualizerHeader');
    let element: HTMLElement | null = null;
    let unregister: (() => void) | undefined;
    const setElement = (value: unknown): void => {
      const next = value instanceof HTMLElement ? value : null;
      if (element === next) return;
      unregister?.();
      unregister = undefined;
      element = next;
      if (next !== null) unregister = root.registerFrame(next);
    };
    onBeforeUnmount(() => {
      unregister?.();
      unregister = undefined;
      element = null;
    });
    return (): VNodeChild => h(
      Primitive,
      mergeProps(attrs, {
        as: props.as,
        asChild: props.asChild,
        elementRef: setElement,
        'data-scope': 'virtualizer',
        'data-part': 'header',
      }),
      { default: () => slots['default']?.() },
    );
  },
});

export const VirtualizerSurface = /* @__PURE__ */ defineComponent({
  name: 'SectileVirtualizerSurface',
  inheritAttrs: false,
  props: {
    as: {
      type: [String, Object, Function] as PropType<PrimitiveAs>,
      default: 'div',
    },
    asChild: { type: Boolean, default: false },
  },
  slots: Object as SlotsType<{
    default: (plan: VirtualLayoutPlan<StableID> | null) => VNodeChild;
  }>,
  setup(props, { attrs, slots }) {
    const root = useVirtualizerRoot('VirtualizerSurface');
    provide<VirtualizerSurfaceContext>(virtualizerSurfaceContextKey, {
      registerItem: root.registerItem,
    });
    let element: HTMLElement | null = null;
    const style = computed(() =>
      root.plan.value === null
        ? Object.freeze({ position: 'relative' })
        : virtualSurfaceStyle(root.plan.value),
    );
    const setElement = (value: unknown): void => {
      const next = value instanceof HTMLElement ? value : null;
      if (element === next) return;
      if (element !== null && root.surface.value === element) {
        root.surface.value = null;
      }
      element = next;
      if (next !== null) root.surface.value = next;
    };
    onBeforeUnmount(() => {
      if (element !== null && root.surface.value === element) {
        root.surface.value = null;
      }
      element = null;
    });
    return (): VNodeChild =>
      h(
        Primitive,
        mergeProps(attrs, {
          as: props.as,
          asChild: props.asChild,
          elementRef: setElement,
          style: style.value,
          'data-scope': 'virtualizer',
          'data-part': 'surface',
        }),
        { default: () => slots['default']?.(root.plan.value) },
      );
  },
});

export const VirtualizerItem = /* @__PURE__ */ defineComponent({
  name: 'SectileVirtualizerItem',
  inheritAttrs: false,
  props: {
    placement: {
      type: Object as PropType<VirtualPlacement<StableID>>,
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
    default: (placement: VirtualPlacement<StableID>) => VNodeChild;
  }>,
  setup(props, { attrs, slots }) {
    const surface = useVirtualizerSurface('VirtualizerItem');
    let element: HTMLElement | null = null;
    let unregister: (() => void) | undefined;
    const sizing = computed<VirtualItemStyleOptions>(() =>
      Object.freeze({
        width: props.size === 'width' || props.size === 'both',
        height: props.size === 'height' || props.size === 'both',
      }),
    );
    const setElement = (value: unknown): void => {
      const next = value instanceof HTMLElement ? value : null;
      if (element === next) return;
      unregister?.();
      unregister = undefined;
      element = next;
      if (next !== null) {
        unregister = surface.registerItem(next, props.placement.id);
      }
    };
    onBeforeUnmount(() => {
      unregister?.();
      unregister = undefined;
      element = null;
    });
    return (): VNodeChild =>
      h(
        Primitive,
        mergeProps(attrs, {
          as: props.as,
          asChild: props.asChild,
          elementRef: setElement,
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

export const VirtualizerFooter = /* @__PURE__ */ defineComponent({
  name: 'SectileVirtualizerFooter',
  inheritAttrs: false,
  props: {
    as: {
      type: [String, Object, Function] as PropType<PrimitiveAs>,
      default: 'div',
    },
    asChild: { type: Boolean, default: false },
  },
  slots: Object as SlotsType<{ default: () => VNodeChild }>,
  setup(props, { attrs, slots }) {
    const root = useVirtualizerRoot('VirtualizerFooter');
    let element: HTMLElement | null = null;
    let unregister: (() => void) | undefined;
    const setElement = (value: unknown): void => {
      const next = value instanceof HTMLElement ? value : null;
      if (element === next) return;
      unregister?.();
      unregister = undefined;
      element = next;
      if (next !== null) unregister = root.registerFrame(next);
    };
    onBeforeUnmount(() => {
      unregister?.();
      unregister = undefined;
      element = null;
    });
    return (): VNodeChild => h(
      Primitive,
      mergeProps(attrs, {
        as: props.as,
        asChild: props.asChild,
        elementRef: setElement,
        'data-scope': 'virtualizer',
        'data-part': 'footer',
      }),
      { default: () => slots['default']?.() },
    );
  },
});

function useVirtualizerRoot(part: string): VirtualizerContext {
  const root = inject<VirtualizerContext>(virtualizerContextKey);
  if (root === undefined) {
    throw new TypeError(`${part} must be used inside VirtualizerRoot.`);
  }
  return root;
}

function useVirtualizerSurface(part: string): VirtualizerSurfaceContext {
  const surface = inject<VirtualizerSurfaceContext>(virtualizerSurfaceContextKey);
  if (surface === undefined) {
    throw new TypeError(`${part} must be used inside VirtualizerSurface.`);
  }
  return surface;
}

export function useVirtualizerSurfaceRegistration(
  part: string,
): VirtualizerSurfaceRegistration {
  return useVirtualizerSurface(part);
}

export function virtualizerNotConnected<T>(): VirtualizerOperationResult<T> {
  return {
    ok: false,
    error: {
      class: 'transition-rejection',
      code: 'virtualizer-not-connected',
      message: 'Virtualizer requires mounted scrollport and surface elements.',
    },
  };
}

export type {
  VirtualInsets,
  VirtualLayoutPlan,
  VirtualLayoutStrategy,
  VirtualMeasurementResolver,
  VirtualPlacement,
  VirtualPoint,
  VirtualRect,
  VirtualScrollAlignment,
  VirtualizerConnection,
  VirtualizerEnvironment,
};

export {
  createAxisMeasurementResolver,
  virtualItemStyle,
  virtualSurfaceStyle,
};
