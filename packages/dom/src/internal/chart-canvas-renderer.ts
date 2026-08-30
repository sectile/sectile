import type { ChartProjection, ChartProjectionBatch } from '@sectile/chart/projection';
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
    let uploadedBytes = 0;
    let drawCalls = 0;
    for (const batch of batches) {
      uploadedBytes += batchBytes(batch);
      drawBatch(context, batch, this.#style.pointRadius);
      drawCalls += 1;
    }
    this.#diagnostics = Object.freeze({ mode: 'canvas2d', uploadedBytes, drawCalls, liveResources: 1 });
  }

  public getDiagnostics(): ChartRendererDiagnostics { return this.#diagnostics; }
  public flush(): void {}
  public disconnect(): void {
    if (!this.#active) return;
    this.#active = false;
    this.#diagnostics = Object.freeze({ ...this.#diagnostics, liveResources: 0 });
  }
}

function drawBatch(context: CanvasRenderingContext2D, batch: ChartProjectionBatch, pointRadius: number): void {
  if (batch.type === 'point') {
    context.beginPath();
    for (let offset = 0; offset < batch.positions.length; offset += 2) {
      context.moveTo((batch.positions[offset] as number) + pointRadius, batch.positions[offset + 1] as number);
      context.arc(batch.positions[offset] as number, batch.positions[offset + 1] as number, pointRadius, 0, Math.PI * 2);
    }
    context.fill();
  } else if (batch.type === 'polyline') {
    for (let line = 0; line + 1 < batch.offsets.length; line += 1) {
      const start = batch.offsets[line] as number;
      const end = batch.offsets[line + 1] as number;
      if (start >= end) continue;
      context.beginPath();
      context.moveTo(batch.positions[start * 2] as number, batch.positions[start * 2 + 1] as number);
      for (let index = start + 1; index < end; index += 1) {
        context.lineTo(batch.positions[index * 2] as number, batch.positions[index * 2 + 1] as number);
      }
      context.stroke();
    }
  } else if (batch.type === 'rectangle') {
    for (let offset = 0; offset < batch.rectangles.length; offset += 4) {
      context.fillRect(batch.rectangles[offset] as number, batch.rectangles[offset + 1] as number, batch.rectangles[offset + 2] as number, batch.rectangles[offset + 3] as number);
    }
  } else if (batch.type === 'cell') {
    for (let offset = 0; offset < batch.cells.length; offset += 5) {
      context.fillRect(batch.cells[offset] as number, batch.cells[offset + 1] as number, batch.cells[offset + 2] as number, batch.cells[offset + 3] as number);
    }
  } else {
    for (let offset = 0; offset < batch.arcs.length; offset += 6) {
      const x = batch.arcs[offset] as number;
      const y = batch.arcs[offset + 1] as number;
      const inner = batch.arcs[offset + 2] as number;
      const outer = batch.arcs[offset + 3] as number;
      const start = batch.arcs[offset + 4] as number;
      const end = batch.arcs[offset + 5] as number;
      context.beginPath();
      context.arc(x, y, outer, start, end);
      if (inner > 0) context.arc(x, y, inner, end, start, true);
      else context.lineTo(x, y);
      context.closePath();
      context.fill();
    }
  }
}

function batchBytes(batch: ChartProjectionBatch): number {
  if (batch.type === 'point') return batch.positions.byteLength;
  if (batch.type === 'polyline') return batch.positions.byteLength + batch.offsets.byteLength;
  if (batch.type === 'rectangle') return batch.rectangles.byteLength;
  if (batch.type === 'cell') return batch.cells.byteLength;
  return batch.arcs.byteLength;
}

function rgba(color: readonly number[]): string {
  return `rgba(${Math.round((color[0] as number) * 255)}, ${Math.round((color[1] as number) * 255)}, ${Math.round((color[2] as number) * 255)}, ${color[3]})`;
}
