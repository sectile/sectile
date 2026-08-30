import type { StableID } from '@sectile/core';
import type { RevisionSnapshot } from '@sectile/core/revision';
import type { UnitID } from '@sectile/core/units';
import {
  createChartController,
  type ChartController,
  type ChartControllerOptions,
} from '@sectile/chart/controller';
import type {
  ChartAccessor,
  ChartAxisDomainInput,
  ChartAxisInputValue,
  ChartAxisViewUpdateMode,
  ChartAxisViewWindow,
  ChartHeatmapReduction,
  ChartLayerDefinition,
  ChartViewState,
} from '@sectile/chart/contract';
import type { ChartDefinition, ChartDefinitionState } from '@sectile/chart/definition';
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
import type { ChartScaleKind } from '@sectile/chart/scale';
import type { ChartAxisViewCapability } from '@sectile/chart/view';
import {
  createDOMChart,
  type DOMChartConnection,
  type DOMChartDragMode,
  type DOMChartNavigation,
  type DOMChartOptions,
  type DOMChartWheelMode,
  type DOMChartWheelModifier,
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
  type VNodeChild,
  type VNodeProps,
} from 'vue';

export interface ChartWritableRef<T> { value: T }

export type ChartReactiveModel<ID extends StableID = StableID> = MaybeRefOrGetter<ChartModel<ID>>;
export type ChartReactiveDefinition<ID extends StableID = StableID> = MaybeRefOrGetter<ChartDefinition<any, ID>>;

interface UseChartStateOptions<ID extends StableID> {
  readonly limits?: ChartLimits;
  readonly activeDatum?: ChartWritableRef<ID | null>;
  readonly defaultActiveDatum?: ID | null;
  readonly cursor?: ChartWritableRef<ID | null>;
  readonly defaultCursor?: ID | null;
  readonly selection?: ChartWritableRef<ChartSelection<ID>>;
  readonly defaultSelection?: ChartSelection<ID>;
  readonly view?: ChartWritableRef<ChartViewState<ID> | null>;
  readonly defaultView?: ChartViewState<ID> | null;
  readonly onActiveDatumChange?: (value: ID | null) => void;
  readonly onCursorChange?: (value: ID | null) => void;
  readonly onSelectionChange?: (value: ChartSelection<ID>) => void;
  readonly onViewChange?: (value: ChartViewState<ID> | null) => void;
  readonly onCommand?: (command: ChartCommand<ID>) => void;
}

export type UseChartOptions<ID extends StableID = StableID> = UseChartStateOptions<ID> & (
  | { readonly model: ChartReactiveModel<ID>; readonly definition?: never; readonly viewCapabilities?: never }
  | {
    readonly model?: never;
    readonly definition: ChartReactiveDefinition<ID>;
    readonly viewCapabilities?: MaybeRefOrGetter<readonly ChartAxisViewCapability<ID>[]>;
  }
);

