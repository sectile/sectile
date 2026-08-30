import assert from 'node:assert/strict';
import test from 'node:test';
import { createChartRenderer, tryCreateChartRenderer } from '../.verification-dist/chart.js';

function fixture() {
  const calls = [];
  const context = new Proxy({
    setTransform: (...args) => calls.push(['setTransform', ...args]),
    clearRect: (...args) => calls.push(['clearRect', ...args]),
    beginPath: () => calls.push(['beginPath']),
    moveTo: (...args) => calls.push(['moveTo', ...args]),
    arc: (...args) => calls.push(['arc', ...args]),
    fill: () => calls.push(['fill']),
    stroke: () => calls.push(['stroke']),
    lineTo: (...args) => calls.push(['lineTo', ...args]),
    fillRect: (...args) => calls.push(['fillRect', ...args]),
    closePath: () => calls.push(['closePath']),
  }, { set(target, key, value) { calls.push([`set:${String(key)}`, value]); target[key] = value; return true; } });
  const canvas = {
    ownerDocument: { createElement: () => ({ getContext: () => null }) },
    getContext: (kind) => kind === '2d' ? context : null,
  };
  return { calls, canvas };
}

function webglFixture() {
  const calls = [];
  let resource = 0;
  const gl = {
    VERTEX_SHADER: 1, FRAGMENT_SHADER: 2, COMPILE_STATUS: 3, LINK_STATUS: 4,
    ARRAY_BUFFER: 5, STATIC_DRAW: 6, DYNAMIC_DRAW: 7, FLOAT: 8, UNSIGNED_BYTE: 9,
    COLOR_BUFFER_BIT: 10, BLEND: 11, SRC_ALPHA: 12, ONE_MINUS_SRC_ALPHA: 13,
    POINTS: 14, LINE_STRIP: 15, TRIANGLES: 16,
    getExtension: () => null,
    createShader: () => ({ id: ++resource }), shaderSource() {}, compileShader() {},
    getShaderParameter: () => true, getShaderInfoLog: () => '', deleteShader() {},
    createProgram: () => ({ id: ++resource }), attachShader() {}, linkProgram() {},
    getProgramParameter: () => true, getProgramInfoLog: () => '',
    deleteProgram: () => calls.push(['deleteProgram']),
    createBuffer: () => ({ id: ++resource }), deleteBuffer: () => calls.push(['deleteBuffer']),
    bindBuffer() {}, bufferData: (_target, data) => calls.push(['bufferData', data.byteLength]),
    bufferSubData: (_target, offset, data) => calls.push(['bufferSubData', offset, data.byteLength]),
    viewport() {}, clearColor() {}, clear() {}, enable() {}, blendFunc() {},
    useProgram() {}, getUniformLocation: () => ({}), uniform1f() {}, uniform2f() {},
    getAttribLocation: (_program, name) => ({ aPosition: 0, aCorner: 1, aRectangle: 2, aArc: 3, aColor: 4 })[name],
    enableVertexAttribArray() {}, disableVertexAttribArray() {}, vertexAttrib4f() {},
    vertexAttribPointer() {}, vertexAttribDivisor() {}, lineWidth() {},
    drawArrays: (...args) => calls.push(['drawArrays', ...args]),
    drawArraysInstanced: (...args) => calls.push(['drawArraysInstanced', ...args]),
    flush: () => calls.push(['flush']),
  };
  const canvas = {
    width: 200, height: 160,
    ownerDocument: { createElement: () => ({ getContext: () => gl }) },
    getContext: (kind) => kind === 'webgl2' ? gl : null,
    addEventListener: (...args) => calls.push(['addEventListener', ...args]),
    removeEventListener: (...args) => calls.push(['removeEventListener', ...args]),
  };
  return { calls, canvas };
}

const revision = Object.freeze({ identity: 0, order: 0, value: 0, geometry: 0, aggregate: 0, style: 0, level: 0 });
const red = new Uint8Array([255, 0, 0, 255]);
const blue = new Uint8Array([0, 0, 255, 255]);

