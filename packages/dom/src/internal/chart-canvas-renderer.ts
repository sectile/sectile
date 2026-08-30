import type { ChartAxisLayout } from '@sectile/chart/layout';
import type {
  ChartDataBatch,
  ChartDataGeometry,
  ChartProjection,
  ChartProjectionBatch,
} from '@sectile/chart/projection';
import type {
  ChartRenderer,
  ChartRendererCapabilities,
  ChartRendererDiagnostics,
  NormalizedChartRenderStyle,
} from '../chart.js';

export class Canvas2DChartRenderer implements ChartRenderer {
  public readonly capabilities: ChartRendererCapabilities = Object.freeze({
    canvas2d: true,
    webgl2: false,
    asynchronousGPUTiming: false,
  });
  readonly #context: CanvasRenderingContext2D;
  readonly #style: NormalizedChartRenderStyle;
  #diagnostics: ChartRendererDiagnostics = Object.freeze({ mode: 'canvas2d', uploadedBytes: 0, drawCalls: 0, liveResources: 1 });
  #active = true;

  public constructor(context: CanvasRenderingContext2D, style: NormalizedChartRenderStyle) {
    this.#context = context;
    this.#style = style;
  }

  public render(projection: ChartProjection, batches: readonly ChartProjectionBatch[] = projection.batches): void {
    if (!this.#active) return;
    const context = this.#context;
    const ratio = projection.viewport.devicePixelRatio ?? 1;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, projection.viewport.width, projection.viewport.height);
    context.fillStyle = rgba(this.#style.color);
    context.strokeStyle = context.fillStyle;
    context.lineWidth = this.#style.lineWidth;
    const dataBatches = projection.dataBatches;
    if (dataBatches !== undefined) {
      const axes = new Map(projection.layout?.axes.map((axis) => [axis.axis.id, axis]) ?? []);
      for (const batch of dataBatches) drawDataBatch(context, batch, axes, projection, this.#style);
      this.#diagnostics = Object.freeze({
        mode: 'canvas2d',
        uploadedBytes: dataBatches.reduce((total, batch) => total + dataBatchBytes(batch), 0),
        drawCalls: dataBatches.length,
        liveResources: 1,
      });
      return;
    }
    let uploadedBytes = 0;
    for (const batch of batches) {
      uploadedBytes += batchBytes(batch);
      drawScreenBatch(context, batch, this.#style.pointRadius, this.#style.color);
    }
    this.#diagnostics = Object.freeze({ mode: 'canvas2d', uploadedBytes, drawCalls: batches.length, liveResources: 1 });
  }

  public getDiagnostics(): ChartRendererDiagnostics { return this.#diagnostics; }
  public flush(): void {}
  public disconnect(): void {
    if (!this.#active) return;
    this.#active = false;
    this.#diagnostics = Object.freeze({ ...this.#diagnostics, liveResources: 0 });
  }
}

function drawDataBatch(
  context: CanvasRenderingContext2D,
  batch: ChartDataBatch,
  axes: ReadonlyMap<unknown, ChartAxisLayout>,
  projection: ChartProjection,
  style: NormalizedChartRenderStyle,
): void {
  const geometry = batch.geometry;
  if (geometry.type === 'arc') {
    drawDataArcs(context, geometry.arcs, batch.colors, projection, style.color);
    return;
  }
  const xAxis = axes.get(batch.xAxisID);
  const yAxis = axes.get(batch.yAxisID);
  if (xAxis === undefined || yAxis === undefined) return;
  if (geometry.type === 'point') {
    for (let offset = 0, primitive = 0; offset < geometry.positions.length; offset += 2, primitive += 1) {
      const x = xAxis.geometryScale.normalize(geometry.positions[offset] as number);
      const y = yAxis.geometryScale.normalize(geometry.positions[offset + 1] as number);
      if (x === null || y === null) continue;
      setFill(context, batch.colors, primitive, style.color);
      context.beginPath();
      context.arc(x, y, style.pointRadius, 0, Math.PI * 2);
      context.fill();
    }
    return;
  }
  if (geometry.type === 'polyline') {
    const offsets = geometry.offsets ?? Uint32Array.of(0, geometry.positions.length / 2);
    for (let line = 0; line + 1 < offsets.length; line += 1) {
      const start = offsets[line] as number;
      const end = offsets[line + 1] as number;
      if (start >= end) continue;
      const x = xAxis.geometryScale.normalize(geometry.positions[start * 2] as number);
      const y = yAxis.geometryScale.normalize(geometry.positions[start * 2 + 1] as number);
      if (x === null || y === null) continue;
      setStroke(context, batch.colors, start, style.color);
      context.beginPath();
      context.moveTo(x, y);
      for (let index = start + 1; index < end; index += 1) {
        const nextX = xAxis.geometryScale.normalize(geometry.positions[index * 2] as number);
        const nextY = yAxis.geometryScale.normalize(geometry.positions[index * 2 + 1] as number);
        if (nextX !== null && nextY !== null) context.lineTo(nextX, nextY);
      }
      context.stroke();
    }
    return;
  }
  if (geometry.type !== 'rectangle' && geometry.type !== 'cell') return;
  const values = geometry.type === 'rectangle' ? geometry.segments : geometry.bounds;
  for (let offset = 0, primitive = 0; offset < values.length; offset += 4, primitive += 1) {
    const x1 = xAxis.geometryScale.normalize(values[offset] as number);
    const y1 = yAxis.geometryScale.normalize(values[offset + 1] as number);
    const x2 = xAxis.geometryScale.normalize(values[offset + 2] as number);
    const y2 = yAxis.geometryScale.normalize(values[offset + 3] as number);
    if (x1 === null || y1 === null || x2 === null || y2 === null) continue;
    setFill(context, batch.colors, primitive, style.color);
    context.fillRect(Math.min(x1, x2), Math.min(y1, y2), Math.abs(x2 - x1), Math.abs(y2 - y1));
  }
}

function drawDataArcs(
  context: CanvasRenderingContext2D,
  arcs: Float64Array,
  colors: Uint8Array | undefined,
  projection: ChartProjection,
  fallback: readonly number[],
): void {
  const x = projection.viewport.width / 2;
  const y = projection.viewport.height / 2;
  const radius = Math.min(projection.viewport.width, projection.viewport.height) / 2;
  for (let offset = 0, primitive = 0; offset < arcs.length; offset += 4, primitive += 1) {
    const inner = (arcs[offset] as number) * radius;
    const outer = (arcs[offset + 1] as number) * radius;
    const start = arcs[offset + 2] as number;
    const end = arcs[offset + 3] as number;
    setFill(context, colors, primitive, fallback);
    context.beginPath();
    context.arc(x, y, outer, start, end);
    if (inner > 0) context.arc(x, y, inner, end, start, true);
    else context.lineTo(x, y);
    context.closePath();
    context.fill();
  }
}

function drawScreenBatch(
  context: CanvasRenderingContext2D,
  batch: ChartProjectionBatch,
  pointRadius: number,
  fallback: readonly number[],
): void {
  if (batch.type === 'point') {
    for (let offset = 0, primitive = 0; offset < batch.positions.length; offset += 2, primitive += 1) {
      setFill(context, batch.colors, primitive, fallback);
      context.beginPath();
      context.arc(batch.positions[offset] as number, batch.positions[offset + 1] as number, pointRadius, 0, Math.PI * 2);
      context.fill();
    }
  } else if (batch.type === 'polyline') {
    for (let line = 0; line + 1 < batch.offsets.length; line += 1) {
      const start = batch.offsets[line] as number;
      const end = batch.offsets[line + 1] as number;
      if (start >= end) continue;
      setStroke(context, batch.colors, start, fallback);
      context.beginPath();
      context.moveTo(batch.positions[start * 2] as number, batch.positions[start * 2 + 1] as number);
      for (let index = start + 1; index < end; index += 1) {
        context.lineTo(batch.positions[index * 2] as number, batch.positions[index * 2 + 1] as number);
      }
      context.stroke();
    }
  } else if (batch.type === 'rectangle') {
    drawScreenRectangles(context, batch.rectangles, 4, batch.colors, fallback);
  } else if (batch.type === 'cell') {
    drawScreenRectangles(context, batch.cells, 5, batch.colors, fallback);
  } else {
    for (let offset = 0, primitive = 0; offset < batch.arcs.length; offset += 6, primitive += 1) {
      const x = batch.arcs[offset] as number;
      const y = batch.arcs[offset + 1] as number;
      const inner = batch.arcs[offset + 2] as number;
      const outer = batch.arcs[offset + 3] as number;
      setFill(context, batch.colors, primitive, fallback);
      context.beginPath();
      context.arc(x, y, outer, batch.arcs[offset + 4] as number, batch.arcs[offset + 5] as number);
      if (inner > 0) context.arc(x, y, inner, batch.arcs[offset + 5] as number, batch.arcs[offset + 4] as number, true);
      else context.lineTo(x, y);
      context.closePath();
      context.fill();
    }
  }
}

function drawScreenRectangles(
  context: CanvasRenderingContext2D,
  values: Float32Array,
  stride: number,
  colors: Uint8Array | undefined,
  fallback: readonly number[],
): void {
  for (let offset = 0, primitive = 0; offset < values.length; offset += stride, primitive += 1) {
    setFill(context, colors, primitive, fallback);
    context.fillRect(values[offset] as number, values[offset + 1] as number, values[offset + 2] as number, values[offset + 3] as number);
  }
}

function setFill(context: CanvasRenderingContext2D, colors: Uint8Array | undefined, index: number, fallback: readonly number[]): void {
  context.fillStyle = colorAt(colors, index, fallback);
}

function setStroke(context: CanvasRenderingContext2D, colors: Uint8Array | undefined, index: number, fallback: readonly number[]): void {
  context.strokeStyle = colorAt(colors, index, fallback);
}

function colorAt(colors: Uint8Array | undefined, index: number, fallback: readonly number[]): string {
  if (colors === undefined || index * 4 + 3 >= colors.length) return rgba(fallback);
  const offset = index * 4;
  return `rgba(${colors[offset]}, ${colors[offset + 1]}, ${colors[offset + 2]}, ${(colors[offset + 3] as number) / 255})`;
}

function dataBatchBytes(batch: ChartDataBatch): number {
  return geometryBytes(batch.geometry) + (batch.colors?.byteLength ?? 0);
}

function geometryBytes(geometry: ChartDataGeometry): number {
  if (geometry.type === 'point' || geometry.type === 'polyline') return geometry.positions.byteLength + (geometry.offsets?.byteLength ?? 0);
  if (geometry.type === 'rectangle') return geometry.segments.byteLength;
  if (geometry.type === 'cell') return geometry.bounds.byteLength;
  return geometry.type === 'arc' ? geometry.arcs.byteLength : 0;
}

function batchBytes(batch: ChartProjectionBatch): number {
  const colors = batch.colors?.byteLength ?? 0;
  if (batch.type === 'point') return batch.positions.byteLength + colors;
  if (batch.type === 'polyline') return batch.positions.byteLength + batch.offsets.byteLength + colors;
  if (batch.type === 'rectangle') return batch.rectangles.byteLength + colors;
  if (batch.type === 'cell') return batch.cells.byteLength + colors;
  return batch.arcs.byteLength + colors;
}

function rgba(color: readonly number[]): string {
  return `rgba(${Math.round((color[0] as number) * 255)}, ${Math.round((color[1] as number) * 255)}, ${Math.round((color[2] as number) * 255)}, ${color[3]})`;
}
