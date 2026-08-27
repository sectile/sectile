import '@sectile/virtual';
import type { Result, SectileError, StableID } from '@sectile/core';
import { unwrap } from '@sectile/core/result';
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
import type { VirtualErrorCode } from '@sectile/virtual';

type DOMVirtualResult<T> = Result<T, VirtualErrorCode>;

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

export type VirtualViewportReader = (root: HTMLElement) => VirtualRect;
export type VirtualScrollWriter = (
  root: HTMLElement,
  point: VirtualPoint,
) => void;

export interface VirtualizerOptions<
  State,
  ID extends StableID,
  Measurement,
  Mutation,
> {
  readonly root: HTMLElement;
  readonly state: State;
  readonly strategy: VirtualLayoutStrategy<State, ID, Measurement, Mutation>;
  readonly overscan?: number | Partial<VirtualInsets>;
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

export function virtualContentStyle<ID extends StableID>(
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
  readonly #root: HTMLElement;
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
  readonly #rootObserver: ResizeObserver;
  readonly #itemObserver: ResizeObserver;
  readonly #items = new Map<ID, HTMLElement>();
  readonly #itemIDs = new Map<Element, ID>();
  readonly #pendingEntries = new Map<Element, ResizeObserverEntry>();
  readonly #handleScroll: () => void;
  #state: State;
  #plan: VirtualLayoutPlan<ID>;
  #overscan: number | Partial<VirtualInsets> | undefined;
  #frame: number | null = null;
  #disconnected = false;

  public constructor(
    options: VirtualizerOptions<State, ID, Measurement, Mutation>,
  ) {
    this.#root = options.root;
    this.#state = options.state;
    this.#strategy = options.strategy;
    this.#overscan = options.overscan;
    this.#measure = options.measure;
    this.#readViewport = options.readViewport ?? defaultViewport;
    this.#writeScroll = options.writeScroll ?? defaultScrollWriter;
    this.#environment = options.environment ?? browserEnvironment(options.root);
    this.#onPlanChange = options.onPlanChange;
    this.#onStateChange = options.onStateChange;
    this.#onError = options.onError;
    this.#plan = unwrap(this.#query(this.#state, this.#overscan));
    this.#handleScroll = (): void => {
      this.#publishCurrent();
    };
    this.#rootObserver = this.#environment.createResizeObserver((): void => {
      this.refresh();
    });
    this.#itemObserver = this.#environment.createResizeObserver(
      (entries): void => {
        for (const entry of entries) {
          if (this.#itemIDs.has(entry.target))
            this.#pendingEntries.set(entry.target, entry);
        }
        this.refresh();
      },
    );
    this.#root.addEventListener('scroll', this.#handleScroll, {
      passive: true,
    });
    this.#rootObserver.observe(this.#root);
    this.#onPlanChange?.(this.#plan, this);
  }

  public getState(): State {
    return this.#state;
  }
  public getPlan(): VirtualLayoutPlan<ID> {
    return this.#plan;
  }

  public setState(state: State): DOMVirtualResult<VirtualLayoutPlan<ID>> {
    this.#requireConnected();
    if (Object.is(state, this.#state)) return { ok: true, value: this.#plan };
    const plan = this.#query(state, this.#overscan);
    if (!plan.ok) return this.#report(plan);
    this.#state = state;
    this.#publish(plan.value);
    return plan;
  }

  public setOverscan(
    overscan?: number | Partial<VirtualInsets>,
  ): DOMVirtualResult<VirtualLayoutPlan<ID>> {
    this.#requireConnected();
    const plan = this.#query(this.#state, overscan);
    if (!plan.ok) return this.#report(plan);
    this.#overscan = overscan;
    this.#publish(plan.value);
    return plan;
  }

  public registerItem(element: HTMLElement, id: ID): () => void {
    this.#requireConnected();
    const previous = this.#items.get(id);
    if (previous !== undefined && previous !== element) {
      this.#itemObserver.unobserve(previous);
      this.#itemIDs.delete(previous);
      this.#pendingEntries.delete(previous);
    }
    const previousID = this.#itemIDs.get(element);
    if (previousID !== undefined && previousID !== id) {
      this.#items.delete(previousID);
      this.#pendingEntries.delete(element);
      if (this.#measure !== undefined) this.#itemObserver.unobserve(element);
    }
    this.#items.set(id, element);
    this.#itemIDs.set(element, id);
    if (this.#measure !== undefined) this.#itemObserver.observe(element);
    return (): void => {
      if (this.#items.get(id) !== element) return;
      this.#items.delete(id);
      this.#itemIDs.delete(element);
      this.#pendingEntries.delete(element);
      this.#itemObserver.unobserve(element);
    };
  }

  public measure(
    measurements: readonly Measurement[],
  ): DOMVirtualResult<VirtualLayoutMutation<State>> {
    this.#requireConnected();
    const before = this.#query(this.#state, this.#overscan);
    if (!before.ok) return this.#reportFailure(before);
    const result = this.#strategy.tryMeasure(this.#state, {
      generation: before.value.generation,
      measurements,
      anchor: before.value.anchor,
    });
    if (!result.ok) return this.#report(result);
    this.#applyMutation(result.value);
    this.#publishCurrent();
    return result;
  }

  public mutate(
    mutation: Mutation,
  ): DOMVirtualResult<VirtualLayoutMutation<State>> {
    this.#requireConnected();
    const before = this.#query(this.#state, this.#overscan);
    if (!before.ok) return this.#reportFailure(before);
    const result = this.#strategy.tryMutate(this.#state, {
      mutation,
      anchor: before.value.anchor,
    });
    if (!result.ok) return this.#report(result);
    this.#applyMutation(result.value);
    this.#publishCurrent();
    return result;
  }

  public scrollTo(
    id: ID,
    alignment: VirtualScrollAlignment = 'nearest',
  ): DOMVirtualResult<VirtualPoint> {
    this.#requireConnected();
    const result = this.#strategy.tryScrollTarget(
      this.#state,
      id,
      this.#readViewport(this.#root),
      alignment,
    );
    if (!result.ok) return this.#report(result);
    this.#writeScroll(this.#root, result.value);
    this.#publishCurrent();
    return result;
  }

  public refresh(): void {
    if (this.#disconnected || this.#frame !== null) return;
    this.#frame = this.#environment.requestFrame((): void => {
      this.#frame = null;
      this.flush();
    });
  }

  public flush(): DOMVirtualResult<VirtualLayoutPlan<ID>> {
    this.#requireConnected();
    if (this.#frame !== null) {
      this.#environment.cancelFrame(this.#frame);
      this.#frame = null;
    }
    const before = this.#query(this.#state, this.#overscan);
    if (!before.ok) return this.#report(before);
    const entries = [...this.#pendingEntries.values()];
    this.#pendingEntries.clear();
    if (this.#measure !== undefined && entries.length > 0) {
      const placements = new Map(
        before.value.placements.map((placement) => [placement.id, placement]),
      );
      const measurements: Measurement[] = [];
      for (const entry of entries) {
        const id = this.#itemIDs.get(entry.target);
        if (id === undefined) continue;
        const placement = placements.get(id);
        const element = this.#items.get(id);
        if (placement === undefined || element === undefined) continue;
        const resolved = this.#measure({
          element,
          entry,
          placement,
          state: this.#state,
        });
        if (resolved === null) continue;
        if (Array.isArray(resolved))
          measurements.push(...(resolved as readonly Measurement[]));
        else measurements.push(resolved as Measurement);
      }
      if (measurements.length > 0) {
        const measured = this.#strategy.tryMeasure(this.#state, {
          generation: before.value.generation,
          measurements,
          anchor: before.value.anchor,
        });
        if (!measured.ok) return this.#reportFailure(measured);
        this.#applyMutation(measured.value);
      }
    }
    return this.#publishCurrent();
  }

  public disconnect(): void {
    if (this.#disconnected) return;
    this.#disconnected = true;
    if (this.#frame !== null) this.#environment.cancelFrame(this.#frame);
    this.#frame = null;
    this.#root.removeEventListener('scroll', this.#handleScroll);
    this.#rootObserver.disconnect();
    this.#itemObserver.disconnect();
    this.#items.clear();
    this.#itemIDs.clear();
    this.#pendingEntries.clear();
  }

  #query(
    state: State,
    overscan: number | Partial<VirtualInsets> | undefined,
  ): DOMVirtualResult<VirtualLayoutPlan<ID>> {
    return this.#strategy.tryQuery(state, {
      viewport: this.#readViewport(this.#root),
      ...(overscan === undefined ? {} : { overscan }),
    });
  }

  #applyMutation(mutation: VirtualLayoutMutation<State>): void {
    this.#state = mutation.state;
    if (mutation.scrollDelta.x !== 0 || mutation.scrollDelta.y !== 0) {
      const viewport = this.#readViewport(this.#root);
      this.#writeScroll(this.#root, {
        x: viewport.x + mutation.scrollDelta.x,
        y: viewport.y + mutation.scrollDelta.y,
      });
    }
    this.#onStateChange?.(this.#state);
  }

  #publishCurrent(): DOMVirtualResult<VirtualLayoutPlan<ID>> {
    const plan = this.#query(this.#state, this.#overscan);
    if (!plan.ok) return this.#report(plan);
    this.#publish(plan.value);
    return plan;
  }

  #publish(plan: VirtualLayoutPlan<ID>): void {
    this.#plan = plan;
    this.#onPlanChange?.(plan, this);
  }

  #report<T>(result: DOMVirtualResult<T>): DOMVirtualResult<T> {
    if (!result.ok) this.#onError?.(result.error);
    return result;
  }

  #reportFailure<T>(
    result: DOMVirtualResult<unknown>,
  ): DOMVirtualResult<T> {
    if (result.ok)
      throw new TypeError('Expected a failed virtual layout result.');
    this.#onError?.(result.error);
    return { ok: false, error: result.error };
  }

  #requireConnected(): void {
    if (this.#disconnected)
      throw new TypeError('Virtualizer connection is disconnected.');
  }
}

function defaultViewport(root: HTMLElement): VirtualRect {
  return Object.freeze({
    x: Math.max(0, root.scrollLeft),
    y: Math.max(0, root.scrollTop),
    width: Math.max(0, root.clientWidth),
    height: Math.max(0, root.clientHeight),
  });
}

function defaultScrollWriter(root: HTMLElement, point: VirtualPoint): void {
  root.scrollTo({ left: point.x, top: point.y, behavior: 'auto' });
}

function browserEnvironment(root: HTMLElement): VirtualizerEnvironment {
  const view = root.ownerDocument.defaultView;
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
};
