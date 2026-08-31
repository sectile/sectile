import type { StableID } from '@sectile/core';
import { unwrap } from '@sectile/core/result';
import type { ChartAggregateRepresentative } from './contract.js';
import { projectionQueryIndex, type ProjectionQueryIndex, type QueryNode } from './internal/query-index.js';
import { chartFail, chartOK } from './internal/result.js';
import type { ChartProjection, ChartProjectionBatch } from './projection.js';
import type { ChartResult } from './result.js';

export interface ChartHitTestInput {
  readonly x: number;
  readonly y: number;
  readonly radius?: number;
  readonly maximumHits?: number;
}

interface ChartHitBase {
  readonly kind: 'datum' | 'aggregate';
  readonly layerIndex: number;
  readonly batchIndex: number;
  readonly primitiveIndex: number;
  readonly distanceSquared: number;
}

export interface ChartDatumHit<ID extends StableID = StableID> extends ChartHitBase {
  readonly kind: 'datum';
  readonly id: ID;
  readonly identityIndex: number;
}

export interface ChartAggregateHit extends ChartHitBase {
  readonly kind: 'aggregate';
  readonly id?: never;
  readonly identityIndex?: never;
  readonly representative: ChartAggregateRepresentative;
}

export type ChartHit<ID extends StableID = StableID> = ChartDatumHit<ID> | ChartAggregateHit;

export const DEFAULT_CHART_NEAREST_RADIUS = 40;
export const MAXIMUM_CHART_HITS = 256;

export interface ChartHitTestDiagnostics {
  readonly visitedIndexNodes: number;
  readonly testedPrimitives: number;
  readonly searchedPartitions: number;
}

export interface ChartHitTestInspection<ID extends StableID = StableID> {
  readonly hits: readonly ChartHit<ID>[];
  readonly diagnostics: ChartHitTestDiagnostics;
}

/** Eagerly pays the O(k log k) immutable query-index construction cost. */
export function prepareChartProjectionQueries(projection: ChartProjection): void {
  projectionQueryIndex(projection);
}

export function hitTestChartProjection<ID extends StableID>(
  projection: ChartProjection<ID>,
  input: ChartHitTestInput,
): readonly ChartHit<ID>[] {
  return unwrap(tryHitTestChartProjection(projection, input));
}

/** Runs the production query kernel and reports deterministic work counters. */
export function inspectChartProjectionHitTest<ID extends StableID>(
  projection: ChartProjection<ID>,
  input: ChartHitTestInput,
): ChartHitTestInspection<ID> {
  const diagnostics: MutableDiagnostics = { visitedIndexNodes: 0, testedPrimitives: 0, searchedPartitions: 0 };
  const hits = unwrap(tryHitTestChartProjectionWithDiagnostics(projection, input, diagnostics));
  return Object.freeze({ hits, diagnostics: Object.freeze({ ...diagnostics }) });
}

export function tryHitTestChartProjection<ID extends StableID>(
  projection: ChartProjection<ID>,
  input: ChartHitTestInput,
): ChartResult<readonly ChartHit<ID>[]> {
  return tryHitTestChartProjectionWithDiagnostics(projection, input, null);
}

function tryHitTestChartProjectionWithDiagnostics<ID extends StableID>(
  projection: ChartProjection<ID>,
  input: ChartHitTestInput,
  diagnostics: MutableDiagnostics | null,
): ChartResult<readonly ChartHit<ID>[]> {
  if (input === null || typeof input !== 'object' || !finite(input.x) || !finite(input.y)) return invalidQuery('Chart hit coordinates must be finite.');
  const radius = input.radius ?? DEFAULT_CHART_NEAREST_RADIUS;
  const maximumHits = input.maximumHits ?? 1;
  if (!finite(radius) || radius < 0 || !Number.isSafeInteger(maximumHits)
    || maximumHits < 0 || maximumHits > MAXIMUM_CHART_HITS) {
    return invalidQuery('Chart hit radius or maximum hit count is invalid.');
  }
  if (maximumHits === 0) return chartOK(Object.freeze([]));
  const index = projectionQueryIndex(projection);
  return chartOK(automaticHits(projection, index, input.x, input.y, radius, maximumHits, diagnostics));
}

