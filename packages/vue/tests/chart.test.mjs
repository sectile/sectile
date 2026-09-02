import assert from 'node:assert/strict';
import test from 'node:test';
import { effectScope, nextTick, shallowRef } from 'vue';
import { useChart } from '../.verification-dist/chart.js';

const series = Object.freeze([
  Object.freeze({ id: 1, recordedAt: new Date(0), category: 'first', amount: 12, value: 1 }),
  Object.freeze({ id: '2', recordedAt: 1_000, category: 'second', amount: 18, value: 2 }),
]);
const layerSeries = (prefix) => Object.freeze(series.map((datum) => Object.freeze({ ...datum, id: `${prefix}-${String(datum.id)}` })));
const scatterSeries = layerSeries('scatter');
const barSeries = layerSeries('bar');
const heatmapSeries = layerSeries('heatmap');

const cartesianDefinition = (data = series) => ({
  coordinate: { kind: 'cartesian', axes: [
    { id: 10, orientation: 'x', scale: 'temporal', field: 'recordedAt' },
    { id: 'category', orientation: 'x', scale: 'categorical', field: 'category' },
    { id: 'amount', orientation: 'y', scale: 'linear', field: 'amount' },
  ] },
  layers: [
    { id: 'line', kind: 'line', data, xAxis: 10, yAxis: 'amount' },
    { id: 'scatter', kind: 'scatter', data: scatterSeries, xAxis: 10, yAxis: 'amount', projection: 'density' },
    { id: 'bar', kind: 'bar', data: barSeries, xAxis: 'category', yAxis: 'amount' },
    { id: 'heatmap', kind: 'heatmap', data: heatmapSeries, xAxis: 10, yAxis: 'amount' },
  ],
});

const radialDefinition = {
  coordinate: { kind: 'radial' },
  layers: [
    { id: 20, kind: 'pie', data: layerSeries('pie') },
    { id: 'donut', kind: 'donut', data: layerSeries('donut'), innerRadius: 0.6 },
  ],
};

test('useChart resolves all six declarative profiles without coercing numeric identities', () => {
  const cartesian = useChart({
    definition: cartesianDefinition(),
    viewCapabilities: [{ axisID: 10, minimumSpan: 1 }],
  });
  assert.deepEqual(cartesian.controller.getDefinition().layers.map((layer) => layer.kind), ['line', 'scatter', 'bar', 'heatmap']);
  assert.equal(cartesian.controller.getDefinition().axes[0].id, 10);
  assert.equal(cartesian.controller.getModel().identityAt(0), 1);
  assert.equal(cartesian.controller.getModel().identityAt(1), '2');
  assert.equal(cartesian.snapshot.value.state.view.axes[0].axisID, 10);

  const radial = useChart({ definition: radialDefinition });
  assert.deepEqual(radial.controller.getDefinition().layers.map((layer) => layer.kind), ['pie', 'donut']);
  assert.equal(radial.snapshot.value.state.view, null);
  cartesian.dispose(); radial.dispose();
});

test('one shallow definition replacement reconciles after one Vue flush', async () => {
  const scope = effectScope();
  const source = shallowRef(cartesianDefinition());
  const chart = scope.run(() => useChart({ definition: source, viewCapabilities: [{ axisID: 10 }] }));
  const priorGeneration = chart.controller.getModel().generation;
  source.value = cartesianDefinition(Object.freeze([
    ...series,
    Object.freeze({ id: 3, recordedAt: 2_000, category: 'third', amount: 24, value: 3 }),
  ]));
  await nextTick();
  assert.equal(chart.controller.getModel().generation, priorGeneration + 1);
  assert.equal(chart.controller.getDefinition().diagnostics.resolvedDatums, 9);
  scope.stop();
});

test('controlled view publishes requests while defaultView remains controller-owned', () => {
  const seed = useChart({ definition: cartesianDefinition(), viewCapabilities: [{ axisID: 10 }] });
  const initialView = seed.snapshot.value.state.view;
  const controlled = shallowRef(initialView);
  const requested = [];
  const chart = useChart({
    definition: cartesianDefinition(),
    viewCapabilities: [{ axisID: 10 }],
    view: controlled,
    onViewChange: (value) => requested.push(value),
  });
  chart.dispatch({ type: 'zoom-axis-view', axisID: 10, factor: 2, phase: 'settled' });
  assert.equal(requested.length, 1);
  assert.equal(controlled.value.revision, initialView.revision + 1);

  const uncontrolled = useChart({
    definition: cartesianDefinition(),
    viewCapabilities: [{ axisID: 10 }],
    defaultView: initialView,
  });
  uncontrolled.dispatch({ type: 'zoom-axis-view', axisID: 10, factor: 2, phase: 'settled' });
  assert.notEqual(uncontrolled.snapshot.value.state.view, initialView);
  assert.throws(() => useChart({
    definition: cartesianDefinition(), viewCapabilities: [{ axisID: 10 }], view: controlled, defaultView: initialView,
  }), /mutually exclusive/);
  seed.dispose(); chart.dispose(); uncontrolled.dispose();
});

test('Chart callbacks observe published controlled refs and cannot block sibling callbacks', async () => {
  const cursor = shallowRef(1);
  const commandError = new Error('application command failed');
  const changeError = new Error('application cursor change failed');
  const observed = [];
  let chart;
  chart = useChart({
    definition: cartesianDefinition(),
    viewCapabilities: [{ axisID: 10 }],
    cursor,
    onCommand: (command) => {
      if (command.type !== 'cursor-change-requested') return;
      observed.push({
        callback: 'command',
        requested: command.id,
        controlled: cursor.value,
        committed: chart.snapshot.value.state.cursor,
      });
      throw commandError;
    },
    onCursorChange: (value) => {
      observed.push({
        callback: 'change',
        requested: value,
        controlled: cursor.value,
        committed: chart.snapshot.value.state.cursor,
      });
      throw changeError;
    },
  });

  assert.throws(
    () => chart.dispatch({ type: 'set-cursor', id: '2' }),
    (error) => error === commandError,
  );
  assert.equal(cursor.value, '2');
  assert.deepEqual(observed, [
    { callback: 'command', requested: '2', controlled: '2', committed: 1 },
    { callback: 'change', requested: '2', controlled: '2', committed: 1 },
  ]);

  await nextTick();
  assert.equal(chart.snapshot.value.state.cursor, '2');
  chart.dispose();
});

test('controlled cursor focuses only after the Vue owner accepts the request', async () => {
  const cursor = shallowRef(1);
  const commands = [];
  let accept = false;
  const chart = useChart({
    definition: cartesianDefinition(),
    viewCapabilities: [{ axisID: 10 }],
    cursor,
    onCursorChange: (value) => {
      if (!accept && value !== 1) cursor.value = 1;
    },
    onCommand: (command) => commands.push(command.type),
  });

  chart.dispatch({ type: 'set-cursor', id: '2' });
  await nextTick();
  assert.equal(chart.snapshot.value.state.cursor, 1);
  assert.deepEqual(commands, ['cursor-change-requested']);

  accept = true;
  chart.dispatch({ type: 'set-cursor', id: '2' });
  await nextTick();
  assert.equal(chart.snapshot.value.state.cursor, '2');
  assert.deepEqual(commands, [
    'cursor-change-requested',
    'cursor-change-requested', 'render-requested', 'focus-datum', 'announce-datum',
  ]);
  chart.dispose();
});
