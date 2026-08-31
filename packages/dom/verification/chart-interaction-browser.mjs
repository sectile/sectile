import { createDOMChart } from '../dist/chart.js';
import { createChartController } from '@sectile/chart/controller';

const configurations = Object.freeze({
  native: Object.freeze({ axes: ['x'], keyboard: true }),
  x: Object.freeze({ axes: ['x'], drag: 'pan', wheel: 'zoom', wheelModifier: 'shift', keyboard: true, controlAlternative: 'external' }),
  y: Object.freeze({ axes: ['y'], drag: 'pan', wheel: 'zoom', wheelModifier: 'shift', keyboard: true, controlAlternative: 'external' }),
  xy: Object.freeze({ axes: ['x', 'y'], drag: 'pan', wheel: 'zoom', wheelModifier: 'shift', pinch: true, keyboard: true, controlAlternative: 'external' }),
});

const entries = new Map();
for (const [name, navigation] of Object.entries(configurations)) entries.set(name, createEntry(name, navigation));

window.__CHART_INTERACTION_BROWSER__ = Object.freeze({
  snapshot,
  wheel,
  wheelBurst,
  drag,
  pinch,
  keyboard,
  control,
  reconfigureDuringPointer,
  wheelAtLimit,
  disconnect,
});
const verificationResult = document.querySelector('#verification-result');
const runMatrixButton = document.querySelector('#run-matrix');
let verificationRevision = 0;
document.addEventListener('sectile-chart-verify', async () => {
  try {
    const request = JSON.parse(verificationResult.dataset.request ?? '{}');
    const methods = { snapshot, wheel, wheelBurst, drag, pinch, keyboard, control, reconfigureDuringPointer, wheelAtLimit, disconnect };
    const method = methods[request.method];
    if (method === undefined) throw new TypeError(`Unknown verification method: ${request.method}`);
    const value = await method(...(request.args ?? []));
    verificationResult.textContent = JSON.stringify({ ok: true, value });
  } catch (error) {
    verificationResult.textContent = JSON.stringify({ ok: false, error: error instanceof Error ? error.message : String(error) });
  }
  verificationResult.dataset.revision = String(++verificationRevision);
});
runMatrixButton.addEventListener('click', async () => {
  runMatrixButton.disabled = true;
  verificationResult.textContent = JSON.stringify(await runMatrix(), null, 2);
  runMatrixButton.disabled = false;
});
document.body.dataset.status = 'ready';

async function runMatrix() {
  const initial = Object.fromEntries(['native', 'x', 'y', 'xy'].map((name) => [name, snapshot(name)]));
  const ordinaryWheel = wheel('native', { deltaY: 80 });
  const browserZoomModifier = wheel('x', { deltaY: -80, ctrlKey: true });
  const enabledWheel = wheel('x', { deltaY: -80, shiftKey: true });
  const trackpadShapedWheel = wheelBurst('x');
  const coalescedFrame = snapshot('x').lifecycle.frames;
  await new Promise((resolve) => setTimeout(resolve, 160));
  const settledAnnouncement = snapshot('x').live;
  const keyboardResult = keyboard('y', 'ArrowUp', { shiftKey: true });
  const visibleControl = control('xy', 'in');
  const mouseDrag = drag('x', { x: 150, y: 110 }, { x: 195, y: 110 });
  const pinchX = pinch('x', { x: 130, y: 110 }, { x: 220, y: 110 }, { x: 105, y: 110 }, { x: 245, y: 110 });
  const pinchY = pinch('y', { x: 180, y: 80 }, { x: 180, y: 150 }, { x: 180, y: 55 }, { x: 180, y: 175 });
  const pinchXY = pinch('xy', { x: 135, y: 80 }, { x: 225, y: 150 }, { x: 105, y: 55 }, { x: 255, y: 175 });
  const activeModeConflict = reconfigureDuringPointer('xy');
  const semanticLimit = wheelAtLimit('x');
  const accessibility = Object.fromEntries(['native', 'x', 'y', 'xy'].map((name) => [name, snapshot(name)]));
  return {
    schemaVersion: 1,
    environment: {
      userAgent: navigator.userAgent,
      viewport: { width: innerWidth, height: innerHeight },
      coarsePointer: matchMedia('(pointer: coarse)').matches,
    },
    expectedTouchActions: { native: '', x: 'pan-y', y: 'pan-x', xy: 'none' },
    initial,
    scenarios: {
      ordinaryWheel,
      browserZoomModifier,
      enabledWheel,
      trackpadShapedWheel,
      coalescedFrame,
      settledAnnouncement,
      keyboardResult,
      visibleControl,
      mouseDrag,
      pinchX,
      pinchY,
      pinchXY,
      activeModeConflict,
      semanticLimit,
    },
    accessibility,
    emulation: {
      wheel: 'constructed WheelEvent; trackpad shape is not physical trackpad certification',
      pointer: 'constructed PointerEvent with emulated capture bookkeeping',
      touch: 'two synthetic touch PointerEvents; not touchscreen or firmware certification',
    },
  };
}

