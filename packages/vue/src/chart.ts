import type { StableID } from '@sectile/core';
import type { RevisionSnapshot } from '@sectile/core/revision';
import {
  createChartController,
  type ChartController,
  type ChartControllerOptions,
} from '@sectile/chart/controller';
import type {
  ChartCommand,
  ChartControlledValues,
  ChartEvent,
  ChartSelection,
  ChartState,
} from '@sectile/chart/interaction';
import type { ChartLimits, ChartModel, ChartPatch } from '@sectile/chart/model';
import type { ChartProjection } from '@sectile/chart/projection';
import type { ChartResult } from '@sectile/chart/result';
import type { ChartViewTransform } from '@sectile/chart/scale';
import {
  createDOMChart,
  type DOMChartConnection,
  type DOMChartOptions,
} from '@sectile/dom/chart';
import {
  defineComponent,
  getCurrentScope,
  h,
  inject,
  nextTick,
  onBeforeUnmount,
  onMounted,
  onScopeDispose,
  provide,
  shallowRef,
  toValue,
  watch,
  type AllowedComponentProps,
  type ComponentCustomProps,
  type InjectionKey,
  type MaybeRefOrGetter,
  type PropType,
  type ShallowRef,
  type SlotsType,
  type VNodeChild,
  type VNodeProps,
} from 'vue';

export interface ChartWritableRef<T> { value: T }
export type ChartReactiveModel<ID extends StableID = StableID> = MaybeRefOrGetter<ChartModel<ID>>;

export interface UseChartOptions<ID extends StableID = StableID> {
  readonly model: ChartReactiveModel<ID>;
  readonly limits?: ChartLimits;
  readonly activeDatum?: ChartWritableRef<ID | null>;
  readonly defaultActiveDatum?: ID | null;
  readonly cursor?: ChartWritableRef<ID | null>;
  readonly defaultCursor?: ID | null;
  readonly selection?: ChartWritableRef<ChartSelection<ID>>;
  readonly defaultSelection?: ChartSelection<ID>;
  readonly viewTransform?: ChartWritableRef<ChartViewTransform>;
  readonly defaultViewTransform?: ChartViewTransform;
  readonly onActiveDatumChange?: (value: ID | null) => void;
  readonly onCursorChange?: (value: ID | null) => void;
  readonly onSelectionChange?: (value: ChartSelection<ID>) => void;
  readonly onViewTransformChange?: (value: ChartViewTransform) => void;
  readonly onCommand?: (command: ChartCommand<ID>) => void;
}

export interface UseChartResult<ID extends StableID = StableID> {
  readonly controller: ChartController<ID>;
  readonly snapshot: ShallowRef<RevisionSnapshot<ChartState<ID>>>;
  readonly projection: ShallowRef<ChartProjection<ID> | null>;
  readonly connection: ShallowRef<DOMChartConnection<ID> | null>;
  replaceModel(model: ChartModel<ID>, expectedRevision?: number): ChartResult<RevisionSnapshot<ChartState<ID>>>;
  applyPatch(patch: ChartPatch<ID>, expectedRevision?: number): ChartResult<RevisionSnapshot<ChartState<ID>>>;
  dispatch(event: ChartEvent<ID>, expectedRevision?: number): ChartResult<{
    readonly snapshot: RevisionSnapshot<ChartState<ID>>;
    readonly commands: readonly ChartCommand<ID>[];
  }>;
  syncControlledValues(): ChartResult<RevisionSnapshot<ChartState<ID>>>;
  dispose(): void;
}

export interface ChartContext<ID extends StableID = StableID> extends UseChartResult<ID> {}

export function useChart<ID extends StableID>(options: UseChartOptions<ID>): UseChartResult<ID> {
  if (options === null || typeof options !== 'object') throw new TypeError('useChart options must be an object.');
  const controlled = controlledValues(options);
  const controllerOptions: ChartControllerOptions<ID> = {
    model: toValue(options.model),
    ...(options.limits === undefined ? {} : { limits: options.limits }),
    ...defaultValues(options),
    ...(Object.keys(controlled).length === 0 ? {} : { controlled }),
  };
  const controller = createChartController(controllerOptions);
  const binding = bindController(controller, options, true);
  const stops: Array<() => void> = [];
  stops.push(watch(() => toValue(options.model), (model) => { binding.replaceModel(model); }, { deep: false }));
  for (const source of [options.activeDatum, options.cursor, options.selection, options.viewTransform]) {
    if (source !== undefined) stops.push(watch(() => source.value, () => { binding.syncControlledValues(); }, { deep: false }));
  }
  const disposeBinding = binding.dispose;
  const result = Object.freeze({
    ...binding,
    dispose(): void {
      for (const stop of stops.splice(0)) stop();
      disposeBinding();
    },
  });
  if (getCurrentScope() !== undefined) onScopeDispose(result.dispose);
  return result;
}

