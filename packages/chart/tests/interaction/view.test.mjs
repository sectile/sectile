import assert from 'node:assert/strict';
import test from 'node:test';
import { createChartDefinition } from '../../.verification-dist/definition.js';
import { createChartController } from '../../.verification-dist/controller.js';
import { createChartState, reduceChartEvent } from '../../.verification-dist/interaction.js';
import { createChartModel } from '../../.verification-dist/model.js';
import { createChartProjection, tryCreateChartProjection } from '../../.verification-dist/projection.js';
import {
  createChartAxisViewState,
  reconcileChartAxisViewState,
  reduceChartViewAction,
} from '../../.verification-dist/view.js';

const axes = [
  { id: 'linear', orientation: 'x', scale: 'linear', domain: { kind: 'numeric', minimum: 0, maximum: 100 }, ticks: 0 },
  { id: 'log', orientation: 'y', scale: 'logarithmic', domain: { kind: 'numeric', minimum: 1, maximum: 1_000 }, ticks: 0 },
  { id: 7, orientation: 'x', scale: 'categorical', domain: { kind: 'categorical', values: ['A', 'B', 'C', 'D'] }, ticks: 0 },
  { id: 'time', orientation: 'x', scale: 'temporal', domain: { kind: 'temporal', minimum: 0, maximum: 4_000 }, ticks: 0 },
];

test('pan and zoom use axis-domain algebra for every scale kind', () => {
  const initial = createChartAxisViewState(axes, [
    { axisID: 'linear', initial: { kind: 'continuous', minimum: 20, maximum: 60 }, minimumSpan: 10 },
    { axisID: 'log', initial: { kind: 'continuous', minimum: 10, maximum: 100 } },
    { axisID: 7, initial: { kind: 'categorical', start: 1, end: 3 }, minimumSpan: 1 },
    { axisID: 'time', initial: { kind: 'continuous', minimum: 1_000, maximum: 3_000 } },
  ]);
  const linear = reduceChartViewAction(initial, { type: 'pan-axis-view', axisID: 'linear', fraction: 0.25 }).value;
  assert.deepEqual(linear.axis.visible, { kind: 'continuous', minimum: 30, maximum: 70 });
  assert.deepEqual(linear.work, { indexedAxes: 0, axisLookups: 1, mathOperations: 10, publishedAxes: 4 });

  const logarithmic = reduceChartViewAction(initial, {
    type: 'zoom-axis-view', axisID: 'log', factor: 2, anchor: 0.5,
  }).value.axis.visible;
  assert.ok(Math.abs(Math.log(logarithmic.minimum) - Math.log(10) * 1.25) < 1e-12);
  assert.ok(Math.abs(Math.log(logarithmic.maximum) - Math.log(10) * 1.75) < 1e-12);

  const categorical = reduceChartViewAction(initial, {
    type: 'zoom-axis-view', axisID: 7, factor: 2, anchor: 0.5,
  }).value.axis.visible;
  assert.deepEqual(categorical, { kind: 'categorical', start: 2, end: 3 });

  const temporal = reduceChartViewAction(initial, {
    type: 'zoom-axis-view', axisID: 'time', factor: 2, anchor: 0.25,
  }).value.axis.visible;
  assert.deepEqual(temporal, { kind: 'continuous', minimum: 1_250, maximum: 2_250 });
});

