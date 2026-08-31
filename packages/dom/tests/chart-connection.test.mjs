import assert from 'node:assert/strict';
import test from 'node:test';
import { Window } from 'happy-dom';
import { createChartController } from '@sectile/chart/controller';
import { createDOMChart, tryCreateDOMChart } from '../.verification-dist/chart.js';

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
  connection.setAccessibilityLabel('Quarterly revenue chart');
  assert.equal(value.root.getAttribute('aria-label'), 'Quarterly revenue chart');
  const options = [...value.root.querySelectorAll('[role="option"]')];
  assert.equal(options.length, 2);
  assert.notEqual(options[0].id, options[1].id);
  assert.deepEqual(options.map((option) => option.getAttribute('aria-selected')), ['false', 'false']);
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
  assert.equal(value.root.querySelectorAll('[role="option"]')[0].hasAttribute('data-active'), true);

  value.canvas.dispatchEvent(new value.window.MouseEvent('click', { clientX: 100, clientY: 0 }));
  connection.flush();
  assert.deepEqual(value.controller.getSnapshot().state.selection, { type: 'points', ids: ['1'] });
  assert.equal(value.controller.getSnapshot().state.cursor, '1');
  assert.equal(value.root.querySelectorAll('[role="option"]')[1].getAttribute('aria-selected'), 'true');
  assert.equal(value.root.querySelector('[role="listbox"]').hasAttribute('aria-activedescendant'), true);

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
  value.controller.dispatch({ type: 'set-active', id: 1 });
  value.controller.dispatch({ type: 'set-selection', selection: { type: 'points', ids: ['1'] } });
  const january = Date.UTC(2026, 0, 1);
  const february = Date.UTC(2026, 1, 1);
  const xScale = { normalize: (datum) => 40 + ((datum - january) / (february - january)) * 50 };
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
        { axis: { id: 'month', orientation: 'x', scale: 'temporal', domain: { kind: 'temporal', minimum: january, maximum: february }, ticks: 2, label: 'Month' }, descriptor: { axisID: 'month', orientation: 'x', kind: 'temporal', domain: { kind: 'temporal', minimum: january, maximum: february }, geometryDomain: { minimum: january, maximum: february }, range: { start: 40, end: 90 } }, scale: xScale, geometryScale: xScale, ticks: [{ value: january, position: 40 }, { value: february, position: 90 }] },
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
  assert.deepEqual([...value.root.querySelectorAll('[data-chart-overlay="axis-value"]')].map((node) => node.textContent), ['2026-01-01', '2026-02-01', '0', '10']);
  assert.deepEqual([...value.root.querySelectorAll('[data-chart-overlay="axis-label"]')].map((node) => node.textContent), ['Month', 'Revenue (USD)']);
  assert.equal(value.root.querySelector('[data-chart-overlay="legend-label"]').textContent, 'revenue');
  assert.equal(value.root.querySelectorAll('[data-chart-overlay="interaction-active"]').length, 1);
  assert.equal(value.root.querySelectorAll('[data-chart-overlay="interaction-selection"]').length, 1);
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

