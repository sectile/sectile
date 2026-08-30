import assert from 'node:assert/strict';
import test from 'node:test';
import { Window } from 'happy-dom';
import { createChartController } from '@sectile/chart/controller';
import { createDOMChart } from '../.verification-dist/chart.js';

function fixture() {
  const window = new Window({ url: 'https://sectile.dev/chart' });
  const root = window.document.createElement('div');
  const canvas = window.document.createElement('canvas');
  root.append(canvas);
  window.document.body.append(root);
  root.getBoundingClientRect = () => ({ x: 0, y: 0, left: 0, top: 0, right: 100, bottom: 100, width: 100, height: 100, toJSON() {} });
  canvas.getBoundingClientRect = root.getBoundingClientRect;
  const renders = [];
  let disconnected = 0;
  const renderer = {
    capabilities: { canvas2d: true, webgl2: false, asynchronousGPUTiming: false },
    render: (projection) => renders.push(projection),
    getDiagnostics: () => ({ mode: 'canvas2d', uploadedBytes: 0, drawCalls: 1, liveResources: 1 }),
    flush() {},
    disconnect: () => { disconnected += 1; },
  };
  const controller = createChartController({ model: { layers: [{ id: 'points', profile: 'point', data: [
    { id: 1, x: 0, y: 0 }, { id: '1', x: 1, y: 1 },
  ] }] } });
  return { window, root, canvas, renderer, controller, renders, disconnected: () => disconnected };
}

test('DOM Chart projects synchronously and exposes a bounded mixed-ID accessibility view', () => {
  const value = fixture();
  const connection = createDOMChart({
    root: value.root,
    canvas: value.canvas,
    controller: value.controller,
    renderer: value.renderer,
    accessibilityLabel: 'Revenue chart',
  });
  assert.equal(value.renders.length, 1);
  assert.deepEqual(connection.getViewport(), { width: 100, height: 100, devicePixelRatio: 1 });
  assert.equal(value.root.getAttribute('role'), 'region');
  assert.equal(value.root.getAttribute('aria-label'), 'Revenue chart');
  const options = [...value.root.querySelectorAll('[role="option"]')];
  assert.equal(options.length, 2);
  assert.notEqual(options[0].id, options[1].id);
  connection.disconnect();
  assert.equal(value.root.hasAttribute('role'), false);
  assert.equal(value.root.querySelector('[role="listbox"]'), null);
  assert.equal(value.disconnected(), 0, 'borrowed renderer remains caller-owned');
});

test('pointer, click, and keyboard input translate while ordinary wheel remains native', () => {
  const value = fixture();
  const commands = [];
  const connection = createDOMChart({
    root: value.root,
    canvas: value.canvas,
    controller: value.controller,
    renderer: value.renderer,
    onCommand: (command) => commands.push(command.type),
  });
  value.canvas.dispatchEvent(new value.window.PointerEvent('pointermove', { clientX: 0, clientY: 100 }));
  connection.flush();
  assert.equal(value.controller.getSnapshot().state.activeDatum, 1);

  value.canvas.dispatchEvent(new value.window.MouseEvent('click', { clientX: 100, clientY: 0 }));
  assert.deepEqual(value.controller.getSnapshot().state.selection, { type: 'points', ids: ['1'] });
  assert.equal(value.controller.getSnapshot().state.cursor, '1');

  value.root.dispatchEvent(new value.window.KeyboardEvent('keydown', { key: 'Home', cancelable: true }));
  assert.equal(value.controller.getSnapshot().state.cursor, 1);
  const beforeWheel = value.controller.getSnapshot();
  const wheel = new value.window.WheelEvent('wheel', { deltaX: 5, deltaY: 10, cancelable: true });
  value.canvas.dispatchEvent(wheel);
  assert.equal(wheel.defaultPrevented, false);
  assert.equal(value.controller.getSnapshot(), beforeWheel);
  assert.equal(commands.includes('render-requested'), true);
  connection.disconnect(); connection.disconnect();
});

