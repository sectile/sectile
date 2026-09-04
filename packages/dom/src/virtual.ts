import type { Result, SectileError, StableID } from '@sectile/core';
import { SectileResultError, unwrap } from '@sectile/core/result';
import type { ExtentUpdate } from '@sectile/virtual/extent-index';
import type {
  VirtualInsets,
  VirtualLayoutMutation,
  VirtualLayoutPlan,
  VirtualLayoutStrategy,
  VirtualPlacement,
  VirtualPoint,
  VirtualRect,
  VirtualScrollAlignment,
} from '@sectile/virtual/layout';
import {
  createVirtualSurfaceFrame,
  surfaceFrameScrollDelta,
  toScrollportPoint,
  toVirtualViewport,
  type VirtualSurfaceFrame,
} from '@sectile/virtual/surface';
import type { VirtualErrorCode } from '@sectile/virtual';

type DOMVirtualResult<T> = Result<T, VirtualErrorCode>;

const ZERO_POINT: VirtualPoint = /* @__PURE__ */ Object.freeze({ x: 0, y: 0 });

export interface VirtualizerEnvironment {
  requestFrame(callback: FrameRequestCallback): number;
  cancelFrame(handle: number): void;
  createResizeObserver(callback: ResizeObserverCallback): ResizeObserver;
}

export interface VirtualMeasurementContext<State, ID extends StableID> {
  readonly element: HTMLElement;
  readonly entry: ResizeObserverEntry;
  readonly placement: VirtualPlacement<ID>;
  readonly state: State;
}

export type VirtualMeasurementResolver<
  State,
  ID extends StableID,
  Measurement,
> = (
  context: VirtualMeasurementContext<State, ID>,
) => Measurement | readonly Measurement[] | null;

export type VirtualViewportReader = (scrollport: HTMLElement) => VirtualRect;
export type VirtualScrollWriter = (
  scrollport: HTMLElement,
  point: VirtualPoint,
) => void;

export interface VirtualizerOptions<
  State,
  ID extends StableID,
  Measurement,
  Mutation,
> {
  readonly scrollport: HTMLElement;
  readonly surface: HTMLElement;
  readonly state: State;
  readonly strategy: VirtualLayoutStrategy<State, ID, Measurement, Mutation>;
  readonly overscan?: number | Partial<VirtualInsets>;
  readonly viewportInsets?: number | Partial<VirtualInsets>;
  readonly measure?: VirtualMeasurementResolver<State, ID, Measurement>;
  readonly readViewport?: VirtualViewportReader;
  readonly writeScroll?: VirtualScrollWriter;
  readonly environment?: VirtualizerEnvironment;
  readonly onPlanChange?: (
    plan: VirtualLayoutPlan<ID>,
    connection: VirtualizerConnection<State, ID, Measurement, Mutation>,
  ) => void;
  readonly onStateChange?: (state: State) => void;
  readonly onError?: (error: SectileError<VirtualErrorCode>) => void;
}

export type VirtualizerPlanChangeHandler<ID extends StableID = StableID> =
  NonNullable<
    VirtualizerOptions<unknown, ID, unknown, unknown>['onPlanChange']
  >;

export type VirtualizerStateChangeHandler<State> = NonNullable<
  VirtualizerOptions<State, StableID, unknown, unknown>['onStateChange']
>;

export type VirtualizerErrorHandler = NonNullable<
  VirtualizerOptions<unknown, StableID, unknown, unknown>['onError']
>;

export interface VirtualizerConnection<
  State,
  ID extends StableID,
  Measurement,
  Mutation,
> {
  getState(): State;
  getPlan(): VirtualLayoutPlan<ID>;
  setState(state: State): DOMVirtualResult<VirtualLayoutPlan<ID>>;
  setOverscan(
    overscan?: number | Partial<VirtualInsets>,
  ): DOMVirtualResult<VirtualLayoutPlan<ID>>;
  setViewportInsets(
    viewportInsets?: number | Partial<VirtualInsets>,
  ): DOMVirtualResult<VirtualLayoutPlan<ID>>;
  registerFrame(element: HTMLElement): () => void;
  registerItem(element: HTMLElement, id: ID): () => void;
  measure(
    measurements: readonly Measurement[],
  ): DOMVirtualResult<VirtualLayoutMutation<State>>;
  mutate(mutation: Mutation): DOMVirtualResult<VirtualLayoutMutation<State>>;
  scrollTo(
    id: ID,
    alignment?: VirtualScrollAlignment,
  ): DOMVirtualResult<VirtualPoint>;
  refresh(): void;
  flush(): DOMVirtualResult<VirtualLayoutPlan<ID>>;
  disconnect(): void;
}

