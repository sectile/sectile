import {
  createDOMChart,
  detectChartRendererCapabilities,
  tryCreateChartRenderer,
} from '../dist/chart.js';
import { createChartController } from '@sectile/chart/controller';

const canvas = document.querySelector('#chart');
const output = document.querySelector('#result');
const capabilities = detectChartRendererCapabilities(canvas);
const rendererResult = tryCreateChartRenderer(canvas, {
  mode: 'webgl2',
  style: { color: [0.12, 0.34, 0.92, 1], pointRadius: 4, lineWidth: 1 },
});

let result;
if (!rendererResult.ok) {
  result = {
    schemaVersion: 1,
    status: 'failed',
    capabilities,
    error: rendererResult.error,
  };
} else {
  result = await verify(rendererResult.value, canvas, capabilities);
}

window.__CHART_WEBGL2_BROWSER_RESULT__ = result;
document.body.dataset.status = result.status;
output.textContent = JSON.stringify(result, null, 2);

async function verify(renderer, canvasElement, detectedCapabilities) {
  const gl = canvasElement.getContext('webgl2');
  const debug = gl.getExtension('WEBGL_debug_renderer_info');
  const rendererName = String(gl.getParameter(debug?.UNMASKED_RENDERER_WEBGL ?? gl.RENDERER));
  const vendorName = String(gl.getParameter(debug?.UNMASKED_VENDOR_WEBGL ?? gl.VENDOR));
  const softwareRenderer = /swiftshader|llvmpipe|lavapipe|software rasterizer/iu.test(rendererName);
  const environment = {
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    vendor: vendorName,
    renderer: rendererName,
    debugRendererInfo: debug !== null,
    softwareRenderer,
    drawingBuffer: { width: gl.drawingBufferWidth, height: gl.drawingBufferHeight },
    maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE),
    maxVertexAttributes: gl.getParameter(gl.MAX_VERTEX_ATTRIBS),
  };
  const projection = representativeProjection();

  drainErrors(gl);
  renderer.render(projection);
  renderer.flush();
  gl.finish();
  const renderError = gl.getError();
  const pixels = {
    background: readPixel(gl, 5, 5),
    point: readPixel(gl, 50, 50),
    polyline: readPixel(gl, 120, 40),
    rectangle: readPixel(gl, 30, 110),
    cell: readPixel(gl, 80, 110),
    arc: readPixel(gl, 100, 95),
  };
  const pixelChecks = {
    background: pixels.background[3] < 8,
    point: isChartColor(pixels.point),
    polyline: isChartColor(pixels.polyline),
    rectangle: isChartColor(pixels.rectangle),
    cell: isChartColor(pixels.cell),
    arc: isChartColor(pixels.arc),
  };
  const representativeDiagnostics = renderer.getDiagnostics();

  const stress = stressProjection(100_000);
  const stressStartedAt = performance.now();
  renderer.render(stress);
  renderer.flush();
  gl.finish();
  const stressRenderMs = performance.now() - stressStartedAt;
  const stressError = gl.getError();
  const stressDiagnostics = renderer.getDiagnostics();

  const canvasFallback = verifyCanvasFallback(projection);
  const domConnection = verifyDOMConnection();

  const contextLifecycle = await verifyContextLifecycle(
    canvasElement,
    gl,
    renderer,
    projection,
    representativeDiagnostics.liveResources,
  );
  renderer.disconnect();
  renderer.disconnect();
  const disconnectedDiagnostics = renderer.getDiagnostics();

  const scenarios = {
    hardwareContext: detectedCapabilities.webgl2 && !softwareRenderer,
    shaderPrograms: representativeDiagnostics.liveResources === 5 + projection.batches.length,
    fiveBatchTypes: representativeDiagnostics.drawCalls === 5,
    pixelReadback: Object.values(pixelChecks).every(Boolean),
    noRenderError: renderError === gl.NO_ERROR,
    stressUpload: stressError === gl.NO_ERROR
      && stressDiagnostics.uploadedBytes === stress.batches[0].positions.byteLength
      && stressDiagnostics.drawCalls === 1,
    canvas2dFallback: canvasFallback.passed,
    domConnection: domConnection.passed,
    contextLifecycle: contextLifecycle.supported ? contextLifecycle.passed : true,
    resourceCleanup: disconnectedDiagnostics.liveResources === 0,
  };

  return {
    schemaVersion: 1,
    status: Object.values(scenarios).every(Boolean) ? 'passed' : 'failed',
    environment,
    capabilities: detectedCapabilities,
    scenarios,
    pixels,
    pixelChecks,
    representativeDiagnostics,
    stress: {
      datums: 100_000,
      renderMs: Number(stressRenderMs.toFixed(3)),
      diagnostics: stressDiagnostics,
    },
    canvasFallback,
    domConnection,
    contextLifecycle,
    disconnectedDiagnostics,
    errors: { render: renderError, stress: stressError },
  };
}

