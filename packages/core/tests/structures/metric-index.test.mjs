import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createMetricIndex,
  tryCreateMetricIndex,
} from '../../.verification-dist/structures/metric-index.js';

test('lookup, distance, nearest, radius, and forward half-space are deterministic', () => {
  const index = createMetricIndex([
    { id: 'origin', coordinates: [0, 0] },
    { id: 'east-first', coordinates: [1, 0] },
    { id: 'west', coordinates: [-1, 0] },
    { id: 'east-tied', coordinates: [1, 0] },
    { id: 'north', coordinates: [0, 2] },
  ]);
  assert.deepEqual(index.coordinateOf('east-first'), [1, 0]);
  assert.equal(index.coordinateOf('missing'), null);
  assert.equal(index.squaredDistance('east-first', 'north'), 5);
  assert.equal(index.squaredDistance('east-first', 'missing'), null);
  assert.deepEqual(index.nearest([1, 0]), { id: 'east-first', squaredDistance: 0 });
  assert.deepEqual(index.withinRadius([0, 0], 1), [
    { id: 'origin', squaredDistance: 0 },
    { id: 'east-first', squaredDistance: 1 },
    { id: 'west', squaredDistance: 1 },
    { id: 'east-tied', squaredDistance: 1 },
  ]);
  assert.deepEqual(index.forwardNearest([0, 0], [1, 0]), { id: 'east-first', squaredDistance: 1 });
  assert.deepEqual(index.forwardNearest([0, 0], [-1, 0]), { id: 'west', squaredDistance: 1 });
});

test('packed and construction-selected indexed paths agree with brute force across dimensions and distributions', () => {
  for (const dimensions of [1, 2, 3, 4, 8, 32]) {
    for (const distribution of ['uniform', 'clustered', 'collinear', 'duplicate']) {
      const points = makePoints(257, dimensions, distribution);
      const indexes = [
        createMetricIndex(points, { maxItems: 1_000, dimensions }),
        createMetricIndex(points, { maxItems: 1_000, dimensions, expectedQueries: 128 }),
      ];
      const targets = Array.from({ length: 160 }, (_, query) =>
        Array.from({ length: dimensions }, (_, axis) => ((query * 17 + axis * 31) % 101) / 10 - 5));
      const target = targets.at(-1);
      const direction = Array.from({ length: dimensions }, (_, axis) => axis === 0 ? 1 : axis % 2 === 0 ? 0.5 : -0.25);
      for (const index of indexes) {
        for (const query of targets) assert.deepEqual(index.nearest(query), bruteNearest(points, query));
        assert.deepEqual(index.withinRadius(target, 3), bruteRadius(points, target, 3));
        assert.deepEqual(index.forwardNearest(target, direction), bruteForward(points, target, direction));
      }
    }
  }
});

test('100,000-point packed fallback remains exact and bounded', () => {
  const points = makePoints(100_000, 2, 'collinear');
  const index = createMetricIndex(points, { maxItems: 100_000 });
  assert.deepEqual(index.nearest([50_000.25, 0]), { id: 'id-50000', squaredDistance: 0.0625 });
  assert.equal(index.size, 100_000);
});

test('scale, dimension, distribution, and adversarial fallback matrix matches brute force', () => {
  const matrix = [
    [1_000, 1, 'uniform'],
    [1_000, 2, 'duplicate'],
    [1_000, 3, 'clustered'],
    [10_000, 4, 'adversarial'],
    [10_000, 8, 'collinear'],
    [100_000, 32, 'collinear'],
  ];
  for (const [count, dimensions, distribution] of matrix) {
    const points = makePoints(count, dimensions, distribution);
    const indexes = [createMetricIndex(points, { dimensions, maxItems: count })];
    if (dimensions <= 8) indexes.push(createMetricIndex(points, { dimensions, maxItems: count, expectedQueries: 128 }));
    const target = Array.from({ length: dimensions }, (_, axis) => axis === 0 ? count / 2 + 0.25 : axis % 3);
    const direction = Array.from({ length: dimensions }, (_, axis) => axis === 0 ? 1 : 0);
    for (const index of indexes) {
      assert.deepEqual(index.nearest(target), bruteNearest(points, target));
      assert.deepEqual(index.withinRadius(target, 2), bruteRadius(points, target, 2));
      assert.deepEqual(index.forwardNearest(target, direction), bruteForward(points, target, direction));
    }
  }
});