export type ChartRootProps<ID extends StableID = StableID> =
  | {
      readonly controller: ChartController<ID>;
      readonly options?: never;
      readonly modelValue?: never;
      readonly cursor?: never;
      readonly viewTransform?: never;
      readonly dom?: Omit<DOMChartOptions<ID>, 'root' | 'canvas' | 'controller'>;
    }
  | {
      readonly controller?: never;
      readonly options: UseChartOptions<ID>;
      readonly modelValue?: ChartSelection<ID>;
      readonly cursor?: ID | null;
      readonly viewTransform?: ChartViewTransform;
      readonly dom?: Omit<DOMChartOptions<ID>, 'root' | 'canvas' | 'controller'>;
    };

export interface ChartRootSlotProps<ID extends StableID = StableID> {
  readonly controller: ChartController<ID>;
  readonly snapshot: RevisionSnapshot<ChartState<ID>>;
  readonly state: ChartState<ID>;
  readonly projection: ChartProjection<ID> | null;
}

export type ChartRootPublicProps<ID extends StableID = StableID> = ChartRootProps<ID>
  & VNodeProps
  & AllowedComponentProps
  & ComponentCustomProps
  & {
    readonly 'onUpdate:modelValue'?: (value: ChartSelection<ID>) => unknown;
    readonly 'onUpdate:cursor'?: (value: ID | null) => unknown;
    readonly 'onUpdate:viewTransform'?: (value: ChartViewTransform) => unknown;
    readonly onCommand?: (command: ChartCommand<ID>) => unknown;
  };

export interface ChartRootComponent {
  new <ID extends StableID = StableID>(props: ChartRootPublicProps<ID>): {
    $props: ChartRootPublicProps<ID>;
    $slots: {
      default?: (props: ChartRootSlotProps<ID>) => VNodeChild;
    };
    controller: ChartController<ID>;
    refresh(): void;
  };
}

interface InternalChartContext<ID extends StableID> extends ChartContext<ID> {
  readonly canvas: ShallowRef<HTMLCanvasElement | null>;
}

const chartKey: InjectionKey<InternalChartContext<StableID>> = Symbol('SectileChart');

export function useChartContext<ID extends StableID = StableID>(): ChartContext<ID> {
  const context = inject(chartKey);
  if (context === undefined) throw new TypeError('useChartContext must be used inside ChartRoot.');
  return context as InternalChartContext<ID>;
}

