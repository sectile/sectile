import type { ChartResult } from '../../result.js';
import type { ChartProjectionInput } from './project.js';
import { chartFail, chartOK } from '../result.js';

export function captureChartProjectionInput(
  input: ChartProjectionInput,
  previousCapture?: ChartResult<ChartProjectionInput>,
): ChartResult<ChartProjectionInput> {
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
    const xScaleValue = transform?.xScale;
    const xOffset = transform?.xOffset;
    const yScaleValue = transform?.yScale;
    const yOffset = transform?.yOffset;
    const top = insets?.top;
    const right = insets?.right;
    const bottom = insets?.bottom;
    const left = insets?.left;
    const previousInput = previousCapture?.ok === true ? previousCapture.value : undefined;
    if (previousInput !== undefined
      && previousInput.viewport.width === width && previousInput.viewport.height === height
      && previousInput.viewport.devicePixelRatio === devicePixelRatio
      && previousInput.maximumRepresentatives === maximumRepresentatives
      && previousInput.xScale === xScale && previousInput.yScale === yScale
      && previousInput.view === view && previousInput.previous === previous
      && (previousInput.viewTransform === undefined) === (transform === undefined)
      && previousInput.viewTransform?.xScale === xScaleValue && previousInput.viewTransform?.xOffset === xOffset
      && previousInput.viewTransform?.yScale === yScaleValue && previousInput.viewTransform?.yOffset === yOffset
      && (previousInput.insets === undefined) === (insets === undefined)
      && previousInput.insets?.top === top && previousInput.insets?.right === right
      && previousInput.insets?.bottom === bottom && previousInput.insets?.left === left) return previousCapture!;
    const captured: { -readonly [Key in keyof ChartProjectionInput]: ChartProjectionInput[Key] } = {
      viewport: devicePixelRatio === undefined ? { width, height } : { width, height, devicePixelRatio },
    };
    if (maximumRepresentatives !== undefined) captured.maximumRepresentatives = maximumRepresentatives;
    if (xScale !== undefined) captured.xScale = xScale;
    if (yScale !== undefined) captured.yScale = yScale;
    if (transform !== undefined) captured.viewTransform = {
        xScale: xScaleValue!, xOffset: xOffset!, yScale: yScaleValue!, yOffset: yOffset!,
    };
    if (view !== undefined) captured.view = view;
    if (insets !== undefined) captured.insets = { top: top!, right: right!, bottom: bottom!, left: left! };
    if (previous !== undefined) captured.previous = previous;
    return chartOK(captured);
  } catch {
    return invalidProjection('Chart projection input must be readable.');
  }
}

function invalidProjection<T>(message: string): ChartResult<T> {
  return chartFail('construction', 'chart-projection-invalid', message);
}