function createEntry(name, navigation) {
  const host = document.querySelector(`#${name}`);
  const canvas = document.createElement('canvas');
  canvas.width = 420;
  canvas.height = 220;
  host.append(canvas);
  const emulatedCaptures = new Set();
  canvas.setPointerCapture = (pointerID) => { emulatedCaptures.add(pointerID); };
  canvas.releasePointerCapture = (pointerID) => { emulatedCaptures.delete(pointerID); };
  canvas.hasPointerCapture = (pointerID) => emulatedCaptures.has(pointerID);
  const controller = createChartController({
    definition: {
      coordinate: { kind: 'cartesian', axes: [
        { id: 'x', orientation: 'x', scale: 'linear', label: 'X value' },
        { id: 'y', orientation: 'y', scale: 'linear', label: 'Y value' },
      ] },
      layers: [{
        id: 'series', kind: 'line', xAxis: 'x', yAxis: 'y',
        data: Array.from({ length: 101 }, (_, index) => ({ id: index, x: index, y: (index * 17) % 101 })),
      }],
    },
    viewCapabilities: [
      { axisID: 'x', initial: { kind: 'continuous', minimum: 20, maximum: 80 }, minimumSpan: 5 },
      { axisID: 'y', initial: { kind: 'continuous', minimum: 20, maximum: 80 }, minimumSpan: 5 },
    ],
  });
  const commands = [];
  const pointerEvents = { trustedDown: 0, trustedMove: 0, trustedUp: 0 };
  const connection = createDOMChart({
    root: host,
    canvas,
    controller,
    renderer: 'canvas2d',
    accessibilityLabel: `${name.toUpperCase()} interaction chart`,
    navigation,
    onCommand: (command) => { commands.push(command); },
  });
  for (const [type, field] of [['pointerdown', 'trustedDown'], ['pointermove', 'trustedMove'], ['pointerup', 'trustedUp']]) {
    canvas.addEventListener(type, (event) => {
      if (event.isTrusted) pointerEvents[field] += 1;
      host.dataset.pointerEvents = JSON.stringify(pointerEvents);
    });
  }
  const controls = document.createElement('div');
  controls.className = 'controls';
  for (const [action, label] of [['pan', 'Pan backward'], ['in', 'Zoom in'], ['out', 'Zoom out'], ['reset', 'Reset view']]) {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.action = action;
    button.setAttribute('aria-label', `${label} ${name.toUpperCase()} chart`);
    button.textContent = label;
    button.addEventListener('click', () => control(name, action));
    controls.append(button);
  }
  host.append(controls);
  const output = document.createElement('output');
  output.setAttribute('aria-live', 'polite');
  host.append(output);
  const entry = { name, host, canvas, controller, connection, commands, output, emulatedCaptures, navigation, pointerEvents };
  renderOutput(entry);
  return entry;
}