type MutableHit<ID extends StableID> = ChartHit<ID>;

const POINT_KIND_MASK = 1 << 0;
const AREA_KIND_MASK = (1 << 2) | (1 << 3) | (1 << 4);

interface MutableDiagnostics {
  visitedIndexNodes: number;
  testedPrimitives: number;
  searchedPartitions: number;
}

function queryNode<ID extends StableID>(
  projection: ChartProjection<ID>, index: ProjectionQueryIndex, nodeIndex: number,
  x: number, y: number, radius: number, acceptedKinds: number,
  hits: MutableHit<ID>[], diagnostics: MutableDiagnostics | null,
): void {
  const node = index.nodes[nodeIndex] as QueryNode;
  if (diagnostics !== null) diagnostics.visitedIndexNodes += 1;
  if ((node.kindMask & acceptedKinds) === 0 || !intersects(node, x, y, radius)) return;
  if (node.left >= 0) {
    queryNode(projection, index, node.left, x, y, radius, acceptedKinds, hits, diagnostics);
    queryNode(projection, index, node.right, x, y, radius, acceptedKinds, hits, diagnostics);
    return;
  }
  for (let position = node.start; position < node.start + node.count; position += 1) {
    const record = index.order[position] as number;
    if ((acceptedKinds & (1 << (index.kinds[record] as number))) === 0) continue;
    const boundsOffset = record * 4;
    if (!intersectsBounds(index.bounds, boundsOffset, x, y, radius)) continue;
    if (diagnostics !== null) diagnostics.testedPrimitives += 1;
    const batchIndex = index.batchIndices[record] as number;
    const primitiveIndex = index.primitiveIndices[record] as number;
    const batch = projection.batches[batchIndex] as ChartProjectionBatch;
    const exact = exactHit(batch, primitiveIndex, x, y, radius);
    if (exact === null) continue;
    const hit = hitFor(projection, batchIndex, primitiveIndex, exact.endpoint, exact.distanceSquared);
    if (hit !== null) hits.push(hit);
  }
}

interface RankedHit<ID extends StableID> {
  readonly hit: MutableHit<ID>;
  readonly primaryDistance: number;
  readonly secondaryDistance: number;
}

function automaticHits<ID extends StableID>(
  projection: ChartProjection<ID>, index: ProjectionQueryIndex,
  x: number, y: number, nearestRadius: number, maximumHits: number,
  diagnostics: MutableDiagnostics | null,
): readonly ChartHit<ID>[] {
  if (!insidePlot(projection, x, y)) return Object.freeze([]);

  const areas: MutableHit<ID>[] = [];
  if (index.root >= 0) queryNode(projection, index, index.root, x, y, 0, AREA_KIND_MASK, areas, diagnostics);
  if (areas.length > 0) return finalizeHits(areas, maximumHits, compareHits);

  const lines = nearestPolylineHits(projection, x, y, diagnostics);
  if (lines.length > 0) return finalizeRankedHits(lines, maximumHits);

  const bars = nearestBarHits(projection, index, x, y, diagnostics);
  if (bars.length > 0) return finalizeRankedHits(bars, maximumHits);

  const points: MutableHit<ID>[] = [];
  if (index.root >= 0) queryNode(
    projection, index, index.root, x, y, nearestRadius, POINT_KIND_MASK, points, diagnostics,
  );
  return finalizeHits(points, maximumHits, compareHits);
}

