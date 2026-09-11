import assert from 'node:assert/strict';
import test from 'node:test';
import { applyChartPatch, createChartModel } from '../../.verification-dist/model.js';
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

test('sampled radial projection uses retained prefix boundaries without a source scan', () => {
  const size = 10_001;
  const maximumRepresentatives = 17;
  const source = Array.from({ length: size }, (_, id) => ({
    id,
    value: id % 5 + 1,
    innerRadius: 0.25,
    outerRadius: 0.75,
  }));
  const radial = createChartModel({ layers: [{ id: 'radial', profile: 'radial-segment', data: source }] }, { maxDatums: size });
  const input = {
    viewport: { width: 320, height: 200 },
    maximumRepresentatives,
    viewTransform: { xScale: 0.75, xOffset: 4, yScale: 0.5, yOffset: -3 },
  };
  const selected = Array.from({ length: maximumRepresentatives }, (_, index) =>
    Math.floor(index * (size - 1) / (maximumRepresentatives - 1)));
  const assertProjection = (state, values) => {
    const projection = createChartProjection(state, input);
    const batch = projection.batches[0];
    assert.equal(batch.type, 'arc');
    assert.equal(projection.diagnostics.sourceDatums, size);
    assert.equal(projection.diagnostics.representedDatums, maximumRepresentatives);
    assert.equal(projection.diagnostics.fullSourceScans, 0);
    assert.deepEqual([...batch.identityIndices], selected);
    const prefix = new Float64Array(size + 1);
    for (let index = 0; index < size; index += 1) prefix[index + 1] = prefix[index] + values[index].value;
    const total = prefix[size];
    const centerX = input.viewport.width / 2 * input.viewTransform.xScale + input.viewTransform.xOffset;
    const centerY = input.viewport.height / 2 * input.viewTransform.yScale + input.viewTransform.yOffset;
    const radiusScale = Math.min(input.viewport.width, input.viewport.height) / 2
      * Math.min(input.viewTransform.xScale, input.viewTransform.yScale);
    for (let output = 0; output < selected.length; output += 1) {
      const sourceIndex = selected[output];
      const offset = output * CHART_ARC_STRIDE;
      assert.ok(Math.abs(batch.arcs[offset] - centerX) < 1e-5);
      assert.ok(Math.abs(batch.arcs[offset + 1] - centerY) < 1e-5);
      assert.ok(Math.abs(batch.arcs[offset + 2] - 0.25 * radiusScale) < 1e-5);
      assert.ok(Math.abs(batch.arcs[offset + 3] - 0.75 * radiusScale) < 1e-5);
      assert.ok(Math.abs(batch.arcs[offset + 4] - prefix[sourceIndex] / total * Math.PI * 2) < 1e-5);
      assert.ok(Math.abs(batch.arcs[offset + 5] - prefix[sourceIndex + 1] / total * Math.PI * 2) < 1e-5);
    }
  };
  assertProjection(radial, source);

  const changed = [...source];
  changed[5_000] = { ...changed[5_000], value: 50 };
  const repaired = applyChartPatch(radial, {
    operations: [{ type: 'replace', layerID: 'radial', index: 5_000, data: [changed[5_000]] }],
  });
  assertProjection(repaired, changed);

  const zero = createChartModel({ layers: [{
    id: 'zero', profile: 'radial-segment', data: Array.from({ length: 100 }, (_, id) => ({ id, value: 0 })),
  }] });
  const zeroBatch = createChartProjection(zero, {
    viewport: { width: 100, height: 100 }, maximumRepresentatives: 7,
  }).batches[0];
  for (let index = 0; index < zeroBatch.arcs.length / CHART_ARC_STRIDE; index += 1) {
    assert.equal(zeroBatch.arcs[index * CHART_ARC_STRIDE + 4], 0);
    assert.equal(zeroBatch.arcs[index * CHART_ARC_STRIDE + 5], 0);
  }
});

test('rejects invalid viewport and unbounded representative requests', () => {
  assert.equal(tryCreateChartProjection(model, { viewport: { width: 0, height: 100 } }).error.code, 'chart-projection-invalid');
  assert.equal(tryCreateChartProjection(model, {
    viewport: { width: 100, height: 100 }, maximumRepresentatives: 1_000_001,
  }).error.code, 'chart-projection-ceiling-exceeded');
});
