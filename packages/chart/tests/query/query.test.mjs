import assert from 'node:assert/strict';
import test from 'node:test';
import { createChartModel } from '../../.verification-dist/model.js';
import { createChartProjection } from '../../.verification-dist/projection.js';
import { hitTestChartProjection, tryHitTestChartProjection } from '../../.verification-dist/query.js';

function project(layers) {
  return createChartProjection(createChartModel({ layers }), { viewport: { width: 100, height: 100 } });
}

test('packed query index resolves points, line segments, rectangles, cells, and arcs', () => {
  const cases = [
    [project([{ id: 'p', profile: 'point', data: [{ id: 1, x: 0, y: 0 }, { id: 2, x: 10, y: 10 }] }]), { x: 1, y: 99 }, 1],
    [project([{ id: 'l', profile: 'ordered-series', data: [{ id: 1, x: 0, y: 0 }, { id: 2, x: 10, y: 10 }] }]), { x: 75, y: 25 }, 2],
    [project([{ id: 'r', profile: 'cartesian-segment', data: [{ id: 1, x1: 0, y1: 0, x2: 10, y2: 10 }] }]), { x: 50, y: 50 }, 1],
    [project([{ id: 'c', profile: 'grid-cell', data: [{ id: 1, column: 0, row: 0, value: 5 }] }]), { x: 50, y: 50 }, 1],
    [project([{ id: 'a', profile: 'radial-segment', data: [{ id: 1, value: 1 }] }]), { x: 90, y: 50 }, 1],
  ];
  for (const [projection, coordinate, expected] of cases) {
    assert.equal(hitTestChartProjection(projection, { ...coordinate, radius: 4 })[0].id, expected);
  }
});

test('hit ordering prefers distance then visually later layers', () => {
  const projection = project([
    { id: 'back', profile: 'point', data: [{ id: 1, x: 0, y: 0 }, { id: 2, x: 1, y: 1 }] },
    { id: 'front', profile: 'point', data: [{ id: '1', x: 0, y: 0 }, { id: '2', x: 1, y: 1 }] },
  ]);
  const hits = hitTestChartProjection(projection, { x: 0, y: 100, radius: 1, maximumHits: 2 });
  assert.deepEqual(hits.map((hit) => hit.id), ['1', 1]);
});

test('query ceilings and invalid coordinates fail before index construction', () => {
  const projection = project([{ id: 'p', profile: 'point', data: [{ id: 1, x: 0, y: 0 }] }]);
  assert.equal(tryHitTestChartProjection(projection, { x: Number.NaN, y: 0 }).error.code, 'chart-query-invalid');
  assert.equal(tryHitTestChartProjection(projection, { x: 0, y: 0, maximumHits: 257 }).error.code, 'chart-query-invalid');
});
