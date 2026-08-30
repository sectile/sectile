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

test('pointer, click, wheel, and keyboard input translate into portable controller events', () => {
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
  value.canvas.dispatchEvent(new value.window.WheelEvent('wheel', { deltaX: 5, deltaY: 10, cancelable: true }));
  assert.deepEqual(value.controller.getSnapshot().state.viewTransform, { xScale: 1, xOffset: -5, yScale: 1, yOffset: -10 });
  assert.equal(commands.includes('render-requested'), true);
  connection.disconnect(); connection.disconnect();
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