function snapshot(name) {
  const entry = required(name);
  const view = entry.controller.getSnapshot().state.view;
  return {
    name,
    view,
    touchAction: entry.canvas.style.touchAction,
    role: entry.host.getAttribute('role'),
    label: entry.host.getAttribute('aria-label'),
    live: entry.host.querySelector('[role="status"]')?.textContent ?? '',
    options: entry.host.querySelectorAll('[role="option"]').length,
    buttons: [...entry.host.querySelectorAll('button')].map((button) => ({
      label: button.getAttribute('aria-label'),
      disabled: button.disabled,
      width: button.getBoundingClientRect().width,
      height: button.getBoundingClientRect().height,
    })),
    lifecycle: entry.connection.getLifecycleDiagnostics(),
    commands: entry.commands.map((command) => command.type),
    capturedPointers: [...entry.emulatedCaptures],
  };
}

function wheel(name, init = {}) {
  const entry = required(name);
  const before = entry.controller.getSnapshot().state.view;
  const event = new WheelEvent('wheel', {
    clientX: entry.canvas.getBoundingClientRect().left + entry.canvas.clientWidth / 2,
    clientY: entry.canvas.getBoundingClientRect().top + entry.canvas.clientHeight / 2,
    deltaX: 0,
    deltaY: -80,
    bubbles: true,
    cancelable: true,
    ...init,
  });
  entry.canvas.dispatchEvent(event);
  renderOutput(entry);
  return { prevented: event.defaultPrevented, changed: entry.controller.getSnapshot().state.view !== before, snapshot: snapshot(name) };
}

function wheelBurst(name, count = 12) {
  const entry = required(name);
  const before = entry.controller.getSnapshot().state.view;
  const events = [];
  for (let index = 0; index < count; index += 1) events.push(wheel(name, { deltaX: 1.5, deltaY: -2.5, shiftKey: true }));
  return {
    emulation: 'trackpad-shaped WheelEvent sequence',
    prevented: events.every((event) => event.prevented),
    changed: entry.controller.getSnapshot().state.view !== before,
    pendingFrames: entry.connection.getLifecycleDiagnostics().frames,
    pendingTimers: entry.connection.getLifecycleDiagnostics().timers,
  };
}

function drag(name, from, to) {
  const entry = required(name);
  const before = entry.controller.getSnapshot().state.view;
  pointer(entry, 'pointerdown', 1, from, { pointerType: 'mouse' });
  pointer(entry, 'pointermove', 1, to, { pointerType: 'mouse' });
  const captured = entry.emulatedCaptures.has(1);
  pointer(entry, 'pointerup', 1, to, { pointerType: 'mouse' });
  renderOutput(entry);
  return { emulation: 'synthetic mouse PointerEvent drag', captured, released: !entry.emulatedCaptures.has(1), changed: entry.controller.getSnapshot().state.view !== before, snapshot: snapshot(name) };
}

function pinch(name, firstStart, secondStart, firstEnd, secondEnd) {
  const entry = required(name);
  const temporaryPinch = entry.navigation.pinch !== true;
  if (temporaryPinch) entry.connection.setNavigation({ ...entry.navigation, pinch: true });
  const touchActionDuring = entry.canvas.style.touchAction;
  const before = entry.controller.getSnapshot().state.view;
  pointer(entry, 'pointerdown', 11, firstStart, { pointerType: 'touch' });
  pointer(entry, 'pointerdown', 12, secondStart, { pointerType: 'touch' });
  pointer(entry, 'pointermove', 11, firstEnd, { pointerType: 'touch' });
  pointer(entry, 'pointermove', 12, secondEnd, { pointerType: 'touch' });
  const captured = entry.emulatedCaptures.size === 2;
  pointer(entry, 'pointerup', 11, firstEnd, { pointerType: 'touch' });
  pointer(entry, 'pointerup', 12, secondEnd, { pointerType: 'touch' });
  if (temporaryPinch) entry.connection.setNavigation(entry.navigation);
  renderOutput(entry);
  return {
    emulation: 'synthetic two-touch PointerEvent pinch',
    touchActionDuring,
    touchActionAfter: entry.canvas.style.touchAction,
    captured,
    released: entry.emulatedCaptures.size === 0,
    changed: entry.controller.getSnapshot().state.view !== before,
    snapshot: snapshot(name),
  };
}

