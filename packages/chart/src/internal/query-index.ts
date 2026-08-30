import type { ChartProjection, ChartProjectionBatch } from '../projection.js';

export interface ProjectionQueryIndex {
  readonly order: Uint32Array;
  readonly bounds: Float32Array;
  readonly batchIndices: Uint16Array;
  readonly primitiveIndices: Uint32Array;
  readonly kinds: Uint8Array;
  readonly nodes: readonly QueryNode[];
  readonly root: number;
}

export interface QueryNode {
  readonly minimumX: number;
  readonly minimumY: number;
  readonly maximumX: number;
  readonly maximumY: number;
  readonly left: number;
  readonly right: number;
  readonly start: number;
  readonly count: number;
}

const indexes = new WeakMap<object, ProjectionQueryIndex>();
const LEAF_SIZE = 8;

export function projectionQueryIndex(projection: ChartProjection): ProjectionQueryIndex {
  const retained = indexes.get(projection);
  if (retained !== undefined) return retained;
  const built = buildProjectionQueryIndex(projection);
  indexes.set(projection, built);
  return built;
}

function buildProjectionQueryIndex(projection: ChartProjection): ProjectionQueryIndex {
  const count = primitiveCount(projection.batches);
  const bounds = new Float32Array(count * 4);
  const batchIndices = new Uint16Array(count);
  const primitiveIndices = new Uint32Array(count);
  const kinds = new Uint8Array(count);
  let cursor = 0;
  for (let batchIndex = 0; batchIndex < projection.batches.length; batchIndex += 1) {
    const batch = projection.batches[batchIndex] as ChartProjectionBatch;
    const batchCount = batchPrimitiveCount(batch);
    for (let primitiveIndex = 0; primitiveIndex < batchCount; primitiveIndex += 1) {
      writePrimitiveBounds(batch, primitiveIndex, bounds, cursor * 4);
      batchIndices[cursor] = batchIndex;
      primitiveIndices[cursor] = primitiveIndex;
      kinds[cursor] = kindOf(batch);
      cursor += 1;
    }
  }
  const sortable = Array.from({ length: count }, (_, index) => index);
  const width = projection.viewport.width;
  const height = projection.viewport.height;
  sortable.sort((left, right) => mortonFor(bounds, left, width, height) - mortonFor(bounds, right, width, height));
  const order = Uint32Array.from(sortable);
  const nodes: QueryNode[] = [];
  const root = count === 0 ? -1 : buildNode(order, bounds, nodes, 0, count);
  return { order, bounds, batchIndices, primitiveIndices, kinds, nodes: Object.freeze(nodes), root };
}

function buildNode(order: Uint32Array, bounds: Float32Array, nodes: QueryNode[], start: number, count: number): number {
  let minimumX = Number.POSITIVE_INFINITY;
  let minimumY = Number.POSITIVE_INFINITY;
  let maximumX = Number.NEGATIVE_INFINITY;
  let maximumY = Number.NEGATIVE_INFINITY;
  for (let position = start; position < start + count; position += 1) {
    const offset = (order[position] as number) * 4;
    minimumX = Math.min(minimumX, bounds[offset] as number);
    minimumY = Math.min(minimumY, bounds[offset + 1] as number);
    maximumX = Math.max(maximumX, bounds[offset + 2] as number);
    maximumY = Math.max(maximumY, bounds[offset + 3] as number);
  }
  const nodeIndex = nodes.length;
  nodes.push({ minimumX, minimumY, maximumX, maximumY, left: -1, right: -1, start, count });
  if (count > LEAF_SIZE) {
    const leftCount = count >>> 1;
    const left = buildNode(order, bounds, nodes, start, leftCount);
    const right = buildNode(order, bounds, nodes, start + leftCount, count - leftCount);
    nodes[nodeIndex] = { minimumX, minimumY, maximumX, maximumY, left, right, start: 0, count: 0 };
  }
  return nodeIndex;
}

function primitiveCount(batches: readonly ChartProjectionBatch[]): number {
  let count = 0;
  for (const batch of batches) count += batchPrimitiveCount(batch);
  return count;
}

function batchPrimitiveCount(batch: ChartProjectionBatch): number {
  if (batch.type === 'point') return batch.identityIndices.length;
  if (batch.type === 'polyline') return Math.max(1, batch.identityIndices.length - 1);
  return batch.identityIndices.length;
}

function kindOf(batch: ChartProjectionBatch): number {
  if (batch.type === 'point') return 0;
  if (batch.type === 'polyline') return 1;
  if (batch.type === 'rectangle') return 2;
  if (batch.type === 'cell') return 3;
  return 4;
}

function writePrimitiveBounds(batch: ChartProjectionBatch, primitive: number, output: Float32Array, target: number): void {
  if (batch.type === 'point') {
    const source = primitive * 2;
    const x = batch.positions[source] as number;
    const y = batch.positions[source + 1] as number;
    writeBounds(output, target, x, y, x, y);
  } else if (batch.type === 'polyline') {
    const source = primitive * 2;
    const next = Math.min(source + 2, batch.positions.length - 2);
    const x1 = batch.positions[source] as number;
    const y1 = batch.positions[source + 1] as number;
    const x2 = batch.positions[next] as number;
    const y2 = batch.positions[next + 1] as number;
    writeBounds(output, target, Math.min(x1, x2), Math.min(y1, y2), Math.max(x1, x2), Math.max(y1, y2));
  } else if (batch.type === 'rectangle') {
    const source = primitive * 4;
    const x = batch.rectangles[source] as number;
    const y = batch.rectangles[source + 1] as number;
    writeBounds(output, target, x, y, x + (batch.rectangles[source + 2] as number), y + (batch.rectangles[source + 3] as number));
  } else if (batch.type === 'cell') {
    const source = primitive * 5;
    const x = batch.cells[source] as number;
    const y = batch.cells[source + 1] as number;
    writeBounds(output, target, x, y, x + (batch.cells[source + 2] as number), y + (batch.cells[source + 3] as number));
  } else {
    const source = primitive * 6;
    const x = batch.arcs[source] as number;
    const y = batch.arcs[source + 1] as number;
    const radius = batch.arcs[source + 3] as number;
    writeBounds(output, target, x - radius, y - radius, x + radius, y + radius);
  }
}

function writeBounds(output: Float32Array, offset: number, minX: number, minY: number, maxX: number, maxY: number): void {
  output[offset] = minX; output[offset + 1] = minY; output[offset + 2] = maxX; output[offset + 3] = maxY;
}

function mortonFor(bounds: Float32Array, index: number, width: number, height: number): number {
  const offset = index * 4;
  const x = Math.max(0, Math.min(65_535, Math.floor((((bounds[offset] as number) + (bounds[offset + 2] as number)) * 0.5 / width) * 65_535)));
  const y = Math.max(0, Math.min(65_535, Math.floor((((bounds[offset + 1] as number) + (bounds[offset + 3] as number)) * 0.5 / height) * 65_535)));
  return interleave16(x) | (interleave16(y) << 1);
}

function interleave16(input: number): number {
  let value = input & 0xffff;
  value = (value | (value << 8)) & 0x00ff00ff;
  value = (value | (value << 4)) & 0x0f0f0f0f;
  value = (value | (value << 2)) & 0x33333333;
  value = (value | (value << 1)) & 0x55555555;
  return value;
}
