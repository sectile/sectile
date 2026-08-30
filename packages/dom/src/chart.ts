import type { StableID } from '@sectile/core';
import type { ChartController } from '@sectile/chart/controller';
import type { ChartCommand } from '@sectile/chart/interaction';
import type { ChartProjection, ChartProjectionBatch, ChartViewport } from '@sectile/chart/projection';

export type ChartRendererMode = 'auto' | 'webgl2' | 'canvas2d';

export interface ChartRendererCapabilities {
  readonly canvas2d: boolean;
  readonly webgl2: boolean;
  readonly asynchronousGPUTiming: boolean;
}

export type ChartRenderPolicy =
  | { readonly type: 'fixed'; readonly renderScale?: number; readonly maximumRepresentatives?: number }
  | { readonly type: 'adaptive'; readonly minimumRenderScale: number; readonly maximumRenderScale: number; readonly frameBudgetMs: number };

export interface ChartRendererDiagnostics {
  readonly mode: Exclude<ChartRendererMode, 'auto'>;
  readonly uploadedBytes: number;
  readonly drawCalls: number;
  readonly liveResources: number;
}

export interface ChartRenderer {
  readonly capabilities: ChartRendererCapabilities;
  render(projection: ChartProjection, batches?: readonly ChartProjectionBatch[]): void;
  flush(): void;
  disconnect(): void;
}

export interface DOMChartOptions<ID extends StableID = StableID> {
  readonly root: HTMLElement;
  readonly canvas: HTMLCanvasElement;
  readonly controller: ChartController<ID>;
  readonly renderer?: ChartRendererMode | ChartRenderer;
  readonly renderPolicy?: ChartRenderPolicy;
  readonly accessibilityLimit?: number;
  readonly onCommand?: (command: ChartCommand<ID>) => void;
}

export interface DOMChartConnection<ID extends StableID = StableID> {
  readonly controller: ChartController<ID>;
  getViewport(): ChartViewport;
  getProjection(): ChartProjection<ID> | null;
  getRendererDiagnostics(): ChartRendererDiagnostics | null;
  refresh(): void;
  flush(): void;
  disconnect(): void;
}
