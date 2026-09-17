import type {
  VirtualPoint,
  VirtualRect,
  VirtualLayoutStrategy,
  VirtualLayoutPlan,
  VirtualPlacement,
  VirtualInsets,
  VirtualLayoutMutation,
  VirtualScrollAlignment,
} from '@sectile/virtual/layout';
import type { VirtualSurfaceFrame } from '@sectile/virtual/surface';
import type { StableID, SectileError } from '@sectile/core';
import type {
  VirtualizerOptions,
  VirtualizerConnection,
  VirtualMeasurementResolver,
  VirtualViewportReader,
  VirtualScrollWriter,
  VirtualizerEnvironment,
  DOMVirtualResult,
} from './contracts.js';
import type { VirtualScrollHost } from './scroll-host.js';
import type { VirtualErrorCode } from '@sectile/virtual';
import {
  createScrollHost,
  browserEnvironment,
  readHostSurfaceFrame,
  requireOwned,
  clampHostScroll,
} from './scroll-host.js';
import { normalizeViewportInsets, sameOverscan, sameInsets, sameRect } from './viewport.js';
import { unwrap, SectileResultError } from '@sectile/core/result';
import {
  toVirtualViewport,
  toScrollportPoint,
  createVirtualSurfaceFrame,
  surfaceFrameScrollDelta,
} from '@sectile/virtual/surface';

const ZERO_POINT: VirtualPoint = /* @__PURE__ */ Object.freeze({ x: 0, y: 0 });

type FramePreparation = readonly [
  previousFrame: VirtualSurfaceFrame,
  nextFrame: VirtualSurfaceFrame,
  scrollportViewport: VirtualRect,
  dirty: boolean,
];

type ItemRegistration<ID extends StableID> = readonly [
  id: ID,
  element: HTMLElement,
  token: object,
];

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

class DOMVirtualizer<
  State,
  ID extends StableID,
  Measurement,
  Mutation,
