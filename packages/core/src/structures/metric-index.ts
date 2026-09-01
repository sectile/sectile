import { unwrap } from '../result.js';
import {
  DEFAULT_MAX_ID_CODE_UNITS,
  type ResourceCeilings,
  type Result,
  type StableID,
} from '../shared.js';
import { fail, ok, validateSafeCeiling, validateStableID } from '../internal/kernel/foundation.js';

export interface MetricPoint<ID extends StableID = StableID> {
  readonly id: ID;
  readonly coordinates: readonly number[];
}

export interface MetricMatch<ID extends StableID = StableID> {
  readonly id: ID;
  readonly squaredDistance: number;
}

export interface MetricIndexOptions extends ResourceCeilings {
  readonly dimensions?: number;
  readonly expectedQueries?: number;
  readonly maxItems?: number;
  readonly maxDimensions?: number;
  readonly maxCoordinateMagnitude?: number;
}

export interface MetricIndex<ID extends StableID = StableID> {
  readonly size: number;
  readonly dimensions: number;
  readonly ids: readonly ID[];
  readonly maxItems: number;
  readonly maxDimensions: number;
  readonly maxCoordinateMagnitude: number;
  coordinateOf(id: ID): readonly number[] | null;
  squaredDistance(left: ID, right: ID): number | null;
  nearest(target: readonly number[]): MetricMatch<ID> | null;
  withinRadius(target: readonly number[], radius: number): readonly MetricMatch<ID>[];
  forwardNearest(origin: readonly number[], direction: readonly number[]): MetricMatch<ID> | null;
}

export const DEFAULT_MAX_METRIC_ITEMS = 100_000;
export const MAX_METRIC_ITEMS = 1_000_000;
export const DEFAULT_MAX_METRIC_DIMENSIONS = 32;
export const MAX_METRIC_DIMENSIONS = 32;
export const DEFAULT_MAX_METRIC_COORDINATE_MAGNITUDE = 1e150;

const KD_MIN_ITEMS = 129;
const KD_MAX_DIMENSIONS = 8;
const KD_QUERY_CROSSOVER = 128;

interface MetricLimits {
  readonly dimensions: number;
  readonly maxItems: number;
  readonly maxDimensions: number;
  readonly maxCoordinateMagnitude: number;
  readonly maxIDCodeUnits: number;
  readonly expectedQueries: number;
}

interface KDIndex {
  readonly root: number;
  readonly point: Int32Array;
  readonly left: Int32Array;
  readonly right: Int32Array;
  readonly axis: Uint8Array;
}

interface InternalMatch {
  readonly index: number;
  readonly squaredDistance: number;
}

export function createMetricIndex<ID extends StableID>(
  points: readonly MetricPoint<ID>[],
  options: MetricIndexOptions = {},
): MetricIndex<ID> {
  return unwrap(tryCreateMetricIndex(points, options));
}

export function tryCreateMetricIndex<ID extends StableID>(
  points: readonly MetricPoint<ID>[],
  options: MetricIndexOptions = {},
): Result<MetricIndex<ID>> {
  if (!Array.isArray(points)) return fail('construction', 'invalid-boundary', 'Metric points must be an array.');
  const limits = tryMetricLimits(points, options);
  if (!limits.ok) return limits;
  if (points.length > limits.value.maxItems) {
    return fail('resource-rejection', 'item-ceiling-exceeded', 'Metric point count exceeds maxItems.', {
      size: points.length,
      maxItems: limits.value.maxItems,
    });
  }
  const ids: ID[] = [];
  const indexByID = new Map<ID, number>();
  const coordinates = new Float64Array(points.length * limits.value.dimensions);
  for (let pointIndex = 0; pointIndex < points.length; pointIndex += 1) {
    const point = points[pointIndex];
    if (point === undefined || point === null || typeof point !== 'object') {
      return fail('construction', 'invalid-boundary', 'Every metric point must be an object.', { pointIndex });
    }
    const idError = validateStableID(point.id, limits.value.maxIDCodeUnits);
    if (idError !== null) return { ok: false, error: idError };
    if (indexByID.has(point.id)) {
      return fail('construction', 'duplicate-id', 'Metric point identities must be unique.', { id: point.id, pointIndex });
    }
    if (!Array.isArray(point.coordinates) || point.coordinates.length !== limits.value.dimensions) {
      return fail('construction', 'invalid-boundary', 'Every metric coordinate must match the fixed dimension.', {
        id: point.id,
        expected: limits.value.dimensions,
        actual: Array.isArray(point.coordinates) ? point.coordinates.length : null,
      });
    }
    indexByID.set(point.id, pointIndex);
    ids.push(point.id);
    for (let dimension = 0; dimension < limits.value.dimensions; dimension += 1) {
      const coordinate = point.coordinates[dimension];
      if (!validCoordinate(coordinate, limits.value.maxCoordinateMagnitude)) {
        return fail('construction', 'invalid-boundary', 'Metric coordinates must be finite and within maxCoordinateMagnitude.', {
          id: point.id,
          dimension,
          coordinate,
          maxCoordinateMagnitude: limits.value.maxCoordinateMagnitude,
        });
      }
      coordinates[pointIndex * limits.value.dimensions + dimension] = coordinate;
    }
  }
  const kd = points.length >= KD_MIN_ITEMS
    && limits.value.dimensions <= KD_MAX_DIMENSIONS
    && limits.value.expectedQueries >= KD_QUERY_CROSSOVER
    ? buildKDIndex(coordinates, points.length, limits.value.dimensions)
    : null;
  return ok(Object.freeze(new PackedMetricIndex(Object.freeze(ids), indexByID, coordinates, limits.value, kd)));
}

