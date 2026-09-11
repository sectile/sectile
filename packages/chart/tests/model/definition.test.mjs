import assert from 'node:assert/strict';
import test from 'node:test';
import { createChartController } from '../../.verification-dist/controller.js';
import { createChartDefinition, tryCreateChartDefinition } from '../../.verification-dist/definition.js';
import { tryCreateChartPlotLayout } from '../../.verification-dist/layout.js';
import { tryCreateChartProjection } from '../../.verification-dist/projection.js';
import { tryCreateLinearScale, tryCreateLogarithmicScale, tryCreateTemporalScale } from '../../.verification-dist/scale.js';

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

test('singleton automatic domains remain finite, increasing, and scale-valid at numeric boundaries', () => {
  const createSingleton = (scale, value) => tryCreateChartDefinition({
    coordinate: { kind: 'cartesian', axes: [
      { id: 'x', orientation: 'x', scale, field: 'x' },
      { id: 'y', orientation: 'y', scale: 'linear', field: 'y' },
    ] },
    layers: [{ id: 'point', kind: 'scatter', xAxis: 'x', yAxis: 'y', data: [{ id: 'a', x: value, y: 1 }] }],
  });
  const scaleFor = (scale, domain) => scale === 'logarithmic'
    ? tryCreateLogarithmicScale(domain, { start: 0, end: 100 })
    : scale === 'temporal'
      ? tryCreateTemporalScale(domain, { start: 0, end: 100 })
      : tryCreateLinearScale(domain, { start: 0, end: 100 });

  for (const [scale, value] of [
    ['linear', 2 ** 53],
    ['linear', -(2 ** 53)],
    ['linear', Number.MAX_VALUE],
    ['linear', -Number.MAX_VALUE],
    ['temporal', 2 ** 53],
    ['temporal', -(2 ** 53)],
    ['temporal', Number.MAX_VALUE],
    ['temporal', -Number.MAX_VALUE],
    ['logarithmic', Number.MIN_VALUE],
    ['logarithmic', Number.MAX_VALUE],
  ]) {
    const result = createSingleton(scale, value);
    assert.equal(result.ok, true);
    const domain = result.value.axes[0].domain;
    assert.notEqual(domain.kind, 'categorical');
    assert.equal(Number.isFinite(domain.minimum), true);
    assert.equal(Number.isFinite(domain.maximum), true);
    assert.ok(domain.minimum < domain.maximum);
    assert.ok(domain.minimum <= value && domain.maximum >= value);
    if (scale === 'logarithmic') assert.ok(domain.minimum > 0);
    assert.equal(scaleFor(scale, domain).ok, true);
    const projected = tryCreateChartProjection(result.value, { viewport: { width: 320, height: 180 } });
    assert.equal(projected.ok, true);
  }

  const ordinary = createSingleton('linear', 1e15);
  assert.equal(ordinary.ok, true);
  assert.deepEqual(ordinary.value.axes[0].domain, {
    kind: 'numeric', minimum: 999_999_999_999_999.5, maximum: 1_000_000_000_000_000.5,
  });

  const controller = createChartController({ definition: {
    coordinate: { kind: 'cartesian', axes: [
      { id: 'x', orientation: 'x', scale: 'linear', field: 'x' },
      { id: 'y', orientation: 'y', scale: 'linear', field: 'y' },
    ] },
    layers: [{ id: 'point', kind: 'scatter', xAxis: 'x', yAxis: 'y', data: [{ id: 'a', x: 2 ** 53, y: 1 }] }],
  } });
  const controllerDomain = controller.getDefinition().axes[0].domain;
  assert.ok(controllerDomain.minimum < controllerDomain.maximum);
  assert.equal(controller.project({ viewport: { width: 320, height: 180 } }).ok, true);

  let defensive;
  assert.doesNotThrow(() => {
    defensive = tryCreateChartPlotLayout([
      { id: 'x', orientation: 'x', scale: 'linear', domain: { kind: 'numeric', minimum: 1, maximum: 1 }, ticks: 0 },
    ], { width: 320, height: 180 });
  });
  assert.equal(defensive.ok, false);
  assert.equal(defensive.error.code, 'chart-scale-invalid');
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

test('CHT-08: contains accessor failures and rejects ceilings before observation', () => {
  const calls = { identity: 0, axis: 0, x: 0, y: 0 };
  const result = tryCreateChartDefinition({
    coordinate: { kind: 'cartesian', axes: [
      { id: 'x', orientation: 'x', scale: 'linear', getValue: (datum) => { calls.axis += 1; return datum.x; } },
      { id: 'y', orientation: 'y', scale: 'linear', field: 'y' },
    ] },
    layers: [{
      id: 'series',
      kind: 'line',
      xAxis: 'x',
      yAxis: 'y',
      data: [{ id: 1, x: 0, y: 0 }, { id: 2, x: 1, y: 1 }],
      getId: (datum) => { calls.identity += 1; return datum.id; },
      getX: (datum) => { calls.x += 1; return datum.x; },
      getY: (datum) => { calls.y += 1; return datum.y; },
    }],
  }, { maxDatums: 1 });
  assert.equal(result.error.code, 'chart-datum-ceiling-exceeded');
  assert.deepEqual(calls, { identity: 0, axis: 0, x: 0, y: 0 });

  const layerResult = tryCreateChartDefinition({
    coordinate: { kind: 'radial' },
    layers: [{
      id: 'share',
      kind: 'pie',
      data: [{ id: 1, value: 1 }],
      getId: (datum) => { calls.identity += 1; return datum.id; },
      getValue: (datum) => { calls.x += 1; return datum.value; },
    }],
  }, { maxLayers: 0 });
  assert.equal(layerResult.error.code, 'chart-layer-ceiling-exceeded');
  assert.deepEqual(calls, { identity: 0, axis: 0, x: 0, y: 0 });

  const acceptedCalls = { identity: 0, x: 0, y: 0 };
  const accepted = tryCreateChartDefinition({
    coordinate: { kind: 'cartesian', axes: [
      { id: 'x', orientation: 'x', scale: 'linear', getValue: (datum) => { acceptedCalls.x += 1; return datum.x; } },
      { id: 'y', orientation: 'y', scale: 'linear', getValue: (datum) => { acceptedCalls.y += 1; return datum.y; } },
    ] },
    layers: [{
      id: 'series',
      kind: 'line',
      xAxis: 'x',
      yAxis: 'y',
      data: [{ id: 1, x: 0, y: 0 }, { id: 2, x: 1, y: 1 }],
      getId: (datum) => { acceptedCalls.identity += 1; return datum.id; },
    }],
  }, { maxLayers: 1, maxDatums: 2 });
  assert.equal(accepted.ok, true);
  assert.deepEqual(acceptedCalls, { identity: 2, x: 2, y: 2 });

  const growingData = [{ id: 'seed', value: 1 }];
  let growingDatumCalls = 0;
  const datumGrowth = tryCreateChartDefinition({
    coordinate: { kind: 'radial' },
    layers: [{
      id: 'share',
      kind: 'pie',
      data: growingData,
      getId: (datum) => {
        growingDatumCalls += 1;
        if (growingDatumCalls < 4) growingData.push({ id: `extra-${growingDatumCalls}`, value: 1 });
        return datum.id;
      },
    }],
  }, { maxLayers: 1, maxDatums: 1 });
  assert.equal(datumGrowth.ok, true);
  assert.equal(growingDatumCalls, 1);
  assert.equal(growingData.length, 2);
  assert.equal(datumGrowth.value.diagnostics.resolvedDatums, 1);
  assert.equal(datumGrowth.value.model.toModel().layers[0].data.length, 1);

  const growingLayers = [];
  let growingLayerCalls = 0;
  const growLayers = (datum) => {
    growingLayerCalls += 1;
    if (growingLayerCalls < 4) {
      const index = growingLayers.length;
      growingLayers.push({
        id: `late-${index}`,
        kind: 'pie',
        data: [{ id: `late-datum-${index}`, value: 1 }],
        getId: growLayers,
      });
    }
    return datum.id;
  };
  growingLayers.push({
    id: 'initial',
    kind: 'pie',
    data: [{ id: 'initial-datum', value: 1 }],
    getId: growLayers,
  });
  const layerGrowth = tryCreateChartDefinition({
    coordinate: { kind: 'radial' },
    layers: growingLayers,
  }, { maxLayers: 1, maxDatums: 4 });
  assert.equal(layerGrowth.ok, true);
  assert.equal(growingLayerCalls, 1);
  assert.equal(growingLayers.length, 2);
  assert.equal(layerGrowth.value.diagnostics.resolvedLayers, 1);
  assert.equal(layerGrowth.value.diagnostics.resolvedDatums, 1);

  let accessorFailure;
  assert.doesNotThrow(() => {
    accessorFailure = tryCreateChartDefinition({
      coordinate: { kind: 'radial' },
      layers: [{
        id: 'share', kind: 'pie', data: [{ id: 1, value: 1 }],
        getId: () => { throw new Error('application accessor failed'); },
      }],
    });
  });
  assert.equal(accessorFailure.ok, false);
  assert.equal(accessorFailure.error.code, 'chart-accessor-invalid');
});
