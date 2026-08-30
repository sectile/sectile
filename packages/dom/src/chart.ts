import type { Result, StableID } from '@sectile/core';
import { unwrap } from '@sectile/core/result';
import type { ChartController } from '@sectile/chart/controller';
import type { ChartCommand } from '@sectile/chart/interaction';
import type { ChartProjection, ChartProjectionBatch, ChartViewport } from '@sectile/chart/projection';
import { Canvas2DChartRenderer } from './internal/chart-canvas-renderer.js';
import { WebGL2ChartRenderer } from './internal/chart-webgl2-renderer.js';

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

export function detectChartRendererCapabilities(canvas: HTMLCanvasElement): ChartRendererCapabilities {
  const probe = canvas.ownerDocument.createElement('canvas');
  const webgl2 = probe.getContext('webgl2');
  return Object.freeze({
    canvas2d: true,
    webgl2: webgl2 !== null,
    asynchronousGPUTiming: webgl2?.getExtension('EXT_disjoint_timer_query_webgl2') !== null,
  });
}

export function createChartRenderer(canvas: HTMLCanvasElement, options: ChartRendererOptions = {}): ChartRenderer {
  return unwrap(tryCreateChartRenderer(canvas, options));
}

export function tryCreateChartRenderer(
  canvas: HTMLCanvasElement,
  options: ChartRendererOptions = {},
): Result<ChartRenderer> {
  if (canvas === null || typeof canvas !== 'object' || typeof canvas.getContext !== 'function') return invalidRenderer('Chart renderer requires a canvas.');
  if (options === null || typeof options !== 'object') return invalidRenderer('Chart renderer options must be an object.');
  const style = normalizeRenderStyle(options.style);
  if (!style.ok) return style;
  const mode = options.mode ?? 'auto';
  if (mode !== 'auto' && mode !== 'webgl2' && mode !== 'canvas2d') return invalidRenderer('Chart renderer mode is invalid.');
  if (mode !== 'canvas2d') {
    const context = canvas.getContext('webgl2', { alpha: true, antialias: true, depth: false, preserveDrawingBuffer: false });
    if (context !== null) {
      try {
        return { ok: true, value: new WebGL2ChartRenderer(canvas, context, style.value) };
      } catch (error) {
        return invalidRenderer(error instanceof Error ? error.message : 'WebGL2 chart renderer initialization failed.');
      }
    }
    if (mode === 'webgl2') return invalidRenderer('WebGL2 is unavailable for the chart canvas.');
  }
  const context = canvas.getContext('2d');
  return context === null
    ? invalidRenderer('Canvas2D is unavailable for the chart canvas.')
    : { ok: true, value: new Canvas2DChartRenderer(context, style.value) };
}

export interface NormalizedChartRenderStyle {
  readonly color: ChartRGBA;
  readonly pointRadius: number;
  readonly lineWidth: number;
}

function normalizeRenderStyle(style: ChartRenderStyle = {}): Result<NormalizedChartRenderStyle> {
  if (style === null || typeof style !== 'object') return invalidRenderer('Chart renderer style must be an object.');
  const color = style.color ?? [0.12, 0.34, 0.92, 1];
  const pointRadius = style.pointRadius ?? 3;
  const lineWidth = style.lineWidth ?? 1.5;
  if (!Array.isArray(color) || color.length !== 4 || color.some((channel) => !Number.isFinite(channel) || channel < 0 || channel > 1)
    || !Number.isFinite(pointRadius) || pointRadius <= 0 || !Number.isFinite(lineWidth) || lineWidth <= 0) {
    return invalidRenderer('Chart renderer style is invalid.');
  }
  return { ok: true, value: Object.freeze({ color: Object.freeze([...color]) as unknown as ChartRGBA, pointRadius, lineWidth }) };
}

function invalidRenderer<T>(message: string): Result<T> {
  return { ok: false, error: { class: 'construction', code: 'invalid-boundary', message } };
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