function keyboard(name, key, init = {}) {
  const entry = required(name);
  const before = entry.controller.getSnapshot().state.view;
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init });
  entry.host.dispatchEvent(event);
  renderOutput(entry);
  return { prevented: event.defaultPrevented, changed: entry.controller.getSnapshot().state.view !== before, snapshot: snapshot(name) };
}

function control(name, action) {
  const entry = required(name);
  const axes = entry.navigation.axes ?? [];
  const before = entry.controller.getSnapshot().state.view;
  for (const axisID of axes) {
    const event = action === 'pan' ? { type: 'pan-axis-view', axisID, fraction: -0.1, phase: 'settled' }
      : action === 'in' ? { type: 'zoom-axis-view', axisID, factor: 1.25, anchor: 0.5, phase: 'settled' }
        : action === 'out' ? { type: 'zoom-axis-view', axisID, factor: 0.8, anchor: 0.5, phase: 'settled' }
          : { type: 'reset-axis-view', axisID, phase: 'settled' };
    entry.controller.dispatch(event);
  }
  entry.connection.flush();
  renderOutput(entry);
  return { changed: entry.controller.getSnapshot().state.view !== before, snapshot: snapshot(name) };
}

function reconfigureDuringPointer(name) {
  const entry = required(name);
  pointer(entry, 'pointerdown', 21, { x: 120, y: 100 }, { pointerType: 'mouse' });
  const result = entry.connection.setNavigation({ axes: entry.navigation.axes, keyboard: true });
  pointer(entry, 'pointercancel', 21, { x: 120, y: 100 }, { pointerType: 'mouse' });
  return { emulation: 'synthetic active pointer sequence', result, released: entry.emulatedCaptures.size === 0 };
}

function wheelAtLimit(name) {
  const entry = required(name);
  for (const axisID of entry.navigation.axes ?? []) entry.controller.dispatch({
    type: 'set-axis-view', axisID, visible: { kind: 'continuous', minimum: 0, maximum: 100 }, phase: 'settled',
  });
  entry.connection.flush();
  return wheel(name, { deltaY: 120, shiftKey: true });
}

function disconnect() {
  const results = {};
  for (const [name, entry] of entries) {
    entry.connection.disconnect();
    entry.controller.dispose();
    results[name] = entry.connection.getLifecycleDiagnostics();
  }
  return results;
}

function pointer(entry, type, pointerId, point, extras) {
  const rect = entry.canvas.getBoundingClientRect();
  entry.canvas.dispatchEvent(new PointerEvent(type, {
    pointerId,
    clientX: rect.left + point.x,
    clientY: rect.top + point.y,
    button: 0,
    buttons: type === 'pointerup' || type === 'pointercancel' ? 0 : 1,
    isPrimary: pointerId === 1 || pointerId === 11 || pointerId === 21,
    bubbles: true,
    cancelable: true,
    ...extras,
  }));
}

function renderOutput(entry) {
  const view = entry.controller.getSnapshot().state.view;
  entry.output.textContent = JSON.stringify(view);
  const axes = view?.axes.filter((axis) => (entry.navigation.axes ?? []).includes(axis.axisID)) ?? [];
  const states = {
    pan: axes.some((axis) => axis.visible.minimum > axis.base.minimum),
    in: axes.some((axis) => axis.visible.maximum - axis.visible.minimum > axis.minimumSpan),
    out: axes.some((axis) => axis.visible.maximum - axis.visible.minimum < axis.base.maximum - axis.base.minimum),
    reset: axes.some((axis) => axis.visible.minimum !== axis.initial.minimum || axis.visible.maximum !== axis.initial.maximum),
  };
  for (const button of entry.host.querySelectorAll('button[data-action]')) button.disabled = !states[button.dataset.action];
}

function required(name) {
  const entry = entries.get(name);
  if (entry === undefined) throw new TypeError(`Unknown chart fixture: ${name}`);
  return entry;
}