function nearestPolylineHits<ID extends StableID>(
  projection: ChartProjection<ID>, x: number, y: number, diagnostics: MutableDiagnostics | null,
): RankedHit<ID>[] {
  const hits: RankedHit<ID>[] = [];
  for (let batchIndex = 0; batchIndex < projection.batches.length; batchIndex += 1) {
    const batch = projection.batches[batchIndex] as ChartProjectionBatch;
    if (batch.type !== 'polyline' || batch.identityIndices.length === 0) continue;
    if (diagnostics !== null) diagnostics.searchedPartitions += 1;
    const count = batch.identityIndices.length;
    const insertion = lowerBoundPosition(batch.positions, count, x);
    const left = insertion > 0 ? insertion - 1 : -1;
    const right = insertion < count ? insertion : -1;
    const leftDistance = left < 0 ? Number.POSITIVE_INFINITY : Math.abs(x - (batch.positions[left * 2] as number));
    const rightDistance = right < 0 ? Number.POSITIVE_INFINITY : Math.abs(x - (batch.positions[right * 2] as number));
    const nearestDistance = Math.min(leftDistance, rightDistance);
    if (left >= 0 && leftDistance === nearestDistance) {
      appendPolylineCoordinateHits(projection, batch, batchIndex, batch.positions[left * 2] as number, x, y, hits, diagnostics);
    }
    if (right >= 0 && rightDistance === nearestDistance
      && (left < 0 || (batch.positions[right * 2] as number) !== (batch.positions[left * 2] as number))) {
      appendPolylineCoordinateHits(projection, batch, batchIndex, batch.positions[right * 2] as number, x, y, hits, diagnostics);
    }
  }
  return hits;
}

function appendPolylineCoordinateHits<ID extends StableID>(
  projection: ChartProjection<ID>, batch: Extract<ChartProjectionBatch, { readonly type: 'polyline' }>, batchIndex: number,
  coordinate: number, x: number, y: number, hits: RankedHit<ID>[], diagnostics: MutableDiagnostics | null,
): void {
  const count = batch.identityIndices.length;
  const start = lowerBoundPosition(batch.positions, count, coordinate);
  const end = upperBoundPosition(batch.positions, count, coordinate);
  for (let vertex = start; vertex < end; vertex += 1) {
    if (diagnostics !== null) diagnostics.testedPrimitives += 1;
    const px = batch.positions[vertex * 2] as number;
    const py = batch.positions[vertex * 2 + 1] as number;
    const primitive = Math.min(vertex, Math.max(0, count - 2));
    const endpoint: 0 | 1 = vertex > primitive ? 1 : 0;
    const distanceSquared = squared(x - px) + squared(y - py);
    const hit = hitFor(projection, batchIndex, primitive, endpoint, distanceSquared);
    if (hit !== null) hits.push({ hit, primaryDistance: Math.abs(x - px), secondaryDistance: Math.abs(y - py) });
  }
}

function nearestBarHits<ID extends StableID>(
  projection: ChartProjection<ID>, index: ProjectionQueryIndex,
  x: number, y: number, diagnostics: MutableDiagnostics | null,
): RankedHit<ID>[] {
  const hits: RankedHit<ID>[] = [];
  appendNearestBarAxisHits(projection, index, index.verticalBarOrder, 0, x, y, hits, diagnostics);
  appendNearestBarAxisHits(projection, index, index.horizontalBarOrder, 1, y, x, hits, diagnostics);
  return hits;
}

