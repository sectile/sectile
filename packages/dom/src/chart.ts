import type { Result, StableID } from '@sectile/core';
import { tryNormalizeStableIDs } from '@sectile/core/identity';
import { SectileResultError, unwrap } from '@sectile/core/result';
import type { ChartController } from '@sectile/chart/controller';
import type { ChartCommand } from '@sectile/chart/interaction';
import type { ChartProjection, ChartProjectionBatch, ChartViewport } from '@sectile/chart/projection';
import type { ChartError, ChartErrorCode } from '@sectile/chart/result';
import { Canvas2DChartRenderer } from './internal/chart-canvas-renderer.js';
import { DOMChart } from './internal/chart-connection.js';
import { WebGL2ChartRenderer } from './internal/chart-webgl2-renderer.js';

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
  try {
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
          if (mode === 'webgl2') return invalidRenderer(error instanceof Error ? error.message : 'WebGL2 chart renderer initialization failed.');
        }
      }
      if (mode === 'webgl2') return invalidRenderer('WebGL2 is unavailable for the chart canvas.');
    }
    const context = canvas.getContext('2d');
    return context === null
      ? invalidRenderer('Canvas2D is unavailable for the chart canvas.')
      : { ok: true, value: new Canvas2DChartRenderer(context, style.value) };
  } catch {
    return invalidRenderer('Chart renderer construction failed.');
  }
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

export function createDOMChart<ID extends StableID>(options: DOMChartOptions<ID>): DOMChartConnection<ID> {
  return unwrap(tryCreateDOMChart(options));
}

export function tryCreateDOMChart<ID extends StableID>(options: DOMChartOptions<ID>): Result<DOMChartConnection<ID>, ChartErrorCode> {
  let renderer: ChartRenderer | undefined;
  let ownsRenderer = false;
  try {
    if (!isDOMChartOptionsShape(options)) return invalidRenderer('DOM Chart requires compatible root, canvas, and controller objects.');
    const view = options.root.ownerDocument.defaultView;
    if (view === null || typeof view !== 'object'
      || typeof view.requestAnimationFrame !== 'function'
      || typeof view.cancelAnimationFrame !== 'function'
      || typeof view.performance?.now !== 'function') {
      return invalidRenderer('DOM Chart requires a browser window with animation frame support.');
    }
    const policy = normalizeRenderPolicy(options.renderPolicy);
    if (!policy.ok) return policy;
    const accessibilityLimit = options.accessibilityLimit ?? 1_000;
    if (!Number.isSafeInteger(accessibilityLimit) || accessibilityLimit < 0 || accessibilityLimit > 10_000) {
      return invalidRenderer('DOM Chart accessibility limit must be a safe integer from zero through 10,000.');
    }
    const borrowedRenderer = options.renderer !== undefined && typeof options.renderer === 'object';
    if (borrowedRenderer && !isChartRenderer(options.renderer)) return invalidRenderer('Borrowed Chart renderer has an invalid method contract.');
    const navigation = tryNormalizeDOMChartNavigation(options.navigation);
    if (!navigation.ok) return navigation;
    const rendererResult = borrowedRenderer
      ? { ok: true as const, value: options.renderer as ChartRenderer }
      : tryCreateChartRenderer(options.canvas, { mode: options.renderer ?? 'auto' });
    if (!rendererResult.ok) return rendererResult;
    renderer = rendererResult.value;
    ownsRenderer = !borrowedRenderer;
    return { ok: true, value: new DOMChart(options, renderer, ownsRenderer, policy.value, accessibilityLimit, view, navigation.value) };
  } catch (error) {
    if (ownsRenderer && renderer !== undefined) {
      try { renderer.disconnect(); }
      catch { /* Construction failure remains the primary error. */ }
    }
    if (error instanceof SectileResultError) {
      return {
        ok: false,
        error: {
          class: error.class,
          code: error.code as ChartErrorCode,
          message: error.message,
          ...(error.details === undefined ? {} : { details: error.details }),
        },
      };
    }
    return invalidRenderer('DOM Chart construction failed.');
  }
}

function isDOMChartOptionsShape<ID extends StableID>(options: DOMChartOptions<ID>): boolean {
  if (options === null || typeof options !== 'object') return false;
  const root = options.root;
  const canvas = options.canvas;
  const controller = options.controller;
  if (root === null || typeof root !== 'object' || canvas === null || typeof canvas !== 'object'
    || controller === null || typeof controller !== 'object') return false;
  const document = root.ownerDocument;
  return document !== null && typeof document === 'object'
    && typeof document.createElement === 'function'
    && typeof document.createElementNS === 'function'
    && typeof document.createDocumentFragment === 'function'
    && ['setAttribute', 'removeAttribute', 'getAttribute', 'hasAttribute', 'append', 'addEventListener', 'removeEventListener', 'getBoundingClientRect']
      .every((method) => typeof (root as unknown as Record<string, unknown>)[method] === 'function')
    && ['setAttribute', 'removeAttribute', 'getAttribute', 'hasAttribute', 'addEventListener', 'removeEventListener', 'getBoundingClientRect']
      .every((method) => typeof (canvas as unknown as Record<string, unknown>)[method] === 'function')
    && ['getSnapshot', 'getModel', 'project', 'dispatch', 'subscribeCommands']
      .every((method) => typeof (controller as unknown as Record<string, unknown>)[method] === 'function');
}

