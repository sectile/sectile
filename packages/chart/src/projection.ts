import type { StableID } from '@sectile/core';
import { unwrap } from '@sectile/core/result';
import { getChartModelData, type ChartModelData, type PackedChartLayer } from './internal/model-store.js';
import { chartFail, chartOK } from './internal/result.js';
import type { ChartModelState, ChartProfile } from './model.js';
import type { ChartResult } from './result.js';
import {
  createLinearScale,
  IDENTITY_CHART_VIEW_TRANSFORM,
  tryCreateChartViewTransform,
  type ChartScale,
  type ChartViewTransform,
} from './scale.js';

export interface ChartViewport {
  readonly width: number;
  readonly height: number;
  readonly devicePixelRatio?: number;
}

export interface ChartPointBatch {
  readonly type: 'point';
  readonly layerIndex: number;
  readonly positions: Float32Array;
  readonly identityIndices: Uint32Array;
}

export interface ChartPolylineBatch {
  readonly type: 'polyline';
  readonly layerIndex: number;
  readonly positions: Float32Array;
  readonly offsets: Uint32Array;
  readonly identityIndices: Uint32Array;
}

export interface ChartRectangleBatch {
  readonly type: 'rectangle';
  readonly layerIndex: number;
  readonly rectangles: Float32Array;
  readonly identityIndices: Uint32Array;
}

export interface ChartCellBatch {
  readonly type: 'cell';
  readonly layerIndex: number;
  readonly cells: Float32Array;
  readonly identityIndices: Uint32Array;
}

export interface ChartArcBatch {
  readonly type: 'arc';
  readonly layerIndex: number;
  readonly arcs: Float32Array;
  readonly identityIndices: Uint32Array;
}

export type ChartProjectionBatch =
  | ChartPointBatch
  | ChartPolylineBatch
  | ChartRectangleBatch
  | ChartCellBatch
  | ChartArcBatch;

export interface ChartProjectionDiagnostics {
  readonly sourceDatums: number;
  readonly representedDatums: number;
  readonly emittedPrimitives: number;
}

export interface ChartProjection<ID extends StableID = StableID> {
  readonly generation: number;
  readonly profile: ChartProfile | 'layered';
  readonly viewport: ChartViewport;
  readonly identities: readonly ID[];
  readonly batches: readonly ChartProjectionBatch[];
  readonly diagnostics: ChartProjectionDiagnostics;
}

export interface ChartProjectionInput {
  readonly viewport: ChartViewport;
  readonly maximumRepresentatives?: number;
  readonly xScale?: ChartScale<number>;
  readonly yScale?: ChartScale<number>;
  readonly viewTransform?: ChartViewTransform;
}

export const DEFAULT_MAXIMUM_CHART_REPRESENTATIVES = 100_000;
export const MAXIMUM_CHART_REPRESENTATIVES = 1_000_000;

/** Packed strides consumed directly by Canvas2D and WebGL2 adapters. */
export const CHART_POINT_STRIDE = 2;
export const CHART_RECTANGLE_STRIDE = 4;
export const CHART_CELL_STRIDE = 5;
export const CHART_ARC_STRIDE = 6;

export function createChartProjection<ID extends StableID>(
  model: ChartModelState<ID>,
  input: ChartProjectionInput,
): ChartProjection<ID> {
  return unwrap(tryCreateChartProjection(model, input));
}

