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

const { createApp, h, nextTick } = await import('vue');
const { createChartController } = await import('@sectile/chart/controller');
const { ChartRoot } = await import('../.verification-dist/chart.js');

test('ChartRoot mounts one DOM connection, publishes updates, and preserves borrowed renderer ownership', async () => {
  const controller = createChartController({ model: { layers: [{ id: 'points', profile: 'point', data: [
    { id: 1, x: 0, y: 0 }, { id: '1', x: 1, y: 1 },
  ] }] } });
  const projections = [];
  let disconnected = 0;
  const renderer = {
    capabilities: { canvas2d: true, webgl2: false, asynchronousGPUTiming: false },
    render: (projection) => projections.push(projection),
    getDiagnostics: () => ({ mode: 'canvas2d', uploadedBytes: 0, drawCalls: 1, liveResources: 1 }),
    flush() {},
    disconnect: () => { disconnected += 1; },
  };
  const selections = [];
  const host = document.createElement('div');
  document.body.append(host);
  const app = createApp({
    render: () => h(ChartRoot, {
      controller,
      dom: { renderer },
      'onUpdate:modelValue': (value) => selections.push(value),
    }),
  });
  app.mount(host);
  await nextTick(); await nextTick();
  assert.ok(host.querySelector('canvas') instanceof HTMLCanvasElement);
  assert.equal(projections.length, 1);
  assert.equal(host.querySelectorAll('[role="option"]').length, 2);
  controller.dispatch({ type: 'set-selection', selection: { type: 'points', ids: ['1'] } });
  assert.deepEqual(selections, [{ type: 'points', ids: ['1'] }]);
  app.unmount();
  assert.equal(disconnected, 0);
  controller.dispose();
});