class PackedMetricIndex<ID extends StableID> implements MetricIndex<ID> {
  readonly #indexByID: ReadonlyMap<ID, number>;
  readonly #coordinates: Float64Array;
  readonly #kd: KDIndex | null;

  public constructor(
    ids: readonly ID[],
    indexByID: ReadonlyMap<ID, number>,
    coordinates: Float64Array,
    limits: MetricLimits,
    kd: KDIndex | null,
  ) {
    this.ids = ids;
    this.#indexByID = indexByID;
    this.#coordinates = coordinates;
    this.size = ids.length;
    this.dimensions = limits.dimensions;
    this.maxItems = limits.maxItems;
    this.maxDimensions = limits.maxDimensions;
    this.maxCoordinateMagnitude = limits.maxCoordinateMagnitude;
    this.#kd = kd;
  }

  public readonly ids: readonly ID[];
  public readonly size: number;
  public readonly dimensions: number;
  public readonly maxItems: number;
  public readonly maxDimensions: number;
  public readonly maxCoordinateMagnitude: number;

  public coordinateOf(id: ID): readonly number[] | null {
    const index = this.#indexByID.get(id);
    if (index === undefined) return null;
    const output = new Array<number>(this.dimensions);
    const offset = index * this.dimensions;
    for (let dimension = 0; dimension < this.dimensions; dimension += 1) output[dimension] = this.#coordinates[offset + dimension] as number;
    return Object.freeze(output);
  }

  public squaredDistance(left: ID, right: ID): number | null {
    const leftIndex = this.#indexByID.get(left);
    const rightIndex = this.#indexByID.get(right);
    return leftIndex === undefined || rightIndex === undefined ? null : this.#distance(leftIndex, rightIndex);
  }

  public nearest(target: readonly number[]): MetricMatch<ID> | null {
    const query = this.#validateVector(target, 'target');
    if (this.size === 0) return null;
    const kd = this.#queryIndex();
    const match = kd === null ? this.#packedNearest(query) : this.#kdNearest(kd, query, null);
    return match === null ? null : this.#publicMatch(match);
  }