function appendNearestBarAxisHits<ID extends StableID>(
  projection: ChartProjection<ID>, index: ProjectionQueryIndex, order: Uint32Array, axisOffset: 0 | 1,
  coordinate: number, secondaryCoordinate: number, hits: RankedHit<ID>[], diagnostics: MutableDiagnostics | null,
): void {
  if (order.length === 0) return;
  if (diagnostics !== null) diagnostics.searchedPartitions += 1;
  const insertion = lowerBoundRecords(index.bounds, order, axisOffset, coordinate);
  const left = insertion > 0 ? insertion - 1 : -1;
  const right = insertion < order.length ? insertion : -1;
  const leftCenter = left < 0 ? Number.NaN : recordCenter(index.bounds, order[left] as number, axisOffset);
  const rightCenter = right < 0 ? Number.NaN : recordCenter(index.bounds, order[right] as number, axisOffset);
  const leftDistance = left < 0 ? Number.POSITIVE_INFINITY : Math.abs(coordinate - leftCenter);
  const rightDistance = right < 0 ? Number.POSITIVE_INFINITY : Math.abs(coordinate - rightCenter);
  const nearestDistance = Math.min(leftDistance, rightDistance);
  if (left >= 0 && leftDistance === nearestDistance) {
    appendBarCenterHits(projection, index, order, axisOffset, leftCenter, coordinate, secondaryCoordinate, hits, diagnostics);
  }
  if (right >= 0 && rightDistance === nearestDistance && (left < 0 || rightCenter !== leftCenter)) {
    appendBarCenterHits(projection, index, order, axisOffset, rightCenter, coordinate, secondaryCoordinate, hits, diagnostics);
  }
}

function appendBarCenterHits<ID extends StableID>(
  projection: ChartProjection<ID>, index: ProjectionQueryIndex, order: Uint32Array, axisOffset: 0 | 1,
  center: number, coordinate: number, secondaryCoordinate: number,
  hits: RankedHit<ID>[], diagnostics: MutableDiagnostics | null,
): void {
  const start = lowerBoundRecords(index.bounds, order, axisOffset, center);
  const end = upperBoundRecords(index.bounds, order, axisOffset, center);
  const secondaryOffset = axisOffset === 0 ? 1 : 0;
  for (let position = start; position < end; position += 1) {
    if (diagnostics !== null) diagnostics.testedPrimitives += 1;
    const record = order[position] as number;
    const boundsOffset = record * 4;
    const secondaryDistance = distanceToInterval(
      secondaryCoordinate,
      index.bounds[boundsOffset + secondaryOffset] as number,
      index.bounds[boundsOffset + secondaryOffset + 2] as number,
    );
    const primaryDistance = Math.abs(coordinate - center);
    const batchIndex = index.batchIndices[record] as number;
    const primitiveIndex = index.primitiveIndices[record] as number;
    const hit = hitFor(projection, batchIndex, primitiveIndex, 0, squared(primaryDistance) + squared(secondaryDistance));
    if (hit !== null) hits.push({ hit, primaryDistance, secondaryDistance });
  }
}

function hitFor<ID extends StableID>(
  projection: ChartProjection<ID>, batchIndex: number, primitiveIndex: number,
  endpoint: 0 | 1, distanceSquared: number,
): MutableHit<ID> | null {
  const batch = projection.batches[batchIndex] as ChartProjectionBatch;
  const representativeIndex = batch.type === 'polyline'
    ? Math.min(batch.identityIndices.length - 1, primitiveIndex + endpoint)
    : primitiveIndex;
  const representative = batch.representatives?.[representativeIndex];
  if (representative?.kind === 'aggregate') {
    return { kind: 'aggregate', representative, layerIndex: batch.layerIndex, batchIndex, primitiveIndex, distanceSquared };
  }
  const identityIndex = identityFor(batch, primitiveIndex, endpoint);
  const id = representative?.kind === 'datum' ? representative.id as ID : projection.identities[identityIndex];
  return id === undefined
    ? null
    : { kind: 'datum', id, identityIndex, layerIndex: batch.layerIndex, batchIndex, primitiveIndex, distanceSquared };
}

function finalizeHits<ID extends StableID>(
  hits: MutableHit<ID>[], maximumHits: number,
  compare: (left: MutableHit<ID>, right: MutableHit<ID>) => number,
): readonly ChartHit<ID>[] {
  hits.sort(compare);
  if (hits.length > maximumHits) hits.length = maximumHits;
  return Object.freeze(hits.map((hit) => Object.freeze(hit)));
}

