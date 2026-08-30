import assert from 'node:assert/strict';
import test from 'node:test';
import { renderToString } from '@vue/server-renderer';
import { createSSRApp, h } from 'vue';
import { createChartController } from '@sectile/chart/controller';
import {
  ChartCartesian,
  ChartLine,
  ChartProvider,
  ChartRoot,
  ChartXAxis,
  ChartYAxis,
  createChartComponents,
  useChartAxisSelector,
  useChartContext,
  useChartLayerSelector,
  useChartSelector,
} from '../.verification-dist/chart.js';

const definition = {
  coordinate: { kind: 'cartesian', axes: [
    { id: 1, orientation: 'x', scale: 'temporal', field: 'time' },
    { id: 'value', orientation: 'y', scale: 'linear', field: 'value' },
  ] },
  layers: [{
    id: 'series', kind: 'line', xAxis: 1, yAxis: 'value',
    data: [{ id: 10, time: new Date(0), value: 4 }, { id: '11', time: 1_000, value: 8 }],
  }],
};

function declarations(Chart = {
  Cartesian: ChartCartesian, XAxis: ChartXAxis, YAxis: ChartYAxis, Line: ChartLine,
}) {
  return h(Chart.Cartesian, null, () => [
    h(Chart.XAxis, { id: 1, scale: 'temporal', field: 'time' }),
    h(Chart.YAxis, { id: 'value', scale: 'linear', field: 'value' }),
    h(Chart.Line, { id: 'series', data: definition.layers[0].data, xAxis: 1, yAxis: 'value' }),
  ]);
}

test('createChartComponents returns one stable controller-bound namespace', () => {
  const controller = createChartController({ definition });
  const first = createChartComponents(controller);
  const second = createChartComponents(controller);
  assert.equal(first, second);
  assert.deepEqual(Object.keys(first).sort(), [
    'AxisTicks', 'AxisView', 'Bar', 'Bars', 'Canvas', 'Cartesian', 'Donut',
    'ExternalViewControls', 'Grid', 'GridLines', 'Heatmap', 'Legend', 'Line',
    'Navigation', 'PanControl', 'Pie', 'Plot', 'Provider', 'Radial', 'Renderer',
    'ResetView', 'Root', 'Scatter', 'Ticks', 'ViewControls', 'XAxis', 'YAxis',
    'ZoomControl',
  ]);
  controller.dispose();
});

test('ChartProvider exposes externally owned state to granular selectors during SSR', async () => {
  const controller = createChartController({ definition });
  let context;
  let renderCount = 0;
  const Probe = {
    setup() {
      context = useChartContext();
      const cursor = useChartSelector((state) => state?.cursor ?? null);
      const layer = useChartLayerSelector('series', (value) => value?.kind ?? 'missing');
      const axis = useChartAxisSelector(1, (value) => value?.scale ?? 'missing');
      return () => { renderCount += 1; return h('span', `${String(cursor.value)}:${layer.value}:${axis.value}`); };
    },
  };
  const app = createSSRApp({
    render: () => h(ChartProvider, { controller }, () => h(ChartRoot, null, () => [declarations(), h(Probe)])),
  });
  const html = await renderToString(app);
  assert.match(html, /null:line:temporal/);
  assert.equal(context.controller.value, controller);
  assert.equal(renderCount, 1);
  assert.equal(controller.getSnapshot().revision, 0);
  controller.dispose();
});

test('controller-bound Root requires its matching Provider and keeps borrowed ownership', async () => {
  const controller = createChartController({ definition });
  const Chart = createChartComponents(controller);
  await assert.rejects(
    () => renderToString(createSSRApp({ render: () => h(Chart.Root, null, () => declarations(Chart)) })),
    /matching Chart.Provider/,
  );
  const html = await renderToString(createSSRApp({
    render: () => h(Chart.Provider, null, () => h(Chart.Root, null, () => declarations(Chart))),
  }));
  assert.match(html, /data-scope="chart"/);
  assert.equal(controller.getSnapshot().revision, 0);
  controller.dispose();
});