function verifyCanvasFallback(projection) {
  const fallbackCanvas = document.createElement('canvas');
  fallbackCanvas.width = 200;
  fallbackCanvas.height = 150;
  const getContext = fallbackCanvas.getContext.bind(fallbackCanvas);
  Object.defineProperty(fallbackCanvas, 'getContext', {
    value: (kind, options) => kind === 'webgl2' ? null : getContext(kind, options),
  });
  const created = tryCreateChartRenderer(fallbackCanvas, { mode: 'auto' });
  if (!created.ok) return { passed: false, error: created.error };
  created.value.render(projection);
  created.value.flush();
  const rendered = created.value.getDiagnostics();
  created.value.disconnect();
  const disconnected = created.value.getDiagnostics();
  return {
    passed: rendered.mode === 'canvas2d' && rendered.drawCalls === 5
      && disconnected.liveResources === 0,
    rendered,
    disconnected,
    webgl2Unavailable: true,
  };
}

function verifyDOMConnection() {
  const root = document.querySelector('#interaction');
  const canvas = document.querySelector('#interaction-chart');
  const controller = createChartController({
    definition: {
      coordinate: { kind: 'cartesian', axes: [
        { id: 'x', orientation: 'x', scale: 'linear', label: 'Quarter' },
        { id: 'y', orientation: 'y', scale: 'linear', label: 'Revenue' },
      ] },
      layers: [{
        id: 'revenue', kind: 'line', xAxis: 'x', yAxis: 'y',
        data: [
          { id: 1, x: 0, y: 10 },
          { id: 2, x: 1, y: 18 },
          { id: 3, x: 2, y: 14 },
        ],
      }],
    },
    viewCapabilities: [{
      axisID: 'x',
      initial: { kind: 'continuous', minimum: 0, maximum: 1 },
    }],
  });
  const connection = createDOMChart({
    root,
    canvas,
    controller,
    renderer: 'canvas2d',
    accessibilityLabel: 'Quarterly revenue',
    navigation: { axes: ['x'], keyboard: true },
  });
  const before = controller.getSnapshot().state.view;
  const keyboard = new KeyboardEvent('keydown', {
    key: 'ArrowRight', shiftKey: true, bubbles: true, cancelable: true,
  });
  root.dispatchEvent(keyboard);
  connection.flush();
  const after = controller.getSnapshot().state.view;
  const ordinaryWheel = new WheelEvent('wheel', { deltaY: 100, bubbles: true, cancelable: true });
  canvas.dispatchEvent(ordinaryWheel);
  const rendered = connection.getRendererDiagnostics();
  const connectedLifecycle = connection.getLifecycleDiagnostics();
  const observed = {
    role: root.getAttribute('role'),
    label: root.getAttribute('aria-label'),
    axes: root.querySelectorAll('[data-chart-overlay="axis-baseline"]').length,
    options: root.querySelectorAll('[role="option"]').length,
    keyboardPrevented: keyboard.defaultPrevented,
    viewChanged: after !== before,
    ordinaryWheelNative: !ordinaryWheel.defaultPrevented,
  };
  connection.disconnect();
  const disconnectedLifecycle = connection.getLifecycleDiagnostics();
  const disconnectedRenderer = connection.getRendererDiagnostics();
  controller.dispose();
  return {
    passed: rendered?.mode === 'canvas2d' && observed.role === 'region'
      && observed.label === 'Quarterly revenue' && observed.axes === 2
      && observed.options === 3 && observed.keyboardPrevented
      && observed.viewChanged && observed.ordinaryWheelNative
      && disconnectedLifecycle.listeners === 0
      && disconnectedLifecycle.subscriptions === 0
      && disconnectedRenderer?.liveResources === 0,
    observed,
    rendered,
    connectedLifecycle,
    disconnectedLifecycle,
    disconnectedRenderer,
  };
}

