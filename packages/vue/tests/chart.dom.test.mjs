import assert from 'node:assert/strict';
import test from 'node:test';
import { createTestWindow } from './happy-dom.mjs';

const browserWindow = createTestWindow({ url: 'https://sectile.dev/chart' });
Object.assign(globalThis, {
  window: browserWindow,
  document: browserWindow.document,
  Node: browserWindow.Node,
  Element: browserWindow.Element,
  HTMLElement: browserWindow.HTMLElement,
  HTMLCanvasElement: browserWindow.HTMLCanvasElement,
  SVGElement: browserWindow.SVGElement,
  Event: browserWindow.Event,
  PointerEvent: browserWindow.PointerEvent,
  MouseEvent: browserWindow.MouseEvent,
  KeyboardEvent: browserWindow.KeyboardEvent,
  WheelEvent: browserWindow.WheelEvent,
  MutationObserver: browserWindow.MutationObserver,
  ResizeObserver: browserWindow.ResizeObserver,
});

const { createApp, h, nextTick, shallowRef } = await import('vue');
const {
  ChartAxisView,
  ChartCartesian,
  ChartLine,
  ChartNavigation,
  ChartPanControl,
  ChartPlot,
  ChartRenderer,
  ChartResetView,
  ChartRoot,
  ChartViewControls,
  ChartXAxis,
  ChartYAxis,
  ChartZoomControl,
} = await import('../.verification-dist/chart.js');

const initial = Object.freeze([
  Object.freeze({ id: 1, month: new Date(0), revenue: 12 }),
  Object.freeze({ id: '2', month: 1_000, revenue: 18 }),
]);

function mockRenderer(projections) {
  return {
    capabilities: { canvas2d: true, webgl2: false, asynchronousGPUTiming: false },
    render: (projection) => projections.push(projection),
    getDiagnostics: () => ({ mode: 'canvas2d', uploadedBytes: 0, drawCalls: 1, liveResources: 1 }),
    flush() {},
    disconnect() {},
  };
}

test('declarative ChartRoot batches layer replacement and inherits axis scope for controls', async () => {
  const data = shallowRef(initial);
  const projections = [];
  let controller = null;
  let rootComponent = null;
  const host = document.createElement('div');
  document.body.append(host);
  const app = createApp({
    render: () => h(ChartRoot, { ref: (value) => { rootComponent = value; }, dom: { renderer: mockRenderer(projections) } }, {
      default: (slot) => {
        controller = slot.controller;
        return [
          h(ChartCartesian, null, () => [
            h(ChartXAxis, { id: 7, scale: 'temporal', field: 'month', label: 'Month' }, () => [
              h(ChartAxisView, { update: 'follow-end' }),
              h(ChartViewControls, null, () => [
                h(ChartPanControl, { direction: 'backward' }, () => 'Earlier'),
                h(ChartZoomControl, { direction: 'in' }, () => 'Zoom in'),
                h(ChartResetView, { to: 'latest' }, () => 'Latest'),
              ]),
            ]),
            h(ChartYAxis, { id: 'revenue', field: 'revenue', label: 'Revenue' }),
            h(ChartLine, { id: 'sales', data: data.value, xAxis: 7, yAxis: 'revenue' }),
            h(ChartNavigation, { axes: [7], drag: 'pan', wheel: 'native', keyboard: true }),
          ]),
          h(ChartPlot, null, () => h(ChartRenderer)),
        ];
      },
    }),
  });
  app.mount(host);
  await nextTick(); await nextTick();
  assert.ok(controller);
  assert.equal(controller.getDefinition().axes[0].id, 7);
  assert.equal(controller.getSnapshot().state.view.axes[0].axisID, 7);
  assert.ok(host.querySelector('canvas') instanceof HTMLCanvasElement);
  assert.ok(host.querySelector('[data-chart-overlay="axes"]'));
  const priorGeneration = controller.getModel().generation;
  const priorDiagnostics = rootComponent.getDeclarationDiagnostics();
  assert.equal(priorDiagnostics.registeredRecords, 7);

  data.value = Object.freeze([...initial, Object.freeze({ id: 3, month: 2_000, revenue: 24 })]);
  await nextTick(); await nextTick();
  assert.equal(controller.getModel().generation, priorGeneration + 1);
  assert.equal(controller.getDefinition().diagnostics.resolvedDatums, 3);
  const nextDiagnostics = rootComponent.getDeclarationDiagnostics();
  assert.equal(nextDiagnostics.publications, priorDiagnostics.publications + 1);
  assert.equal(nextDiagnostics.readRecords, 7);
  assert.ok(projections.length >= 1);
  app.unmount(); host.remove();
});

test('direct gestures require a declared visible or external control alternative', async () => {
  const errors = [];
  const host = document.createElement('div');
  document.body.append(host);
  const app = createApp({
    render: () => h(ChartRoot, { onError: (error) => errors.push(error) }, () => [
      h(ChartCartesian, null, () => [
        h(ChartXAxis, { id: 'x', scale: 'linear' }),
        h(ChartYAxis, { id: 'y', scale: 'linear' }),
        h(ChartLine, { id: 'series', data: [{ id: 1, x: 0, y: 0 }], xAxis: 'x', yAxis: 'y' }),
        h(ChartNavigation, { drag: 'pan' }),
      ]),
      h(ChartPlot, null, () => h(ChartRenderer)),
    ]),
  });
  app.mount(host);
  await nextTick();
  assert.equal(errors.length, 1);
  assert.match(String(errors[0]), /ChartViewControls|ChartExternalViewControls/);
  app.unmount(); host.remove();
});