export interface VirtualItemStyleOptions {
  readonly width?: boolean;
  readonly height?: boolean;
}

interface FramePreparation {
  readonly previousFrame: VirtualSurfaceFrame;
  readonly nextFrame: VirtualSurfaceFrame;
  readonly scrollportViewport: VirtualRect;
  readonly frameDirty: boolean;
  readonly viewportDirty: boolean;
}

interface ItemRegistration<ID extends StableID> {
  readonly id: ID;
  readonly element: HTMLElement;
  readonly token: object;
}

export function createVirtualizer<
  State,
  ID extends StableID,
  Measurement,
  Mutation,
>(
  options: VirtualizerOptions<State, ID, Measurement, Mutation>,
): VirtualizerConnection<State, ID, Measurement, Mutation> {
  return new DOMVirtualizer(options);
}

export function createAxisMeasurementResolver<State, ID extends StableID>(
  axis: 'vertical' | 'horizontal',
): VirtualMeasurementResolver<State, ID, ExtentUpdate> {
  return ({ element, placement }): ExtentUpdate => {
    const bounds = element.getBoundingClientRect();
    return Object.freeze({
      index: placement.index,
      extent: Object.freeze({
        kind: 'exact',
        value: axis === 'vertical' ? bounds.height : bounds.width,
      }),
    });
  };
}

export function virtualSurfaceStyle<ID extends StableID>(
  plan: VirtualLayoutPlan<ID>,
): Readonly<Record<string, string>> {
  return Object.freeze({
    position: 'relative',
    width: `${plan.contentSize.width}px`,
    height: `${plan.contentSize.height}px`,
  });
}

export function virtualItemStyle<ID extends StableID>(
  placement: VirtualPlacement<ID>,
  options: VirtualItemStyleOptions = {},
): Readonly<Record<string, string | number>> {
  const style: Record<string, string | number> = {
    position: 'absolute',
    top: '0',
    left: '0',
    transform: `translate3d(${placement.rect.x}px, ${placement.rect.y}px, 0)`,
  };
  if (options.width === true) style['width'] = `${placement.rect.width}px`;
  if (options.height === true) style['height'] = `${placement.rect.height}px`;
  if ('zIndex' in placement && typeof placement['zIndex'] === 'number') {
    style['zIndex'] = placement['zIndex'];
  }
  return Object.freeze(style);
}

class DOMVirtualizer<
  State,
  ID extends StableID,
  Measurement,
  Mutation,