function navigableFixture() {
  const value = fixture();
  const view = Object.freeze({ revision: 0, axes: Object.freeze([Object.freeze({
    axisID: 'x', orientation: 'x', scale: 'linear',
    base: Object.freeze({ kind: 'continuous', minimum: 0, maximum: 100 }),
    initial: Object.freeze({ kind: 'continuous', minimum: 20, maximum: 80 }),
    visible: Object.freeze({ kind: 'continuous', minimum: 20, maximum: 80 }),
    update: 'preserve', followingEnd: false, revision: 0,
  })]) });
  const source = createChartController({
    model: value.controller.getModel().toModel(),
    initialValues: { view },
  });
  const scale = {
    normalize: (datum) => datum,
    invert: (pixel) => pixel,
  };
  const projection = {
    generation: 0, profile: 'point', coordinate: 'cartesian',
    viewport: { width: 100, height: 100, devicePixelRatio: 1 },
    identities: [1, '1'], batches: [], dataBatches: [],
    diagnostics: { sourceDatums: 2, representedDatums: 0, emittedPrimitives: 0 },
    layout: {
      viewport: { width: 100, height: 100 },
      insets: { top: 0, right: 0, bottom: 0, left: 0 },
      plot: { x: 0, y: 0, width: 100, height: 100 },
      axes: [{
        axis: { id: 'x', orientation: 'x', scale: 'linear', domain: { kind: 'linear', minimum: 20, maximum: 80 }, ticks: 2, label: 'Timeline' },
        descriptor: { axisID: 'x', orientation: 'x', kind: 'linear', domain: { kind: 'linear', minimum: 20, maximum: 80 }, geometryDomain: { minimum: 20, maximum: 80 }, range: { start: 0, end: 100 } },
        scale, geometryScale: scale, ticks: [{ value: 20, position: 0 }, { value: 80, position: 100 }],
      }],
    },
  };
  const controller = new Proxy(source, {
    get(target, property) {
      if (property === 'project') return () => ({ ok: true, value: projection });
      const result = Reflect.get(target, property, target);
      return typeof result === 'function' ? result.bind(target) : result;
    },
  });
  return { ...value, controller };
}

test('direct gestures require a declared single-pointer control alternative', () => {
  const value = navigableFixture();
  const result = tryCreateDOMChart({
    root: value.root, canvas: value.canvas, controller: value.controller, renderer: value.renderer,
    navigation: { drag: 'pan', axes: ['x'] },
  });
  assert.equal(result.ok, false);
  assert.match(result.error.message, /control alternative/);
});

test('opt-in axis navigation derives touch action, conditionally cancels wheel, coalesces settlement, and reconfigures cleanly', async () => {
  const value = navigableFixture();
  const connection = createDOMChart({
    root: value.root, canvas: value.canvas, controller: value.controller, renderer: value.renderer,
    navigation: {
      axes: ['x'], drag: 'pan', wheel: 'zoom', keyboard: true,
      controlAlternative: 'external',
    },
  });
  assert.equal(value.canvas.style.touchAction, 'pan-y');
  assert.equal(connection.getLifecycleDiagnostics().listeners, 9);

  const wheel = new value.window.WheelEvent('wheel', { clientX: 50, clientY: 50, deltaY: -100, cancelable: true });
  Object.defineProperties(wheel, {
    clientX: { value: 50 },
    clientY: { value: 50 },
  });
  value.canvas.dispatchEvent(wheel);
  assert.equal(wheel.defaultPrevented, true);
  assert.equal(connection.getLifecycleDiagnostics().timers, 1);
  const afterWheel = value.controller.getSnapshot().state.view.axes[0].visible;
  assert.equal(afterWheel.maximum - afterWheel.minimum < 60, true);

  const browserZoom = new value.window.WheelEvent('wheel', { clientX: 50, clientY: 50, deltaY: -100, ctrlKey: true, cancelable: true });
  Object.defineProperties(browserZoom, {
    clientX: { value: 50 },
    clientY: { value: 50 },
    ctrlKey: { value: true },
  });
  value.canvas.dispatchEvent(browserZoom);
  assert.equal(browserZoom.defaultPrevented, false);

  const beforeKeyboard = value.controller.getSnapshot().state.view;
  value.root.dispatchEvent(new value.window.KeyboardEvent('keydown', { key: 'ArrowRight', shiftKey: true, cancelable: true }));
  assert.notEqual(value.controller.getSnapshot().state.view, beforeKeyboard);

  await new Promise((resolve) => value.window.setTimeout(resolve, 140));
  assert.equal(connection.getLifecycleDiagnostics().timers, 0);
  assert.match(value.root.querySelector('[role="status"]').textContent, /Timeline range/);

  assert.equal(connection.setNavigation().ok, true);
  assert.equal(connection.getLifecycleDiagnostics().listeners, 4);
  assert.equal(value.canvas.style.touchAction, '');
  connection.disconnect();
  assert.deepEqual(connection.getLifecycleDiagnostics(), { listeners: 0, observers: 0, frames: 0, timers: 0, subscriptions: 0, overlayNodes: 0 });
});