export function tryCreateChartProjection<ID extends StableID>(
  model: ChartModelState<ID>,
  input: ChartProjectionInput,
): ChartResult<ChartProjection<ID>> {
  if (input === null || typeof input !== 'object' || !validViewport(input.viewport)) {
    return invalidProjection('Chart projection viewport must have finite positive dimensions and device pixel ratio.');
  }
  const maximum = input.maximumRepresentatives ?? Math.min(model.size, DEFAULT_MAXIMUM_CHART_REPRESENTATIVES);
  if (!Number.isSafeInteger(maximum) || maximum < 0 || maximum > MAXIMUM_CHART_REPRESENTATIVES) {
    return chartFail('resource-rejection', 'chart-projection-ceiling-exceeded', 'Chart representative maximum is invalid or exceeds its ceiling.', {
      maximum,
      ceiling: MAXIMUM_CHART_REPRESENTATIVES,
    });
  }
  const transformResult = tryCreateChartViewTransform(input.viewTransform ?? IDENTITY_CHART_VIEW_TRANSFORM);
  if (!transformResult.ok) return transformResult;
  const data = getChartModelData<ID>(model);
  const bounds = projectionBounds(data.cartesianBounds);
  const xScale = input.xScale ?? createLinearScale(bounds.x, { start: 0, end: input.viewport.width });
  const yScale = input.yScale ?? createLinearScale(bounds.y, { start: input.viewport.height, end: 0 });
  const quotas = representativeQuotas(data.layers, model.size, maximum);
  const batches: ChartProjectionBatch[] = [];
  let representedDatums = 0;
  let emittedPrimitives = 0;
  for (let layerIndex = 0; layerIndex < data.layers.length; layerIndex += 1) {
    const layer = data.layers[layerIndex] as PackedChartLayer<ID>;
    const quota = quotas[layerIndex] ?? 0;
    const selected = selectRepresentativeIndices(layer.identityIndices.length, quota);
    representedDatums += selected.length;
    emittedPrimitives += selected.length;
    const batch = projectLayer(layer, layerIndex, selected, xScale, yScale, transformResult.value, input.viewport);
    if (!batch.ok) return batch;
    if (selected.length > 0) batches.push(batch.value);
  }
  const profiles = new Set(data.layers.map((layer) => layer.profile));
  return chartOK(Object.freeze({
    generation: model.generation,
    profile: profiles.size === 1 ? (data.layers[0]?.profile ?? 'layered') : 'layered',
    viewport: Object.freeze({
      width: input.viewport.width,
      height: input.viewport.height,
      ...(input.viewport.devicePixelRatio === undefined ? {} : { devicePixelRatio: input.viewport.devicePixelRatio }),
    }),
    identities: model.identities,
    batches: Object.freeze(batches),
    diagnostics: Object.freeze({ sourceDatums: model.size, representedDatums, emittedPrimitives }),
  }));
}

interface Bounds { readonly x: { minimum: number; maximum: number }; readonly y: { minimum: number; maximum: number } }

function projectionBounds(bounds: ChartModelData['cartesianBounds']): Bounds {
  if (!bounds.hasValues) return { x: { minimum: 0, maximum: 1 }, y: { minimum: 0, maximum: 1 } };
  let minimumX = bounds.minimumX;
  let maximumX = bounds.maximumX;
  let minimumY = bounds.minimumY;
  let maximumY = bounds.maximumY;
  if (minimumX === maximumX) { minimumX -= 0.5; maximumX += 0.5; }
  if (minimumY === maximumY) { minimumY -= 0.5; maximumY += 0.5; }
  return { x: { minimum: minimumX, maximum: maximumX }, y: { minimum: minimumY, maximum: maximumY } };
}

function representativeQuotas(
  layers: readonly PackedChartLayer[],
  total: number,
  maximum: number,
): Uint32Array {
  const quotas = new Uint32Array(layers.length);
  if (total === 0 || maximum === 0) return quotas;
  if (maximum >= total) {
    for (let index = 0; index < layers.length; index += 1) quotas[index] = layers[index]?.identityIndices.length ?? 0;
    return quotas;
  }
  let assigned = 0;
  for (let index = 0; index < layers.length; index += 1) {
    const size = layers[index]?.identityIndices.length ?? 0;
    const quota = Math.min(size, Math.floor(maximum * size / total));
    quotas[index] = quota;
    assigned += quota;
  }
  for (let index = 0; assigned < maximum && index < layers.length; index += 1) {
    const size = layers[index]?.identityIndices.length ?? 0;
    if ((quotas[index] as number) < size) { quotas[index] = (quotas[index] as number) + 1; assigned += 1; }
  }
  return quotas;
}

function selectRepresentativeIndices(size: number, maximum: number): Uint32Array {
  if (maximum <= 0 || size === 0) return new Uint32Array(0);
  if (maximum >= size) return Uint32Array.from({ length: size }, (_, index) => index);
  if (maximum === 1) return Uint32Array.of(0);
  const selected = new Uint32Array(maximum);
  const denominator = maximum - 1;
  for (let index = 0; index < maximum; index += 1) {
    selected[index] = Math.floor(index * (size - 1) / denominator);
  }
  return selected;
}