> implements VirtualizerConnection<State, ID, Measurement, Mutation> {
  readonly #scrollport: HTMLElement;
  readonly #surface: HTMLElement;
  readonly #strategy: VirtualLayoutStrategy<State, ID, Measurement, Mutation>;
  readonly #measure:
    VirtualMeasurementResolver<State, ID, Measurement> | undefined;
  readonly #readViewport: VirtualViewportReader;
  readonly #writeScroll: VirtualScrollWriter;
  readonly #environment: VirtualizerEnvironment;
  readonly #onPlanChange:
    | ((
      plan: VirtualLayoutPlan<ID>,
      connection: VirtualizerConnection<State, ID, Measurement, Mutation>,
    ) => void)
    | undefined;
  readonly #onStateChange: ((state: State) => void) | undefined;
  readonly #onError:
    | ((error: SectileError<VirtualErrorCode>) => void)
    | undefined;
  readonly #geometryObserver: ResizeObserver;
  readonly #itemObserver: ResizeObserver;
  readonly #frameRegistrations = new Map<HTMLElement, object>();
  readonly #items = new Map<ID, ItemRegistration<ID>>();
  readonly #itemIDs = new Map<Element, ItemRegistration<ID>>();
  readonly #pendingEntries = new Map<Element, ResizeObserverEntry>();
  readonly #placementByID = new Map<ID, VirtualPlacement<ID>>();
  readonly #handleScroll: () => void;
  #state: State;
  #plan: VirtualLayoutPlan<ID>;
  #overscan: number | Partial<VirtualInsets> | undefined;
  #viewportInsets: VirtualInsets;
  #surfaceFrame: VirtualSurfaceFrame;
  #scheduledFrame: number | null = null;
  #scheduleGeneration = 0;
  #geometryDirty = false;
  #viewportDirty = false;
  #disconnected = false;

  public constructor(
    options: VirtualizerOptions<State, ID, Measurement, Mutation>,
  ) {
    if (options.scrollport === options.surface) {
      throw new TypeError('Virtualizer scrollport and surface must be distinct elements.');
    }
    this.#scrollport = options.scrollport;
    this.#surface = options.surface;
    this.#state = options.state;
    this.#strategy = options.strategy;
    this.#overscan = options.overscan;
    this.#measure = options.measure;
    this.#readViewport = options.readViewport ?? defaultViewport;
    this.#writeScroll = options.writeScroll ?? defaultScrollWriter;
    this.#environment = options.environment
      ?? browserEnvironment(options.scrollport);
    this.#onPlanChange = options.onPlanChange;
    this.#onStateChange = options.onStateChange;
    this.#onError = options.onError;
    this.#viewportInsets = normalizeViewportInsets(options.viewportInsets);
    this.#surfaceFrame = readSurfaceFrame(
      this.#scrollport,
      this.#surface,
      this.#viewportInsets,
    );
    this.#plan = unwrap(this.#query(
      this.#state,
      this.#overscan,
      this.#surfaceFrame,
      this.#readViewport(this.#scrollport),
    ));
    this.#handleScroll = (): void => {
      if (this.#disconnected) return;
      this.#viewportDirty = true;
      this.#schedule();
    };
    const observers = createObserverPair(
      this.#environment,
      (entries): void => {
        if (this.#disconnected) return;
        for (const entry of entries) {
          if (
            entry.target === this.#scrollport
            || entry.target === this.#surface
            || this.#frameRegistrations.has(entry.target as HTMLElement)
          ) {
            this.#invalidateGeometry();
            return;
          }
        }
      },
      (entries): void => {
        if (this.#disconnected) return;
        for (const entry of entries) {
          if (this.#itemIDs.has(entry.target)) {
            this.#pendingEntries.set(entry.target, entry);
          }
        }
        if (this.#pendingEntries.size > 0) this.#schedule();
      },
    );
    this.#geometryObserver = observers.geometry;
    this.#itemObserver = observers.items;
    try {
      this.#scrollport.addEventListener('scroll', this.#handleScroll, {
        passive: true,
      });
      this.#geometryObserver.observe(this.#scrollport);
      this.#geometryObserver.observe(this.#surface);
      this.#indexPlacements(this.#plan);
      this.#onPlanChange?.(this.#plan, this);
    } catch (error) {
      this.disconnect();
      throw error;
    }
  }

  public getState(): State {
    return this.#state;
  }

  public getPlan(): VirtualLayoutPlan<ID> {
    return this.#plan;
  }

  public setState(state: State): DOMVirtualResult<VirtualLayoutPlan<ID>> {
    this.#requireConnected();
    if (
      Object.is(state, this.#state)
      && !this.#geometryDirty
      && !this.#viewportDirty
    ) return { ok: true, value: this.#plan };
    this.#cancelScheduled();
    if (!Object.is(state, this.#state)) this.#pendingEntries.clear();
    const prepared = this.#prepareFrame(this.#viewportInsets);
    if (!prepared.ok) return prepared;
    return this.#finishFrame(prepared.value, {
      state,
      stateChanged: !Object.is(state, this.#state),
      scrollDelta: ZERO_POINT,
      overscan: this.#overscan,
      viewportInsets: this.#viewportInsets,
      forceQuery: true,
    });
  }

  public setOverscan(
    overscan?: number | Partial<VirtualInsets>,
  ): DOMVirtualResult<VirtualLayoutPlan<ID>> {
    this.#requireConnected();
    if (
      sameOverscan(this.#overscan, overscan)
      && !this.#geometryDirty
      && !this.#viewportDirty
    ) return { ok: true, value: this.#plan };
    this.#cancelScheduled();
    const prepared = this.#prepareFrame(this.#viewportInsets);
    if (!prepared.ok) return prepared;
    const measured = this.#resolveMeasurements(this.#state, [], false);
    if (!measured.ok) return this.#failureAs(measured);
    const state = measured.value?.state ?? this.#state;
    const scrollDelta = measured.value?.scrollDelta ?? ZERO_POINT;
    return this.#finishFrame(prepared.value, {
      state,
      stateChanged: !Object.is(state, this.#state),
      scrollDelta,
      overscan,
      viewportInsets: this.#viewportInsets,
      forceQuery: true,
    });
  }

  public setViewportInsets(
    viewportInsets?: number | Partial<VirtualInsets>,
  ): DOMVirtualResult<VirtualLayoutPlan<ID>> {
    this.#requireConnected();
    const normalized = this.#tryVirtual(() =>
      normalizeViewportInsets(viewportInsets));
    if (!normalized.ok) return normalized;
    if (
      sameInsets(this.#viewportInsets, normalized.value)
      && !this.#geometryDirty
      && !this.#viewportDirty
    ) return { ok: true, value: this.#plan };
    this.#cancelScheduled();
    const prepared = this.#prepareFrame(normalized.value);
    if (!prepared.ok) return prepared;
    const measured = this.#resolveMeasurements(this.#state, [], false);
    if (!measured.ok) return this.#failureAs(measured);
    const state = measured.value?.state ?? this.#state;
    const scrollDelta = measured.value?.scrollDelta ?? ZERO_POINT;
    return this.#finishFrame(prepared.value, {
      state,
      stateChanged: !Object.is(state, this.#state),
      scrollDelta,
      overscan: this.#overscan,
      viewportInsets: normalized.value,
      forceQuery: true,
    });
  }

  public registerFrame(element: HTMLElement): () => void {
    this.#requireConnected();
    if (element === this.#scrollport || element === this.#surface) {
      return (): void => {};
    }
    const token = Object.freeze({});
    const hadRegistration = this.#frameRegistrations.has(element);
    if (!hadRegistration) this.#geometryObserver.observe(element);
    this.#frameRegistrations.set(element, token);
    this.#invalidateGeometry();
    return (): void => {
      if (this.#frameRegistrations.get(element) !== token) return;
      this.#frameRegistrations.delete(element);
      if (!this.#disconnected) {
        this.#geometryObserver.unobserve(element);
        this.#invalidateGeometry();
      }
    };
  }

  public registerItem(element: HTMLElement, id: ID): () => void {
    this.#requireConnected();
    const token = Object.freeze({});
    const previousForID = this.#items.get(id);
    const previousForElement = this.#itemIDs.get(element);
    if (
      previousForID !== undefined
      && previousForID.element !== element
    ) this.#removeItemRegistration(previousForID);
    if (
      previousForElement !== undefined
      && previousForElement.id !== id
    ) this.#removeItemRegistration(previousForElement);
    const existing = this.#items.get(id);
    const registration: ItemRegistration<ID> = Object.freeze({
      id,
      element,
      token,
    });
    this.#items.set(id, registration);
    this.#itemIDs.set(element, registration);
    if (this.#measure !== undefined && existing === undefined) {
      this.#itemObserver.observe(element);
    }
    return (): void => {
      if (this.#items.get(id)?.token !== token) return;
      this.#removeItemRegistration(registration);
    };
  }

  public measure(
    measurements: readonly Measurement[],
  ): DOMVirtualResult<VirtualLayoutMutation<State>> {
    this.#requireConnected();
    this.#cancelScheduled();
    const prepared = this.#prepareFrame(this.#viewportInsets);
    if (!prepared.ok) return this.#failureAs(prepared);
    const measured = this.#resolveMeasurements(
      this.#state,
      measurements,
      true,
    );
    if (!measured.ok) return measured;
    if (measured.value === null) {
      throw new TypeError('Explicit measurement must produce a layout result.');
    }
    const finished = this.#finishFrame(prepared.value, {
      state: measured.value.state,
      stateChanged: !Object.is(measured.value.state, this.#state),
      scrollDelta: measured.value.scrollDelta,
      overscan: this.#overscan,
      viewportInsets: this.#viewportInsets,
      forceQuery: false,
    });
    if (!finished.ok) return this.#failureAs(finished);
    return { ok: true, value: measured.value };
  }

  public mutate(
    mutation: Mutation,
  ): DOMVirtualResult<VirtualLayoutMutation<State>> {
    this.#requireConnected();
    this.#cancelScheduled();
    const prepared = this.#prepareFrame(this.#viewportInsets);
    if (!prepared.ok) return this.#failureAs(prepared);
    const measured = this.#resolveMeasurements(this.#state, [], false);
    if (!measured.ok) return this.#failureAs(measured);
    const measuredState = measured.value?.state ?? this.#state;
    const measuredDelta = measured.value?.scrollDelta ?? ZERO_POINT;
    const mutated = this.#strategy.tryMutate(measuredState, {
      mutation,
      anchor: this.#plan.anchor,
    });
    if (!mutated.ok) return this.#report(mutated);
    const combined = this.#tryAddPoints(
      measuredDelta,
      mutated.value.scrollDelta,
    );
    if (!combined.ok) return this.#failureAs(combined);
    const finished = this.#finishFrame(prepared.value, {
      state: mutated.value.state,
      stateChanged: !Object.is(mutated.value.state, this.#state),
      scrollDelta: combined.value,
      overscan: this.#overscan,
      viewportInsets: this.#viewportInsets,
      forceQuery: false,
    });
    if (!finished.ok) return this.#failureAs(finished);
    return mutated;
  }

  public scrollTo(
    id: ID,
    alignment: VirtualScrollAlignment = 'nearest',
  ): DOMVirtualResult<VirtualPoint> {
    this.#requireConnected();
    this.#cancelScheduled();
    const prepared = this.#prepareFrame(this.#viewportInsets);
    if (!prepared.ok) return this.#failureAs(prepared);
    const measured = this.#resolveMeasurements(this.#state, [], false);
    if (!measured.ok) return this.#failureAs(measured);
    const state = measured.value?.state ?? this.#state;
    const viewport = this.#tryVirtual(() =>
      toVirtualViewport(
        prepared.value.scrollportViewport,
        prepared.value.nextFrame,
      ));
    if (!viewport.ok) return viewport;
    const target = this.#strategy.tryScrollTarget(
      state,
      id,
      viewport.value,
      alignment,
    );
    if (!target.ok) return this.#report(target);
    const physicalTarget = this.#tryVirtual(() =>
      toScrollportPoint(target.value, prepared.value.nextFrame));
    if (!physicalTarget.ok) return physicalTarget;
    const written = clampScrollPoint(this.#scrollport, physicalTarget.value);
    this.#writeScroll(this.#scrollport, written);
    const finalViewport = this.#readViewport(this.#scrollport);
    const plan = this.#query(
      state,
      this.#overscan,
      prepared.value.nextFrame,
      finalViewport,
    );
    if (!plan.ok) return this.#failureAs(plan);
    this.#commitFrame(
      state,
      !Object.is(state, this.#state),
      this.#overscan,
      this.#viewportInsets,
      prepared.value.nextFrame,
      plan.value,
    );
    return {
      ok: true,
      value: Object.freeze({
        x: finalViewport.x,
        y: finalViewport.y,
      }),
    };
  }

  public refresh(): void {
    if (this.#disconnected) return;
    this.#invalidateGeometry();
  }

  public flush(): DOMVirtualResult<VirtualLayoutPlan<ID>> {
    this.#requireConnected();
    this.#cancelScheduled();
    return this.#flushFrame(true);
  }

  public disconnect(): void {
    if (this.#disconnected) return;
    this.#disconnected = true;
    this.#cancelScheduled();
    this.#scrollport.removeEventListener('scroll', this.#handleScroll);
    this.#geometryObserver.disconnect();
    this.#itemObserver.disconnect();
    this.#frameRegistrations.clear();
    this.#items.clear();
    this.#itemIDs.clear();
    this.#pendingEntries.clear();
    this.#placementByID.clear();
    this.#geometryDirty = false;
    this.#viewportDirty = false;
  }

  #invalidateGeometry(): void {
    if (this.#disconnected) return;
    this.#geometryDirty = true;
    this.#viewportDirty = true;
    this.#schedule();
  }

  #schedule(): void {
    if (this.#disconnected || this.#scheduledFrame !== null) return;
    const generation = ++this.#scheduleGeneration;
    this.#scheduledFrame = this.#environment.requestFrame((): void => {
      if (
        this.#disconnected
        || generation !== this.#scheduleGeneration
      ) return;
      this.#scheduledFrame = null;
      this.#flushFrame(false);
    });
  }

  #cancelScheduled(): void {
    this.#scheduleGeneration += 1;
    if (this.#scheduledFrame === null) return;
    this.#environment.cancelFrame(this.#scheduledFrame);
    this.#scheduledFrame = null;
  }

  #flushFrame(forceQuery: boolean): DOMVirtualResult<VirtualLayoutPlan<ID>> {
    const prepared = this.#prepareFrame(this.#viewportInsets);
    if (!prepared.ok) return prepared;
    const measured = this.#resolveMeasurements(this.#state, [], false);
    if (!measured.ok) return this.#failureAs(measured);
    const state = measured.value?.state ?? this.#state;
    const scrollDelta = measured.value?.scrollDelta ?? ZERO_POINT;
    return this.#finishFrame(prepared.value, {
      state,
      stateChanged: !Object.is(state, this.#state),
      scrollDelta,
      overscan: this.#overscan,
      viewportInsets: this.#viewportInsets,
      forceQuery,
    });
  }

  #prepareFrame(
    viewportInsets: VirtualInsets,
  ): DOMVirtualResult<FramePreparation> {
    return this.#tryVirtual(() => {
      const frameDirty = this.#geometryDirty;
      const viewportDirty = this.#viewportDirty;
      const nextFrame = frameDirty
        ? readSurfaceFrame(
            this.#scrollport,
            this.#surface,
            viewportInsets,
          )
        : sameInsets(this.#viewportInsets, viewportInsets)
          ? this.#surfaceFrame
          : createVirtualSurfaceFrame({
              origin: this.#surfaceFrame.origin,
              viewportInsets,
            });
      return Object.freeze({
        previousFrame: this.#surfaceFrame,
        nextFrame,
        scrollportViewport: this.#readViewport(this.#scrollport),
        frameDirty,
        viewportDirty,
      });
    });
  }

  #resolveMeasurements(
    state: State,
    explicit: readonly Measurement[],
    forceCall: boolean,
  ): DOMVirtualResult<VirtualLayoutMutation<State> | null> {
    const entries = [...this.#pendingEntries.values()];
    this.#pendingEntries.clear();
    let measurements: readonly Measurement[] = explicit;
    if (this.#measure !== undefined && entries.length > 0) {
      const resolved: Measurement[] = [...explicit];
      for (const entry of entries) {
        const registration = this.#itemIDs.get(entry.target);
        if (registration === undefined) continue;
        const current = this.#items.get(registration.id);
        const placement = this.#placementByID.get(registration.id);
        if (
          current?.token !== registration.token
          || placement === undefined
        ) continue;
        const value = this.#measure({
          element: registration.element,
          entry,
          placement,
          state,
        });
        if (value === null) continue;
        if (Array.isArray(value)) {
          resolved.push(...(value as readonly Measurement[]));
        } else {
          resolved.push(value as Measurement);
        }
      }
      measurements = resolved;
    }
    if (measurements.length === 0 && !forceCall) {
      return { ok: true, value: null };
    }
    const measured = this.#strategy.tryMeasure(state, {
      generation: this.#plan.generation,
      measurements,
      anchor: this.#plan.anchor,
    });
    return measured.ok ? measured : this.#report(measured);
  }

  #finishFrame(
    prepared: FramePreparation,
    input: Readonly<{
      state: State;
      stateChanged: boolean;
      scrollDelta: VirtualPoint;
      overscan: number | Partial<VirtualInsets> | undefined;
      viewportInsets: VirtualInsets;
      forceQuery: boolean;
    }>,
  ): DOMVirtualResult<VirtualLayoutPlan<ID>> {
    const frameDelta = this.#plan.anchor === null
      ? { ok: true as const, value: ZERO_POINT }
      : this.#tryVirtual(() => surfaceFrameScrollDelta(
          prepared.previousFrame,
          prepared.nextFrame,
        ));
    if (!frameDelta.ok) return frameDelta;
    const combined = this.#tryAddPoints(
      input.scrollDelta,
      frameDelta.value,
    );
    if (!combined.ok) return combined;
    let finalScrollportViewport = prepared.scrollportViewport;
    const scrollChanged = !isZeroPoint(combined.value);
    if (scrollChanged) {
      const target = this.#tryAddPoints(
        Object.freeze({
          x: prepared.scrollportViewport.x,
          y: prepared.scrollportViewport.y,
        }),
        combined.value,
      );
      if (!target.ok) return target;
      this.#writeScroll(
        this.#scrollport,
        clampScrollPoint(this.#scrollport, target.value),
      );
      finalScrollportViewport = this.#readViewport(this.#scrollport);
    }
    const viewport = this.#tryVirtual(() =>
      toVirtualViewport(finalScrollportViewport, prepared.nextFrame));
    if (!viewport.ok) return viewport;
    const shouldQuery = input.forceQuery
      || input.stateChanged
      || scrollChanged
      || prepared.frameDirty
      || prepared.viewportDirty
      || !sameOverscan(this.#overscan, input.overscan)
      || !sameInsets(this.#viewportInsets, input.viewportInsets)
      || !sameRect(this.#plan.viewport, viewport.value);
    if (!shouldQuery) {
      this.#geometryDirty = false;
      this.#viewportDirty = false;
      return { ok: true, value: this.#plan };
    }
    const plan = this.#strategy.tryQuery(input.state, {
      viewport: viewport.value,
      ...(input.overscan === undefined ? {} : { overscan: input.overscan }),
    });
    if (!plan.ok) return this.#report(plan);
    this.#commitFrame(
      input.state,
      input.stateChanged,
      input.overscan,
      input.viewportInsets,
      prepared.nextFrame,
      plan.value,
    );
    return plan;
  }

  #commitFrame(
    state: State,
    stateChanged: boolean,
    overscan: number | Partial<VirtualInsets> | undefined,
    viewportInsets: VirtualInsets,
    surfaceFrame: VirtualSurfaceFrame,
    plan: VirtualLayoutPlan<ID>,
  ): void {
    this.#state = state;
    this.#overscan = overscan;
    this.#viewportInsets = viewportInsets;
    this.#surfaceFrame = surfaceFrame;
    this.#geometryDirty = false;
    this.#viewportDirty = false;
    if (stateChanged) this.#onStateChange?.(state);
    this.#publish(plan);
  }

  #query(
    state: State,
    overscan: number | Partial<VirtualInsets> | undefined,
    frame: VirtualSurfaceFrame,
    scrollportViewport: VirtualRect,
  ): DOMVirtualResult<VirtualLayoutPlan<ID>> {
    const viewport = this.#tryVirtual(() =>
      toVirtualViewport(scrollportViewport, frame));
    if (!viewport.ok) return viewport;
    const plan = this.#strategy.tryQuery(state, {
      viewport: viewport.value,
      ...(overscan === undefined ? {} : { overscan }),
    });
    return plan.ok ? plan : this.#report(plan);
  }

  #publish(plan: VirtualLayoutPlan<ID>): void {
    this.#plan = plan;
    this.#indexPlacements(plan);
    this.#onPlanChange?.(plan, this);
  }

  #indexPlacements(plan: VirtualLayoutPlan<ID>): void {
    this.#placementByID.clear();
    for (const placement of plan.placements) {
      this.#placementByID.set(placement.id, placement);
    }
  }

  #removeItemRegistration(registration: ItemRegistration<ID>): void {
    if (this.#items.get(registration.id)?.token === registration.token) {
      this.#items.delete(registration.id);
    }
    if (this.#itemIDs.get(registration.element)?.token === registration.token) {
      this.#itemIDs.delete(registration.element);
    }
    this.#pendingEntries.delete(registration.element);
    if (!this.#disconnected && this.#measure !== undefined) {
      this.#itemObserver.unobserve(registration.element);
    }
  }

  #tryAddPoints(
    left: VirtualPoint,
    right: VirtualPoint,
  ): DOMVirtualResult<VirtualPoint> {
    const x = left.x + right.x;
    const y = left.y + right.y;
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      return this.#report({
        ok: false,
        error: {
          class: 'construction',
          code: 'virtual-layout-geometry-invalid',
          message: 'Virtualizer scroll corrections must remain finite.',
          details: { left, right },
        },
      });
    }
    return { ok: true, value: Object.freeze({ x, y }) };
  }

  #tryVirtual<T>(operation: () => T): DOMVirtualResult<T> {
    try {
      return { ok: true, value: operation() };
    } catch (error) {
      if (!(error instanceof SectileResultError)) throw error;
      const failure: SectileError<VirtualErrorCode> = {
        class: error.class,
        code: error.code as VirtualErrorCode,
        message: error.message,
        ...(error.details === undefined ? {} : { details: error.details }),
      };
      return this.#report({ ok: false, error: failure });
    }
  }

  #failureAs<T>(result: DOMVirtualResult<unknown>): DOMVirtualResult<T> {
    if (result.ok) {
      throw new TypeError('Expected a failed virtualizer result.');
    }
    return { ok: false, error: result.error };
  }

  #report<T>(result: DOMVirtualResult<T>): DOMVirtualResult<T> {
    if (!result.ok) this.#onError?.(result.error);
    return result;
  }

  #requireConnected(): void {
    if (this.#disconnected) {
      throw new TypeError('Virtualizer connection is disconnected.');
    }
  }
}