function finalizeRankedHits<ID extends StableID>(hits: RankedHit<ID>[], maximumHits: number): readonly ChartHit<ID>[] {
  hits.sort(compareRankedHits);
  if (hits.length > maximumHits) hits.length = maximumHits;
  return Object.freeze(hits.map(({ hit }) => Object.freeze(hit)));
}

function compareRankedHits<ID extends StableID>(left: RankedHit<ID>, right: RankedHit<ID>): number {
  return left.primaryDistance - right.primaryDistance
    || left.secondaryDistance - right.secondaryDistance
    || right.hit.layerIndex - left.hit.layerIndex
    || left.hit.primitiveIndex - right.hit.primitiveIndex;
}

function insidePlot(projection: ChartProjection, x: number, y: number): boolean {
  const plot = projection.layout?.plot ?? { x: 0, y: 0, width: projection.viewport.width, height: projection.viewport.height };
  return x >= plot.x && x <= plot.x + plot.width && y >= plot.y && y <= plot.y + plot.height;
}

function lowerBoundPosition(positions: Float32Array, count: number, coordinate: number): number {
  let low = 0;
  let high = count;
  while (low < high) {
    const middle = (low + high) >>> 1;
    if ((positions[middle * 2] as number) < coordinate) low = middle + 1;
    else high = middle;
  }
  return low;
}

function upperBoundPosition(positions: Float32Array, count: number, coordinate: number): number {
  let low = 0;
  let high = count;
  while (low < high) {
    const middle = (low + high) >>> 1;
    if ((positions[middle * 2] as number) <= coordinate) low = middle + 1;
    else high = middle;
  }
  return low;
}

function lowerBoundRecords(bounds: Float32Array, order: Uint32Array, axisOffset: 0 | 1, coordinate: number): number {
  let low = 0;
  let high = order.length;
  while (low < high) {
    const middle = (low + high) >>> 1;
    if (recordCenter(bounds, order[middle] as number, axisOffset) < coordinate) low = middle + 1;
    else high = middle;
  }
  return low;
}

function upperBoundRecords(bounds: Float32Array, order: Uint32Array, axisOffset: 0 | 1, coordinate: number): number {
  let low = 0;
  let high = order.length;
  while (low < high) {
    const middle = (low + high) >>> 1;
    if (recordCenter(bounds, order[middle] as number, axisOffset) <= coordinate) low = middle + 1;
    else high = middle;
  }
  return low;
}

function recordCenter(bounds: Float32Array, record: number, axisOffset: 0 | 1): number {
  const offset = record * 4 + axisOffset;
  return ((bounds[offset] as number) + (bounds[offset + 2] as number)) * 0.5;
}

function distanceToInterval(value: number, minimum: number, maximum: number): number {
  return value < minimum ? minimum - value : value > maximum ? value - maximum : 0;
}

