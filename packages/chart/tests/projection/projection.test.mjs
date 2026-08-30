import assert from 'node:assert/strict';
import test from 'node:test';
import { createChartModel } from '../../.verification-dist/model.js';
import {
  CHART_ARC_STRIDE,
  CHART_CELL_STRIDE,
  CHART_POINT_STRIDE,
  CHART_RECTANGLE_STRIDE,
  createChartProjection,
  tryCreateChartProjection,
} from '../../.verification-dist/projection.js';

const model = createChartModel({ layers: [
  { id: 'points', profile: 'point', data: [{ id: 1, x: 0, y: 0 }, { id: '2', x: 10, y: 10 }] },
  { id: 'line', profile: 'ordered-series', data: [{ id: 3, x: 0, y: 10 }, { id: 4, x: 10, y: 0 }] },
  { id: 'bar', profile: 'cartesian-segment', data: [{ id: 5, x1: 2, y1: 0, x2: 4, y2: 6 }] },
  { id: 'heat', profile: 'grid-cell', data: [{ id: 6, column: 1, row: 2, value: 9 }] },
  { id: 'pie', profile: 'radial-segment', data: [{ id: 7, value: 1 }, { id: 8, value: 3, innerRadius: 0.5 }] },
] });

test('projects all five semantic profiles into renderer-neutral packed batches', () => {
  const projection = createChartProjection(model, { viewport: { width: 200, height: 100 } });
  assert.equal(projection.profile, 'layered');
  assert.deepEqual(projection.batches.map((batch) => batch.type), ['point', 'polyline', 'rectangle', 'cell', 'arc']);
  assert.equal(projection.batches[0].positions.length, 2 * CHART_POINT_STRIDE);
  assert.equal(projection.batches[2].rectangles.length, CHART_RECTANGLE_STRIDE);
  assert.equal(projection.batches[3].cells.length, CHART_CELL_STRIDE);
  assert.equal(projection.batches[4].arcs.length, 2 * CHART_ARC_STRIDE);
  assert.deepEqual(projection.batches[4].arcs.slice(4, 6), new Float32Array([0, Math.PI / 2]));
  assert.equal(projection.diagnostics.sourceDatums, 8);
  assert.equal(projection.diagnostics.representedDatums, 8);
});

test('representative ceilings bound emitted primitives deterministically', () => {
  const projection = createChartProjection(model, {
    viewport: { width: 200, height: 100, devicePixelRatio: 2 },
    maximumRepresentatives: 3,
  });
  assert.equal(projection.diagnostics.representedDatums, 3);
  assert.equal(projection.diagnostics.emittedPrimitives, 3);
  assert.deepEqual(projection.batches.flatMap((batch) => [...batch.identityIndices]), [0, 2, 4]);
});

test('rejects invalid viewport and unbounded representative requests', () => {
  assert.equal(tryCreateChartProjection(model, { viewport: { width: 0, height: 100 } }).error.code, 'chart-projection-invalid');
  assert.equal(tryCreateChartProjection(model, {
    viewport: { width: 100, height: 100 }, maximumRepresentatives: 1_000_001,
  }).error.code, 'chart-projection-ceiling-exceeded');
});
