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
  }, { set(target, key, value) { target[key] = value; return true; } });
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
    ARRAY_BUFFER: 5, STATIC_DRAW: 6, DYNAMIC_DRAW: 7, FLOAT: 8,
    COLOR_BUFFER_BIT: 9, BLEND: 10, SRC_ALPHA: 11, ONE_MINUS_SRC_ALPHA: 12,
    POINTS: 13, LINE_STRIP: 14, TRIANGLES: 15,
    getExtension: () => null,
    createShader: () => ({ id: ++resource }), shaderSource() {}, compileShader() {},
    getShaderParameter: () => true, getShaderInfoLog: () => '', deleteShader() {},
    createProgram: () => ({ id: ++resource }), attachShader() {}, linkProgram() {},
    getProgramParameter: () => true, getProgramInfoLog: () => '',
    deleteProgram: () => calls.push(['deleteProgram']),
    createBuffer: () => ({ id: ++resource }), deleteBuffer: () => calls.push(['deleteBuffer']),
    bindBuffer() {}, bufferData() {}, viewport() {}, clearColor() {}, clear() {}, enable() {}, blendFunc() {},
    useProgram() {}, getUniformLocation: () => ({}), uniform1f() {}, uniform2f() {}, uniform4f() {},
    getAttribLocation: (_program, name) => ({ aPosition: 0, aCorner: 1, aRectangle: 2, aArcA: 3, aArcB: 4 })[name],
    enableVertexAttribArray() {}, vertexAttribPointer() {}, vertexAttribDivisor() {}, lineWidth() {},
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

const projection = {
  generation: 0,
  profile: 'layered',
  viewport: { width: 100, height: 80, devicePixelRatio: 2 },
  identities: [1, 2, 3, 4, 5],
  diagnostics: { sourceDatums: 5, representedDatums: 5, emittedPrimitives: 5 },
  batches: [
    { type: 'point', layerIndex: 0, positions: new Float32Array([10, 10]), identityIndices: new Uint32Array([0]) },
    { type: 'polyline', layerIndex: 1, positions: new Float32Array([0, 0, 10, 10]), offsets: new Uint32Array([0, 2]), identityIndices: new Uint32Array([1, 1]) },
    { type: 'rectangle', layerIndex: 2, rectangles: new Float32Array([1, 2, 3, 4]), identityIndices: new Uint32Array([2]) },
    { type: 'cell', layerIndex: 3, cells: new Float32Array([2, 3, 4, 5, 9]), identityIndices: new Uint32Array([3]) },
    { type: 'arc', layerIndex: 4, arcs: new Float32Array([50, 40, 10, 30, 0, Math.PI]), identityIndices: new Uint32Array([4]) },
  ],
};

test('Canvas2D renderer consumes every packed batch without geometry expansion', () => {
  const { calls, canvas } = fixture();
  const renderer = createChartRenderer(canvas, { mode: 'canvas2d' });
  renderer.render(projection);
  const diagnostics = renderer.getDiagnostics();
  assert.equal(diagnostics.mode, 'canvas2d');
  assert.equal(diagnostics.drawCalls, 5);
  assert.equal(diagnostics.uploadedBytes, 8 + 24 + 16 + 20 + 24);
  assert.equal(calls.some(([name]) => name === 'fillRect'), true);
  assert.equal(calls.some(([name]) => name === 'lineTo'), true);
  assert.equal(calls.filter(([name]) => name === 'arc').length >= 2, true);
});

test('renderer disconnect is idempotent and leaves zero live resources', () => {
  const { canvas } = fixture();
  const renderer = createChartRenderer(canvas, { mode: 'canvas2d' });
  renderer.disconnect(); renderer.disconnect();
  assert.equal(renderer.getDiagnostics().liveResources, 0);
});

test('WebGL2 renderer uses instancing and releases six GPU resources plus two listeners', () => {
  const { calls, canvas } = webglFixture();
  const renderer = createChartRenderer(canvas, { mode: 'webgl2' });
  renderer.render(projection);
  renderer.flush();
  assert.equal(renderer.getDiagnostics().mode, 'webgl2');
  assert.equal(renderer.getDiagnostics().drawCalls, 5);
  assert.equal(calls.filter(([name]) => name === 'drawArraysInstanced').length, 3);
  renderer.disconnect(); renderer.disconnect();
  assert.equal(calls.filter(([name]) => name === 'deleteProgram').length, 4);
  assert.equal(calls.filter(([name]) => name === 'deleteBuffer').length, 2);
  assert.equal(calls.filter(([name]) => name === 'removeEventListener').length, 2);
  assert.equal(renderer.getDiagnostics().liveResources, 0);
});

test('renderer construction rejects invalid styles and unavailable explicit modes', () => {
  const { canvas } = fixture();
  assert.equal(tryCreateChartRenderer(canvas, { style: { pointRadius: 0 } }).error.code, 'invalid-boundary');
  assert.equal(tryCreateChartRenderer(canvas, { mode: 'webgl2' }).error.code, 'invalid-boundary');
});
