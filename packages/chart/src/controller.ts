import type { StableID } from '@sectile/core';
import { unwrap } from '@sectile/core/result';
import { createRevisionSnapshot, type RevisionSnapshot } from '@sectile/core/revision';
import { chartFail, chartOK } from './internal/result.js';
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

export interface ChartControllerOptions<ID extends StableID = StableID> {
  readonly model: ChartModel<ID>;
  readonly limits?: ChartLimits;
  readonly initialValues?: ChartControlledValues<ID>;
  readonly controlled?: ChartControlledValues<ID>;
}

export interface ChartUpdate<ID extends StableID = StableID> {
  readonly snapshot: RevisionSnapshot<ChartState<ID>>;
  readonly commands: readonly ChartCommand<ID>[];
}

export interface ChartController<ID extends StableID = StableID> {
  getModel(): ChartModelState<ID>;
  getSnapshot(): RevisionSnapshot<ChartState<ID>>;
  replaceModel(model: ChartModel<ID>, expectedRevision?: number): ChartResult<RevisionSnapshot<ChartState<ID>>>;
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
  const model = tryCreateChartModel(options.model, options.limits);
  if (!model.ok) return model;
  const controlledValues = options.controlled ?? {};
  const state = tryCreateChartState(model.value, { ...(options.initialValues ?? {}), ...controlledValues });
  if (!state.ok) return state;
  return chartOK(new ImmutableChartController(
    model.value,
    createRevisionSnapshot(state.value),
    controlFlags(controlledValues),
    Object.freeze({ ...controlledValues }),
  ));
}

class ImmutableChartController<ID extends StableID> implements ChartController<ID> {
  #model: ChartModelState<ID>;
  #snapshot: RevisionSnapshot<ChartState<ID>>;
  readonly #controlled: ChartControlFlags;
  #controlledValues: ChartControlledValues<ID>;
  readonly #listeners = new Set<(command: ChartCommand<ID>) => void>();
  #projectionCache: ProjectionCache<ID> | null = null;
  #disposed = false;

  public constructor(
    model: ChartModelState<ID>,
    snapshot: RevisionSnapshot<ChartState<ID>>,
    controlled: ChartControlFlags,
    controlledValues: ChartControlledValues<ID>,
  ) {
    this.#model = model;
    this.#snapshot = snapshot;
    this.#controlled = controlled;
    this.#controlledValues = controlledValues;
  }

  public getModel(): ChartModelState<ID> { return this.#model; }
  public getSnapshot(): RevisionSnapshot<ChartState<ID>> { return this.#snapshot; }

  public replaceModel(
    input: ChartModel<ID>,
    expectedRevision: number = this.#snapshot.revision,
  ): ChartResult<RevisionSnapshot<ChartState<ID>>> {
    const ready = this.#ready(expectedRevision);
    if (!ready.ok) return ready;
    const nextModel = tryReplaceChartModel(this.#model, input);
    if (!nextModel.ok) return nextModel;
    if (nextModel.value === this.#model) return chartOK(this.#snapshot);
    return this.#commitModel(nextModel.value);
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
    return this.#commitModel(nextModel.value);
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
    const transformChanged = next.value.viewTransform !== this.#snapshot.state.viewTransform;
    const committed = this.#commitState(next.value, []);
    if (committed.ok && transformChanged) this.#projectionCache = null;
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
      const transformChanged = reduced.value.state.viewTransform !== this.#snapshot.state.viewTransform;
      this.#snapshot = createRevisionSnapshot(reduced.value.state, this.#snapshot.revision + 1);
      if (transformChanged) this.#projectionCache = null;
    }
    const update = Object.freeze({ snapshot: this.#snapshot, commands: reduced.value.commands });
    this.#emit(reduced.value.commands);
    return chartOK(update);
  }

  public project(input: ChartProjectionInput): ChartResult<ChartProjection<ID>> {
    if (this.#disposed) return disposedController();
    if (input === null || typeof input !== 'object') return invalidController('Chart projection input must be an object.');
    const resolved = {
      ...input,
      viewTransform: input.viewTransform ?? this.#snapshot.state.viewTransform,
    };
    const cacheable = input.xScale === undefined && input.yScale === undefined;
    if (cacheable && this.#projectionCache !== null && sameProjectionRequest(this.#projectionCache, this.#model, resolved)) {
      return chartOK(this.#projectionCache.projection);
    }
    const projection = tryCreateChartProjection(this.#model, resolved);
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

  #commitModel(model: ChartModelState<ID>): ChartResult<RevisionSnapshot<ChartState<ID>>> {
    if (this.#snapshot.revision === Number.MAX_SAFE_INTEGER) return revisionExhausted();
    const state = reconcileChartState(this.#snapshot.state, model, this.#controlledValues);
    if (!state.ok) return state;
    this.#model = model;
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
    && cache.yScale === transform.yScale && cache.yOffset === transform.yOffset;
}

function controlFlags<ID extends StableID>(values: ChartControlledValues<ID>): ChartControlFlags {
  return Object.freeze({
    activeDatum: own(values, 'activeDatum'),
    cursor: own(values, 'cursor'),
    selection: own(values, 'selection'),
    viewTransform: own(values, 'viewTransform'),
  });
}

function sameControlledShape<ID extends StableID>(values: ChartControlledValues<ID>, flags: ChartControlFlags): boolean {
  return own(values, 'activeDatum') === flags.activeDatum
    && own(values, 'cursor') === flags.cursor
    && own(values, 'selection') === flags.selection
    && own(values, 'viewTransform') === flags.viewTransform;
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