const ChartRootRuntime = defineComponent({
  name: 'SectileChartRoot',
  inheritAttrs: false,
  props: {
    controller: { type: Object as PropType<ChartController>, default: undefined },
    options: { type: Object as PropType<UseChartOptions>, default: undefined },
    modelValue: { type: Object as PropType<ChartSelection>, default: undefined },
    cursor: { type: [String, Number] as PropType<StableID | null>, default: undefined },
    viewTransform: { type: Object as PropType<ChartViewTransform>, default: undefined },
    dom: { type: Object as PropType<Omit<DOMChartOptions, 'root' | 'canvas' | 'controller'>>, default: undefined },
  },
  emits: {
    'update:modelValue': (_value: ChartSelection): boolean => true,
    'update:cursor': (_value: StableID | null): boolean => true,
    'update:viewTransform': (_value: ChartViewTransform): boolean => true,
    command: (_command: ChartCommand): boolean => true,
  },
  slots: Object as SlotsType<{ default: (props: ChartRootSlotProps) => VNodeChild }>,
  setup(props, { attrs, emit, expose, slots }) {
    if ((props.controller === undefined) === (props.options === undefined)) {
      throw new TypeError('ChartRoot requires exactly one of controller or options.');
    }
    if (props.controller !== undefined
      && (props.modelValue !== undefined || props.cursor !== undefined || props.viewTransform !== undefined)) {
      throw new TypeError('ChartRoot controlled props require options; synchronize an external controller at its owner.');
    }
    const root = shallowRef<HTMLElement | null>(null);
    const canvas = shallowRef<HTMLCanvasElement | null>(null);
    const callbacks = {
      onSelectionChange: (value: ChartSelection): void => emit('update:modelValue', value),
      onCursorChange: (value: StableID | null): void => emit('update:cursor', value),
      onViewTransformChange: (value: ChartViewTransform): void => emit('update:viewTransform', value),
      onCommand: (command: ChartCommand): void => emit('command', command),
    };
    const result = props.controller === undefined
      ? useChart(mergeRootOptions(props.options as UseChartOptions, props, callbacks))
      : bindController(props.controller, callbacks, false);
    const context = Object.freeze({ ...result, canvas }) as InternalChartContext<StableID>;
    provide(chartKey, context);

    const connect = (): void => {
      if (root.value === null || canvas.value === null || result.connection.value !== null) return;
      const dom = props.dom ?? {};
      result.connection.value = createDOMChart({
        ...dom,
        root: root.value,
        canvas: canvas.value,
        controller: result.controller,
        onCommand: (command) => { dom.onCommand?.(command); },
        onProjectionChange: (projection) => { result.projection.value = projection; dom.onProjectionChange?.(projection); },
      });
      result.projection.value = result.connection.value.getProjection();
    };
    onMounted(() => { void nextTick(connect); });
    onBeforeUnmount(() => {
      result.connection.value?.disconnect();
      result.connection.value = null;
      if (props.controller !== undefined) result.dispose();
    });
    expose({ controller: result.controller, refresh: () => result.connection.value?.refresh() });
    return (): VNodeChild => h('div', {
      ...attrs,
      ref: (element: unknown) => { root.value = element as HTMLElement | null; },
      'data-scope': 'chart',
      'data-part': 'root',
    }, slots['default']?.({
      controller: result.controller,
      snapshot: result.snapshot.value,
      state: result.snapshot.value.state,
      projection: result.projection.value,
    }) ?? [h(ChartCanvas)]);
  },
});

export const ChartRoot = ChartRootRuntime as unknown as ChartRootComponent;

export const ChartCanvas = defineComponent({
  name: 'SectileChartCanvas',
  inheritAttrs: false,
  setup(_props, { attrs }) {
    const context = inject(chartKey);
    if (context === undefined) throw new TypeError('ChartCanvas must be used inside ChartRoot.');
    return (): VNodeChild => h('canvas', {
      ...attrs,
      ref: (element: unknown) => { context.canvas.value = element as HTMLCanvasElement | null; },
      'aria-hidden': 'true',
      'data-scope': 'chart',
      'data-part': 'canvas',
    });
  },
});

function bindController<ID extends StableID>(
  controller: ChartController<ID>,
  options: Partial<UseChartOptions<ID>>,
  owned: boolean,
): UseChartResult<ID> {
  const snapshot = shallowRef(controller.getSnapshot());
  const projection = shallowRef<ChartProjection<ID> | null>(null);
  const connection = shallowRef<DOMChartConnection<ID> | null>(null);
  let active = true;
  const controlledFlags = {
    activeDatum: options.activeDatum !== undefined,
    cursor: options.cursor !== undefined,
    selection: options.selection !== undefined,
    viewTransform: options.viewTransform !== undefined,
  };
  const publish = (): void => {
    if (!active) return;
    const previous = snapshot.value;
    const current = controller.getSnapshot();
    if (current === previous) return;
    snapshot.value = current;
    if (!controlledFlags.activeDatum && current.state.activeDatum !== previous.state.activeDatum) options.onActiveDatumChange?.(current.state.activeDatum);
    if (!controlledFlags.cursor && current.state.cursor !== previous.state.cursor) options.onCursorChange?.(current.state.cursor);
    if (!controlledFlags.selection && current.state.selection !== previous.state.selection) options.onSelectionChange?.(current.state.selection);
    if (!controlledFlags.viewTransform && current.state.viewTransform !== previous.state.viewTransform) options.onViewTransformChange?.(current.state.viewTransform);
  };
  const unsubscribe = controller.subscribeCommands((command) => {
    options.onCommand?.(command);
    if (command.type === 'active-change-requested') {
      if (options.activeDatum !== undefined) options.activeDatum.value = command.id;
      options.onActiveDatumChange?.(command.id);
    } else if (command.type === 'cursor-change-requested') {
      if (options.cursor !== undefined) options.cursor.value = command.id;
      options.onCursorChange?.(command.id);
    } else if (command.type === 'selection-change-requested') {
      if (options.selection !== undefined) options.selection.value = command.selection;
      options.onSelectionChange?.(command.selection);
    } else if (command.type === 'view-transform-change-requested') {
      if (options.viewTransform !== undefined) options.viewTransform.value = command.viewTransform;
      options.onViewTransformChange?.(command.viewTransform);
    }
    publish();
  });
  const result: UseChartResult<ID> = {
    controller,
    snapshot,
    projection,
    connection,
    replaceModel(model, expectedRevision) {
      const value = controller.replaceModel(model, expectedRevision);
      publish();
      return value;
    },
    applyPatch(patch, expectedRevision) {
      const value = controller.applyPatch(patch, expectedRevision);
      publish();
      return value;
    },
    dispatch(event, expectedRevision) {
      const value = controller.dispatch(event, expectedRevision);
      publish();
      return value;
    },
    syncControlledValues() {
      const value = controller.syncControlledValues(controlledValues(options));
      publish();
      return value;
    },
    dispose() {
      if (!active) return;
      active = false;
      connection.value?.disconnect();
      connection.value = null;
      unsubscribe();
      if (owned) controller.dispose();
    },
  };
  return Object.freeze(result);
}

