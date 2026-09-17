import type { Result, StableID } from '@sectile/core';
import type { ChartController } from '@sectile/chart/controller';
import type { ChartCommand } from '@sectile/chart/interaction';
import type { ChartProjection, ChartProjectionBatch, ChartViewport } from '@sectile/chart/projection';
import type { ChartError } from '@sectile/chart/result';

export type ChartRendererMode = 'auto' | 'webgl2' | 'canvas2d';

export type DOMChartDragMode = 'none' | 'pan' | 'zoom-region' | 'select';

export type DOMChartWheelMode = 'native' | 'pan' | 'zoom';

export type DOMChartWheelModifier = 'none' | 'control' | 'meta' | 'alt' | 'shift';

export interface DOMChartNavigation<ID extends StableID = StableID> {
  readonly axes?: readonly ID[];
  readonly drag?: DOMChartDragMode;
  readonly wheel?: DOMChartWheelMode;
  readonly wheelModifier?: DOMChartWheelModifier;
  readonly pinch?: boolean;
  readonly keyboard?: boolean;
  readonly controlAlternative?: 'built-in' | 'external';
}

export interface NormalizedDOMChartNavigation<ID extends StableID = StableID> {
  readonly axes: readonly ID[] | undefined;
  readonly drag: DOMChartDragMode;
  readonly wheel: DOMChartWheelMode;
  readonly wheelModifier: DOMChartWheelModifier;
  readonly pinch: boolean;
  readonly keyboard: boolean;
  readonly controlAlternative: 'built-in' | 'external' | undefined;
}

export interface ChartRendererCapabilities {
  readonly canvas2d: boolean;
  readonly webgl2: boolean;
  readonly asynchronousGPUTiming: boolean;
}

export type ChartRenderPolicy =
  | { readonly type: 'fixed'; readonly renderScale?: number; readonly maximumRepresentatives?: number }
  | { readonly type: 'adaptive'; readonly minimumRenderScale: number; readonly maximumRenderScale: number; readonly frameBudgetMs: number; readonly maximumRepresentatives?: number };

export interface ChartRendererDiagnostics {
  readonly mode: Exclude<ChartRendererMode, 'auto'>;
  readonly uploadedBytes: number;
  readonly drawCalls: number;
  readonly liveResources: number;
  readonly fullUploads?: number;
  readonly partialUploads?: number;
  readonly reusedGeometryBuffers?: number;
}

export type ChartRGBA = readonly [red: number, green: number, blue: number, alpha: number];

export interface ChartRenderStyle {
  readonly color?: ChartRGBA;
  readonly pointRadius?: number;
  readonly lineWidth?: number;
}

export interface ChartRendererOptions {
  readonly mode?: ChartRendererMode;
  readonly style?: ChartRenderStyle;
}

export interface ChartRenderer {
  readonly capabilities: ChartRendererCapabilities;
  render(projection: ChartProjection, batches?: readonly ChartProjectionBatch[]): void;
  getDiagnostics(): ChartRendererDiagnostics;
  flush(): void;
  disconnect(): void;
}

export interface NormalizedChartRenderStyle {
  readonly color: ChartRGBA;
  readonly pointRadius: number;
  readonly lineWidth: number;
}

export interface DOMChartOptions<ID extends StableID = StableID> {
  readonly root: HTMLElement;
  readonly canvas: HTMLCanvasElement;
  readonly controller: ChartController<ID>;
  readonly renderer?: ChartRendererMode | ChartRenderer;
  readonly renderPolicy?: ChartRenderPolicy;
  readonly accessibilityLimit?: number;
  readonly accessibilityLabel?: string;
  readonly getAccessibleDatumLabel?: (id: ID, index: number) => string;
  readonly onCommand?: (command: ChartCommand<ID>) => void;
  readonly onProjectionChange?: (projection: ChartProjection<ID>) => void;
  readonly onProjectionError?: (error: ChartError) => void;
  readonly navigation?: DOMChartNavigation<ID>;
}

export interface DOMChartLifecycleDiagnostics {
  readonly listeners: number;
  readonly observers: number;
  readonly frames: number;
  readonly timers: number;
  readonly subscriptions: number;
  readonly overlayNodes: number;
}

export interface DOMChartConnection<ID extends StableID = StableID> {
  readonly controller: ChartController<ID>;
  getViewport(): ChartViewport;
  getProjection(): ChartProjection<ID> | null;
  getRendererDiagnostics(): ChartRendererDiagnostics | null;
  getLifecycleDiagnostics(): DOMChartLifecycleDiagnostics;
  setAccessibilityLabel(label?: string): void;
  setNavigation(navigation?: DOMChartNavigation<ID>): Result<void>;
  refresh(): void;
  flush(): void;
  disconnect(): void;
}

export interface NormalizedChartRenderPolicy {
  readonly type: 'fixed' | 'adaptive';
  readonly minimumRenderScale: number;
  readonly maximumRenderScale: number;
  readonly frameBudgetMs: number;
  readonly maximumRepresentatives: number | undefined;
}