export interface UseChartResult<ID extends StableID = StableID> {
  readonly controller: ChartController<ID>;
  readonly snapshot: ShallowRef<RevisionSnapshot<ChartState<ID>>>;
  readonly projection: ShallowRef<ChartProjection<ID> | null>;
  readonly connection: ShallowRef<DOMChartConnection<ID> | null>;
  replaceModel(model: ChartModel<ID>, expectedRevision?: number): ChartResult<RevisionSnapshot<ChartState<ID>>>;
  replaceDefinition<Datum>(
    definition: ChartDefinition<Datum, ID>,
    viewCapabilities?: readonly ChartAxisViewCapability<ID>[],
    expectedRevision?: number,
  ): ChartResult<RevisionSnapshot<ChartState<ID>>>;
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
  if ((options.model === undefined) === (options.definition === undefined)) {
    throw new TypeError('useChart requires exactly one model or declarative definition.');
  }
  assertControlledDefaults(options);
  const controlled = controlledValues(options);
  const source = options.definition === undefined
    ? { model: toValue(options.model as ChartReactiveModel<ID>) }
    : {
      definition: toValue(options.definition),
      viewCapabilities: toValue(options.viewCapabilities ?? (() => Object.freeze([]))),
    };
  const controller = createChartController({
    ...source,
    ...(options.limits === undefined ? {} : { limits: options.limits }),
    ...defaultValues(options),
    ...(Object.keys(controlled).length === 0 ? {} : { controlled }),
  } as ChartControllerOptions<ID>);
  const binding = bindController(controller, options, true);
  const stops: Array<() => void> = [];
  if (options.model !== undefined) {
    stops.push(watch(() => toValue(options.model as ChartReactiveModel<ID>), (model) => { binding.replaceModel(model); }, { deep: false }));
  } else {
    stops.push(watch(
      () => [toValue(options.definition as ChartReactiveDefinition<ID>), toValue(options.viewCapabilities ?? (() => Object.freeze([])))] as const,
      ([definition, capabilities]) => { binding.replaceDefinition(definition, capabilities); },
      { deep: false },
    ));
  }
  for (const sourceRef of [options.activeDatum, options.cursor, options.selection, options.view]) {
    if (sourceRef !== undefined) stops.push(watch(() => sourceRef.value, () => { binding.syncControlledValues(); }, { deep: false }));
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

export interface ChartRootProps<ID extends StableID = StableID> {
  readonly limits?: ChartLimits;
  readonly modelValue?: ChartSelection<ID>;
  readonly defaultModelValue?: ChartSelection<ID>;
  readonly activeDatum?: ID | null;
  readonly defaultActiveDatum?: ID | null;
  readonly cursor?: ID | null;
  readonly defaultCursor?: ID | null;
  readonly view?: ChartViewState<ID> | null;
  readonly defaultView?: ChartViewState<ID> | null;
  readonly patch?: ChartPatch<ID> | null;
  readonly dom?: Omit<DOMChartOptions<ID>, 'root' | 'canvas' | 'controller' | 'navigation'>;
  readonly onError?: (error: unknown) => void;
}

export interface ChartRootSlotProps<ID extends StableID = StableID> {
  readonly controller: ChartController<ID> | null;
  readonly snapshot: RevisionSnapshot<ChartState<ID>> | null;
  readonly state: ChartState<ID> | null;
  readonly projection: ChartProjection<ID> | null;
  readonly definition: ChartDefinitionState<ID> | null;
}

export interface ChartDeclarationDiagnostics {
  readonly registeredRecords: number;
  readonly publications: number;
  readonly readRecords: number;
}

export type ChartRootPublicProps<ID extends StableID = StableID> = ChartRootProps<ID>
  & VNodeProps & AllowedComponentProps & ComponentCustomProps & {
    readonly 'onUpdate:modelValue'?: (value: ChartSelection<ID>) => unknown;
    readonly 'onUpdate:activeDatum'?: (value: ID | null) => unknown;
    readonly 'onUpdate:cursor'?: (value: ID | null) => unknown;
    readonly 'onUpdate:view'?: (value: ChartViewState<ID> | null) => unknown;
    readonly onCommand?: (command: ChartCommand<ID>) => unknown;
  };

export interface ChartRootComponent {
  new <ID extends StableID = StableID>(props: ChartRootPublicProps<ID>): {
    $props: ChartRootPublicProps<ID>;
    $slots: { default?: (props: ChartRootSlotProps<ID>) => VNodeChild };
    readonly controller: ShallowRef<ChartController<ID> | null>;
    getDeclarationDiagnostics(): ChartDeclarationDiagnostics;
    refresh(): void;
  };
}

interface AssembledChart<ID extends StableID> {
  readonly definition: ChartDefinition<any, ID>;
  readonly viewCapabilities: readonly ChartAxisViewCapability<ID>[];
  readonly navigation: DOMChartNavigation<ID>;
}

type DeclarationKind = 'coordinate' | 'axis' | 'layer' | 'view' | 'navigation' | 'controls';

interface DeclarationRecord {
  readonly token: number;
  readonly kind: DeclarationKind;
  readonly read: () => unknown;
}

class ChartDeclarations<ID extends StableID> {
  readonly #records = new Map<number, DeclarationRecord>();
  readonly #publish: (value: AssembledChart<ID>) => void;
  #token = 0;
  #scheduled = false;
  #publications = 0;
  #readRecords = 0;

  public constructor(publish: (value: AssembledChart<ID>) => void) { this.#publish = publish; }

  public register(kind: DeclarationKind, read: () => unknown): { readonly touch: () => void; readonly dispose: () => void } {
    const token = ++this.#token;
    this.#records.set(token, { token, kind, read });
    this.schedule();
    let active = true;
    return Object.freeze({
      touch: (): void => { if (active) this.schedule(); },
      dispose: (): void => {
        if (!active) return;
        active = false;
        this.#records.delete(token);
        this.schedule();
      },
    });
  }

  public publishNow(): void {
    this.#scheduled = false;
    this.#publish(this.assemble());
    this.#publications += 1;
  }

  public getDiagnostics(): ChartDeclarationDiagnostics {
    return Object.freeze({
      registeredRecords: this.#records.size,
      publications: this.#publications,
      readRecords: this.#readRecords,
    });
  }

  public schedule(): void {
    if (this.#scheduled) return;
    this.#scheduled = true;
    void nextTick(() => { if (this.#scheduled) this.publishNow(); });
  }

  public assemble(): AssembledChart<ID> {
    const records = [...this.#records.values()].sort((left, right) => left.token - right.token);
    this.#readRecords = records.length;
    const coordinates = records.filter((record) => record.kind === 'coordinate');
    if (coordinates.length !== 1) throw new TypeError('ChartRoot requires exactly one ChartCartesian or ChartRadial coordinate.');
    const coordinate = coordinates[0]?.read() as { readonly kind: 'cartesian' | 'radial' };
    const axes = records.filter((record) => record.kind === 'axis').map((record) => record.read());
    const layers = records.filter((record) => record.kind === 'layer').map((record) => record.read());
    const capabilities = records.filter((record) => record.kind === 'view').map((record) => record.read()) as ChartAxisViewCapability<ID>[];
    const navigationRecords = records.filter((record) => record.kind === 'navigation');
    if (navigationRecords.length > 1) throw new TypeError('ChartRoot accepts at most one ChartNavigation declaration.');
    const controls = records.filter((record) => record.kind === 'controls').map((record) => record.read()) as Array<'built-in' | 'external'>;
    const navigation = navigationRecords[0]?.read() as DOMChartNavigation<ID> | undefined;
    const alternative = controls.includes('built-in') ? 'built-in' : controls.includes('external') ? 'external' : undefined;
    if (navigation !== undefined && ((navigation.drag ?? 'none') !== 'none' || navigation.pinch === true) && alternative === undefined) {
      throw new TypeError('Chart direct gestures require ChartViewControls or ChartExternalViewControls.');
    }
    return Object.freeze({
      definition: Object.freeze({
        coordinate: coordinate.kind === 'cartesian'
          ? Object.freeze({ kind: 'cartesian' as const, axes: Object.freeze(axes) })
          : Object.freeze({ kind: 'radial' as const }),
        layers: Object.freeze(layers),
      }) as ChartDefinition<any, ID>,
      viewCapabilities: Object.freeze(capabilities),
      navigation: Object.freeze({ ...(navigation ?? {}), ...(alternative === undefined ? {} : { controlAlternative: alternative }) }),
    });
  }
}

interface InternalChartContext<ID extends StableID> {
  readonly declarations: ChartDeclarations<ID>;
  readonly controller: ShallowRef<ChartController<ID> | null>;
  readonly canvas: ShallowRef<HTMLCanvasElement | null>;
  dispatch(event: ChartEvent<ID>): void;
}

const chartKey: InjectionKey<InternalChartContext<StableID>> = Symbol('SectileChart');
const chartAxisKey: InjectionKey<ShallowRef<StableID>> = Symbol('SectileChartAxis');
const chartControlAxisKey: InjectionKey<ShallowRef<StableID>> = Symbol('SectileChartControlAxis');

function useInternalChart<ID extends StableID = StableID>(): InternalChartContext<ID> {
  const context = inject(chartKey);
  if (context === undefined) throw new TypeError('Chart component must be used inside ChartRoot.');
  return context as unknown as InternalChartContext<ID>;
}

export function useChartContext<ID extends StableID = StableID>(): Pick<InternalChartContext<ID>, 'controller' | 'dispatch'> {
  return useInternalChart<ID>();
}

const ChartRootRuntime = defineComponent({
  name: 'SectileChartRoot',
  inheritAttrs: false,
  props: {
    limits: { type: Object as PropType<ChartLimits>, default: undefined },
    modelValue: { type: Object as PropType<ChartSelection>, default: undefined },
    defaultModelValue: { type: Object as PropType<ChartSelection>, default: undefined },
    activeDatum: { type: [String, Number] as PropType<StableID | null>, default: undefined },
    defaultActiveDatum: { type: [String, Number] as PropType<StableID | null>, default: undefined },
    cursor: { type: [String, Number] as PropType<StableID | null>, default: undefined },
    defaultCursor: { type: [String, Number] as PropType<StableID | null>, default: undefined },
    view: { type: Object as PropType<ChartViewState | null>, default: undefined },
    defaultView: { type: Object as PropType<ChartViewState | null>, default: undefined },
    patch: { type: Object as PropType<ChartPatch>, default: undefined },
    dom: { type: Object as PropType<Omit<DOMChartOptions, 'root' | 'canvas' | 'controller' | 'navigation'>>, default: undefined },
    onError: { type: Function as PropType<(error: unknown) => void>, default: undefined },
  },
  emits: {
    'update:modelValue': (_value: ChartSelection): boolean => true,
    'update:activeDatum': (_value: StableID | null): boolean => true,
    'update:cursor': (_value: StableID | null): boolean => true,
    'update:view': (_value: ChartViewState | null): boolean => true,
    command: (_command: ChartCommand): boolean => true,
  },
  setup(props, { attrs, emit, expose, slots }) {
    assertRootControlledDefaults(props);
    const root = shallowRef<HTMLElement | null>(null);
    const canvas = shallowRef<HTMLCanvasElement | null>(null);
    const controller = shallowRef<ChartController | null>(null);
    const snapshot = shallowRef<RevisionSnapshot<ChartState> | null>(null);
    const projection = shallowRef<ChartProjection | null>(null);
    const connection = shallowRef<DOMChartConnection | null>(null);
    let assembled: AssembledChart<StableID> | null = null;
    let unsubscribe: (() => void) | null = null;
    let previousState: ChartState | null = null;
    let mounted = false;
    const controlled = Object.freeze({
      activeDatum: props.activeDatum !== undefined,
      cursor: props.cursor !== undefined,
      selection: props.modelValue !== undefined,
      view: props.view !== undefined,
    });

    const report = (error: unknown): void => {
      if (props.onError !== undefined) props.onError(error);
      else throw error;
    };
    const publishSnapshot = (): void => {
      const owner = controller.value;
      if (owner === null) return;
      const current = owner.getSnapshot();
      if (snapshot.value === current) return;
      const prior = previousState;
      snapshot.value = current;
      previousState = current.state;
      if (prior !== null) {
        if (!controlled.activeDatum && prior.activeDatum !== current.state.activeDatum) emit('update:activeDatum', current.state.activeDatum);
        if (!controlled.cursor && prior.cursor !== current.state.cursor) emit('update:cursor', current.state.cursor);
        if (!controlled.selection && prior.selection !== current.state.selection) emit('update:modelValue', current.state.selection);
        if (!controlled.view && prior.view !== current.state.view) emit('update:view', current.state.view);
      }
    };
    const onCommand = (command: ChartCommand): void => {
      emit('command', command);
      if (command.type === 'active-change-requested') emit('update:activeDatum', command.id);
      else if (command.type === 'cursor-change-requested') emit('update:cursor', command.id);
      else if (command.type === 'selection-change-requested') emit('update:modelValue', command.selection);
      else if (command.type === 'view-change-requested') emit('update:view', command.view);
      publishSnapshot();
    };
    const connect = (): void => {
      const owner = controller.value;
      if (!mounted || owner === null || root.value === null || canvas.value === null || connection.value !== null) return;
      const dom = props.dom ?? {};
      try {
        connection.value = createDOMChart({
          ...dom,
          root: root.value,
          canvas: canvas.value,
          controller: owner,
          ...(assembled === null ? {} : { navigation: assembled.navigation }),
          onCommand: (command: ChartCommand) => { dom.onCommand?.(command); },
          onProjectionChange: (next) => { projection.value = next; dom.onProjectionChange?.(next); },
        });
        projection.value = connection.value.getProjection();
      } catch (error) { report(error); }
    };
    const publishDefinition = (next: AssembledChart<StableID>): void => {
      assembled = next;
      const owner = controller.value;
      if (owner === null) return;
      const replaced = owner.replaceDefinition(next.definition, next.viewCapabilities);
      if (!replaced.ok) { report(new TypeError(`${replaced.error.code}: ${replaced.error.message}`)); return; }
      publishSnapshot();
      const navigation = connection.value?.setNavigation(next.navigation);
      if (navigation !== undefined && !navigation.ok) report(new TypeError(`${navigation.error.code}: ${navigation.error.message}`));
      connection.value?.refresh();
    };
    const declarations = new ChartDeclarations<StableID>((next) => {
      try { publishDefinition(next); } catch (error) { report(error); }
    });
    const context: InternalChartContext<StableID> = Object.freeze({
      declarations,
      controller,
      canvas,
      dispatch(event: ChartEvent<StableID>): void {
        const result = controller.value?.dispatch(event);
        if (result !== undefined && !result.ok) report(new TypeError(`${result.error.code}: ${result.error.message}`));
        publishSnapshot();
      },
    });
    provide(chartKey, context);

    const syncControlled = (): void => {
      const owner = controller.value;
      if (owner === null) return;
      const result = owner.syncControlledValues(Object.freeze({
        ...(controlled.activeDatum ? { activeDatum: props.activeDatum ?? null } : {}),
        ...(controlled.cursor ? { cursor: props.cursor ?? null } : {}),
        ...(controlled.selection ? { selection: props.modelValue as ChartSelection } : {}),
        ...(controlled.view ? { view: props.view ?? null } : {}),
      }));
      if (!result.ok) report(new TypeError(`${result.error.code}: ${result.error.message}`));
      publishSnapshot();
    };
    watch(() => [props.activeDatum, props.cursor, props.modelValue, props.view] as const, syncControlled, { deep: false });
    watch(() => props.patch, (patch) => {
      if (patch === null || patch === undefined || controller.value === null) return;
      const result = controller.value.applyPatch(patch);
      if (!result.ok) report(new TypeError(`${result.error.code}: ${result.error.message}`));
      publishSnapshot();
    }, { deep: false });

    onMounted(() => {
      mounted = true;
      try {
        declarations.publishNow();
        const next = assembled as AssembledChart<StableID>;
        const controlledValues = Object.freeze({
          ...(controlled.activeDatum ? { activeDatum: props.activeDatum ?? null } : {}),
          ...(controlled.cursor ? { cursor: props.cursor ?? null } : {}),
          ...(controlled.selection ? { selection: props.modelValue as ChartSelection } : {}),
          ...(controlled.view ? { view: props.view ?? null } : {}),
        });
        const initialValues = Object.freeze({
          ...(!controlled.activeDatum && props.defaultActiveDatum !== undefined ? { activeDatum: props.defaultActiveDatum } : {}),
          ...(!controlled.cursor && props.defaultCursor !== undefined ? { cursor: props.defaultCursor } : {}),
          ...(!controlled.selection && props.defaultModelValue !== undefined ? { selection: props.defaultModelValue } : {}),
          ...(!controlled.view && props.defaultView !== undefined ? { view: props.defaultView } : {}),
        });
        controller.value = createChartController({
          definition: next.definition,
          viewCapabilities: next.viewCapabilities,
          ...(props.limits === undefined ? {} : { limits: props.limits }),
          ...(Object.keys(controlledValues).length === 0 ? {} : { controlled: controlledValues }),
          ...(Object.keys(initialValues).length === 0 ? {} : { initialValues }),
        });
        snapshot.value = controller.value.getSnapshot();
        previousState = snapshot.value.state;
        unsubscribe = controller.value.subscribeCommands(onCommand);
        void nextTick(connect);
      } catch (error) { report(error); }
    });
    onBeforeUnmount(() => {
      mounted = false;
      connection.value?.disconnect();
      connection.value = null;
      unsubscribe?.();
      unsubscribe = null;
      controller.value?.dispose();
      controller.value = null;
    });
    expose({
      controller,
      getDeclarationDiagnostics: () => declarations.getDiagnostics(),
      refresh: () => connection.value?.refresh(),
    });

    return (): VNodeChild => h('div', {
      ...attrs,
      ref: (element: unknown) => { root.value = element as HTMLElement | null; },
      'data-scope': 'chart',
      'data-part': 'root',
    }, slots['default']?.({
      controller: controller.value,
      snapshot: snapshot.value,
      state: snapshot.value?.state ?? null,
      projection: projection.value,
      definition: controller.value?.getDefinition() ?? null,
    }));
  },
});

export const ChartRoot = ChartRootRuntime as unknown as ChartRootComponent;

const coordinateProps = {};

export const ChartCartesian = defineComponent({
  name: 'SectileChartCartesian', props: coordinateProps,
  setup(_props, { slots }) {
    const context = useInternalChart();
    const record = context.declarations.register('coordinate', () => Object.freeze({ kind: 'cartesian' as const }));
    onBeforeUnmount(record.dispose);
    return (): VNodeChild => slots['default']?.() ?? null;
  },
});

export const ChartRadial = defineComponent({
  name: 'SectileChartRadial', props: coordinateProps,
  setup(_props, { slots }) {
    const context = useInternalChart();
    const record = context.declarations.register('coordinate', () => Object.freeze({ kind: 'radial' as const }));
    onBeforeUnmount(record.dispose);
    return (): VNodeChild => slots['default']?.() ?? null;
  },
});

export interface ChartAxisProps<ID extends StableID = StableID> {
  readonly id: ID;
  readonly scale?: ChartScaleKind;
  readonly domain?: ChartAxisDomainInput;
  readonly field?: string;
  readonly getValue?: ChartAccessor<any, ChartAxisInputValue>;
  readonly ticks?: number;
  readonly label?: string;
  readonly unit?: UnitID;
}

const axisProps = {
  id: { type: [String, Number] as PropType<StableID>, required: true },
  scale: { type: String as PropType<ChartScaleKind>, default: 'linear' },
  domain: { type: [String, Object] as PropType<ChartAxisDomainInput>, default: 'auto' },
  field: { type: String, default: undefined },
  getValue: { type: Function as PropType<ChartAccessor<any, ChartAxisInputValue>>, default: undefined },
  ticks: { type: Number, default: undefined },
  label: { type: String, default: undefined },
  unit: { type: String as PropType<UnitID>, default: undefined },
};

function axisComponent(orientation: 'x' | 'y') {
  return defineComponent({
    name: orientation === 'x' ? 'SectileChartXAxis' : 'SectileChartYAxis',
    props: axisProps,
    setup(props, { slots }) {
      const context = useInternalChart();
      const axis = shallowRef(props.id as StableID);
      provide(chartAxisKey, axis);
      const value = shallowRef(axisDefinition(props, orientation));
      const record = context.declarations.register('axis', () => value.value);
      watch(() => [props.id, props.scale, props.domain, props.field, props.getValue, props.ticks, props.label, props.unit] as const, () => {
        axis.value = props.id as StableID;
        value.value = axisDefinition(props, orientation); record.touch();
      }, { deep: false, flush: 'post' });
      onBeforeUnmount(record.dispose);
      return (): VNodeChild => slots['default']?.() ?? null;
    },
  });
}

export const ChartXAxis = axisComponent('x') as unknown as GenericSemanticComponent<ChartAxisProps>;
export const ChartYAxis = axisComponent('y') as unknown as GenericSemanticComponent<ChartAxisProps>;

function axisDefinition(props: Record<string, unknown>, orientation: 'x' | 'y'): object {
  return defined({
    id: props['id'], orientation, scale: props['scale'], domain: props['domain'], field: props['field'],
    getValue: props['getValue'], ticks: props['ticks'], label: props['label'], unit: props['unit'],
  });
}

interface GenericSemanticComponent<Props> {
  new <ID extends StableID = StableID>(props: Props & { readonly id: ID } & VNodeProps & AllowedComponentProps & ComponentCustomProps): { $props: Props & { readonly id: ID } };
}

interface ChartLayerBaseProps<Datum, ID extends StableID> {
  readonly id: ID;
  readonly data: readonly Datum[];
  readonly getId?: ChartAccessor<Datum, ID>;
  readonly label?: string;
}

export interface ChartCartesianLayerProps<Datum = unknown, ID extends StableID = StableID> extends ChartLayerBaseProps<Datum, ID> {
  readonly xAxis: ID;
  readonly yAxis: ID;
  readonly getX?: ChartAccessor<Datum, ChartAxisInputValue>;
  readonly getY?: ChartAccessor<Datum, ChartAxisInputValue>;
}

export interface ChartScatterProps<Datum = unknown, ID extends StableID = StableID> extends ChartCartesianLayerProps<Datum, ID> {
  readonly projection?: 'raw' | 'density';
}

export interface ChartBarProps<Datum = unknown, ID extends StableID = StableID> extends ChartCartesianLayerProps<Datum, ID> {
  readonly orientation?: 'vertical' | 'horizontal';
}

export interface ChartHeatmapProps<Datum = unknown, ID extends StableID = StableID> extends ChartCartesianLayerProps<Datum, ID> {
  readonly getValue?: ChartAccessor<Datum, number>;
  readonly valueField?: string;
  readonly projection?: 'raw' | { readonly kind: 'aggregate'; readonly reduction: ChartHeatmapReduction };
}

export interface ChartRadialLayerProps<Datum = unknown, ID extends StableID = StableID> extends ChartLayerBaseProps<Datum, ID> {
  readonly getValue?: ChartAccessor<Datum, number>;
  readonly valueField?: string;
  readonly getLabel?: ChartAccessor<Datum, string>;
  readonly labelField?: string;
}

export interface ChartDonutProps<Datum = unknown, ID extends StableID = StableID> extends ChartRadialLayerProps<Datum, ID> {
  readonly innerRadius?: number;
  readonly outerRadius?: number;
}

type ChartSemanticPublicProps<Props> = Props & VNodeProps & AllowedComponentProps & ComponentCustomProps;

export interface ChartLineComponent {
  new <Datum = unknown, ID extends StableID = StableID>(props: ChartSemanticPublicProps<ChartCartesianLayerProps<Datum, ID>>): {
    $props: ChartCartesianLayerProps<Datum, ID>;
  };
}

export interface ChartScatterComponent {
  new <Datum = unknown, ID extends StableID = StableID>(props: ChartSemanticPublicProps<ChartScatterProps<Datum, ID>>): {
    $props: ChartScatterProps<Datum, ID>;
  };
}

export interface ChartBarComponent {
  new <Datum = unknown, ID extends StableID = StableID>(props: ChartSemanticPublicProps<ChartBarProps<Datum, ID>>): {
    $props: ChartBarProps<Datum, ID>;
  };
}

export interface ChartHeatmapComponent {
  new <Datum = unknown, ID extends StableID = StableID>(props: ChartSemanticPublicProps<ChartHeatmapProps<Datum, ID>>): {
    $props: ChartHeatmapProps<Datum, ID>;
  };
}

export interface ChartPieComponent {
  new <Datum = unknown, ID extends StableID = StableID>(props: ChartSemanticPublicProps<ChartRadialLayerProps<Datum, ID>>): {
    $props: ChartRadialLayerProps<Datum, ID>;
  };
}

export interface ChartDonutComponent {
  new <Datum = unknown, ID extends StableID = StableID>(props: ChartSemanticPublicProps<ChartDonutProps<Datum, ID>>): {
    $props: ChartDonutProps<Datum, ID>;
  };
}

const layerBaseProps = {
  id: { type: [String, Number] as PropType<StableID>, required: true },
  data: { type: Array as PropType<readonly unknown[]>, required: true },
  getId: { type: Function as PropType<ChartAccessor<unknown, StableID>>, default: undefined },
  label: { type: String, default: undefined },
};
const cartesianLayerProps = {
  ...layerBaseProps,
  xAxis: { type: [String, Number] as PropType<StableID>, required: true },
  yAxis: { type: [String, Number] as PropType<StableID>, required: true },
  getX: { type: Function as PropType<ChartAccessor<unknown, ChartAxisInputValue>>, default: undefined },
  getY: { type: Function as PropType<ChartAccessor<unknown, ChartAxisInputValue>>, default: undefined },
};

function layerComponent(kind: ChartLayerDefinition['kind'], extraProps: Record<string, unknown> = {}) {
  return defineComponent({
    name: `SectileChart${kind[0]?.toUpperCase()}${kind.slice(1)}`,
    props: { ...(kind === 'pie' || kind === 'donut' ? layerBaseProps : cartesianLayerProps), ...extraProps },
    setup(props) {
      const context = useInternalChart();
      const value = shallowRef(layerDefinition(props, kind));
      const record = context.declarations.register('layer', () => value.value);
      watch(() => Object.values(props), () => { value.value = layerDefinition(props, kind); record.touch(); }, { deep: false, flush: 'post' });
      onBeforeUnmount(record.dispose);
      return (): null => null;
    },
  });
}

export const ChartLine = layerComponent('line') as unknown as ChartLineComponent;
export const ChartScatter = layerComponent('scatter', {
  projection: { type: String as PropType<'raw' | 'density'>, default: 'raw' },
}) as unknown as ChartScatterComponent;
export const ChartBar = layerComponent('bar', {
  orientation: { type: String as PropType<'vertical' | 'horizontal'>, default: 'vertical' },
}) as unknown as ChartBarComponent;
export const ChartBars = ChartBar;
export const ChartHeatmap = layerComponent('heatmap', {
  getValue: { type: Function as PropType<ChartAccessor<unknown, number>>, default: undefined },
  valueField: { type: String, default: undefined },
  projection: { type: [String, Object] as PropType<ChartHeatmapProps['projection']>, default: 'raw' },
}) as unknown as ChartHeatmapComponent;
export const ChartPie = layerComponent('pie', {
  getValue: { type: Function as PropType<ChartAccessor<unknown, number>>, default: undefined },
  valueField: { type: String, default: undefined },
  getLabel: { type: Function as PropType<ChartAccessor<unknown, string>>, default: undefined },
  labelField: { type: String, default: undefined },
}) as unknown as ChartPieComponent;
export const ChartDonut = layerComponent('donut', {
  getValue: { type: Function as PropType<ChartAccessor<unknown, number>>, default: undefined },
  valueField: { type: String, default: undefined },
  getLabel: { type: Function as PropType<ChartAccessor<unknown, string>>, default: undefined },
  labelField: { type: String, default: undefined },
  innerRadius: { type: Number, default: 0.5 },
  outerRadius: { type: Number, default: 1 },
}) as unknown as ChartDonutComponent;

function layerDefinition(props: Record<string, unknown>, kind: ChartLayerDefinition['kind']): object {
  return defined({
    kind, id: props['id'], data: props['data'], getId: props['getId'], label: props['label'],
    xAxis: props['xAxis'], yAxis: props['yAxis'], getX: props['getX'], getY: props['getY'],
    projection: props['projection'], orientation: props['orientation'], getValue: props['getValue'],
    valueField: props['valueField'], getLabel: props['getLabel'], labelField: props['labelField'],
    innerRadius: props['innerRadius'], outerRadius: props['outerRadius'],
  });
}

export interface ChartAxisViewProps<ID extends StableID = StableID> {
  readonly axis?: ID;
  readonly initial?: ChartAxisViewWindow;
  readonly minimumSpan?: number;
  readonly maximumSpan?: number;
  readonly update?: ChartAxisViewUpdateMode;
}

export const ChartAxisView = defineComponent({
  name: 'SectileChartAxisView',
  props: {
    axis: { type: [String, Number] as PropType<StableID>, default: undefined },
    initial: { type: Object as PropType<ChartAxisViewWindow>, default: undefined },
    minimumSpan: { type: Number, default: undefined },
    maximumSpan: { type: Number, default: undefined },
    update: { type: String as PropType<ChartAxisViewUpdateMode>, default: 'preserve' },
  },
  setup(props) {
    const context = useInternalChart();
    const inheritedAxis = inject(chartAxisKey, undefined);
    const read = (): ChartAxisViewCapability => viewCapability(props, inheritedAxis?.value);
    const value = shallowRef(read());
    const record = context.declarations.register('view', () => value.value);
    watch(() => [props.axis, inheritedAxis?.value, props.initial, props.minimumSpan, props.maximumSpan, props.update] as const, () => {
      value.value = read(); record.touch();
    }, { deep: false, flush: 'post' });
    onBeforeUnmount(record.dispose);
    return (): null => null;
  },
});

function viewCapability(props: Record<string, unknown>, inheritedAxis?: StableID): ChartAxisViewCapability {
  const axisID = props['axis'] ?? inheritedAxis;
  if (axisID === undefined) throw new TypeError('ChartAxisView requires an axis prop or an enclosing ChartXAxis or ChartYAxis.');
  return Object.freeze(defined({
    axisID, initial: props['initial'], minimumSpan: props['minimumSpan'],
    maximumSpan: props['maximumSpan'], update: props['update'],
  })) as ChartAxisViewCapability;
}

export interface ChartNavigationProps<ID extends StableID = StableID> {
  readonly axes?: readonly ID[];
  readonly drag?: DOMChartDragMode;
  readonly wheel?: DOMChartWheelMode;
  readonly wheelModifier?: DOMChartWheelModifier;
  readonly pinch?: boolean;
  readonly keyboard?: boolean;
}

export const ChartNavigation = defineComponent({
  name: 'SectileChartNavigation',
  props: {
    axes: { type: Array as PropType<readonly StableID[]>, default: undefined },
    drag: { type: String as PropType<DOMChartDragMode>, default: 'none' },
    wheel: { type: String as PropType<DOMChartWheelMode>, default: 'native' },
    wheelModifier: { type: String as PropType<DOMChartWheelModifier>, default: 'none' },
    pinch: { type: Boolean, default: false },
    keyboard: { type: Boolean, default: false },
  },
  setup(props) {
    const context = useInternalChart();
    const value = shallowRef(navigationDefinition(props));
    const record = context.declarations.register('navigation', () => value.value);
    watch(() => [props.axes, props.drag, props.wheel, props.wheelModifier, props.pinch, props.keyboard] as const, () => {
      value.value = navigationDefinition(props); record.touch();
    }, { deep: false, flush: 'post' });
    onBeforeUnmount(record.dispose);
    return (): null => null;
  },
});

function navigationDefinition(props: Record<string, unknown>): DOMChartNavigation {
  return Object.freeze(defined({
    axes: props['axes'], drag: props['drag'], wheel: props['wheel'], wheelModifier: props['wheelModifier'],
    pinch: props['pinch'], keyboard: props['keyboard'],
  })) as DOMChartNavigation;
}

export const ChartViewControls = defineComponent({
  name: 'SectileChartViewControls', inheritAttrs: false,
  props: { axis: { type: [String, Number] as PropType<StableID>, default: undefined } },
  setup(props, { attrs, slots }) {
    const context = useInternalChart();
    const inheritedAxis = inject(chartAxisKey, undefined);
    const initialAxis = props.axis ?? inheritedAxis?.value;
    if (initialAxis === undefined) throw new TypeError('ChartViewControls requires an axis prop or an enclosing ChartXAxis or ChartYAxis.');
    const axis = shallowRef(initialAxis);
    provide(chartControlAxisKey, axis);
    watch(() => [props.axis, inheritedAxis?.value] as const, () => {
      axis.value = (props.axis ?? inheritedAxis?.value) as StableID;
    }, { deep: false, flush: 'sync' });
    const record = context.declarations.register('controls', () => 'built-in');
    onBeforeUnmount(record.dispose);
    return (): VNodeChild => h('div', { ...attrs, 'data-scope': 'chart', 'data-part': 'view-controls' }, slots['default']?.());
  },
});

export const ChartExternalViewControls = defineComponent({
  name: 'SectileChartExternalViewControls',
  setup() {
    const context = useInternalChart();
    const record = context.declarations.register('controls', () => 'external');
    onBeforeUnmount(record.dispose);
    return (): null => null;
  },
});

const axisControlProps = {
  axis: { type: [String, Number] as PropType<StableID>, default: undefined },
  label: { type: String, default: undefined },
};

export const ChartPanControl = defineComponent({
  name: 'SectileChartPanControl', inheritAttrs: false,
  props: { ...axisControlProps, direction: { type: String as PropType<'backward' | 'forward'>, required: true }, step: { type: Number, default: 0.1 } },
  setup(props, { attrs, slots }) {
    const context = useInternalChart();
    const inheritedAxis = inject(chartControlAxisKey, inject(chartAxisKey, undefined));
    const axis = (): StableID => requiredControlAxis(props.axis, inheritedAxis?.value);
    return (): VNodeChild => h('button', {
      ...attrs, type: 'button', disabled: context.controller.value === null,
      'aria-label': props.label ?? `Pan ${String(axis())} ${props.direction}`,
      'data-scope': 'chart', 'data-part': 'pan-control',
      onClick: () => context.dispatch({ type: 'pan-axis-view', axisID: axis(), fraction: props.direction === 'backward' ? -props.step : props.step, phase: 'settled' }),
    }, slots['default']?.() ?? props.direction);
  },
});

export const ChartZoomControl = defineComponent({
  name: 'SectileChartZoomControl', inheritAttrs: false,
  props: { ...axisControlProps, direction: { type: String as PropType<'in' | 'out'>, required: true }, factor: { type: Number, default: 1.25 } },
  setup(props, { attrs, slots }) {
    const context = useInternalChart();
    const inheritedAxis = inject(chartControlAxisKey, inject(chartAxisKey, undefined));
    const axis = (): StableID => requiredControlAxis(props.axis, inheritedAxis?.value);
    return (): VNodeChild => h('button', {
      ...attrs, type: 'button', disabled: context.controller.value === null,
      'aria-label': props.label ?? `Zoom ${String(axis())} ${props.direction}`,
      'data-scope': 'chart', 'data-part': 'zoom-control',
      onClick: () => context.dispatch({ type: 'zoom-axis-view', axisID: axis(), factor: props.direction === 'in' ? props.factor : 1 / props.factor, anchor: 0.5, phase: 'settled' }),
    }, slots['default']?.() ?? props.direction);
  },
});

export const ChartResetView = defineComponent({
  name: 'SectileChartResetView', inheritAttrs: false,
  props: { ...axisControlProps, to: { type: String as PropType<'initial' | 'latest'>, default: 'initial' } },
  setup(props, { attrs, slots }) {
    const context = useInternalChart();
    const inheritedAxis = inject(chartControlAxisKey, inject(chartAxisKey, undefined));
    const axis = (): StableID => requiredControlAxis(props.axis, inheritedAxis?.value);
    return (): VNodeChild => h('button', {
      ...attrs, type: 'button', disabled: context.controller.value === null,
      'aria-label': props.label ?? `Reset ${String(axis())} view`,
      'data-scope': 'chart', 'data-part': 'reset-view',
      onClick: () => context.dispatch({ type: 'reset-axis-view', axisID: axis(), to: props.to, phase: 'settled' }),
    }, slots['default']?.() ?? 'Reset');
  },
});

export const ChartPlot = defineComponent({
  name: 'SectileChartPlot', inheritAttrs: false,
  setup(_props, { attrs, slots }) {
    return (): VNodeChild => h('div', { ...attrs, 'data-scope': 'chart', 'data-part': 'plot' }, slots['default']?.());
  },
});

export const ChartRenderer = defineComponent({
  name: 'SectileChartRenderer', inheritAttrs: false,
  setup(_props, { attrs }) {
    const context = useInternalChart();
    return (): VNodeChild => h('canvas', {
      ...attrs,
      ref: (element: unknown) => { context.canvas.value = element as HTMLCanvasElement | null; },
      'aria-hidden': 'true', 'data-scope': 'chart', 'data-part': 'renderer',
    });
  },
});

export const ChartCanvas = ChartRenderer;

function semanticMarker(name: string, part: string) {
  return defineComponent({
    name,
    setup() { useInternalChart(); return (): null => null; },
  });
}

export const ChartGrid = semanticMarker('SectileChartGrid', 'grid');
export const ChartGridLines = ChartGrid;
export const ChartLegend = semanticMarker('SectileChartLegend', 'legend');
export const ChartAxisTicks = semanticMarker('SectileChartAxisTicks', 'axis-ticks');
export const ChartTicks = ChartAxisTicks;

function requiredControlAxis(axis: StableID | undefined, inheritedAxis: StableID | undefined): StableID {
  const resolved = axis ?? inheritedAxis;
  if (resolved === undefined) throw new TypeError('Chart view control requires an axis prop or an enclosing axis control scope.');
  return resolved;
}

function bindController<ID extends StableID>(
  controller: ChartController<ID>,
  options: UseChartStateOptions<ID>,
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
    view: options.view !== undefined,
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
    if (!controlledFlags.view && current.state.view !== previous.state.view) options.onViewChange?.(current.state.view);
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
    } else if (command.type === 'view-change-requested') {
      if (options.view !== undefined) options.view.value = command.view;
      options.onViewChange?.(command.view);
    }
    publish();
  });
  const result: UseChartResult<ID> = {
    controller, snapshot, projection, connection,
    replaceModel(model, expectedRevision) { const value = controller.replaceModel(model, expectedRevision); publish(); return value; },
    replaceDefinition(definition, viewCapabilities, expectedRevision) {
      const value = controller.replaceDefinition(definition, viewCapabilities, expectedRevision); publish(); return value;
    },
    applyPatch(patch, expectedRevision) { const value = controller.applyPatch(patch, expectedRevision); publish(); return value; },
    dispatch(event, expectedRevision) { const value = controller.dispatch(event, expectedRevision); publish(); return value; },
    syncControlledValues() { const value = controller.syncControlledValues(controlledValues(options)); publish(); return value; },
    dispose() {
      if (!active) return;
      active = false;
      connection.value?.disconnect(); connection.value = null;
      unsubscribe();
      if (owned) controller.dispose();
    },
  };
  return Object.freeze(result);
}

function controlledValues<ID extends StableID>(options: UseChartStateOptions<ID>): ChartControlledValues<ID> {
  return Object.freeze({
    ...(options.activeDatum === undefined ? {} : { activeDatum: options.activeDatum.value }),
    ...(options.cursor === undefined ? {} : { cursor: options.cursor.value }),
    ...(options.selection === undefined ? {} : { selection: options.selection.value }),
    ...(options.view === undefined ? {} : { view: options.view.value }),
  });
}

function defaultValues<ID extends StableID>(options: UseChartStateOptions<ID>): { readonly initialValues?: ChartControlledValues<ID> } {
  const values: ChartControlledValues<ID> = Object.freeze({
    ...(options.activeDatum !== undefined || options.defaultActiveDatum === undefined ? {} : { activeDatum: options.defaultActiveDatum }),
    ...(options.cursor !== undefined || options.defaultCursor === undefined ? {} : { cursor: options.defaultCursor }),
    ...(options.selection !== undefined || options.defaultSelection === undefined ? {} : { selection: options.defaultSelection }),
    ...(options.view !== undefined || options.defaultView === undefined ? {} : { view: options.defaultView }),
  });
  return Object.keys(values).length === 0 ? {} : { initialValues: values };
}

function assertControlledDefaults<ID extends StableID>(options: UseChartStateOptions<ID>): void {
  if ((options.activeDatum !== undefined && options.defaultActiveDatum !== undefined)
    || (options.cursor !== undefined && options.defaultCursor !== undefined)
    || (options.selection !== undefined && options.defaultSelection !== undefined)
    || (options.view !== undefined && options.defaultView !== undefined)) {
    throw new TypeError('Chart controlled values and their default counterparts are mutually exclusive.');
  }
}

function assertRootControlledDefaults(props: Record<string, unknown>): void {
  if ((props['modelValue'] !== undefined && props['defaultModelValue'] !== undefined)
    || (props['activeDatum'] !== undefined && props['defaultActiveDatum'] !== undefined)
    || (props['cursor'] !== undefined && props['defaultCursor'] !== undefined)
    || (props['view'] !== undefined && props['defaultView'] !== undefined)) {
    throw new TypeError('ChartRoot controlled props and their default counterparts are mutually exclusive.');
  }
}

function defined<T extends object>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined)) as T;
}