function normalizeViewportInsets(
  viewportInsets: number | Partial<VirtualInsets> | undefined,
): VirtualInsets {
  return createVirtualSurfaceFrame({
    ...(viewportInsets === undefined ? {} : { viewportInsets }),
  }).viewportInsets;
}

function readSurfaceFrame(
  scrollport: HTMLElement,
  surface: HTMLElement,
  viewportInsets: VirtualInsets,
): VirtualSurfaceFrame {
  const scrollportRect = scrollport.getBoundingClientRect();
  const surfaceRect = surface.getBoundingClientRect();
  const clientLeft = finiteNonNegative(scrollport.clientLeft)
    ? scrollport.clientLeft
    : 0;
  const clientTop = finiteNonNegative(scrollport.clientTop)
    ? scrollport.clientTop
    : 0;
  return createVirtualSurfaceFrame({
    origin: {
      x: surfaceRect.left
        - scrollportRect.left
        - clientLeft
        + finiteOrZero(scrollport.scrollLeft),
      y: surfaceRect.top
        - scrollportRect.top
        - clientTop
        + finiteOrZero(scrollport.scrollTop),
    },
    viewportInsets,
  });
}

function defaultViewport(scrollport: HTMLElement): VirtualRect {
  return Object.freeze({
    x: Math.max(0, scrollport.scrollLeft),
    y: Math.max(0, scrollport.scrollTop),
    width: Math.max(0, scrollport.clientWidth),
    height: Math.max(0, scrollport.clientHeight),
  });
}