  public withinRadius(target: readonly number[], radius: number): readonly MetricMatch<ID>[] {
    const query = this.#validateVector(target, 'target');
    if (typeof radius !== 'number' || !Number.isFinite(radius) || radius < 0 || !Number.isFinite(radius * radius)) {
      return unwrap(fail('construction', 'invalid-boundary', 'radius must be a non-negative finite number with a finite square.', { radius }));
    }
    if (this.size === 0) return Object.freeze([]);
    const squaredRadius = radius * radius;
    const kd = this.#queryIndex();
    const matches = kd === null ? this.#packedRadius(query, squaredRadius) : this.#kdRadius(kd, query, squaredRadius);
    return Object.freeze(matches.map((match) => this.#publicMatch(match)));
  }

  public forwardNearest(origin: readonly number[], direction: readonly number[]): MetricMatch<ID> | null {
    const query = this.#validateVector(origin, 'origin');
    const normalizedDirection = this.#normalizeDirection(direction);
    if (this.size === 0) return null;
    const kd = this.#queryIndex();
    const match = kd === null
      ? this.#packedNearest(query, normalizedDirection)
      : this.#kdNearest(kd, query, normalizedDirection);
    return match === null ? null : this.#publicMatch(match);
  }

  #queryIndex(): KDIndex | null {
    return this.#kd;
  }

  #packedNearest(target: readonly number[], direction: readonly number[] | null = null): InternalMatch | null {
    let bestIndex = -1;
    let bestSquaredDistance = Number.POSITIVE_INFINITY;
    for (let index = 0; index < this.size; index += 1) {
      if (direction !== null && this.#dotFrom(index, target, direction) <= 0) continue;
      const squaredDistance = this.#distanceTo(index, target);
      if (squaredDistance < bestSquaredDistance) {
        bestIndex = index;
        bestSquaredDistance = squaredDistance;
      }
    }
    return bestIndex < 0 ? null : { index: bestIndex, squaredDistance: bestSquaredDistance };
  }

  #packedRadius(target: readonly number[], squaredRadius: number): InternalMatch[] {
    const matches: InternalMatch[] = [];
    if (this.dimensions === 2) {
      const targetX = target[0] as number;
      const targetY = target[1] as number;
      for (let index = 0, offset = 0; index < this.size; index += 1, offset += 2) {
        const deltaX = (this.#coordinates[offset] as number) - targetX;
        const deltaY = (this.#coordinates[offset + 1] as number) - targetY;
        const squaredDistance = deltaX * deltaX + deltaY * deltaY;
        if (squaredDistance <= squaredRadius) matches.push({ index, squaredDistance });
      }
      return matches;
    }
    for (let index = 0; index < this.size; index += 1) {
      const squaredDistance = this.#distanceTo(index, target);
      if (squaredDistance <= squaredRadius) matches.push({ index, squaredDistance });
    }
    return matches;
  }

  #kdNearest(kd: KDIndex, target: readonly number[], direction: readonly number[] | null): InternalMatch | null {
    let bestIndex = -1;
    let bestSquaredDistance = Number.POSITIVE_INFINITY;
    let candidates = 0;
    let aborted = false;
    const visit = (node: number): void => {
      if (node < 0 || aborted) return;
      candidates += 1;
      if (candidates > (this.size >>> 1)) {
        aborted = true;
        return;
      }
      const pointIndex = kd.point[node] as number;
      const axis = kd.axis[node] as number;
      const offset = pointIndex * this.dimensions;
      const delta = target[axis] as number - (this.#coordinates[offset + axis] as number);
      const near = delta <= 0 ? kd.left[node] as number : kd.right[node] as number;
      const far = delta <= 0 ? kd.right[node] as number : kd.left[node] as number;
      visit(near);
      if (direction === null || this.#dotFrom(pointIndex, target, direction) > 0) {
        const squaredDistance = this.#distanceTo(pointIndex, target);
        if (squaredDistance < bestSquaredDistance
          || (squaredDistance === bestSquaredDistance && pointIndex < bestIndex)) {
          bestIndex = pointIndex;
          bestSquaredDistance = squaredDistance;
        }
      }
      if (bestIndex < 0 || delta * delta <= bestSquaredDistance) visit(far);
    };
    visit(kd.root);
    return aborted
      ? this.#packedNearest(target, direction)
      : bestIndex < 0 ? null : { index: bestIndex, squaredDistance: bestSquaredDistance };
  }

  #kdRadius(kd: KDIndex, target: readonly number[], squaredRadius: number): InternalMatch[] {
    const matches: InternalMatch[] = [];
    let candidates = 0;
    let aborted = false;
    const visit = (node: number): void => {
      if (node < 0 || aborted) return;
      candidates += 1;
      if (candidates > (this.size >>> 1)) {
        aborted = true;
        return;
      }
      const pointIndex = kd.point[node] as number;
      const axis = kd.axis[node] as number;
      const offset = pointIndex * this.dimensions;
      const delta = target[axis] as number - (this.#coordinates[offset + axis] as number);
      const squaredDistance = this.#distanceTo(pointIndex, target);
      if (squaredDistance <= squaredRadius) matches.push({ index: pointIndex, squaredDistance });
      visit(delta <= 0 ? kd.left[node] as number : kd.right[node] as number);
      if (delta * delta <= squaredRadius) visit(delta <= 0 ? kd.right[node] as number : kd.left[node] as number);
    };
    visit(kd.root);
    return aborted ? this.#packedRadius(target, squaredRadius) : radixDomainOrder(matches);
  }

  #distance(leftIndex: number, rightIndex: number): number {
    let total = 0;
    const leftOffset = leftIndex * this.dimensions;
    const rightOffset = rightIndex * this.dimensions;
    for (let dimension = 0; dimension < this.dimensions; dimension += 1) {
      const delta = (this.#coordinates[leftOffset + dimension] as number) - (this.#coordinates[rightOffset + dimension] as number);
      total += delta * delta;
    }
    return total;
  }

  #distanceTo(index: number, target: readonly number[]): number {
    let total = 0;
    const offset = index * this.dimensions;
    for (let dimension = 0; dimension < this.dimensions; dimension += 1) {
      const delta = (this.#coordinates[offset + dimension] as number) - (target[dimension] as number);
      total += delta * delta;
    }
    return total;
  }

  #dotFrom(index: number, origin: readonly number[], direction: readonly number[]): number {
    let total = 0;
    const offset = index * this.dimensions;
    for (let dimension = 0; dimension < this.dimensions; dimension += 1) {
      total += ((this.#coordinates[offset + dimension] as number) - (origin[dimension] as number)) * (direction[dimension] as number);
    }
    return total;
  }

  #validateVector(vector: readonly number[], label: string): readonly number[] {
    if (!Array.isArray(vector) || vector.length !== this.dimensions) {
      return unwrap(fail('construction', 'invalid-boundary', `${label} must match the fixed metric dimension.`, {
        expected: this.dimensions,
        actual: Array.isArray(vector) ? vector.length : null,
      }));
    }
    for (let dimension = 0; dimension < this.dimensions; dimension += 1) {
      if (!validCoordinate(vector[dimension], this.maxCoordinateMagnitude)) {
        return unwrap(fail('construction', 'invalid-boundary', `${label} coordinates must be finite and bounded.`, { dimension }));
      }
    }
    return vector;
  }

  #normalizeDirection(direction: readonly number[]): readonly number[] {
    const checked = this.#validateVector(direction, 'direction');
    let scale = 0;
    for (const value of checked) scale = Math.max(scale, Math.abs(value));
    if (scale === 0) return unwrap(fail('construction', 'invalid-boundary', 'direction must be non-zero.'));
    return checked.map((value) => value / scale);
  }

  #publicMatch(match: InternalMatch): MetricMatch<ID> {
    return Object.freeze({ id: this.ids[match.index] as ID, squaredDistance: match.squaredDistance });
  }
}

