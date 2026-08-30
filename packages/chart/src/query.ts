import type { StableID } from '@sectile/core';
import { unwrap } from '@sectile/core/result';
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

export interface ChartHit<ID extends StableID = StableID> {
  readonly id: ID;
  readonly identityIndex: number;
  readonly layerIndex: number;
  readonly batchIndex: number;
  readonly primitiveIndex: number;
  readonly distanceSquared: number;
}

export const DEFAULT_CHART_HIT_RADIUS = 8;
export const MAXIMUM_CHART_HITS = 256;

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

export function tryHitTestChartProjection<ID extends StableID>(
  projection: ChartProjection<ID>,
  input: ChartHitTestInput,
): ChartResult<readonly ChartHit<ID>[]> {
  if (input === null || typeof input !== 'object' || !finite(input.x) || !finite(input.y)) return invalidQuery('Chart hit coordinates must be finite.');
  const radius = input.radius ?? DEFAULT_CHART_HIT_RADIUS;
  const maximumHits = input.maximumHits ?? 1;
  if (!finite(radius) || radius < 0 || !Number.isSafeInteger(maximumHits) || maximumHits < 0 || maximumHits > MAXIMUM_CHART_HITS) {
    return invalidQuery('Chart hit radius or maximum hit count is invalid.');
  }
  if (maximumHits === 0) return chartOK(Object.freeze([]));
  const index = projectionQueryIndex(projection);
  const hits: MutableHit<ID>[] = [];
  if (index.root >= 0) queryNode(projection, index, index.root, input.x, input.y, radius, hits);
  hits.sort(compareHits);
  if (hits.length > maximumHits) hits.length = maximumHits;
  return chartOK(Object.freeze(hits.map((hit) => Object.freeze(hit))));
}

type MutableHit<ID extends StableID> = ChartHit<ID>;

function queryNode<ID extends StableID>(
  projection: ChartProjection<ID>, index: ProjectionQueryIndex, nodeIndex: number,
  x: number, y: number, radius: number, hits: MutableHit<ID>[],
): void {
  const node = index.nodes[nodeIndex] as QueryNode;
  if (!intersects(node, x, y, radius)) return;
  if (node.left >= 0) {
    queryNode(projection, index, node.left, x, y, radius, hits);
    queryNode(projection, index, node.right, x, y, radius, hits);
    return;
  }
  for (let position = node.start; position < node.start + node.count; position += 1) {
    const record = index.order[position] as number;
    const boundsOffset = record * 4;
    if (!intersectsBounds(index.bounds, boundsOffset, x, y, radius)) continue;
    const batchIndex = index.batchIndices[record] as number;
    const primitiveIndex = index.primitiveIndices[record] as number;
    const batch = projection.batches[batchIndex] as ChartProjectionBatch;
    const exact = exactHit(batch, primitiveIndex, x, y, radius);
    if (exact === null) continue;
    const identityIndex = identityFor(batch, primitiveIndex, exact.endpoint);
    const id = projection.identities[identityIndex];
    if (id === undefined) continue;
    hits.push({ id, identityIndex, layerIndex: batch.layerIndex, batchIndex, primitiveIndex, distanceSquared: exact.distanceSquared });
  }
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