function projectLayer<ID extends StableID>(
  layer: PackedChartLayer<ID>,
  layerIndex: number,
  selected: Uint32Array,
  xScale: ChartScale<number>,
  yScale: ChartScale<number>,
  transform: ChartViewTransform,
  viewport: ChartViewport,
): ChartResult<ChartProjectionBatch> {
  if (layer.profile === 'point') return projectPoints(layer, layerIndex, selected, xScale, yScale, transform);
  if (layer.profile === 'ordered-series') return projectPolyline(layer, layerIndex, selected, xScale, yScale, transform);
  if (layer.profile === 'cartesian-segment') return projectRectangles(layer, layerIndex, selected, xScale, yScale, transform);
  if (layer.profile === 'grid-cell') return projectCells(layer, layerIndex, selected, xScale, yScale, transform);
  return projectArcs(layer, layerIndex, selected, viewport, transform);
}

function projectPoints<ID extends StableID>(
  layer: PackedChartLayer<ID>, layerIndex: number, selected: Uint32Array,
  xScale: ChartScale<number>, yScale: ChartScale<number>, transform: ChartViewTransform,
): ChartResult<ChartPointBatch> {
  const positions = new Float32Array(selected.length * CHART_POINT_STRIDE);
  const identities = new Uint32Array(selected.length);
  for (let output = 0; output < selected.length; output += 1) {
    const source = selected[output] as number;
    const x = projectedAxis(layer.values[source * 2] as number, xScale, transform.xScale, transform.xOffset);
    const y = projectedAxis(layer.values[source * 2 + 1] as number, yScale, transform.yScale, transform.yOffset);
    if (x === null || y === null) return invalidProjection('Point cannot be represented by the selected scales.');
    positions[output * 2] = x; positions[output * 2 + 1] = y;
    identities[output] = layer.identityIndices[source] as number;
  }
  return chartOK({ type: 'point', layerIndex, positions, identityIndices: identities });
}

function projectPolyline<ID extends StableID>(
  layer: PackedChartLayer<ID>, layerIndex: number, selected: Uint32Array,
  xScale: ChartScale<number>, yScale: ChartScale<number>, transform: ChartViewTransform,
): ChartResult<ChartPolylineBatch> {
  const point = projectPoints(layer, layerIndex, selected, xScale, yScale, transform);
  return point.ok ? chartOK({
    type: 'polyline', layerIndex, positions: point.value.positions,
    offsets: Uint32Array.of(0, selected.length), identityIndices: point.value.identityIndices,
  }) : point;
}

function projectRectangles<ID extends StableID>(
  layer: PackedChartLayer<ID>, layerIndex: number, selected: Uint32Array,
  xScale: ChartScale<number>, yScale: ChartScale<number>, transform: ChartViewTransform,
): ChartResult<ChartRectangleBatch> {
  const rectangles = new Float32Array(selected.length * CHART_RECTANGLE_STRIDE);
  const identities = new Uint32Array(selected.length);
  for (let output = 0; output < selected.length; output += 1) {
    const source = selected[output] as number;
    const offset = source * 4;
    const x1 = projectedAxis(layer.values[offset] as number, xScale, transform.xScale, transform.xOffset);
    const y1 = projectedAxis(layer.values[offset + 1] as number, yScale, transform.yScale, transform.yOffset);
    const x2 = projectedAxis(layer.values[offset + 2] as number, xScale, transform.xScale, transform.xOffset);
    const y2 = projectedAxis(layer.values[offset + 3] as number, yScale, transform.yScale, transform.yOffset);
    if (x1 === null || y1 === null || x2 === null || y2 === null) return invalidProjection('Rectangle cannot be represented by the selected scales.');
    const target = output * 4;
    rectangles[target] = Math.min(x1, x2); rectangles[target + 1] = Math.min(y1, y2);
    rectangles[target + 2] = Math.abs(x2 - x1); rectangles[target + 3] = Math.abs(y2 - y1);
    identities[output] = layer.identityIndices[source] as number;
  }
  return chartOK({ type: 'rectangle', layerIndex, rectangles, identityIndices: identities });
}