function tryMetricLimits<ID extends StableID>(points: readonly MetricPoint<ID>[], options: MetricIndexOptions): Result<MetricLimits> {
  const maxItems = options.maxItems ?? DEFAULT_MAX_METRIC_ITEMS;
  const itemError = validateSafeCeiling(maxItems, 'maxItems');
  if (itemError !== null) return { ok: false, error: itemError };
  if (maxItems > MAX_METRIC_ITEMS) return fail('resource-rejection', 'item-ceiling-exceeded', 'maxItems exceeds the MetricIndex hard ceiling.', { maxItems, hardCeiling: MAX_METRIC_ITEMS });
  const maxDimensions = options.maxDimensions ?? DEFAULT_MAX_METRIC_DIMENSIONS;
  if (!Number.isSafeInteger(maxDimensions) || maxDimensions < 1 || maxDimensions > MAX_METRIC_DIMENSIONS) {
    return fail('construction', 'invalid-boundary', 'maxDimensions must be a positive safe integer within the hard ceiling.', { maxDimensions, hardCeiling: MAX_METRIC_DIMENSIONS });
  }
  const inferredDimensions = points[0]?.coordinates?.length;
  const dimensionValue = options.dimensions ?? inferredDimensions;
  if (!Number.isSafeInteger(dimensionValue) || (dimensionValue ?? 0) < 1 || (dimensionValue ?? 0) > maxDimensions) {
    return fail('construction', 'invalid-boundary', 'dimensions must be a positive safe integer within maxDimensions.', { dimensions: dimensionValue, maxDimensions });
  }
  const dimensions = dimensionValue as number;
  const maxCoordinateMagnitude = options.maxCoordinateMagnitude ?? DEFAULT_MAX_METRIC_COORDINATE_MAGNITUDE;
  if (typeof maxCoordinateMagnitude !== 'number' || !Number.isFinite(maxCoordinateMagnitude)
    || maxCoordinateMagnitude <= 0 || maxCoordinateMagnitude > DEFAULT_MAX_METRIC_COORDINATE_MAGNITUDE) {
    return fail('construction', 'invalid-boundary', 'maxCoordinateMagnitude must be finite, positive, and within the hard ceiling.', { maxCoordinateMagnitude });
  }
  const maxIDCodeUnits = options.maxIDCodeUnits ?? DEFAULT_MAX_ID_CODE_UNITS;
  const idError = validateSafeCeiling(maxIDCodeUnits, 'maxIDCodeUnits', 1);
  if (idError !== null) return { ok: false, error: idError };
  const expectedQueries = options.expectedQueries ?? 0;
  if (!Number.isSafeInteger(expectedQueries) || expectedQueries < 0) {
    return fail('construction', 'invalid-boundary', 'expectedQueries must be a non-negative safe integer.', { expectedQueries });
  }
  return ok(Object.freeze({ dimensions, maxItems, maxDimensions, maxCoordinateMagnitude, maxIDCodeUnits, expectedQueries }));
}