function representativeProjection() {
  return {
    generation: 0,
    profile: 'layered',
    viewport: { width: 200, height: 150, devicePixelRatio: 1 },
    identities: [1, 2, 3, 4, 5],
    diagnostics: { sourceDatums: 5, representedDatums: 5, emittedPrimitives: 5 },
    batches: [
      { type: 'point', layerIndex: 0, positions: new Float32Array([50, 50]), identityIndices: new Uint32Array([0]) },
      { type: 'polyline', layerIndex: 1, positions: new Float32Array([100, 40, 140, 40]), offsets: new Uint32Array([0, 2]), identityIndices: new Uint32Array([1, 1]) },
      { type: 'rectangle', layerIndex: 2, rectangles: new Float32Array([20, 100, 30, 25]), identityIndices: new Uint32Array([2]) },
      { type: 'cell', layerIndex: 3, cells: new Float32Array([70, 100, 30, 25, 9]), identityIndices: new Uint32Array([3]) },
      { type: 'arc', layerIndex: 4, arcs: new Float32Array([160, 110, 10, 25, 0, Math.PI * 2]), identityIndices: new Uint32Array([4]) },
    ],
  };
}

function stressProjection(size) {
  const positions = new Float32Array(size * 2);
  const identityIndices = new Uint32Array(size);
  for (let index = 0; index < size; index += 1) {
    positions[index * 2] = index % 200;
    positions[index * 2 + 1] = Math.floor(index / 200) % 150;
    identityIndices[index] = index;
  }
  return {
    generation: 1,
    profile: 'point',
    viewport: { width: 200, height: 150, devicePixelRatio: 1 },
    identities: [],
    diagnostics: { sourceDatums: size, representedDatums: size, emittedPrimitives: size },
    batches: [{ type: 'point', layerIndex: 0, positions, identityIndices }],
  };
}

async function verifyContextLifecycle(canvasElement, gl, renderer, projection, expectedResources) {
  const extension = gl.getExtension('WEBGL_lose_context');
  if (extension === null) return { supported: false, passed: false };
  const lost = eventOnce(canvasElement, 'webglcontextlost');
  extension.loseContext();
  const lostObserved = await lost;
  const lostResources = renderer.getDiagnostics().liveResources;
  const restored = eventOnce(canvasElement, 'webglcontextrestored');
  await nextFrames(2);
  extension.restoreContext();
  const restoredObserved = await restored;
  renderer.render(projection);
  renderer.flush();
  gl.finish();
  const restoredError = gl.getError();
  const restoredResources = renderer.getDiagnostics().liveResources;
  return {
    supported: true,
    passed: lostObserved && restoredObserved && lostResources === 0
      && restoredResources === expectedResources && restoredError === gl.NO_ERROR,
    lostObserved,
    restoredObserved,
    lostResources,
    restoredResources,
    restoredError,
  };
}

function eventOnce(target, type) {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => resolve(false), 5_000);
    target.addEventListener(type, () => {
      clearTimeout(timeout);
      resolve(true);
    }, { once: true });
  });
}

function readPixel(gl, x, y) {
  const pixel = new Uint8Array(4);
  gl.readPixels(x, gl.drawingBufferHeight - y - 1, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
  return [...pixel];
}

function isChartColor(pixel) {
  const alpha = pixel[3];
  return alpha >= 96
    && Math.abs(pixel[0] - 0.12 * alpha) <= 4
    && Math.abs(pixel[1] - 0.34 * alpha) <= 4
    && Math.abs(pixel[2] - 0.92 * alpha) <= 4;
}

function nextFrames(count) {
  return new Promise((resolve) => {
    const next = () => count-- <= 0 ? resolve() : requestAnimationFrame(next);
    next();
  });
}

function drainErrors(gl) {
  while (gl.getError() !== gl.NO_ERROR) {
    // Clear errors introduced by browser extensions before the fixture starts.
  }
}