function axis(id, orientation, minimum, maximum, start, end) {
  const project = (value) => start + (value - minimum) / (maximum - minimum) * (end - start);
  return {
    axis: { id, orientation, scale: 'linear', domain: { kind: 'linear', minimum, maximum }, ticks: 2 },
    descriptor: { axisID: id, orientation, kind: 'linear', domain: { kind: 'linear', minimum, maximum }, geometryDomain: { minimum, maximum }, range: { start, end } },
    geometryScale: { normalize: project },
    scale: { normalize: project },
    ticks: [{ value: minimum, position: start }, { value: maximum, position: end }],
  };
}

function projection() {
  const dataBatches = [
    { type: 'point', layerIndex: 0, xAxisID: 'x', yAxisID: 'y', geometry: { type: 'point', positions: new Float64Array([1, 2]) }, identityIndices: new Uint32Array([0]), representatives: [], revision, colors: red },
    { type: 'polyline', layerIndex: 1, xAxisID: 'x', yAxisID: 'y', geometry: { type: 'polyline', positions: new Float64Array([0, 0, 10, 10]), offsets: new Uint32Array([0, 2]) }, identityIndices: new Uint32Array([1, 2]), representatives: [], revision, colors: blue },
    { type: 'rectangle', layerIndex: 2, xAxisID: 'x', yAxisID: 'y', geometry: { type: 'rectangle', segments: new Float64Array([1, 0, 2, 4]) }, identityIndices: new Uint32Array([3]), representatives: [], revision, colors: red },
    { type: 'cell', layerIndex: 3, xAxisID: 'x', yAxisID: 'y', geometry: { type: 'cell', bounds: new Float64Array([2, 3, 4, 5]) }, values: new Float64Array([9]), identityIndices: new Uint32Array([4]), representatives: [], revision, colors: blue },
    { type: 'arc', layerIndex: 4, geometry: { type: 'arc', arcs: new Float64Array([0, 1, 0, Math.PI]) }, identityIndices: new Uint32Array([5]), representatives: [], revision, colors: red },
    { type: 'arc', layerIndex: 5, geometry: { type: 'arc', arcs: new Float64Array([0.5, 1, Math.PI, Math.PI * 2]) }, identityIndices: new Uint32Array([6]), representatives: [], revision, colors: blue },
  ];
  return {
    generation: 0,
    profile: 'layered',
    coordinate: 'cartesian',
    viewport: { width: 100, height: 80, devicePixelRatio: 2 },
    identities: [1, 2, 3, 4, 5, 6, 7],
    diagnostics: { sourceDatums: 7, representedDatums: 7, emittedPrimitives: 7 },
    layout: { viewport: { width: 100, height: 80 }, insets: { top: 0, right: 0, bottom: 0, left: 0 }, plot: { x: 0, y: 0, width: 100, height: 80 }, axes: [axis('x', 'x', 0, 10, 0, 100), axis('y', 'y', 0, 10, 80, 0)] },
    batches: [],
    dataBatches,
  };
}

test('Canvas2D consumes all six semantic profiles in data space with per-primitive colors', () => {
  const { calls, canvas } = fixture();
  const renderer = createChartRenderer(canvas, { mode: 'canvas2d' });
  renderer.render(projection());
  const diagnostics = renderer.getDiagnostics();
  assert.equal(diagnostics.mode, 'canvas2d');
  assert.equal(diagnostics.drawCalls, 6);
  assert.equal(calls.some(([name]) => name === 'fillRect'), true);
  assert.equal(calls.some(([name]) => name === 'lineTo'), true);
  assert.equal(calls.filter(([name]) => name === 'arc').length >= 4, true);
  assert.equal(calls.some(([name, value]) => name === 'set:fillStyle' && String(value).includes('255, 0, 0')), true);
});

test('renderer disconnect is idempotent and leaves zero live resources', () => {
  const { canvas } = fixture();
  const renderer = createChartRenderer(canvas, { mode: 'canvas2d' });
  renderer.disconnect(); renderer.disconnect();
  assert.equal(renderer.getDiagnostics().liveResources, 0);
});