test('connection-owned overlay renders bounded axes, grid, values, labels, units, and legend', () => {
  const value = fixture();
  const xScale = { normalize: (datum) => 40 + datum * 4 };
  const yScale = { normalize: (datum) => 70 - datum * 5 };
  const semanticProjection = {
    generation: 0,
    profile: 'point',
    coordinate: 'cartesian',
    viewport: { width: 100, height: 100, devicePixelRatio: 1 },
    identities: [1, '1'],
    diagnostics: { sourceDatums: 2, representedDatums: 2, emittedPrimitives: 2 },
    batches: [{ type: 'point', layerIndex: 0, positions: new Float32Array([40, 70, 44, 65]), identityIndices: new Uint32Array([0, 1]), colors: new Uint8Array([255, 0, 0, 255, 255, 0, 0, 255]) }],
    dataBatches: [],
    layerRevisions: [{ layerID: 'revenue', identity: 0, order: 0, value: 0, geometry: 0, aggregate: 0, style: 0, level: 0 }],
    layout: {
      viewport: { width: 100, height: 100, devicePixelRatio: 1 },
      insets: { top: 10, right: 10, bottom: 30, left: 40 },
      plot: { x: 40, y: 10, width: 50, height: 60 },
      axes: [
        { axis: { id: 'month', orientation: 'x', scale: 'linear', domain: { kind: 'linear', minimum: 0, maximum: 10 }, ticks: 2, label: 'Month' }, descriptor: { axisID: 'month', orientation: 'x', kind: 'linear', domain: { kind: 'linear', minimum: 0, maximum: 10 }, geometryDomain: { minimum: 0, maximum: 10 }, range: { start: 40, end: 90 } }, scale: xScale, geometryScale: xScale, ticks: [{ value: 0, position: 40 }, { value: 10, position: 90 }] },
        { axis: { id: 'revenue', orientation: 'y', scale: 'linear', domain: { kind: 'linear', minimum: 0, maximum: 10 }, ticks: 2, label: 'Revenue', unit: 'USD' }, descriptor: { axisID: 'revenue', orientation: 'y', kind: 'linear', domain: { kind: 'linear', minimum: 0, maximum: 10 }, geometryDomain: { minimum: 0, maximum: 10 }, range: { start: 70, end: 10 } }, scale: yScale, geometryScale: yScale, ticks: [{ value: 0, position: 70 }, { value: 10, position: 10 }] },
      ],
    },
  };
  const controller = new Proxy(value.controller, {
    get(target, property) {
      if (property === 'project') return () => ({ ok: true, value: semanticProjection });
      const result = Reflect.get(target, property, target);
      return typeof result === 'function' ? result.bind(target) : result;
    },
  });
  const connection = createDOMChart({ root: value.root, canvas: value.canvas, controller, renderer: value.renderer });
  assert.equal(value.root.querySelectorAll('[data-chart-overlay="grid-line"]').length, 4);
  assert.deepEqual([...value.root.querySelectorAll('[data-chart-overlay="axis-label"]')].map((node) => node.textContent), ['Month', 'Revenue (USD)']);
  assert.equal(value.root.querySelector('[data-chart-overlay="legend-label"]').textContent, 'revenue');
  connection.disconnect();
  assert.equal(value.root.querySelector('svg'), null);
});

test('model generations rebuild accessibility within the declared ceiling', () => {
  const value = fixture();
  const connection = createDOMChart({
    root: value.root, canvas: value.canvas, controller: value.controller,
    renderer: value.renderer, accessibilityLimit: 1,
  });
  assert.equal(value.root.querySelectorAll('[role="option"]').length, 1);
  value.controller.applyPatch({ operations: [{
    type: 'insert', layerID: 'points', index: 2, data: [{ id: 2, x: 2, y: 2 }],
  }] });
  connection.flush();
  assert.equal(value.root.querySelectorAll('[role="option"]').length, 1);
  assert.equal(value.root.querySelector('[role="listbox"]').getAttribute('aria-setsize'), '3');
  connection.disconnect();
});
