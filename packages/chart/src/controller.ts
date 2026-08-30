import type { StableID } from '@sectile/core';
import { unwrap } from '@sectile/core/result';
import { createRevisionSnapshot, type RevisionSnapshot } from '@sectile/core/revision';
import { chartFail, chartOK } from './internal/result.js';
import {
  tryCreateChartDefinition,
  tryReplaceChartDefinition,
  type ChartDefinition,
  type ChartDefinitionState,
} from './definition.js';
import {
  reconcileChartState,
  reduceChartEvent,
  tryCreateChartState,
  type ChartCommand,
  type ChartControlledValues,
  type ChartControlFlags,
  type ChartEvent,
  type ChartState,
} from './interaction.js';
import {
  tryApplyChartPatch,
  tryCreateChartModel,
  tryReplaceChartModel,
  type ChartLimits,
  type ChartModel,
  type ChartModelState,
  type ChartPatch,
} from './model.js';
import { tryCreateChartProjection, type ChartProjection, type ChartProjectionInput } from './projection.js';
import type { ChartResult } from './result.js';
import { IDENTITY_CHART_VIEW_TRANSFORM } from './scale.js';
import {
  tryCreateChartAxisViewState,
  reconcileChartAxisViewState,
  type ChartAxisViewCapability,
} from './view.js';

interface ChartControllerOptionsBase<ID extends StableID> {
  readonly limits?: ChartLimits;
  readonly initialValues?: ChartControlledValues<ID>;
  readonly controlled?: ChartControlledValues<ID>;
}

export interface ChartModelControllerOptions<ID extends StableID = StableID> extends ChartControllerOptionsBase<ID> {
  readonly model: ChartModel<ID>;
  readonly definition?: never;
  readonly viewCapabilities?: never;
}

export interface ChartDefinitionControllerOptions<ID extends StableID = StableID> extends ChartControllerOptionsBase<ID> {
  readonly model?: never;
  readonly definition: ChartDefinition<any, ID>;
  readonly viewCapabilities?: readonly ChartAxisViewCapability<ID>[];
}

export type ChartControllerOptions<ID extends StableID = StableID> =
  | ChartModelControllerOptions<ID>
  | ChartDefinitionControllerOptions<ID>;

export interface ChartUpdate<ID extends StableID = StableID> {
  readonly snapshot: RevisionSnapshot<ChartState<ID>>;
  readonly commands: readonly ChartCommand<ID>[];
}

export interface ChartController<ID extends StableID = StableID> {
  getModel(): ChartModelState<ID>;
  getDefinition(): ChartDefinitionState<ID> | null;
  getSnapshot(): RevisionSnapshot<ChartState<ID>>;
  replaceModel(model: ChartModel<ID>, expectedRevision?: number): ChartResult<RevisionSnapshot<ChartState<ID>>>;
  replaceDefinition<Datum>(
    definition: ChartDefinition<Datum, ID>,
    viewCapabilities?: readonly ChartAxisViewCapability<ID>[],
    expectedRevision?: number,
  ): ChartResult<RevisionSnapshot<ChartState<ID>>>;
  applyPatch(patch: ChartPatch<ID>, expectedRevision?: number): ChartResult<RevisionSnapshot<ChartState<ID>>>;
  syncControlledValues(values: ChartControlledValues<ID>): ChartResult<RevisionSnapshot<ChartState<ID>>>;
  dispatch(event: ChartEvent<ID>, expectedRevision?: number): ChartResult<ChartUpdate<ID>>;
  project(input: ChartProjectionInput): ChartResult<ChartProjection<ID>>;
  subscribeCommands(listener: (command: ChartCommand<ID>) => void): () => void;
  dispose(): void;
}

export function createChartController<ID extends StableID>(options: ChartControllerOptions<ID>): ChartController<ID> {
  return unwrap(tryCreateChartController(options));
}

export function tryCreateChartController<ID extends StableID>(
  options: ChartControllerOptions<ID>,
): ChartResult<ChartController<ID>> {
  if (options === null || typeof options !== 'object') return invalidController('Chart controller options must be an object.');
  if ((options.model === undefined) === (options.definition === undefined)) {
    return invalidController('Chart controller requires exactly one model or declarative definition.');
  }
  const definition = options.definition === undefined
    ? chartOK(null)
    : tryCreateChartDefinition(options.definition, options.limits);
  if (!definition.ok) return definition;
  const model = definition.value === null
    ? tryCreateChartModel(options.model as ChartModel<ID>, options.limits)
    : chartOK(definition.value.model);
  if (!model.ok) return model;
  const controlledValues = options.controlled ?? {};
  const capabilities = options.definition === undefined ? Object.freeze([]) : Object.freeze([...(options.viewCapabilities ?? [])]);
  const defaultView = definition.value === null || capabilities.length === 0
    ? chartOK(undefined)
    : tryCreateChartAxisViewState(definition.value.axes, capabilities);
  if (!defaultView.ok) return defaultView;
  const state = tryCreateChartState(model.value, {
    ...(defaultView.value === undefined ? {} : { view: defaultView.value }),
    ...(options.initialValues ?? {}),
    ...controlledValues,
  });
  if (!state.ok) return state;
  return chartOK(new ImmutableChartController(
    model.value,
    definition.value,
    capabilities,
    createRevisionSnapshot(state.value),
    controlFlags(controlledValues),
    Object.freeze({ ...controlledValues }),
  ));
}