test('continuous pan and anchored zoom obey inverse laws without boundary clamping', () => {
  const initial = createChartAxisViewState(axes, [
    { axisID: 'linear', initial: { kind: 'continuous', minimum: 30, maximum: 70 } },
    { axisID: 'log', initial: { kind: 'continuous', minimum: 10, maximum: 100 } },
    { axisID: 'time', initial: { kind: 'continuous', minimum: 1_000, maximum: 3_000 } },
  ]);
  for (const axisID of ['linear', 'log', 'time']) {
    const panned = reduceChartViewAction(initial, { type: 'pan-axis-view', axisID, fraction: 0.1 }).value;
    const restoredPan = reduceChartViewAction(panned.state, { type: 'pan-axis-view', axisID, fraction: -0.1 }).value;
    const original = initial.axes.find((axis) => axis.axisID === axisID).visible;
    assert.ok(Math.abs(restoredPan.axis.visible.minimum - original.minimum) < 1e-9);
    assert.ok(Math.abs(restoredPan.axis.visible.maximum - original.maximum) < 1e-9);
    const zoomed = reduceChartViewAction(initial, { type: 'zoom-axis-view', axisID, factor: 2, anchor: 0.3 }).value;
    const restoredZoom = reduceChartViewAction(zoomed.state, { type: 'zoom-axis-view', axisID, factor: 0.5, anchor: 0.3 }).value;
    const expected = initial.axes.find((axis) => axis.axisID === axisID).visible;
    assert.ok(Math.abs(restoredZoom.axis.visible.minimum - expected.minimum) < 1e-9);
    assert.ok(Math.abs(restoredZoom.axis.visible.maximum - expected.maximum) < 1e-9);
    assert.equal(panned.work.axisLookups, 1);
    assert.equal(panned.work.indexedAxes, 0);
  }
});

test('limits produce semantic no-ops and reset-to-latest restores sticky follow-end', () => {
  const initial = createChartAxisViewState(axes, [{
    axisID: 'linear', initial: { kind: 'continuous', minimum: 60, maximum: 100 }, update: 'follow-end',
  }]);
  const bounded = reduceChartViewAction(initial, { type: 'pan-axis-view', axisID: 'linear', fraction: 1, phase: 'update' }).value;
  assert.equal(bounded.changed, false);
  assert.equal(bounded.phase, 'update');
  const manual = reduceChartViewAction(initial, { type: 'pan-axis-view', axisID: 'linear', fraction: -0.5 }).value.state;
  assert.equal(manual.axes[0].followingEnd, false);
  const latest = reduceChartViewAction(manual, { type: 'reset-axis-view', axisID: 'linear', to: 'latest' }).value;
  assert.deepEqual(latest.axis.visible, { kind: 'continuous', minimum: 60, maximum: 100 });
  assert.equal(latest.axis.followingEnd, true);
});

test('CHT-07: data replacement preserves bounds and applies the declared update policy', () => {
  const previous = createChartAxisViewState(axes, [
    { axisID: 7, initial: { kind: 'categorical', start: 1, end: 3 }, update: 'preserve' },
    { axisID: 'linear', initial: { kind: 'continuous', minimum: 60, maximum: 100 }, update: 'follow-end' },
    { axisID: 'time', initial: { kind: 'continuous', minimum: 1_000, maximum: 2_000 }, update: 'reset' },
  ]);
  const nextAxes = [
    { ...axes[0], domain: { kind: 'numeric', minimum: 0, maximum: 120 } },
    axes[1],
    { ...axes[2], domain: { kind: 'categorical', values: ['X', 'A', 'B', 'C', 'D'] } },
    { ...axes[3], domain: { kind: 'temporal', minimum: 0, maximum: 8_000 } },
  ];
  const next = reconcileChartAxisViewState(previous, nextAxes, [
    { axisID: 7, initial: { kind: 'categorical', start: 1, end: 3 }, update: 'preserve' },
    { axisID: 'linear', initial: { kind: 'continuous', minimum: 80, maximum: 120 }, update: 'follow-end' },
    { axisID: 'time', initial: { kind: 'continuous', minimum: 2_000, maximum: 4_000 }, update: 'reset' },
  ]).value;
  assert.deepEqual(next.axes[0].visible, { kind: 'categorical', start: 2, end: 4 });
  assert.deepEqual(next.axes[1].visible, { kind: 'continuous', minimum: 80, maximum: 120 });
  assert.deepEqual(next.axes[2].visible, { kind: 'continuous', minimum: 2_000, maximum: 4_000 });
});

