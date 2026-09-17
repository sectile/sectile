import type { Result, StableID, SectileError } from '@sectile/core';
import type { VirtualErrorCode } from '@sectile/virtual';
import type {
  VirtualPlacement,
  VirtualRect,
  VirtualPoint,
  VirtualLayoutStrategy,
  VirtualInsets,
  VirtualLayoutPlan,
  VirtualLayoutMutation,
  VirtualScrollAlignment,
} from '@sectile/virtual/layout';

export type DOMVirtualResult<T> = Result<T, VirtualErrorCode>;

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

export type VirtualScrollport = HTMLElement | Document;

export type VirtualViewportReader = (scrollport: VirtualScrollport) => VirtualRect;

export type VirtualScrollWriter = (
  scrollport: VirtualScrollport,
  point: VirtualPoint,
) => void;

export interface VirtualizerOptions<
  State,
  ID extends StableID,
  Measurement,
  Mutation,
> {
  readonly scrollport: VirtualScrollport;
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