class ImmutableChartController<ID extends StableID> implements ChartController<ID> {
  #model: ChartModelState<ID>;
  #definition: ChartDefinitionState<ID> | null;
  #viewCapabilities: readonly ChartAxisViewCapability<ID>[];
  #snapshot: RevisionSnapshot<ChartState<ID>>;
  readonly #controlled: ChartControlFlags;
  #controlledValues: ChartControlledValues<ID>;
  readonly #listeners = new Set<(command: ChartCommand<ID>) => void>();
  #projectionCache: ProjectionCache<ID> | null = null;
  #disposed = false;

  public constructor(
    model: ChartModelState<ID>,
    definition: ChartDefinitionState<ID> | null,
    viewCapabilities: readonly ChartAxisViewCapability<ID>[],
    snapshot: RevisionSnapshot<ChartState<ID>>,
    controlled: ChartControlFlags,
    controlledValues: ChartControlledValues<ID>,
  ) {
    this.#model = model;
    this.#definition = definition;
    this.#viewCapabilities = viewCapabilities;
    this.#snapshot = snapshot;
    this.#controlled = controlled;
    this.#controlledValues = controlledValues;
  }

  public getModel(): ChartModelState<ID> { return this.#model; }
  public getDefinition(): ChartDefinitionState<ID> | null { return this.#definition; }
  public getSnapshot(): RevisionSnapshot<ChartState<ID>> { return this.#snapshot; }

  public replaceModel(
    input: ChartModel<ID>,
    expectedRevision: number = this.#snapshot.revision,
  ): ChartResult<RevisionSnapshot<ChartState<ID>>> {
    const ready = this.#ready(expectedRevision);
    if (!ready.ok) return ready;
    const nextModel = tryReplaceChartModel(this.#model, input);
    if (!nextModel.ok) return nextModel;
    if (nextModel.value === this.#model && this.#definition === null) return chartOK(this.#snapshot);
    return this.#commitModel(nextModel.value, null, null, Object.freeze([]));
  }

  public replaceDefinition<Datum>(
    input: ChartDefinition<Datum, ID>,
    viewCapabilities: readonly ChartAxisViewCapability<ID>[] = this.#viewCapabilities,
    expectedRevision: number = this.#snapshot.revision,
  ): ChartResult<RevisionSnapshot<ChartState<ID>>> {
    const ready = this.#ready(expectedRevision);
    if (!ready.ok) return ready;
    const next = this.#definition === null
      ? tryCreateChartDefinition(input, this.#model.limits)
      : tryReplaceChartDefinition(this.#definition, input, this.#model.limits);
    if (!next.ok) return next;
    const capabilities = Object.freeze([...viewCapabilities]);
    let view = this.#snapshot.state.view;
    if (capabilities.length === 0) view = null;
    else if (view === null) {
      const created = tryCreateChartAxisViewState(next.value.axes, capabilities);
      if (!created.ok) return created;
      view = created.value;
    }
    else {
      const reconciled = reconcileChartAxisViewState(view, next.value.axes, capabilities);
      if (!reconciled.ok) return reconciled;
      view = reconciled.value;
    }
    if (next.value === this.#definition && view === this.#snapshot.state.view
      && sameCapabilities(capabilities, this.#viewCapabilities)) return chartOK(this.#snapshot);
    return this.#commitModel(next.value.model, view, next.value, capabilities);
  }

  public applyPatch(
    patch: ChartPatch<ID>,
    expectedRevision: number = this.#snapshot.revision,
  ): ChartResult<RevisionSnapshot<ChartState<ID>>> {
    const ready = this.#ready(expectedRevision);
    if (!ready.ok) return ready;
    const nextModel = tryApplyChartPatch(this.#model, patch);
    if (!nextModel.ok) return nextModel;
    if (nextModel.value === this.#model) return chartOK(this.#snapshot);
    const definition = this.#definition === null ? null : Object.freeze({ ...this.#definition, model: nextModel.value });
    return this.#commitModel(nextModel.value, this.#snapshot.state.view, definition, this.#viewCapabilities);
  }

  public syncControlledValues(values: ChartControlledValues<ID>): ChartResult<RevisionSnapshot<ChartState<ID>>> {
    if (this.#disposed) return disposedController();
    if (values === null || typeof values !== 'object' || !sameControlledShape(values, this.#controlled)) {
      return invalidController('Controlled chart value shape must remain stable for the controller lifetime.');
    }
    const next = reconcileChartState(this.#snapshot.state, this.#model, values);
    if (!next.ok) return next;
    if (next.value === this.#snapshot.state) {
      this.#controlledValues = Object.freeze({ ...values });
      return chartOK(this.#snapshot);
    }
    const projectionViewChanged = next.value.view !== this.#snapshot.state.view;
    const committed = this.#commitState(next.value, []);
    if (committed.ok && projectionViewChanged) this.#projectionCache = null;
    if (committed.ok) this.#controlledValues = Object.freeze({ ...values });
    return committed;
  }

  public dispatch(
    event: ChartEvent<ID>,
    expectedRevision: number = this.#snapshot.revision,
  ): ChartResult<ChartUpdate<ID>> {
    const ready = this.#ready(expectedRevision);
    if (!ready.ok) return ready;
    const reduced = reduceChartEvent(this.#model, this.#snapshot.state, event, this.#controlled);
    if (!reduced.ok) return reduced;
    if (reduced.value.changed) {
      if (this.#snapshot.revision === Number.MAX_SAFE_INTEGER) return revisionExhausted();
      const projectionViewChanged = reduced.value.state.view !== this.#snapshot.state.view;
      this.#snapshot = createRevisionSnapshot(reduced.value.state, this.#snapshot.revision + 1);
      if (projectionViewChanged) this.#projectionCache = null;
    }
    const update = Object.freeze({ snapshot: this.#snapshot, commands: reduced.value.commands });
    this.#emit(reduced.value.commands);
    return chartOK(update);
  }

  public project(input: ChartProjectionInput): ChartResult<ChartProjection<ID>> {
    if (this.#disposed) return disposedController();
    if (input === null || typeof input !== 'object') return invalidController('Chart projection input must be an object.');
    const view = input.view ?? this.#snapshot.state.view ?? undefined;
    const resolved = {
      ...input,
      viewTransform: input.viewTransform ?? IDENTITY_CHART_VIEW_TRANSFORM,
      ...(view === undefined ? {} : { view }),
    };
    const cacheable = input.xScale === undefined && input.yScale === undefined;
    if (cacheable && this.#projectionCache !== null && sameProjectionRequest(this.#projectionCache, this.#model, resolved)) {
      return chartOK(this.#projectionCache.projection);
    }
    const projection = tryCreateChartProjection(this.#definition ?? this.#model, resolved);
    if (cacheable && projection.ok) this.#projectionCache = projectionCache(this.#model, resolved, projection.value);
    return projection;
  }

  public subscribeCommands(listener: (command: ChartCommand<ID>) => void): () => void {
    if (this.#disposed || typeof listener !== 'function') return (): void => undefined;
    this.#listeners.add(listener);
    let active = true;
    return (): void => {
      if (!active) return;
      active = false;
      this.#listeners.delete(listener);
    };
  }

  public dispose(): void {
    if (this.#disposed) return;
    this.#disposed = true;
    this.#listeners.clear();
    this.#projectionCache = null;
  }

  #commitModel(
    model: ChartModelState<ID>,
    view: ChartState<ID>['view'] = this.#snapshot.state.view,
    definition: ChartDefinitionState<ID> | null = this.#definition,
    capabilities: readonly ChartAxisViewCapability<ID>[] = this.#viewCapabilities,
  ): ChartResult<RevisionSnapshot<ChartState<ID>>> {
    if (this.#snapshot.revision === Number.MAX_SAFE_INTEGER) return revisionExhausted();
    const state = reconcileChartState(this.#snapshot.state, model, this.#controlled.view === true
      ? this.#controlledValues
      : { ...this.#controlledValues, view });
    if (!state.ok) return state;
    this.#model = model;
    this.#definition = definition;
    this.#viewCapabilities = capabilities;
    this.#projectionCache = null;
    return this.#commitState(state.value, [Object.freeze({ type: 'render-requested', generation: model.generation })]);
  }

  #commitState(state: ChartState<ID>, commands: readonly ChartCommand<ID>[]): ChartResult<RevisionSnapshot<ChartState<ID>>> {
    if (this.#snapshot.revision === Number.MAX_SAFE_INTEGER) return revisionExhausted();
    this.#snapshot = createRevisionSnapshot(state, this.#snapshot.revision + 1);
    this.#emit(commands);
    return chartOK(this.#snapshot);
  }

  #ready(expectedRevision: number): ChartResult<true> {
    if (this.#disposed) return disposedController();
    if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 0 || expectedRevision !== this.#snapshot.revision) {
      return chartFail('transition-rejection', 'stale-revision', 'Expected Chart revision does not match.', {
        expectedRevision,
        currentRevision: this.#snapshot.revision,
      });
    }
    return chartOK(true);
  }

  #emit(commands: readonly ChartCommand<ID>[]): void {
    for (const command of commands) for (const listener of this.#listeners) listener(command);
  }
}

function sameCapabilities<ID extends StableID>(
  left: readonly ChartAxisViewCapability<ID>[],
  right: readonly ChartAxisViewCapability<ID>[],
): boolean {
  if (left.length !== right.length) return false;
  for (let index = 0; index < left.length; index += 1) {
    const a = left[index]; const b = right[index];
    if (a === undefined || b === undefined || a.axisID !== b.axisID || !sameCapabilityWindow(a.initial, b.initial)
      || a.minimumSpan !== b.minimumSpan || a.maximumSpan !== b.maximumSpan || a.update !== b.update) return false;
  }
  return true;
}

function sameCapabilityWindow(
  left: ChartAxisViewCapability['initial'],
  right: ChartAxisViewCapability['initial'],
): boolean {
  if (left === undefined || right === undefined) return left === right;
  return left.kind === right.kind && (left.kind === 'continuous' && right.kind === 'continuous'
    ? left.minimum === right.minimum && left.maximum === right.maximum
    : left.kind === 'categorical' && right.kind === 'categorical' && left.start === right.start && left.end === right.end);
}

interface ProjectionCache<ID extends StableID> {
  readonly generation: number;
  readonly width: number;
  readonly height: number;
  readonly devicePixelRatio: number | undefined;
  readonly maximumRepresentatives: number | undefined;
  readonly xScale: number;
  readonly xOffset: number;
  readonly yScale: number;
  readonly yOffset: number;
  readonly view: ChartProjectionInput['view'];
  readonly projection: ChartProjection<ID>;
}

function projectionCache<ID extends StableID>(
  model: ChartModelState<ID>, input: ChartProjectionInput, projection: ChartProjection<ID>,
): ProjectionCache<ID> {
  const transform = input.viewTransform!;
  return {
    generation: model.generation,
    width: input.viewport.width,
    height: input.viewport.height,
    devicePixelRatio: input.viewport.devicePixelRatio,
    maximumRepresentatives: input.maximumRepresentatives,
    xScale: transform.xScale,
    xOffset: transform.xOffset,
    yScale: transform.yScale,
    yOffset: transform.yOffset,
    view: input.view,
    projection,
  };
}

function sameProjectionRequest<ID extends StableID>(
  cache: ProjectionCache<ID>, model: ChartModelState<ID>, input: ChartProjectionInput,
): boolean {
  const transform = input.viewTransform!;
  return cache.generation === model.generation
    && cache.width === input.viewport.width && cache.height === input.viewport.height
    && cache.devicePixelRatio === input.viewport.devicePixelRatio
    && cache.maximumRepresentatives === input.maximumRepresentatives
    && cache.xScale === transform.xScale && cache.xOffset === transform.xOffset
    && cache.yScale === transform.yScale && cache.yOffset === transform.yOffset
    && cache.view === input.view;
}

function controlFlags<ID extends StableID>(values: ChartControlledValues<ID>): ChartControlFlags {
  return Object.freeze({
    activeDatum: own(values, 'activeDatum'),
    cursor: own(values, 'cursor'),
    selection: own(values, 'selection'),
    view: own(values, 'view'),
  });
}

function sameControlledShape<ID extends StableID>(values: ChartControlledValues<ID>, flags: ChartControlFlags): boolean {
  return own(values, 'activeDatum') === flags.activeDatum
    && own(values, 'cursor') === flags.cursor
    && own(values, 'selection') === flags.selection
    && own(values, 'view') === flags.view;
}

function own(value: object, key: PropertyKey): boolean { return Object.prototype.hasOwnProperty.call(value, key); }

function invalidController<T>(message: string): ChartResult<T> {
  return chartFail('construction', 'chart-controller-invalid', message);
}

function disposedController<T>(): ChartResult<T> {
  return chartFail('transition-rejection', 'chart-controller-disposed', 'Disposed Chart controller cannot be used.');
}

function revisionExhausted<T>(): ChartResult<T> {
  return chartFail('resource-rejection', 'revision-ceiling-reached', 'Chart revision is exhausted.');
}
