import assert from 'node:assert/strict';
import test from 'node:test';
import { createChartDefinition, tryCreateChartDefinition } from '../../.verification-dist/definition.js';

test('resolves Date and epoch values into identical Cartesian domains and geometry', () => {
  const create = (observedAt) => createChartDefinition({
    coordinate: { kind: 'cartesian', axes: [
      { id: 1, orientation: 'x', scale: 'temporal', field: 'observedAt' },
      { id: 'revenue', orientation: 'y', scale: 'linear', field: 'revenue', unit: 'usd' },
    ] },
    layers: [{ id: 'series', kind: 'line', xAxis: 1, yAxis: 'revenue', data: [
      { id: 'a', observedAt: observedAt(0), revenue: 10 },
      { id: 'b', observedAt: observedAt(1_000), revenue: 20 },
    ] }],
  });
  const dates = create((value) => new Date(value));
  const epochs = create((value) => value);
  assert.deepEqual(dates.axes, epochs.axes);
  assert.deepEqual(dates.model.toModel(), epochs.model.toModel());
  assert.equal(dates.model.toModel().layers[0].data[1].x, 1_000);
});

test('compiles categorical bars with a zero baseline and time/category heatmap edges', () => {
  const state = createChartDefinition({
    coordinate: { kind: 'cartesian', axes: [
      { id: 'month', orientation: 'x', scale: 'temporal', field: 'month' },
      { id: 'team', orientation: 'y', scale: 'categorical', field: 'team' },
      { id: 'category', orientation: 'x', scale: 'categorical', field: 'category' },
      { id: 'amount', orientation: 'y', scale: 'linear', field: 'amount' },
    ] },
    layers: [
      { id: 'bars', kind: 'bar', xAxis: 'category', yAxis: 'amount', data: [{ id: 'b', category: 'A', amount: 12 }] },
      { id: 'heat', kind: 'heatmap', xAxis: 'month', yAxis: 'team', data: [
        { id: 'h1', month: new Date(0), team: 'A', value: 3 },
        { id: 'h2', month: new Date(1_000), team: 'B', value: 7 },
      ] },
    ],
  });
  assert.deepEqual(state.model.toModel().layers[0].data[0], { id: 'b', x1: 0, y1: 0, x2: 1, y2: 12 });
  assert.deepEqual([...state.layers[1].heatmap.xEdges], [-500, 500, 1_500]);
  assert.deepEqual([...state.layers[1].heatmap.yEdges], [0, 1, 2]);
});

test('keeps radial coordinates axis-free and rejects invalid radial values', () => {
  const pie = createChartDefinition({
    coordinate: { kind: 'radial' },
    layers: [{ id: 'share', kind: 'pie', data: [{ id: 1, value: 0 }, { id: 2, value: 0 }] }],
  });
  assert.equal(pie.axes.length, 0);
  assert.equal(pie.model.toModel().layers[0].data[0].innerRadius, 0);
  assert.equal(tryCreateChartDefinition({
    coordinate: { kind: 'radial' },
    layers: [{ id: 'share', kind: 'pie', data: [{ id: 1, value: -1 }] }],
  }).error.code, 'chart-definition-invalid');
});