> implements VirtualizerConnection<State, ID, Measurement, Mutation> {
  readonly #host: VirtualScrollHost;
  readonly #strategy: VirtualLayoutStrategy<State, ID, Measurement, Mutation>;
  readonly #measure:
    VirtualMeasurementResolver<State, ID, Measurement> | undefined;
  readonly #readViewport: VirtualViewportReader | undefined;
  readonly #writeScroll: VirtualScrollWriter | undefined;
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
  readonly #handleResize: () => void;
  #state: State;
  #plan: VirtualLayoutPlan<ID>;
  #overscan: number | Partial<VirtualInsets> | undefined;
  #viewportInsets: VirtualInsets;
  #surfaceFrame: VirtualSurfaceFrame;
  #scheduledFrame: number | null = null;
  #scheduleGeneration = 0;
  #dirty = 0;
  #disconnected = false;

  public constructor(
    options: VirtualizerOptions<State, ID, Measurement, Mutation>,
  ) {
    const host = createScrollHost(options.scrollport, options.surface);
    this.#host = host;
    this.#state = options.state;
    this.#strategy = options.strategy;
    this.#overscan = options.overscan;
    this.#measure = options.measure;
    this.#readViewport = options.readViewport;
    this.#writeScroll = options.writeScroll;
    this.#environment = options.environment
      ?? browserEnvironment(host[0]);
    this.#onPlanChange = options.onPlanChange;
    this.#onStateChange = options.onStateChange;
    this.#onError = options.onError;
    this.#viewportInsets = normalizeViewportInsets(options.viewportInsets);
    this.#surfaceFrame = readHostSurfaceFrame(host, this.#viewportInsets);
    this.#plan = unwrap(this.#query(
      this.#state,
      this.#overscan,
      this.#surfaceFrame,
      this.#readPhysicalViewport(),
    ));
    this.#handleScroll = (): void => {
      if (this.#disconnected) return;
      this.#dirty |= 1;
      this.#schedule();
    };
    this.#handleResize = this.#invalidateGeometry.bind(this);
    const geometryObserver = this.#environment.createResizeObserver((entries): void => {
      if (this.#disconnected) return;
      for (const entry of entries) {
        if (
          entry.target === this.#host[2]
          || entry.target === this.#host[6]
          || this.#frameRegistrations.has(entry.target as HTMLElement)
        ) {
          this.#invalidateGeometry();
          return;
        }
      }
    });
    this.#geometryObserver = geometryObserver;
    try {
      this.#itemObserver = this.#environment.createResizeObserver((entries): void => {
        if (this.#disconnected) return;
        for (const entry of entries) {
          if (this.#itemIDs.has(entry.target)) {
            this.#pendingEntries.set(entry.target, entry);
          }
        }
        if (this.#pendingEntries.size > 0) this.#schedule();
      });
    } catch (error) {
      geometryObserver.disconnect();
      throw error;
    }
    try {
      this.#host[1].addEventListener('scroll', this.#handleScroll, {
        passive: true,
      });
      this.#host[3]?.addEventListener('resize', this.#handleResize);
      if (this.#host[2] !== null) {
        this.#geometryObserver.observe(this.#host[2]);
      }
      this.#geometryObserver.observe(this.#host[6]);
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
      && this.#dirty === 0
    ) return { ok: true, value: this.#plan };
    this.#cancelScheduled();
    if (!Object.is(state, this.#state)) this.#pendingEntries.clear();
    const prepared = this.#prepareFrame(this.#viewportInsets);
    if (!prepared.ok) return prepared;
    return this.#finishFrame(
      prepared.value,
      state,
      !Object.is(state, this.#state),
      ZERO_POINT,
      this.#overscan,
      this.#viewportInsets,
      true,
    );
  }

  public setOverscan(
    overscan?: number | Partial<VirtualInsets>,
  ): DOMVirtualResult<VirtualLayoutPlan<ID>> {
    this.#requireConnected();
    if (
      sameOverscan(this.#overscan, overscan)
      && this.#dirty === 0
    ) return { ok: true, value: this.#plan };
    this.#cancelScheduled();
    const prepared = this.#prepareFrame(this.#viewportInsets);
    if (!prepared.ok) return prepared;
    const measured = this.#resolveMeasurements(this.#state, [], false);
    if (!measured.ok) return measured;
    const state = measured.value?.state ?? this.#state;
    const scrollDelta = measured.value?.scrollDelta ?? ZERO_POINT;
    return this.#finishFrame(
      prepared.value,
      state,
      !Object.is(state, this.#state),
      scrollDelta,
      overscan,
      this.#viewportInsets,
      true,
    );
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
      && this.#dirty === 0
    ) return { ok: true, value: this.#plan };
    this.#cancelScheduled();
    const prepared = this.#prepareFrame(normalized.value);
    if (!prepared.ok) return prepared;
    const measured = this.#resolveMeasurements(this.#state, [], false);
    if (!measured.ok) return measured;
    const state = measured.value?.state ?? this.#state;
    const scrollDelta = measured.value?.scrollDelta ?? ZERO_POINT;
    return this.#finishFrame(
      prepared.value,
      state,
      !Object.is(state, this.#state),
      scrollDelta,
      this.#overscan,
      normalized.value,
      true,
    );
  }

  public registerFrame(element: HTMLElement): () => void {
    this.#requireConnected();
    requireOwned(element, this.#host[0]);
    if (element === this.#host[2] || element === this.#host[6]) {
      return (): void => {};
    }
    const token = {};
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
    requireOwned(element, this.#host[0]);
    const token = {};
    const previousForID = this.#items.get(id);
    const previousForElement = this.#itemIDs.get(element);
    if (
      previousForID !== undefined
      && previousForID[1] !== element
    ) this.#removeItemRegistration(previousForID);
    if (
      previousForElement !== undefined
      && previousForElement[0] !== id
    ) this.#removeItemRegistration(previousForElement);
    const existing = this.#items.get(id);
    const registration: ItemRegistration<ID> = [id, element, token];
    this.#items.set(id, registration);
    this.#itemIDs.set(element, registration);
    if (this.#measure !== undefined && existing === undefined) {
      this.#itemObserver.observe(element);
    }
    return (): void => {
      if (this.#items.get(id)?.[2] !== token) return;
      this.#removeItemRegistration(registration);
    };
  }

  public measure(
    measurements: readonly Measurement[],
  ): DOMVirtualResult<VirtualLayoutMutation<State>> {
    this.#requireConnected();
    this.#cancelScheduled();
    const prepared = this.#prepareFrame(this.#viewportInsets);
    if (!prepared.ok) return prepared;
    const measured = this.#resolveMeasurements(
      this.#state,
      measurements,
      true,
    );
    if (!measured.ok) return measured;
    if (measured.value === null) {
      throw new TypeError('measurement result');
    }
    const finished = this.#finishFrame(
      prepared.value,
      measured.value.state,
      !Object.is(measured.value.state, this.#state),
      measured.value.scrollDelta,
      this.#overscan,
      this.#viewportInsets,
      false,
    );
    if (!finished.ok) return finished;
    return { ok: true, value: measured.value };
  }

  public mutate(
    mutation: Mutation,
  ): DOMVirtualResult<VirtualLayoutMutation<State>> {
    this.#requireConnected();
    this.#cancelScheduled();
    const prepared = this.#prepareFrame(this.#viewportInsets);
    if (!prepared.ok) return prepared;
    const measured = this.#resolveMeasurements(this.#state, [], false);
    if (!measured.ok) return measured;
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
    if (!combined.ok) return combined;
    const finished = this.#finishFrame(
      prepared.value,
      mutated.value.state,
      !Object.is(mutated.value.state, this.#state),
      combined.value,
      this.#overscan,
      this.#viewportInsets,
      false,
    );
    if (!finished.ok) return finished;
    return mutated;
  }

  public scrollTo(
    id: ID,
    alignment: VirtualScrollAlignment = 'nearest',
  ): DOMVirtualResult<VirtualPoint> {
    this.#requireConnected();
    this.#cancelScheduled();
    const prepared = this.#prepareFrame(this.#viewportInsets);
    if (!prepared.ok) return prepared;
    const measured = this.#resolveMeasurements(this.#state, [], false);
    if (!measured.ok) return measured;
    const state = measured.value?.state ?? this.#state;
    const viewport = this.#tryVirtual(() =>
      toVirtualViewport(prepared.value[2], prepared.value[1]));
    if (!viewport.ok) return viewport;
    const target = this.#strategy.tryScrollTarget(
      state,
      id,
      viewport.value,
      alignment,
    );
    if (!target.ok) return this.#report(target);
    const physicalTarget = this.#tryVirtual(() =>
      toScrollportPoint(target.value, prepared.value[1]));
    if (!physicalTarget.ok) return physicalTarget;
    const scrolled = this.#queryAfterScroll(
      state,
      this.#overscan,
      prepared.value[1],
      prepared.value[2],
      physicalTarget.value,
    );
    if (!scrolled.ok) return scrolled;
    const [plan, finalViewport] = scrolled.value;
    this.#commitFrame(
      state,
      !Object.is(state, this.#state),
      this.#overscan,
      this.#viewportInsets,
      prepared.value[1],
      plan,
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
    this.#host[1].removeEventListener('scroll', this.#handleScroll);
    this.#host[3]?.removeEventListener('resize', this.#handleResize);
    this.#geometryObserver.disconnect();
    this.#itemObserver.disconnect();
    this.#frameRegistrations.clear();
    this.#items.clear();
    this.#itemIDs.clear();
    this.#pendingEntries.clear();
    this.#placementByID.clear();
    this.#dirty = 0;
  }

  #readPhysicalViewport(): VirtualRect {
    const readViewport = this.#readViewport;
    if (readViewport !== undefined) return readViewport(this.#host[1]);
    const scroll = this.#host[4];
    const viewport = this.#host[5];
    return {
      x: Math.max(0, scroll.scrollLeft),
      y: Math.max(0, scroll.scrollTop),
      width: Math.max(0, viewport.clientWidth),
      height: Math.max(0, viewport.clientHeight),
    };
  }

  #writePhysicalScroll(point: VirtualPoint): void {
    const writeScroll = this.#writeScroll;
    if (writeScroll !== undefined) return writeScroll(this.#host[1], point);
    (this.#host[3] ?? this.#host[2])!.scrollTo({
      left: point.x,
      top: point.y,
      behavior: this.#host[3] === null ? 'auto' : 'instant',
    });
  }

  #invalidateGeometry(): void {
    if (this.#disconnected) return;
    this.#dirty = 3;
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
    if (!measured.ok) return measured;
    const state = measured.value?.state ?? this.#state;
    const scrollDelta = measured.value?.scrollDelta ?? ZERO_POINT;
    return this.#finishFrame(
      prepared.value,
      state,
      !Object.is(state, this.#state),
      scrollDelta,
      this.#overscan,
      this.#viewportInsets,
      forceQuery,
    );
  }

  #prepareFrame(
    viewportInsets: VirtualInsets,
  ): DOMVirtualResult<FramePreparation> {
    return this.#tryVirtual(() => {
      const frameDirty = (this.#dirty & 2) !== 0;
      const nextFrame = frameDirty
        ? readHostSurfaceFrame(this.#host, viewportInsets)
        : sameInsets(this.#viewportInsets, viewportInsets)
          ? this.#surfaceFrame
          : createVirtualSurfaceFrame({
              origin: this.#surfaceFrame.origin,
              viewportInsets,
            });
      return [
        this.#surfaceFrame,
        nextFrame,
        this.#readPhysicalViewport(),
        this.#dirty !== 0,
      ] as const;
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
        const current = this.#items.get(registration[0]);
        const placement = this.#placementByID.get(registration[0]);
        if (
          current?.[2] !== registration[2]
          || placement === undefined
        ) continue;
        const value = this.#measure({
          element: registration[1],
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
    state: State,
    stateChanged: boolean,
    scrollDelta: VirtualPoint,
    overscan: number | Partial<VirtualInsets> | undefined,
    viewportInsets: VirtualInsets,
    forceQuery: boolean,
  ): DOMVirtualResult<VirtualLayoutPlan<ID>> {
    const frameDelta = this.#plan.anchor === null
      ? { ok: true as const, value: ZERO_POINT }
      : this.#tryVirtual(() => surfaceFrameScrollDelta(prepared[0], prepared[1]));
    if (!frameDelta.ok) return frameDelta;
    const combined = this.#tryAddPoints(scrollDelta, frameDelta.value);
    if (!combined.ok) return combined;
    let plan: DOMVirtualResult<VirtualLayoutPlan<ID>>;
    if (combined.value.x !== 0 || combined.value.y !== 0) {
      const target = this.#tryAddPoints(
        { x: prepared[2].x, y: prepared[2].y },
        combined.value,
      );
      if (!target.ok) return target;
      const scrolled = this.#queryAfterScroll(
        state,
        overscan,
        prepared[1],
        prepared[2],
        target.value,
      );
      if (!scrolled.ok) return scrolled;
      plan = { ok: true, value: scrolled.value[0] };
    } else {
      const viewport = this.#tryVirtual(() =>
        toVirtualViewport(prepared[2], prepared[1]));
      if (!viewport.ok) return viewport;
      const shouldQuery = forceQuery
        || stateChanged
        || prepared[3]
        || !sameOverscan(this.#overscan, overscan)
        || !sameInsets(this.#viewportInsets, viewportInsets)
        || !sameRect(this.#plan.viewport, viewport.value);
      if (!shouldQuery) {
        this.#dirty = 0;
        return { ok: true, value: this.#plan };
      }
      plan = this.#strategy.tryQuery(state, {
        viewport: viewport.value,
        ...(overscan === undefined ? {} : { overscan }),
      });
      if (!plan.ok) return this.#report(plan);
    }
    this.#commitFrame(
      state,
      stateChanged,
      overscan,
      viewportInsets,
      prepared[1],
      plan.value,
    );
    return plan;
  }

  #queryAfterScroll(
    state: State,
    overscan: number | Partial<VirtualInsets> | undefined,
    frame: VirtualSurfaceFrame,
    previousViewport: VirtualRect,
    target: VirtualPoint,
  ): DOMVirtualResult<readonly [VirtualLayoutPlan<ID>, VirtualRect]> {
    const previousX = previousViewport.x;
    const previousY = previousViewport.y;
    const queried = this.#tryVirtual(() => {
      let accepted = false;
      try {
        this.#writePhysicalScroll(clampHostScroll(this.#host, target));
        const viewport = this.#readPhysicalViewport();
        const plan = this.#strategy.tryQuery(state, {
          viewport: toVirtualViewport(viewport, frame),
          ...(overscan === undefined ? {} : { overscan }),
        });
        if (!plan.ok) return plan;
        accepted = true;
        return { ok: true as const, value: [plan.value, viewport] as const };
      } finally {
        // Restore through the same coordinate model before any failure is reported.
        if (!accepted) {
          this.#writePhysicalScroll(Object.freeze({ x: previousX, y: previousY }));
        }
      }
    });
    return queried.ok ? this.#report(queried.value) : queried;
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
    this.#dirty = 0;
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
    if (this.#items.get(registration[0])?.[2] === registration[2]) {
      this.#items.delete(registration[0]);
    }
    if (this.#itemIDs.get(registration[1])?.[2] === registration[2]) {
      this.#itemIDs.delete(registration[1]);
    }
    this.#pendingEntries.delete(registration[1]);
    if (!this.#disconnected && this.#measure !== undefined) {
      this.#itemObserver.unobserve(registration[1]);
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
          message: 'Scroll correction must be finite.',
          details: { left, right },
        },
      });
    }
    return { ok: true, value: { x, y } };
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

  #report<T>(result: DOMVirtualResult<T>): DOMVirtualResult<T> {
    if (!result.ok) this.#onError?.(result.error);
    return result;
  }

  #requireConnected(): void {
    if (this.#disconnected) {
      throw new TypeError('disconnected');
    }
  }
}
