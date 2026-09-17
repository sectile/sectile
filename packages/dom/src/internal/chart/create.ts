import type { Result, StableID } from '@sectile/core';
import { SectileResultError, unwrap } from '@sectile/core/result';
import type { ChartErrorCode } from '@sectile/chart/result';
import type {
  ChartRendererCapabilities,
  ChartRendererOptions,
  ChartRenderer,
  ChartRenderStyle,
  NormalizedChartRenderStyle,
  ChartRGBA,
  DOMChartOptions,
  DOMChartConnection,
  ChartRenderPolicy,
  NormalizedChartRenderPolicy,
} from './contracts.js';
import { Canvas2DChartRenderer } from './renderers/canvas2d.js';
import { WebGL2ChartRenderer } from './renderers/webgl2.js';
import { DOMChart } from './connection.js';
import { tryNormalizeDOMChartNavigation } from './navigation-options.js';
import { invalidRenderer } from './result.js';

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

function normalizeRenderStyle(style: ChartRenderStyle = {}): Result<NormalizedChartRenderStyle> {
  if (style === null || typeof style !== 'object') return invalidRenderer('Chart renderer style must be an object.');
  const color = style.color ?? [0.12, 0.34, 0.92, 1];
  const pointRadius = style.pointRadius ?? 3;
  const lineWidth = style.lineWidth ?? 2.5;
  if (!Array.isArray(color) || color.length !== 4 || color.some((channel) => !Number.isFinite(channel) || channel < 0 || channel > 1)
    || !Number.isFinite(pointRadius) || pointRadius <= 0 || !Number.isFinite(lineWidth) || lineWidth <= 0) {
    return invalidRenderer('Chart renderer style is invalid.');
  }
  return { ok: true, value: Object.freeze({ color: Object.freeze([...color]) as unknown as ChartRGBA, pointRadius, lineWidth }) };
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
