import type { Result } from '@sectile/core/result';
import type { ChartRenderStyle, NormalizedChartRenderStyle } from './contracts.js';
import { invalidRenderer } from './result.js';

/** Fixed-size external style admission shared by construction and updates. */
export function normalizeRenderStyle(style: ChartRenderStyle = {}, previous?: NormalizedChartRenderStyle): Result<NormalizedChartRenderStyle> {
  try {
    if (style === null || typeof style !== 'object') return invalidRenderer('Chart renderer style must be an object.');
    const color = style.color ?? [0.12, 0.34, 0.92, 1];
    const pointRadius = style.pointRadius ?? 3, lineWidth = style.lineWidth ?? 2.5;
    if (!Array.isArray(color) || color.length !== 4 || !Number.isFinite(pointRadius) || pointRadius <= 0
      || !Number.isFinite(lineWidth) || lineWidth <= 0) return invalidRenderer('Chart renderer style is invalid.');
    const [red, green, blue, alpha] = color;
    for (const channel of [red, green, blue, alpha]) {
      if (!Number.isFinite(channel) || channel < 0 || channel > 1) return invalidRenderer('Chart renderer style is invalid.');
    }
    if (previous && previous.pointRadius === pointRadius && previous.lineWidth === lineWidth
      && previous.color[0] === red && previous.color[1] === green && previous.color[2] === blue && previous.color[3] === alpha) {
      return { ok: true, value: previous };
    }
    return { ok: true, value: Object.freeze({ color: Object.freeze([red, green, blue, alpha] as const), pointRadius, lineWidth }) };
  } catch { return invalidRenderer('Chart renderer style admission failed.'); }
}