function controlledValues<ID extends StableID>(options: Partial<UseChartOptions<ID>>): ChartControlledValues<ID> {
  return Object.freeze({
    ...(options.activeDatum === undefined ? {} : { activeDatum: options.activeDatum.value }),
    ...(options.cursor === undefined ? {} : { cursor: options.cursor.value }),
    ...(options.selection === undefined ? {} : { selection: options.selection.value }),
    ...(options.viewTransform === undefined ? {} : { viewTransform: options.viewTransform.value }),
  });
}

function mergeRootOptions<ID extends StableID>(
  options: UseChartOptions<ID>,
  values: {
    readonly modelValue: ChartSelection<ID> | undefined;
    readonly cursor: ID | null | undefined;
    readonly viewTransform: ChartViewTransform | undefined;
  },
  callbacks: Pick<UseChartOptions<ID>, 'onSelectionChange' | 'onCursorChange' | 'onViewTransformChange' | 'onCommand'>,
): UseChartOptions<ID> {
  if ((values.modelValue !== undefined && options.selection !== undefined)
    || (values.cursor !== undefined && options.cursor !== undefined)
    || (values.viewTransform !== undefined && options.viewTransform !== undefined)) {
    throw new TypeError('ChartRoot controlled props cannot duplicate controlled refs in options.');
  }
  return {
    ...options,
    ...(values.modelValue === undefined ? {} : { selection: rootControlledRef(() => values.modelValue as ChartSelection<ID>) }),
    ...(values.cursor === undefined ? {} : { cursor: rootControlledRef(() => values.cursor as ID | null) }),
    ...(values.viewTransform === undefined ? {} : { viewTransform: rootControlledRef(() => values.viewTransform as ChartViewTransform) }),
    onSelectionChange(value) { options.onSelectionChange?.(value); callbacks.onSelectionChange?.(value); },
    onCursorChange(value) { options.onCursorChange?.(value); callbacks.onCursorChange?.(value); },
    onViewTransformChange(value) { options.onViewTransformChange?.(value); callbacks.onViewTransformChange?.(value); },
    onCommand(command) { options.onCommand?.(command); callbacks.onCommand?.(command); },
  };
}

function rootControlledRef<T>(read: () => T): ChartWritableRef<T> {
  return {
    get value(): T { return read(); },
    set value(_value: T) { /* The prop owner commits through the emitted update. */ },
  };
}

function defaultValues<ID extends StableID>(options: UseChartOptions<ID>): Pick<ChartControllerOptions<ID>, 'initialValues'> | {} {
  const values: ChartControlledValues<ID> = Object.freeze({
    ...(options.activeDatum !== undefined || options.defaultActiveDatum === undefined ? {} : { activeDatum: options.defaultActiveDatum }),
    ...(options.cursor !== undefined || options.defaultCursor === undefined ? {} : { cursor: options.defaultCursor }),
    ...(options.selection !== undefined || options.defaultSelection === undefined ? {} : { selection: options.defaultSelection }),
    ...(options.viewTransform !== undefined || options.defaultViewTransform === undefined ? {} : { viewTransform: options.defaultViewTransform }),
  });
  return Object.keys(values).length === 0 ? {} : { initialValues: values };
}
