import assert from 'node:assert/strict';
import test from 'node:test';
import { createChartDefinition, replaceChartDefinition } from '../../.verification-dist/definition.js';
import { createChartProjection, tryCreateChartProjection } from '../../.verification-dist/projection.js';
import { hitTestChartProjection } from '../../.verification-dist/query.js';

const axes = [
  { id: 'x', orientation: 'x', scale: 'linear' },
  { id: 'y', orientation: 'y', scale: 'linear' },
];

test('uses a bounded retained envelope for ordered series without fabricated identities', () => {
  const data = Array.from({ length: 4_096 }, (_, id) => ({ id, x: id, y: Math.sin(id / 8) * 100 }));
  const source = createChartDefinition({
    coordinate: { kind: 'cartesian', axes },
    layers: [{ id: 'line', kind: 'line', xAxis: 'x', yAxis: 'y', data }],
  });
  const projection = createChartProjection(source, {
    viewport: { width: 80, height: 180 }, insets: { top: 8, right: 8, bottom: 24, left: 24 }, maximumRepresentatives: 192,
  });
  assert.ok(projection.batches[0].identityIndices.length <= 192);
  assert.ok(projection.diagnostics.visitedIndexNodes > 0);
  assert.equal(projection.diagnostics.fullSourceScans, 0);
  assert.ok(projection.batches[0].representatives.every((representative) => representative.kind === 'datum'));
  const exact = createChartProjection(source, {
    viewport: { width: 80, height: 180 }, insets: { top: 8, right: 8, bottom: 24, left: 24 }, maximumRepresentatives: data.length,
  });
  assert.deepEqual(rasterEnvelope(projection.batches[0].positions, 80), rasterEnvelope(exact.batches[0].positions, 80));
});

function rasterEnvelope(positions, width) {
  const minimum = new Float64Array(width).fill(Number.POSITIVE_INFINITY);
  const maximum = new Float64Array(width).fill(Number.NEGATIVE_INFINITY);
  for (let index = 0; index + 1 < positions.length / 2; index += 1) {
    const x1 = positions[index * 2]; const y1 = positions[index * 2 + 1];
    const x2 = positions[index * 2 + 2]; const y2 = positions[index * 2 + 3];
    const start = Math.max(0, Math.floor(Math.min(x1, x2)));
    const end = Math.min(width - 1, Math.floor(Math.max(x1, x2)));
    for (let column = start; column <= end; column += 1) {
      const left = Math.max(Math.min(x1, x2), column);
      const right = Math.min(Math.max(x1, x2), column + 1);
      const leftRatio = x1 === x2 ? 0 : (left - x1) / (x2 - x1);
      const rightRatio = x1 === x2 ? 1 : (right - x1) / (x2 - x1);
      const leftY = y1 + (y2 - y1) * leftRatio;
      const rightY = y1 + (y2 - y1) * rightRatio;
      minimum[column] = Math.min(minimum[column], leftY, rightY);
      maximum[column] = Math.max(maximum[column], leftY, rightY);
    }
  }
  return [...minimum].map((value, index) => [
    Number.isFinite(value) ? Number(value.toFixed(4)) : null,
    Number.isFinite(maximum[index]) ? Number(maximum[index].toFixed(4)) : null,
  ]);
}

test('rejects over-ceiling raw scatter and exposes explicit density aggregates', () => {
  const data = Array.from({ length: 1_024 }, (_, id) => ({ id, x: id % 32, y: Math.floor(id / 32) }));
  const raw = createChartDefinition({
    coordinate: { kind: 'cartesian', axes },
    layers: [{ id: 'scatter', kind: 'scatter', xAxis: 'x', yAxis: 'y', projection: 'raw', data }],
  });
  assert.equal(tryCreateChartProjection(raw, {
    viewport: { width: 320, height: 180 }, maximumRepresentatives: 32,
  }).error.code, 'chart-projection-ceiling-exceeded');

  const density = createChartDefinition({
    coordinate: { kind: 'cartesian', axes },
    layers: [{ id: 'scatter', kind: 'scatter', xAxis: 'x', yAxis: 'y', projection: 'density', data }],
  });
  const projection = createChartProjection(density, { viewport: { width: 320, height: 180 }, maximumRepresentatives: 32 });
  assert.ok(projection.batches[0].representatives.every((representative) => representative.kind === 'aggregate'));
  const first = projection.batches[0].cells;
  const hit = hitTestChartProjection(projection, { x: first[0], y: first[1], radius: 2 })[0];
  assert.equal(hit.kind, 'aggregate');
  assert.equal('id' in hit, false);
});

