import type { ChartResult } from '../../result.js';
import type { ChartProjectionInput } from './project.js';
import { chartFail, chartOK } from '../result.js';

export function captureChartProjectionInput(input: ChartProjectionInput): ChartResult<ChartProjectionInput> {
  if (input === null || typeof input !== 'object') return invalidProjection('Chart projection input must be an object.');
  try {
    const viewport = input.viewport;
    if (viewport === null || typeof viewport !== 'object') return invalidProjection('Chart projection viewport must be an object.');
    const width = viewport.width;
    const height = viewport.height;
    const devicePixelRatio = viewport.devicePixelRatio;
    const maximumRepresentatives = input.maximumRepresentatives;
    const xScale = input.xScale;
    const yScale = input.yScale;
    const transform = input.viewTransform;
    const view = input.view;
    const insets = input.insets;
    const previous = input.previous;
    if (transform !== undefined && (transform === null || typeof transform !== 'object')) return invalidProjection('Chart view transform must be an object.');
    if (insets !== undefined && (insets === null || typeof insets !== 'object')) return invalidProjection('Chart plot insets must be an object.');
    const captured: { -readonly [Key in keyof ChartProjectionInput]: ChartProjectionInput[Key] } = {
      viewport: devicePixelRatio === undefined ? { width, height } : { width, height, devicePixelRatio },
    };
    if (maximumRepresentatives !== undefined) captured.maximumRepresentatives = maximumRepresentatives;
    if (xScale !== undefined) captured.xScale = xScale;
    if (yScale !== undefined) captured.yScale = yScale;
    if (transform !== undefined) captured.viewTransform = {
        xScale: transform.xScale, xOffset: transform.xOffset, yScale: transform.yScale, yOffset: transform.yOffset,
    };
    if (view !== undefined) captured.view = view;
    if (insets !== undefined) captured.insets = { top: insets.top, right: insets.right, bottom: insets.bottom, left: insets.left };
    if (previous !== undefined) captured.previous = previous;
    return chartOK(captured);
  } catch {
    return invalidProjection('Chart projection input must be readable.');
  }
}

function invalidProjection<T>(message: string): ChartResult<T> {
  return chartFail('construction', 'chart-projection-invalid', message);
}
