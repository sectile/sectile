import type { StableID } from '@sectile/core';
import type { ChartViewTransform } from './scale.js';

export type ChartSelection<ID extends StableID = StableID> =
  | { readonly type: 'points'; readonly ids: readonly ID[] }
  | { readonly type: 'interval'; readonly start: number; readonly end: number };

export interface ChartState<ID extends StableID = StableID> {
  readonly generation: number;
  readonly activeDatum: ID | null;
  readonly cursor: ID | null;
  readonly selection: ChartSelection<ID>;
  readonly viewTransform: ChartViewTransform;
}

export interface ChartControlledValues<ID extends StableID = StableID> {
  readonly activeDatum?: ID | null;
  readonly cursor?: ID | null;
  readonly selection?: ChartSelection<ID>;
  readonly viewTransform?: ChartViewTransform;
}

export type ChartEvent<ID extends StableID = StableID> =
  | { readonly type: 'pointer-candidate'; readonly id: ID | null }
  | { readonly type: 'set-active'; readonly id: ID | null }
  | { readonly type: 'set-cursor'; readonly id: ID | null }
  | { readonly type: 'set-selection'; readonly selection: ChartSelection<ID> }
  | { readonly type: 'move-focus'; readonly direction: 'next' | 'previous' | 'first' | 'last' }
  | { readonly type: 'pan'; readonly x: number; readonly y: number }
  | { readonly type: 'zoom'; readonly x: number; readonly y: number; readonly factor: number }
  | { readonly type: 'reset-view' };

export type ChartCommand<ID extends StableID = StableID> =
  | { readonly type: 'focus-datum'; readonly id: ID }
  | { readonly type: 'announce-datum'; readonly id: ID }
  | { readonly type: 'render-requested'; readonly generation: number };