function exactHit(
  batch: ChartProjectionBatch, primitive: number, x: number, y: number, radius: number,
): { readonly distanceSquared: number; readonly endpoint: 0 | 1 } | null {
  const maximumDistance = radius * radius;
  if (batch.type === 'point') {
    const offset = primitive * 2;
    const distanceSquared = squared(x - (batch.positions[offset] as number)) + squared(y - (batch.positions[offset + 1] as number));
    return distanceSquared <= maximumDistance ? { distanceSquared, endpoint: 0 } : null;
  }
  if (batch.type === 'polyline') {
    const offset = primitive * 2;
    const next = Math.min(offset + 2, batch.positions.length - 2);
    return segmentDistance(
      x, y,
      batch.positions[offset] as number, batch.positions[offset + 1] as number,
      batch.positions[next] as number, batch.positions[next + 1] as number,
      maximumDistance,
    );
  }
  if (batch.type === 'rectangle') return rectangleDistance(batch.rectangles, primitive * 4, x, y, maximumDistance);
  if (batch.type === 'cell') return rectangleDistance(batch.cells, primitive * 5, x, y, maximumDistance);
  const offset = primitive * 6;
  const dx = x - (batch.arcs[offset] as number);
  const dy = y - (batch.arcs[offset + 1] as number);
  const distance = Math.hypot(dx, dy);
  const inner = batch.arcs[offset + 2] as number;
  const outer = batch.arcs[offset + 3] as number;
  const angle = normalizedAngle(Math.atan2(dy, dx));
  const rawStart = batch.arcs[offset + 4] as number;
  const rawEnd = batch.arcs[offset + 5] as number;
  const start = normalizedAngle(rawStart);
  const end = normalizedAngle(rawEnd);
  const inAngle = rawEnd - rawStart >= Math.PI * 2 - 1e-6
    || (start <= end ? angle >= start && angle <= end : angle >= start || angle <= end);
  if (!inAngle || distance < inner - radius || distance > outer + radius) return null;
  const radialDistance = distance < inner ? inner - distance : distance > outer ? distance - outer : 0;
  return { distanceSquared: radialDistance * radialDistance, endpoint: 0 };
}

function segmentDistance(
  x: number, y: number, x1: number, y1: number, x2: number, y2: number, maximumDistance: number,
): { readonly distanceSquared: number; readonly endpoint: 0 | 1 } | null {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lengthSquared = dx * dx + dy * dy;
  const ratio = lengthSquared === 0 ? 0 : Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / lengthSquared));
  const distanceSquared = squared(x - (x1 + ratio * dx)) + squared(y - (y1 + ratio * dy));
  return distanceSquared <= maximumDistance ? { distanceSquared, endpoint: ratio <= 0.5 ? 0 : 1 } : null;
}

function rectangleDistance(
  values: Float32Array, offset: number, x: number, y: number, maximumDistance: number,
): { readonly distanceSquared: number; readonly endpoint: 0 } | null {
  const left = values[offset] as number;
  const top = values[offset + 1] as number;
  const right = left + (values[offset + 2] as number);
  const bottom = top + (values[offset + 3] as number);
  const dx = x < left ? left - x : x > right ? x - right : 0;
  const dy = y < top ? top - y : y > bottom ? y - bottom : 0;
  const distanceSquared = dx * dx + dy * dy;
  return distanceSquared <= maximumDistance ? { distanceSquared, endpoint: 0 } : null;
}

function identityFor(batch: ChartProjectionBatch, primitive: number, endpoint: 0 | 1): number {
  return batch.type === 'polyline'
    ? (batch.identityIndices[Math.min(batch.identityIndices.length - 1, primitive + endpoint)] as number)
    : (batch.identityIndices[primitive] as number);
}

function intersects(node: QueryNode, x: number, y: number, radius: number): boolean {
  return node.minimumX <= x + radius && node.maximumX >= x - radius
    && node.minimumY <= y + radius && node.maximumY >= y - radius;
}

function intersectsBounds(bounds: Float32Array, offset: number, x: number, y: number, radius: number): boolean {
  return (bounds[offset] as number) <= x + radius && (bounds[offset + 2] as number) >= x - radius
    && (bounds[offset + 1] as number) <= y + radius && (bounds[offset + 3] as number) >= y - radius;
}

function compareHits<ID extends StableID>(left: MutableHit<ID>, right: MutableHit<ID>): number {
  return left.distanceSquared - right.distanceSquared || right.layerIndex - left.layerIndex || left.primitiveIndex - right.primitiveIndex;
}

function normalizedAngle(angle: number): number {
  const full = Math.PI * 2;
  const normalized = angle % full;
  return normalized < 0 ? normalized + full : normalized;
}

function invalidQuery<T>(message: string): ChartResult<T> {
  return chartFail('construction', 'chart-query-invalid', message);
}

function squared(value: number): number { return value * value; }
function finite(value: unknown): value is number { return typeof value === 'number' && Number.isFinite(value); }
