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
browserWindow.HTMLElement.prototype.getBoundingClientRect = () => ({
  x: 0, y: 0, left: 0, top: 0, right: 400, bottom: 300,
  width: 400, height: 300, toJSON() {},
});

const { createApp, createSSRApp, h, nextTick, shallowRef } = await import('vue');
const { renderToString } = await import('@vue/server-renderer');
const { createChartController } = await import('@sectile/chart/controller');
const {
  ChartAxisView,
  ChartCartesian,
  ChartLine,
  ChartNavigation,
  ChartPanControl,
  ChartPlot,
  ChartProvider,
  ChartRenderer,
  ChartResetView,
  ChartRoot,
  ChartScatter,
  ChartViewControls,
  ChartXAxis,
  ChartYAxis,
  ChartZoomControl,
  useChartAxisSelector,
  useChartLayerSelector,
  useChartSelector,
} = await import('../.verification-dist/chart.js');

const initial = Object.freeze([
  Object.freeze({ id: 1, month: new Date(0), revenue: 12 }),
  Object.freeze({ id: '2', month: 1_000, revenue: 18 }),
]);
const controlledChartDefinition = {
  coordinate: { kind: 'cartesian', axes: [
    { id: 'x', orientation: 'x', scale: 'temporal', field: 'month' },
    { id: 'y', orientation: 'y', scale: 'linear', field: 'revenue' },
  ] },
  layers: [{ id: 'series', kind: 'line', data: initial, xAxis: 'x', yAxis: 'y' }],
};