test('WebGL2 retains layer buffers across compatible view changes and uploads only changed geometry', () => {
  const { calls, canvas } = webglFixture();
  const renderer = createChartRenderer(canvas, { mode: 'webgl2' });
  const first = projection();
  renderer.render(first);
  assert.equal(renderer.getDiagnostics().drawCalls, 6);
  assert.equal(renderer.getDiagnostics().uploadedBytes > 0, true);
  const uploadsAfterFirst = calls.filter(([name]) => name === 'bufferData').length;

  first.viewport = { width: 120, height: 90, devicePixelRatio: 2 };
  renderer.render(first);
  assert.equal(renderer.getDiagnostics().uploadedBytes, 0);
  assert.equal(renderer.getDiagnostics().reusedGeometryBuffers, 6);
  assert.equal(calls.filter(([name]) => name === 'bufferData').length, uploadsAfterFirst);

  first.dataBatches[2] = { ...first.dataBatches[2], geometry: { type: 'rectangle', segments: new Float64Array([2, 0, 3, 6]) } };
  renderer.render(first);
  assert.equal(renderer.getDiagnostics().uploadedBytes, 16);
  assert.equal(calls.filter(([name]) => name === 'bufferData').length, uploadsAfterFirst + 1);

  renderer.flush();
  renderer.disconnect(); renderer.disconnect();
  assert.equal(calls.filter(([name]) => name === 'deleteProgram').length, 4);
  assert.equal(calls.filter(([name]) => name === 'removeEventListener').length, 2);
  assert.equal(renderer.getDiagnostics().liveResources, 0);
});

test('WebGL2 applies a bounded partial upload only when the changed range crosses the calibrated size gate', () => {
  const { calls, canvas } = webglFixture();
  const renderer = createChartRenderer(canvas, { mode: 'webgl2' });
  const first = projection();
  const positions = new Float64Array(4_096);
  first.dataBatches = [{ ...first.dataBatches[0], geometry: { type: 'point', positions } }];
  renderer.render(first);
  const changed = positions.slice();
  changed[2_000] = 4;
  changed[2_001] = 5;
  first.dataBatches = [{ ...first.dataBatches[0], geometry: { type: 'point', positions: changed } }];
  renderer.render(first);
  assert.equal(renderer.getDiagnostics().fullUploads, 0);
  assert.equal(renderer.getDiagnostics().partialUploads, 1);
  assert.equal(renderer.getDiagnostics().uploadedBytes, 8);
  assert.deepEqual(calls.findLast(([name]) => name === 'bufferSubData').slice(1), [8_000, 8]);
  renderer.disconnect();
});

test('WebGL2 invalidates lost resources, restores the last projection, and ignores callbacks after disconnect', () => {
  const { calls, canvas } = webglFixture();
  const renderer = createChartRenderer(canvas, { mode: 'webgl2' });
  renderer.render(projection());
  const uploads = calls.filter(([name]) => name === 'bufferData').length;
  const lost = calls.find(([name, type]) => name === 'addEventListener' && type === 'webglcontextlost')[2];
  const restored = calls.find(([name, type]) => name === 'addEventListener' && type === 'webglcontextrestored')[2];
  let prevented = false;
  lost({ preventDefault: () => { prevented = true; } });
  assert.equal(prevented, true);
  assert.equal(renderer.getDiagnostics().liveResources, 0);
  restored();
  assert.equal(calls.filter(([name]) => name === 'bufferData').length > uploads, true);
  assert.equal(renderer.getDiagnostics().liveResources > 5, true);
  renderer.disconnect();
  const afterDisconnect = calls.filter(([name]) => name === 'bufferData').length;
  restored();
  assert.equal(calls.filter(([name]) => name === 'bufferData').length, afterDisconnect);
});

test('renderer construction rejects invalid styles and unavailable explicit modes', () => {
  const { canvas } = fixture();
  assert.equal(tryCreateChartRenderer(canvas, { style: { pointRadius: 0 } }).error.code, 'invalid-boundary');
  assert.equal(tryCreateChartRenderer(canvas, { mode: 'webgl2' }).error.code, 'invalid-boundary');
});

test('automatic renderer falls back to Canvas2D when WebGL2 initialization fails', () => {
  const { canvas: fallback } = fixture();
  const canvas = {
    ...fallback,
    addEventListener() {}, removeEventListener() {},
    getContext: (kind) => kind === 'webgl2' ? {
      getExtension: () => null,
      createShader: () => null,
    } : fallback.getContext(kind),
  };
  const renderer = createChartRenderer(canvas, { mode: 'auto' });
  assert.equal(renderer.getDiagnostics().mode, 'canvas2d');
  renderer.disconnect();
});