test('pan and emulated pinch own one pointer mode, capture pointers, and release at settlement', () => {
  const value = navigableFixture();
  const captures = new Set();
  value.canvas.setPointerCapture = (id) => captures.add(id);
  value.canvas.hasPointerCapture = (id) => captures.has(id);
  value.canvas.releasePointerCapture = (id) => captures.delete(id);
  const connection = createDOMChart({
    root: value.root, canvas: value.canvas, controller: value.controller, renderer: value.renderer,
    navigation: { axes: ['x'], drag: 'pan', pinch: true, controlAlternative: 'external' },
  });
  assert.equal(value.canvas.style.touchAction, 'none');
  value.canvas.dispatchEvent(new value.window.PointerEvent('pointerdown', { pointerId: 1, button: 0, clientX: 40, clientY: 50 }));
  value.canvas.dispatchEvent(new value.window.PointerEvent('pointerdown', { pointerId: 2, button: 0, clientX: 60, clientY: 50 }));
  assert.deepEqual([...captures], [1, 2]);
  value.canvas.dispatchEvent(new value.window.PointerEvent('pointermove', { pointerId: 2, clientX: 80, clientY: 50 }));
  const zoomed = value.controller.getSnapshot().state.view.axes[0].visible;
  assert.equal(zoomed.maximum - zoomed.minimum, 30);
  value.canvas.dispatchEvent(new value.window.PointerEvent('pointerup', { pointerId: 2, button: 0, clientX: 80, clientY: 50 }));
  assert.equal(captures.size, 0);
  connection.disconnect();
});

test('region drag modes translate pixels into axis-domain zoom or selection without leaking a click', () => {
  for (const mode of ['zoom-region', 'select']) {
    const value = navigableFixture();
    const captures = new Set();
    value.canvas.setPointerCapture = (id) => captures.add(id);
    value.canvas.hasPointerCapture = (id) => captures.has(id);
    value.canvas.releasePointerCapture = (id) => captures.delete(id);
    const connection = createDOMChart({
      root: value.root, canvas: value.canvas, controller: value.controller, renderer: value.renderer,
      navigation: { axes: ['x'], drag: mode, controlAlternative: 'external' },
    });
    value.canvas.dispatchEvent(new value.window.PointerEvent('pointerdown', { pointerId: 1, button: 0, clientX: 30, clientY: 50 }));
    value.canvas.dispatchEvent(new value.window.PointerEvent('pointermove', { pointerId: 1, clientX: 70, clientY: 50 }));
    value.canvas.dispatchEvent(new value.window.PointerEvent('pointerup', { pointerId: 1, button: 0, clientX: 70, clientY: 50 }));
    value.canvas.dispatchEvent(new value.window.MouseEvent('click', { clientX: 70, clientY: 50 }));
    if (mode === 'zoom-region') assert.deepEqual(value.controller.getSnapshot().state.view.axes[0].visible, { kind: 'continuous', minimum: 30, maximum: 70 });
    else assert.deepEqual(value.controller.getSnapshot().state.selection, { type: 'axis-interval', axisID: 'x', start: 30, end: 70 });
    connection.disconnect();
  }
});

test('disconnect cancels the single pending frame and stale callbacks cannot render or retain resources', () => {
  const value = fixture();
  let callback;
  let cancelled = 0;
  value.window.requestAnimationFrame = (next) => { callback = next; return 17; };
  value.window.cancelAnimationFrame = (id) => { if (id === 17) cancelled += 1; };
  const connection = createDOMChart({ root: value.root, canvas: value.canvas, controller: value.controller, renderer: value.renderer });
  value.controller.applyPatch({ operations: [{ type: 'insert', layerID: 'points', index: 2, data: [{ id: 2, x: 2, y: 2 }] }] });
  assert.equal(connection.getLifecycleDiagnostics().frames, 1);
  assert.equal(value.renders.length, 1);
  connection.disconnect();
  assert.equal(cancelled, 1);
  callback(0);
  assert.equal(value.renders.length, 1);
  assert.deepEqual(connection.getLifecycleDiagnostics(), { listeners: 0, observers: 0, frames: 0, timers: 0, subscriptions: 0, overlayNodes: 0 });
});