function defaultScrollWriter(
  scrollport: HTMLElement,
  point: VirtualPoint,
): void {
  scrollport.scrollTo({
    left: point.x,
    top: point.y,
    behavior: 'auto',
  });
}

function clampScrollPoint(
  scrollport: HTMLElement,
  point: VirtualPoint,
): VirtualPoint {
  const maxX = finiteNonNegative(scrollport.scrollWidth)
    && finiteNonNegative(scrollport.clientWidth)
    ? Math.max(0, scrollport.scrollWidth - scrollport.clientWidth)
    : null;
  const maxY = finiteNonNegative(scrollport.scrollHeight)
    && finiteNonNegative(scrollport.clientHeight)
    ? Math.max(0, scrollport.scrollHeight - scrollport.clientHeight)
    : null;
  const x = maxX === null
    ? Math.max(0, point.x)
    : Math.min(Math.max(0, point.x), maxX);
  const y = maxY === null
    ? Math.max(0, point.y)
    : Math.min(Math.max(0, point.y), maxY);
  return Object.freeze({ x, y });
}

function sameRect(left: VirtualRect, right: VirtualRect): boolean {
  return left.x === right.x
    && left.y === right.y
    && left.width === right.width
    && left.height === right.height;
}

function sameInsets(left: VirtualInsets, right: VirtualInsets): boolean {
  return left.top === right.top
    && left.right === right.right
    && left.bottom === right.bottom
    && left.left === right.left;
}