function projectCells<ID extends StableID>(
  layer: PackedChartLayer<ID>, layerIndex: number, selected: Uint32Array,
  xScale: ChartScale<number>, yScale: ChartScale<number>, transform: ChartViewTransform,
): ChartResult<ChartCellBatch> {
  const cells = new Float32Array(selected.length * CHART_CELL_STRIDE);
  const identities = new Uint32Array(selected.length);
  for (let output = 0; output < selected.length; output += 1) {
    const source = selected[output] as number;
    const offset = source * 3;
    const column = layer.values[offset] as number;
    const row = layer.values[offset + 1] as number;
    const x1 = projectedAxis(column, xScale, transform.xScale, transform.xOffset);
    const y1 = projectedAxis(row, yScale, transform.yScale, transform.yOffset);
    const x2 = projectedAxis(column + 1, xScale, transform.xScale, transform.xOffset);
    const y2 = projectedAxis(row + 1, yScale, transform.yScale, transform.yOffset);
    if (x1 === null || y1 === null || x2 === null || y2 === null) return invalidProjection('Cell cannot be represented by the selected scales.');
    const target = output * 5;
    cells[target] = Math.min(x1, x2); cells[target + 1] = Math.min(y1, y2);
    cells[target + 2] = Math.abs(x2 - x1); cells[target + 3] = Math.abs(y2 - y1);
    cells[target + 4] = layer.values[offset + 2] as number;
    identities[output] = layer.identityIndices[source] as number;
  }
  return chartOK({ type: 'cell', layerIndex, cells, identityIndices: identities });
}

function projectArcs<ID extends StableID>(
  layer: PackedChartLayer<ID>, layerIndex: number, selected: Uint32Array,
  viewport: ChartViewport, transform: ChartViewTransform,
): ChartResult<ChartArcBatch> {
  const arcs = new Float32Array(selected.length * CHART_ARC_STRIDE);
  const identities = new Uint32Array(selected.length);
  let total = 0;
  for (let offset = 0; offset < layer.values.length; offset += 3) total += layer.values[offset] as number;
  const radius = Math.min(viewport.width, viewport.height) / 2;
  let cumulative = 0;
  let selectedCursor = 0;
  for (let source = 0; source < layer.identityIndices.length && selectedCursor < selected.length; source += 1) {
    const offset = source * 3;
    const value = layer.values[offset] as number;
    const start = total === 0 ? 0 : cumulative / total * Math.PI * 2;
    cumulative += value;
    if (source !== selected[selectedCursor]) continue;
    const target = selectedCursor * 6;
    arcs[target] = viewport.width / 2 * transform.xScale + transform.xOffset;
    arcs[target + 1] = viewport.height / 2 * transform.yScale + transform.yOffset;
    arcs[target + 2] = (layer.values[offset + 1] as number) * radius * Math.min(transform.xScale, transform.yScale);
    arcs[target + 3] = (layer.values[offset + 2] as number) * radius * Math.min(transform.xScale, transform.yScale);
    arcs[target + 4] = start;
    arcs[target + 5] = total === 0 ? 0 : cumulative / total * Math.PI * 2;
    identities[selectedCursor] = layer.identityIndices[source] as number;
    selectedCursor += 1;
  }
  return chartOK({ type: 'arc', layerIndex, arcs, identityIndices: identities });
}

function projectedAxis(value: number, scale: ChartScale<number>, factor: number, offset: number): number | null {
  const projected = scale.normalize(value);
  if (projected === null) return null;
  const transformed = projected * factor + offset;
  return Number.isFinite(transformed) ? transformed : null;
}

function validViewport(value: ChartViewport): boolean {
  return value !== null && typeof value === 'object'
    && finitePositive(value.width) && finitePositive(value.height)
    && (value.devicePixelRatio === undefined || finitePositive(value.devicePixelRatio));
}

function finitePositive(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function invalidProjection<T>(message: string): ChartResult<T> {
  return chartFail('construction', 'chart-projection-invalid', message);
}
