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
    VirtualizerConnection<State, ID, Measurement, Mutation>['flush']
  >;
}

export type VirtualizerItemSize = 'none' | 'width' | 'height' | 'both';

export interface VirtualizerRootProps {
  readonly state: object;
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

export const VirtualizerRoot = defineComponent({
  name: 'SectileVirtualizerRoot',
  inheritAttrs: false,
  props: {
    state: { type: Object as PropType<object>, required: true },
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
    'update:state': (_state: object): boolean => true,
    planChange: (_plan: VirtualLayoutPlan<string>): boolean => true,
    error: (_error: Parameters<VirtualizerErrorHandler>[0]): boolean => true,
  },
  slots: Object as SlotsType<{
    default: (props: VirtualizerRootSlotProps) => VNodeChild;
  }>,
  setup(props, { attrs, emit, expose, slots }) {
    const state = shallowRef(props.state);
    const virtualizer = useVirtualizer({
      state,
      strategy: props.strategy,
      overscan: () => props.overscan,
      ...(props.initialViewport === undefined
        ? {}
        : { initialViewport: props.initialViewport }),
      ...(props.measure === undefined ? {} : { measure: props.measure }),
      onStateChange: (value) => {
        emit('update:state', value);
      },
      onPlanChange: (value) => {
        emit('planChange', value);
      },
      onError: (error) => {
        emit('error', error);
      },
    });
    watch(
      () => props.state,
      (value) => {
        state.value = value;
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