test('semantic projection consumes visible domains and reuses data geometry across resize and zoom', () => {
  const definition = createChartDefinition({
    coordinate: { kind: 'cartesian', axes: [
      { id: 'x', orientation: 'x', scale: 'linear' },
      { id: 'y', orientation: 'y', scale: 'linear' },
    ] },
    layers: [{ id: 'line', kind: 'line', xAxis: 'x', yAxis: 'y', data: [
      { id: 1, x: 0, y: 0 }, { id: 2, x: 50, y: 1 }, { id: 3, x: 100, y: 0 },
    ] }],
  });
  const view = createChartAxisViewState(definition.axes, [{
    axisID: 'x', initial: { kind: 'continuous', minimum: 0, maximum: 50 },
  }]);
  const before = createChartProjection(definition, { viewport: { width: 320, height: 180 }, view });
  const resized = createChartProjection(definition, { viewport: { width: 640, height: 240 }, view, previous: before });
  assert.equal(resized.dataBatches[0].geometry, before.dataBatches[0].geometry);
  const zoomed = reduceChartViewAction(view, { type: 'zoom-axis-view', axisID: 'x', factor: 2, anchor: 0 }).value.state;
  const after = createChartProjection(definition, { viewport: { width: 640, height: 240 }, view: zoomed, previous: resized });
  assert.deepEqual(after.layout.axes[0].descriptor.geometryDomain, { minimum: 0, maximum: 25 });
  assert.notEqual(after.batches[0].positions[2], before.batches[0].positions[2]);
});

test('visible-domain hierarchy queries bound raw and aggregate Cartesian output', () => {
  const data = Array.from({ length: 100 }, (_, id) => ({ id, x: id % 10, y: Math.floor(id / 10) }));
  const definition = (projection) => createChartDefinition({
    coordinate: { kind: 'cartesian', axes: [
      { id: 'x', orientation: 'x', scale: 'linear', domain: { kind: 'numeric', minimum: 0, maximum: 9 } },
      { id: 'y', orientation: 'y', scale: 'linear', domain: { kind: 'numeric', minimum: 0, maximum: 9 } },
    ] },
    layers: [{ id: 'scatter', kind: 'scatter', projection, xAxis: 'x', yAxis: 'y', data }],
  });
  const raw = definition('raw');
  const view = createChartAxisViewState(raw.axes, [
    { axisID: 'x', initial: { kind: 'continuous', minimum: 0, maximum: 2 } },
    { axisID: 'y', initial: { kind: 'continuous', minimum: 0, maximum: 2 } },
  ]);
  const exact = createChartProjection(raw, { viewport: { width: 240, height: 160 }, view, maximumRepresentatives: 9 });
  assert.equal(exact.batches[0].identityIndices.length, 9);
  assert.equal(tryCreateChartProjection(raw, {
    viewport: { width: 240, height: 160 }, view, maximumRepresentatives: 8,
  }).error.code, 'chart-projection-ceiling-exceeded');

  const density = createChartProjection(definition('density'), {
    viewport: { width: 240, height: 160 }, view, maximumRepresentatives: 16,
  });
  assert.equal(density.diagnostics.representedDatums, 9);
  assert.ok(density.batches[0].representatives.every((representative) => (
    representative.bounds.minimumX >= 0 && representative.bounds.maximumX <= 2
      && representative.bounds.minimumY >= 0 && representative.bounds.maximumY <= 2
  )));
});