function controlledChartDeclarations() {
  return h(ChartCartesian, null, () => [
    h(ChartXAxis, { id: 'x', scale: 'temporal', field: 'month' }, () => h(ChartAxisView)),
    h(ChartYAxis, { id: 'y', scale: 'linear', field: 'revenue' }),
    h(ChartLine, { id: 'series', data: initial, xAxis: 'x', yAxis: 'y' }),
  ]);
}

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
  const accessibilityLabel = shallowRef('Revenue chart');
  const projections = [];
  let controller = null;
  let rootComponent = null;
  const host = document.createElement('div');
  document.body.append(host);
  const app = createApp({
    render: () => h(ChartRoot, { ref: (value) => { rootComponent = value; }, dom: { renderer: mockRenderer(projections), accessibilityLabel: accessibilityLabel.value } }, {
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
  assert.equal(host.querySelector('[data-part="root"]').getAttribute('aria-label'), 'Revenue chart');
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
  accessibilityLabel.value = 'Quarterly revenue chart';
  await nextTick();
  assert.equal(host.querySelector('[data-part="root"]').getAttribute('aria-label'), 'Quarterly revenue chart');
  app.unmount(); host.remove();
});

test('ChartRoot warns when controlled ownership shape changes without a remount', async () => {
  const selection = shallowRef(undefined);
  const activeDatum = shallowRef(undefined);
  const cursor = shallowRef(undefined);
  const view = shallowRef(undefined);
  const warnings = [];
  const originalWarn = console.warn;
  let controller = null;
  const host = document.createElement('div');
  document.body.append(host);
  console.warn = (message) => warnings.push(String(message));
  const app = createApp({
    render: () => h(ChartRoot, {
      modelValue: selection.value,
      activeDatum: activeDatum.value,
      cursor: cursor.value,
      view: view.value,
    }, {
      default: (slot) => {
        controller = slot.controller ?? controller;
        return controlledChartDeclarations();
      },
    }),
  });
  try {
    app.mount(host);
    await nextTick(); await nextTick();
    selection.value = { type: 'points', ids: [1] };
    activeDatum.value = null;
    cursor.value = null;
    view.value = null;
    await nextTick(); await nextTick();
    assert.equal(warnings.length, 4);
    for (const property of ['modelValue', 'activeDatum', 'cursor', 'view']) {
      assert.ok(warnings.some((message) => message.includes(`cannot switch ${property}`)), property);
    }
    controller.dispatch({ type: 'set-cursor', id: '2' });
    assert.equal(controller.getSnapshot().state.cursor, '2', 'ownership remains uncontrolled after the unsupported switch');
  } finally {
    console.warn = originalWarn;
    app.unmount();
    host.remove();
  }
});

test('ChartRoot publishes every controlled request after the generic command callback', async () => {
  const seed = createChartController({ definition: controlledChartDefinition, viewCapabilities: [{ axisID: 'x' }] });
  const selection = shallowRef({ type: 'points', ids: [1] });
  const activeDatum = shallowRef(1);
  const cursor = shallowRef(1);
  const view = shallowRef(seed.getSnapshot().state.view);
  seed.dispose();
  const observed = [];
  let controller = null;
  const ownerValue = (slice) => slice === 'activeDatum' ? activeDatum.value
    : slice === 'cursor' ? cursor.value
      : slice === 'selection' ? selection.value : view.value;
  const committedValue = (slice) => slice === 'activeDatum' ? controller.getSnapshot().state.activeDatum
    : slice === 'cursor' ? controller.getSnapshot().state.cursor
      : slice === 'selection' ? controller.getSnapshot().state.selection : controller.getSnapshot().state.view;
  const recordChange = (slice, requested) => observed.push({
    phase: 'change', slice, requested, owner: ownerValue(slice), committed: committedValue(slice),
  });
  const host = document.createElement('div');
  document.body.append(host);
  const app = createApp({
    render: () => h(ChartRoot, {
      modelValue: selection.value,
      activeDatum: activeDatum.value,
      cursor: cursor.value,
      view: view.value,
      'onUpdate:modelValue': (next) => { selection.value = next; recordChange('selection', next); },
      'onUpdate:activeDatum': (next) => { activeDatum.value = next; recordChange('activeDatum', next); },
      'onUpdate:cursor': (next) => { cursor.value = next; recordChange('cursor', next); },
      'onUpdate:view': (next) => { view.value = next; recordChange('view', next); },
      onCommand: (command) => {
        const slice = command.type === 'active-change-requested' ? 'activeDatum'
          : command.type === 'cursor-change-requested' ? 'cursor'
            : command.type === 'selection-change-requested' ? 'selection'
              : command.type === 'view-change-requested' ? 'view' : null;
        if (slice === null) return;
        const requested = command.type === 'selection-change-requested' ? command.selection
          : command.type === 'view-change-requested' ? command.view : command.id;
        observed.push({ phase: 'command', slice, requested, owner: ownerValue(slice), committed: committedValue(slice) });
      },
    }, {
      default: (slot) => {
        controller = slot.controller ?? controller;
        return controlledChartDeclarations();
      },
    }),
  });
  app.mount(host);
  await nextTick(); await nextTick();
  assert.ok(controller);

  const scenarios = [
    { slice: 'activeDatum', event: { type: 'set-active', id: '2' } },
    { slice: 'cursor', event: { type: 'set-cursor', id: '2' } },
    { slice: 'selection', event: { type: 'set-selection', selection: { type: 'points', ids: ['2'] } } },
    { slice: 'view', event: { type: 'zoom-axis-view', axisID: 'x', factor: 2, phase: 'settled' } },
  ];
  for (const scenario of scenarios) {
    observed.length = 0;
    const beforeOwner = ownerValue(scenario.slice);
    const beforeCommitted = committedValue(scenario.slice);
    const result = controller.dispatch(scenario.event);
    assert.equal(result.ok, true);
    assert.deepEqual(observed.map(({ phase, slice }) => [phase, slice]), [
      ['command', scenario.slice], ['change', scenario.slice],
    ]);
    assert.deepEqual(observed[0].owner, beforeOwner);
    assert.deepEqual(observed[0].committed, beforeCommitted);
    assert.deepEqual(observed[1].owner, observed[1].requested);
    assert.deepEqual(observed[1].committed, beforeCommitted);
    await nextTick(); await nextTick();
    assert.deepEqual(committedValue(scenario.slice), ownerValue(scenario.slice));
  }

  app.unmount();
  host.remove();
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

test('ChartRoot surfaces later DOM projection failures through its existing onError contract', async () => {
  const data = shallowRef(Object.freeze([{ id: 1, x: 0, y: 0 }]));
  const projections = [];
  const errors = [];
  const host = document.createElement('div');
  document.body.append(host);
  const app = createApp({
    render: () => h(ChartRoot, {
      dom: {
        renderer: mockRenderer(projections),
        renderPolicy: { type: 'fixed', renderScale: 1, maximumRepresentatives: 1 },
      },
      onError: (error) => errors.push(error),
    }, () => [
      h(ChartCartesian, null, () => [
        h(ChartXAxis, { id: 'x', scale: 'linear' }),
        h(ChartYAxis, { id: 'y', scale: 'linear' }),
        h(ChartScatter, { id: 'series', data: data.value, xAxis: 'x', yAxis: 'y' }),
      ]),
      h(ChartPlot, null, () => h(ChartRenderer)),
    ]),
  });

  app.mount(host);
  await nextTick(); await nextTick();
  assert.equal(errors.length, 0);
  assert.equal(projections.length, 1);

  data.value = Object.freeze([{ id: 1, x: 0, y: 0 }, { id: 2, x: 1, y: 1 }]);
  await nextTick(); await nextTick();
  assert.equal(errors.length, 1);
  assert.equal(errors[0].code, 'chart-projection-ceiling-exceeded');
  assert.equal(projections.length, 1, 'the last successful visual projection is preserved');

  app.unmount();
  host.remove();
});

test('granular provider selectors publish only their selected changes and release on unmount', async () => {
  const controller = createChartController({
    definition: {
      coordinate: { kind: 'cartesian', axes: [
        { id: 'x', orientation: 'x', scale: 'linear' },
        { id: 'y', orientation: 'y', scale: 'linear' },
      ] },
      layers: [{ id: 'series', kind: 'line', data: [{ id: 1, x: 0, y: 0 }], xAxis: 'x', yAxis: 'y' }],
    },
  });
  const renders = { cursor: 0, layer: 0, axis: 0 };
  const CursorProbe = { setup() { const value = useChartSelector((state) => state?.cursor); return () => { renders.cursor += 1; return String(value.value); }; } };
  const LayerProbe = { setup() { const value = useChartLayerSelector('series', (layer) => layer?.kind); return () => { renders.layer += 1; return String(value.value); }; } };
  const AxisProbe = { setup() { const value = useChartAxisSelector('x', (axis) => axis?.scale); return () => { renders.axis += 1; return String(value.value); }; } };
  const host = document.createElement('div');
  document.body.append(host);
  const app = createApp({ render: () => h(ChartProvider, { controller }, () => [h(CursorProbe), h(LayerProbe), h(AxisProbe)]) });
  app.mount(host);
  await nextTick();
  assert.deepEqual(renders, { cursor: 1, layer: 1, axis: 1 });
  controller.dispatch({ type: 'set-cursor', id: 1 });
  await nextTick();
  assert.deepEqual(renders, { cursor: 2, layer: 1, axis: 1 });
  app.unmount();
  controller.dispatch({ type: 'set-cursor', id: null });
  await nextTick();
  assert.deepEqual(renders, { cursor: 2, layer: 1, axis: 1 });
  controller.dispose(); host.remove();
});

test('ChartRoot hydrates deterministic structure before creating renderer resources', async () => {
  const projections = [];
  const renderer = mockRenderer(projections);
  let hydratedController = null;
  const component = {
    render: () => h(ChartRoot, { dom: { renderer } }, {
      default: (slot) => {
        hydratedController = slot.controller;
        return [
          h(ChartCartesian, null, () => [
            h(ChartXAxis, { id: 'x', scale: 'linear' }),
            h(ChartYAxis, { id: 'y', scale: 'linear' }),
            h(ChartLine, { id: 'series', data: [{ id: 1, x: 0, y: 0 }], xAxis: 'x', yAxis: 'y' }),
          ]),
          h(ChartPlot, null, () => h(ChartRenderer)),
        ];
      },
    }),
  };
  const html = await renderToString(createSSRApp(component));
  assert.equal(projections.length, 0);
  assert.match(html, /data-part="root"/);
  assert.match(html, /data-part="plot"/);
  assert.match(html, /data-part="renderer"/);

  const host = document.createElement('div');
  host.innerHTML = html;
  document.body.append(host);
  const app = createSSRApp(component);
  app.mount(host);
  await nextTick(); await nextTick();
  assert.ok(hydratedController);
  assert.ok(projections.length >= 1);
  app.unmount(); host.remove();
});

test('two roots synchronize axis-domain views only through consumer-owned controlled state', async () => {
  const definition = {
    coordinate: { kind: 'cartesian', axes: [
      { id: 'x', orientation: 'x', scale: 'linear' },
      { id: 'y', orientation: 'y', scale: 'linear' },
    ] },
    layers: [{ id: 'series', kind: 'line', data: [{ id: 1, x: 0, y: 0 }, { id: 2, x: 10, y: 10 }], xAxis: 'x', yAxis: 'y' }],
  };
  const seed = createChartController({ definition, viewCapabilities: [{ axisID: 'x' }] });
  const view = shallowRef(seed.getSnapshot().state.view);
  seed.dispose();
  const controllers = [];
  const chart = (index) => h(ChartRoot, {
    view: view.value,
    'onUpdate:view': (next) => { view.value = next; },
  }, {
    default: (slot) => {
      controllers[index] = slot.controller;
      return h(ChartCartesian, null, () => [
        h(ChartXAxis, { id: 'x', scale: 'linear' }, () => h(ChartAxisView)),
        h(ChartYAxis, { id: 'y', scale: 'linear' }),
        h(ChartLine, { id: 'series', data: definition.layers[0].data, xAxis: 'x', yAxis: 'y' }),
      ]);
    },
  });
  const host = document.createElement('div');
  document.body.append(host);
  const app = createApp({ render: () => h('div', [chart(0), chart(1)]) });
  app.mount(host);
  await nextTick(); await nextTick();
  controllers[0].dispatch({ type: 'zoom-axis-view', axisID: 'x', factor: 2, phase: 'settled' });
  await nextTick(); await nextTick();
  assert.deepEqual(controllers[0].getSnapshot().state.view, view.value);
  assert.deepEqual(controllers[1].getSnapshot().state.view, view.value);
  assert.deepEqual(
    controllers[0].getSnapshot().state.view.axes[0].visible,
    controllers[1].getSnapshot().state.view.axes[0].visible,
  );
  app.unmount(); host.remove();
});