function sameOverscan(
  left: number | Partial<VirtualInsets> | undefined,
  right: number | Partial<VirtualInsets> | undefined,
): boolean {
  if (Object.is(left, right)) return true;
  return overscanSide(left, 'top') === overscanSide(right, 'top')
    && overscanSide(left, 'right') === overscanSide(right, 'right')
    && overscanSide(left, 'bottom') === overscanSide(right, 'bottom')
    && overscanSide(left, 'left') === overscanSide(right, 'left');
}

function overscanSide(
  overscan: number | Partial<VirtualInsets> | undefined,
  side: keyof VirtualInsets,
): number {
  if (typeof overscan === 'number') return overscan;
  return overscan?.[side] ?? 0;
}

function isZeroPoint(point: VirtualPoint): boolean {
  return point.x === 0 && point.y === 0;
}

function finiteNonNegative(value: unknown): value is number {
  return typeof value === 'number'
    && Number.isFinite(value)
    && value >= 0;
}

function finiteOrZero(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function createObserverPair(
  environment: VirtualizerEnvironment,
  geometryCallback: ResizeObserverCallback,
  itemCallback: ResizeObserverCallback,
): Readonly<{
  geometry: ResizeObserver;
  items: ResizeObserver;
}> {
  const geometry = environment.createResizeObserver(geometryCallback);
  try {
    return Object.freeze({
      geometry,
      items: environment.createResizeObserver(itemCallback),
    });
  } catch (error) {
    geometry.disconnect();
    throw error;
  }
}

function browserEnvironment(scrollport: HTMLElement): VirtualizerEnvironment {
  const view = scrollport.ownerDocument.defaultView;
  if (view === null || typeof view.ResizeObserver !== 'function') {
    throw new TypeError(
      'Virtualizer requires a browser window with ResizeObserver support.',
    );
  }
  return Object.freeze({
    requestFrame: (callback: FrameRequestCallback): number =>
      view.requestAnimationFrame(callback),
    cancelFrame: (handle: number): void => {
      view.cancelAnimationFrame(handle);
    },
    createResizeObserver: (callback: ResizeObserverCallback): ResizeObserver =>
      new view.ResizeObserver(callback),
  });
}

export type {
  ExtentUpdate,
  VirtualInsets,
  VirtualLayoutMutation,
  VirtualLayoutPlan,
  VirtualLayoutStrategy,
  VirtualPlacement,
  VirtualPoint,
  VirtualRect,
  VirtualScrollAlignment,
  VirtualSurfaceFrame,
};