test('preserves heatmap data geometry while value colors and datum delta update', () => {
  const definition = (value) => ({
    coordinate: { kind: 'cartesian', axes: [
      { id: 'column', orientation: 'x', scale: 'categorical', field: 'column' },
      { id: 'row', orientation: 'y', scale: 'categorical', field: 'row' },
    ] },
    layers: [{ id: 'heat', kind: 'heatmap', xAxis: 'column', yAxis: 'row', data: [
      { id: 'minimum', column: 'A', row: 'R1', value: 0 },
      { id: 'cell', column: 'B', row: 'R1', value },
      { id: 'maximum', column: 'C', row: 'R1', value: 10 },
    ] }],
  });
  const initial = createChartDefinition(definition(1));
  const before = createChartProjection(initial, { viewport: { width: 240, height: 160 } });
  const next = replaceChartDefinition(initial, definition(9));
  const after = createChartProjection(next, { viewport: { width: 240, height: 160 }, previous: before });
  assert.equal(after.dataBatches[0].geometry, before.dataBatches[0].geometry);
  assert.notDeepEqual(after.batches[0].colors, before.batches[0].colors);
  assert.deepEqual(after.delta, { enter: [], update: ['cell'], exit: [] });
  assert.equal(after.diagnostics.reusedBatches, 1);
});

test('requires explicit heatmap reduction and never samples exact bars or radial segments', () => {
  const heatData = Array.from({ length: 256 }, (_, id) => ({ id, x: id % 16, y: Math.floor(id / 16), value: id + 1 }));
  const reducedHeat = createChartDefinition({
    coordinate: { kind: 'cartesian', axes },
    layers: [{
      id: 'heat', kind: 'heatmap', xAxis: 'x', yAxis: 'y',
      projection: { kind: 'aggregate', reduction: 'sum' }, data: heatData,
    }],
  });
  const reduced = createChartProjection(reducedHeat, { viewport: { width: 240, height: 160 }, maximumRepresentatives: 16 });
  assert.equal(reduced.batches[0].reduction, 'sum');
  assert.ok(reduced.batches[0].representatives.every((representative) => representative.kind === 'aggregate'));

  const categories = Array.from({ length: 20 }, (_, id) => `C${id}`);
  const bars = createChartDefinition({
    coordinate: { kind: 'cartesian', axes: [
      { id: 'category', orientation: 'x', scale: 'categorical', field: 'category', domain: { kind: 'categorical', values: categories } },
      { id: 'value', orientation: 'y', scale: 'linear', field: 'value' },
    ] },
    layers: [{ id: 'bars', kind: 'bar', xAxis: 'category', yAxis: 'value', data: categories.map((category, id) => ({ id, category, value: id })) }],
  });
  assert.equal(tryCreateChartProjection(bars, {
    viewport: { width: 240, height: 160 }, maximumRepresentatives: 10,
  }).error.code, 'chart-projection-ceiling-exceeded');

  const pie = createChartDefinition({
    coordinate: { kind: 'radial' },
    layers: [{ id: 'share', kind: 'pie', data: categories.map((_, id) => ({ id, value: id + 1 })) }],
  });
  assert.equal(tryCreateChartProjection(pie, {
    viewport: { width: 200, height: 200 }, maximumRepresentatives: 10,
  }).error.code, 'chart-projection-ceiling-exceeded');
});

test('projects zero-total pie as a deterministic empty result', () => {
  const source = createChartDefinition({
    coordinate: { kind: 'radial' },
    layers: [{ id: 'share', kind: 'donut', innerRadius: 0.5, data: [{ id: 1, value: 0 }] }],
  });
  const projection = createChartProjection(source, { viewport: { width: 200, height: 200 } });
  assert.deepEqual(projection.batches, []);
  assert.deepEqual(projection.dataBatches, []);
});