function buildKDIndex(coordinates: Float64Array, size: number, dimensions: number): KDIndex {
  const orders = Array.from({ length: dimensions }, (_, axis) =>
    Array.from({ length: size }, (_unused, index) => index).sort((left, right) => {
      const compared = (coordinates[left * dimensions + axis] as number) - (coordinates[right * dimensions + axis] as number);
      return compared || left - right;
    }));
  const point = new Int32Array(size);
  const left = new Int32Array(size);
  const right = new Int32Array(size);
  const axisByNode = new Uint8Array(size);
  left.fill(-1);
  right.fill(-1);
  let nodeCount = 0;
  const build = (active: readonly (readonly number[])[], depth: number): number => {
    const length = active[0]?.length ?? 0;
    if (length === 0) return -1;
    const axis = depth % dimensions;
    const axisOrder = active[axis] as readonly number[];
    const middle = length >>> 1;
    const pointIndex = axisOrder[middle] as number;
    const leftMembers = new Set(axisOrder.slice(0, middle));
    const leftOrders: number[][] = [];
    const rightOrders: number[][] = [];
    for (let orderedAxis = 0; orderedAxis < dimensions; orderedAxis += 1) {
      const leftOrder: number[] = [];
      const rightOrder: number[] = [];
      for (const candidate of active[orderedAxis] as readonly number[]) {
        if (candidate === pointIndex) continue;
        if (leftMembers.has(candidate)) leftOrder.push(candidate);
        else rightOrder.push(candidate);
      }
      leftOrders.push(leftOrder);
      rightOrders.push(rightOrder);
    }
    const node = nodeCount;
    nodeCount += 1;
    point[node] = pointIndex;
    axisByNode[node] = axis;
    left[node] = build(leftOrders, depth + 1);
    right[node] = build(rightOrders, depth + 1);
    return node;
  };
  return Object.freeze({ root: build(orders, 0), point, left, right, axis: axisByNode });
}

function radixDomainOrder(matches: InternalMatch[]): InternalMatch[] {
  if (matches.length < 2) return matches;
  let input = matches;
  let output = new Array<InternalMatch>(matches.length);
  const counts = new Uint32Array(256);
  for (let shift = 0; shift < 24; shift += 8) {
    counts.fill(0);
    for (const match of input) {
      const bucket = (match.index >>> shift) & 255;
      counts[bucket] = (counts[bucket] as number) + 1;
    }
    let offset = 0;
    for (let bucket = 0; bucket < counts.length; bucket += 1) {
      const count = counts[bucket] as number;
      counts[bucket] = offset;
      offset += count;
    }
    for (const match of input) {
      const bucket = (match.index >>> shift) & 255;
      output[counts[bucket] as number] = match;
      counts[bucket] = (counts[bucket] as number) + 1;
    }
    const swap = input;
    input = output;
    output = swap;
  }
  return input;
}

function validCoordinate(value: unknown, maxMagnitude: number): value is number {
  return typeof value === 'number' && Number.isFinite(value) && Math.abs(value) <= maxMagnitude;
}