test('visible heatmap edges and categorical bars retain exact profile meaning', () => {
  const heat = createChartDefinition({
    coordinate: { kind: 'cartesian', axes: [
      { id: 'x', orientation: 'x', scale: 'linear' },
      { id: 'y', orientation: 'y', scale: 'linear' },
    ] },
    layers: [{ id: 'heat', kind: 'heatmap', xAxis: 'x', yAxis: 'y', data: Array.from({ length: 16 }, (_, id) => ({
      id, x: id % 4, y: Math.floor(id / 4), value: id,
    })) }],
  });
  const heatView = createChartAxisViewState(heat.axes, [
    { axisID: 'x', initial: { kind: 'continuous', minimum: -0.5, maximum: 1.5 } },
    { axisID: 'y', initial: { kind: 'continuous', minimum: -0.5, maximum: 1.5 } },
  ]);
  const heatProjection = createChartProjection(heat, {
    viewport: { width: 240, height: 160 }, view: heatView, maximumRepresentatives: 4,
  });
  assert.equal(heatProjection.batches[0].identityIndices.length, 4);

  const categories = Array.from({ length: 20 }, (_, index) => `C${index}`);
  const bars = createChartDefinition({
    coordinate: { kind: 'cartesian', axes: [
      { id: 'category', orientation: 'x', scale: 'categorical', field: 'category', domain: { kind: 'categorical', values: categories } },
      { id: 'value', orientation: 'y', scale: 'linear', field: 'value' },
    ] },
    layers: [{ id: 'bars', kind: 'bar', xAxis: 'category', yAxis: 'value', data: categories.map((category, id) => ({ id, category, value: id + 1 })) }],
  });
  const barView = createChartAxisViewState(bars.axes, [{
    axisID: 'category', initial: { kind: 'categorical', start: 5, end: 8 },
  }]);
  const barProjection = createChartProjection(bars, {
    viewport: { width: 240, height: 160 }, view: barView, maximumRepresentatives: 3,
  });
  assert.deepEqual([...barProjection.batches[0].identityIndices], [5, 6, 7]);
});

test('chart interaction preserves controlled view ownership and emits semantic phases', () => {
  const model = createChartModel({ layers: [{ id: 'series', profile: 'ordered-series', data: [
    { id: 1, x: 0, y: 0 }, { id: 2, x: 1, y: 1 },
  ] }] });
  const view = createChartAxisViewState(axes, [
    { axisID: 'linear', initial: { kind: 'continuous', minimum: 0, maximum: 50 } },
    { axisID: 'log', initial: { kind: 'continuous', minimum: 10, maximum: 100 } },
  ]);
  const state = createChartState(model, { view });
  const transition = reduceChartEvent(model, state, {
    type: 'zoom-axis-view', axisID: 'linear', factor: 2, phase: 'end',
  }, { view: true }).value;
  assert.equal(transition.state, state);
  assert.deepEqual(transition.commands.map((command) => command.type), ['view-change-requested']);
  assert.equal(transition.commands[0].phase, 'end');

  const regional = reduceChartEvent(model, state, {
    type: 'set-selection',
    selection: {
      type: 'domain-region', xAxisID: 'linear', xStart: 10, xEnd: 20,
      yAxisID: 'log', yStart: 10, yEnd: 100,
    },
  }).value;
  assert.deepEqual(regional.state.selection, {
    type: 'domain-region', xAxisID: 'linear', xStart: 10, xEnd: 20,
    yAxisID: 'log', yStart: 10, yEnd: 100,
  });
});

test('controller view ownership converges only through controlled synchronization', () => {
  const view = createChartAxisViewState(axes, [{
    axisID: 'linear', initial: { kind: 'continuous', minimum: 0, maximum: 50 },
  }]);
  const controller = createChartController({
    model: { layers: [{ id: 'series', profile: 'ordered-series', data: [
      { id: 1, x: 0, y: 0 }, { id: 2, x: 1, y: 1 },
    ] }] },
    controlled: { view },
  });
  const commands = [];
  controller.subscribeCommands((command) => commands.push(command.type));
  const request = controller.dispatch({ type: 'zoom-axis-view', axisID: 'linear', factor: 2 }).value;
  assert.equal(request.snapshot.revision, 0);
  assert.notEqual(request.snapshot.state.view, view);
  assert.deepEqual(request.snapshot.state.view, view);
  assert.deepEqual(commands, ['view-change-requested']);
  const requestedView = request.commands.find((command) => command.type === 'view-change-requested').view;
  const synced = controller.syncControlledValues({ view: requestedView }).value;
  assert.equal(synced.revision, 1);
  assert.notEqual(synced.state.view, requestedView);
  assert.deepEqual(synced.state.view, requestedView);
  assert.deepEqual(commands, ['view-change-requested', 'render-requested', 'view-phase']);
  assert.equal(controller.syncControlledValues({}).error.code, 'chart-controller-invalid');
});