function isChartRenderer(renderer: unknown): renderer is ChartRenderer {
  if (renderer === null || typeof renderer !== 'object') return false;
  const candidate = renderer as Record<string, unknown>;
  return candidate['capabilities'] !== null && typeof candidate['capabilities'] === 'object'
    && ['render', 'getDiagnostics', 'flush', 'disconnect'].every((method) => typeof candidate[method] === 'function');
}

export function normalizeDOMChartNavigation<ID extends StableID>(
  navigation: DOMChartNavigation<ID> = {},
): NormalizedDOMChartNavigation<ID> {
  return unwrap(tryNormalizeDOMChartNavigation(navigation));
}

export function tryNormalizeDOMChartNavigation<ID extends StableID>(
  navigation: DOMChartNavigation<ID> = {},
): Result<NormalizedDOMChartNavigation<ID>> {
  if (navigation === null || typeof navigation !== 'object') return invalidRenderer('DOM Chart navigation must be an object.');
  const drag = navigation.drag ?? 'none';
  const wheel = navigation.wheel ?? 'native';
  const wheelModifier = navigation.wheelModifier ?? 'none';
  if (!['none', 'pan', 'zoom-region', 'select'].includes(drag)
    || !['native', 'pan', 'zoom'].includes(wheel)
    || !['none', 'control', 'meta', 'alt', 'shift'].includes(wheelModifier)
    || (navigation.pinch !== undefined && typeof navigation.pinch !== 'boolean')
    || (navigation.keyboard !== undefined && typeof navigation.keyboard !== 'boolean')
    || (navigation.controlAlternative !== undefined
      && navigation.controlAlternative !== 'built-in' && navigation.controlAlternative !== 'external')) {
    return invalidRenderer('DOM Chart navigation binding is invalid.');
  }
  const axes = navigation.axes === undefined ? undefined : tryNormalizeStableIDs(navigation.axes);
  if (axes !== undefined && !axes.ok) return axes;
  const pinch = navigation.pinch ?? false;
  if ((drag !== 'none' || pinch) && navigation.controlAlternative === undefined) {
    return invalidRenderer('Direct Chart gestures require a built-in or external single-pointer control alternative.');
  }
  return { ok: true, value: Object.freeze({
    axes: axes?.value,
    drag,
    wheel,
    wheelModifier,
    pinch,
    keyboard: navigation.keyboard ?? false,
    controlAlternative: navigation.controlAlternative,
  }) };
}

function normalizeRenderPolicy(policy: ChartRenderPolicy = { type: 'fixed' }): Result<NormalizedChartRenderPolicy> {
  if (policy === null || typeof policy !== 'object') return invalidRenderer('Chart render policy must be an object.');
  if (policy.type === 'fixed') {
    const scale = policy.renderScale ?? 1;
    if (!validRenderScale(scale) || !validRepresentativeMaximum(policy.maximumRepresentatives)) return invalidRenderer('Fixed Chart render policy is invalid.');
    return { ok: true, value: Object.freeze({
      type: 'fixed', minimumRenderScale: scale, maximumRenderScale: scale,
      frameBudgetMs: Number.POSITIVE_INFINITY, maximumRepresentatives: policy.maximumRepresentatives,
    }) };
  }
  if (policy.type !== 'adaptive' || !validRenderScale(policy.minimumRenderScale)
    || !validRenderScale(policy.maximumRenderScale) || policy.minimumRenderScale > policy.maximumRenderScale
    || !Number.isFinite(policy.frameBudgetMs) || policy.frameBudgetMs <= 0
    || !validRepresentativeMaximum(policy.maximumRepresentatives)) return invalidRenderer('Adaptive Chart render policy is invalid.');
  return { ok: true, value: Object.freeze({
    type: 'adaptive',
    minimumRenderScale: policy.minimumRenderScale,
    maximumRenderScale: policy.maximumRenderScale,
    frameBudgetMs: policy.frameBudgetMs,
    maximumRepresentatives: policy.maximumRepresentatives,
  }) };
}

function validRenderScale(value: number): boolean { return Number.isFinite(value) && value > 0 && value <= 4; }
function validRepresentativeMaximum(value: number | undefined): boolean {
  return value === undefined || (Number.isSafeInteger(value) && value >= 0 && value <= 1_000_000);
}