test('representation and crossover state stay absent from the public surface', () => {
  const index = createMetricIndex(makePoints(257, 2, 'uniform'), { dimensions: 2, expectedQueries: 128 });
  assert.deepEqual(Object.keys(index).sort(), [
    'dimensions',
    'ids',
    'maxCoordinateMagnitude',
    'maxDimensions',
    'maxItems',
    'size',
  ]);
  assert.equal('representation' in index, false);
  assert.equal('candidates' in index, false);
  assert.equal('expectedQueries' in index, false);
});

test('construction and query resource contracts reject malformed inputs', () => {
  assert.equal(tryCreateMetricIndex([], {}).error.code, 'invalid-boundary');
  assert.equal(tryCreateMetricIndex([], { dimensions: 2 }).ok, true);
  assert.equal(tryCreateMetricIndex([{ id: 'a', coordinates: [0] }, { id: 'a', coordinates: [1] }]).error.code, 'duplicate-id');
  assert.equal(tryCreateMetricIndex([{ id: 'a', coordinates: [Number.NaN] }]).error.code, 'invalid-boundary');
  assert.equal(tryCreateMetricIndex([{ id: 'a', coordinates: [0, 1] }], { dimensions: 1 }).error.code, 'invalid-boundary');
  assert.equal(tryCreateMetricIndex([{ id: 'a', coordinates: [0] }], { maxItems: 0 }).error.code, 'item-ceiling-exceeded');
  assert.equal(tryCreateMetricIndex([{ id: 'a', coordinates: [0] }], { maxDimensions: 33 }).error.code, 'invalid-boundary');
  assert.equal(tryCreateMetricIndex([{ id: 'a', coordinates: [0] }], { expectedQueries: -1 }).error.code, 'invalid-boundary');
  const index = createMetricIndex([{ id: 'a', coordinates: [0, 0] }]);
  assert.throws(() => index.nearest([0]), { code: 'invalid-boundary' });
  assert.throws(() => index.withinRadius([0, 0], Number.POSITIVE_INFINITY), { code: 'invalid-boundary' });
  assert.throws(() => index.forwardNearest([0, 0], [0, 0]), { code: 'invalid-boundary' });
});

function makePoints(count, dimensions, distribution) {
  return Array.from({ length: count }, (_, index) => ({
    id: `id-${index}`,
    coordinates: Array.from({ length: dimensions }, (_, axis) => {
      if (distribution === 'duplicate') return axis % 2;
      if (distribution === 'collinear') return axis === 0 ? index : 0;
      if (distribution === 'clustered') return ((index % 17) - 8) * 0.01 + (axis % 3);
      if (distribution === 'adversarial') return axis === 0 ? index % 2 : 0;
      return ((index * 73 + axis * 41) % 997) / 10 - 49;
    }),
  }));
}

function bruteNearest(points, target, eligible = () => true) {
  let best = null;
  for (const point of points) {
    if (!eligible(point)) continue;
    const squaredDistance = distance(point.coordinates, target);
    if (best === null || squaredDistance < best.squaredDistance) best = { id: point.id, squaredDistance };
  }
  return best;
}

function bruteRadius(points, target, radius) {
  return points.flatMap((point) => {
    const squaredDistance = distance(point.coordinates, target);
    return squaredDistance <= radius * radius ? [{ id: point.id, squaredDistance }] : [];
  });
}

function bruteForward(points, origin, direction) {
  const scale = Math.max(...direction.map(Math.abs));
  const normalized = direction.map((value) => value / scale);
  return bruteNearest(points, origin, (point) => point.coordinates.reduce(
    (sum, coordinate, axis) => sum + (coordinate - origin[axis]) * normalized[axis],
    0,
  ) > 0);
}

function distance(left, right) {
  return left.reduce((sum, coordinate, axis) => sum + (coordinate - right[axis]) ** 2, 0);
}
