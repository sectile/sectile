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
  const shaderSources = [];
  let resource = 0;
  const failure = { kind: null, at: 0 };
  const ordinals = new Map();
  const totals = {
    shaders: { created: 0, deleted: 0 },
    programs: { created: 0, deleted: 0 },
    buffers: { created: 0, deleted: 0 },
  };
  const shouldFail = (kind) => {
    const ordinal = (ordinals.get(kind) ?? 0) + 1;
    ordinals.set(kind, ordinal);
    return failure.kind === kind && failure.at === ordinal;
  };
  const setFailure = (kind = null, at = 0) => {
    failure.kind = kind;
    failure.at = at;
    ordinals.clear();
  };
  const resourceCounts = () => ({
    shaders: { ...totals.shaders },
    programs: { ...totals.programs },
    buffers: { ...totals.buffers },
  });
  const gl = {
    VERTEX_SHADER: 1, FRAGMENT_SHADER: 2, COMPILE_STATUS: 3, LINK_STATUS: 4,
    ARRAY_BUFFER: 5, STATIC_DRAW: 6, DYNAMIC_DRAW: 7, FLOAT: 8, UNSIGNED_BYTE: 9,
    COLOR_BUFFER_BIT: 10, BLEND: 11, SRC_ALPHA: 12, ONE_MINUS_SRC_ALPHA: 13,
    POINTS: 14, LINE_STRIP: 15, TRIANGLES: 16,
    getExtension: () => null,
    createShader: () => {
      if (shouldFail('shader-allocation')) return null;
      totals.shaders.created += 1;
      return { id: ++resource, compileFailed: false };
    },
    shaderSource: (_shader, source) => { shaderSources.push(source); calls.push(['shaderSource', source]); },
    compileShader: (shader) => { shader.compileFailed = shouldFail('shader-compile'); },
    getShaderParameter: (shader) => !shader.compileFailed,
    getShaderInfoLog: () => 'synthetic shader failure',
    deleteShader: () => { totals.shaders.deleted += 1; calls.push(['deleteShader']); },
    createProgram: () => {
      if (shouldFail('program-allocation')) return null;
      totals.programs.created += 1;
      return { id: ++resource, linkFailed: false };
    },
    attachShader() {},
    linkProgram: (program) => { program.linkFailed = shouldFail('program-link'); },
    getProgramParameter: (program) => !program.linkFailed,
    getProgramInfoLog: () => 'synthetic link failure',
    deleteProgram: () => { totals.programs.deleted += 1; calls.push(['deleteProgram']); },
    createBuffer: () => {
      if (shouldFail('buffer-allocation')) return null;
      totals.buffers.created += 1;
      return { id: ++resource };
    },
    deleteBuffer: () => { totals.buffers.deleted += 1; calls.push(['deleteBuffer']); },
    bindBuffer() {},
    bufferData: (_target, data) => {
      if (shouldFail('buffer-upload')) throw new Error('synthetic buffer upload failure');
      calls.push(['bufferData', data.byteLength]);
    },
    bufferSubData: (_target, offset, data) => calls.push(['bufferSubData', offset, data.byteLength]),
    viewport() {}, clearColor() {}, clear() {}, enable() {}, blendFunc() {},
    useProgram() {}, getUniformLocation: (_program, name) => name,
    uniform1f: (...args) => calls.push(['uniform1f', ...args]), uniform2f() {},
    getAttribLocation: (_program, name) => ({ aPosition: 0, aCorner: 1, aRectangle: 2, aArc: 3, aColor: 4, aStart: 5, aEnd: 6 })[name],
    enableVertexAttribArray() {}, disableVertexAttribArray() {}, vertexAttrib4f() {},
    vertexAttribPointer() {}, vertexAttribDivisor() {}, lineWidth: (...args) => calls.push(['lineWidth', ...args]),
    drawArrays: (...args) => calls.push(['drawArrays', ...args]),
    drawArraysInstanced: (...args) => calls.push(['drawArraysInstanced', ...args]),
    flush: () => calls.push(['flush']),
  };
  for (const method of ['bindBuffer', 'useProgram', 'uniform2f', 'getAttribLocation',
    'enableVertexAttribArray', 'disableVertexAttribArray', 'vertexAttrib4f',
    'vertexAttribPointer', 'vertexAttribDivisor']) {
    const original = gl[method];
    gl[method] = (...args) => {
      calls.push([method, ...args.map((value) => value?.id ?? value)]);
      return original(...args);
    };
  }
  const canvas = {
    width: 200, height: 160,
    ownerDocument: { createElement: () => ({ getContext: () => gl }) },
    getContext: (kind) => kind === 'webgl2' ? gl : null,
    addEventListener: (...args) => {
      calls.push(['addEventListener', ...args]);
      if (shouldFail('listener-install')) throw new Error('synthetic listener installation failure');
    },
    removeEventListener: (...args) => calls.push(['removeEventListener', ...args]),
  };
  return { calls, canvas, setFailure, resourceCounts, shaderSources };
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

const webglInitializationFailures = Object.freeze([
  ...Array.from({ length: 8 }, (_, index) => ['shader-allocation', index + 1]),
  ...Array.from({ length: 8 }, (_, index) => ['shader-compile', index + 1]),
  ...Array.from({ length: 4 }, (_, index) => ['program-allocation', index + 1]),
  ...Array.from({ length: 4 }, (_, index) => ['program-link', index + 1]),
  ['buffer-allocation', 1],
  ['buffer-upload', 1],
]);

function assertBalancedResources(counts, label) {
  for (const type of ['shaders', 'programs', 'buffers']) {
    assert.equal(counts[type].created, counts[type].deleted, `${label}: ${type}`);
  }
}

function assertBalancedResourceDelta(before, after, label) {
  for (const type of ['shaders', 'programs', 'buffers']) {
    assert.equal(
      after[type].created - before[type].created,
      after[type].deleted - before[type].deleted,
      `${label}: ${type}`,
    );
  }
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
  assert.equal(calls.some(([name, value]) => name === 'set:lineWidth' && value === 2.5), true);
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
  assert.equal(calls.some(([name, location, value]) => name === 'uniform1f' && location === 'uLineWidth' && value === 2.5), true);
  assert.equal(calls.some(([name]) => name === 'lineWidth'), false);
  assert.equal(calls.filter(([name, mode]) => name === 'drawArrays' && mode === 15).length, 0);
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

test('WebGL2 binds independent axis ranges, disjoint line spans and per-vertex divisor resets', () => {
  for (const xLog of [false, true]) for (const yLog of [false, true]) {
    const { calls, canvas, shaderSources } = webglFixture();
    const renderer = createChartRenderer(canvas, { mode: 'webgl2', style: { lineWidth: 6 } });
    const frame = projection();
    frame.layout.axes = [axis('x', 'x', 2, 100, 9, 91), axis('y', 'y', 1, 50, 72, 8)];
    frame.layout.axes[0].descriptor.kind = xLog ? 'logarithmic' : 'linear';
    frame.layout.axes[1].descriptor.kind = yLog ? 'logarithmic' : 'linear';
    const line = { ...frame.dataBatches[1], colors: new Uint8Array(24).fill(255),
      geometry: { type: 'polyline', positions: new Float64Array([2, 1, 3, 2, 4, 3, 5, 4, 6, 5, 7, 6]),
        offsets: new Uint32Array([0, 0, 1, 3, 6]) },
    };
    frame.dataBatches = [line, frame.dataBatches[0]];
    calls.length = 0;
    try {
      renderer.render(frame);
      assert.deepEqual(calls.filter(([name]) => name === 'uniform2f').map((entry) => entry.slice(1)), [
        ['uViewport', 100, 80], ['uXDomain', 2, 100], ['uXRange', 9, 91], ['uYDomain', 1, 50], ['uYRange', 72, 8],
        ['uViewport', 100, 80], ['uXDomain', 2, 100], ['uXRange', 9, 91], ['uYDomain', 1, 50], ['uYRange', 72, 8],
      ]);
      assert.deepEqual(calls.filter(([name]) => name === 'uniform1f').map((entry) => entry.slice(1)), [
        ['uXLogarithmic', Number(xLog)], ['uYLogarithmic', Number(yLog)], ['uLineWidth', 6],
        ['uXLogarithmic', Number(xLog)], ['uYLogarithmic', Number(yLog)], ['uPointSize', 12],
      ]);
      assert.deepEqual(calls.filter(([name]) => name === 'vertexAttribPointer').map((entry) => entry.slice(1)), [
        [1, 2, 8, false, 8, 0],
        [5, 2, 8, false, 8, 8], [6, 2, 8, false, 8, 16], [4, 4, 9, true, 4, 4],
        [5, 2, 8, false, 8, 24], [6, 2, 8, false, 8, 32], [4, 4, 9, true, 4, 12],
        [0, 2, 8, false, 8, 0], [4, 4, 9, true, 4, 0],
      ]);
      assert.deepEqual(calls.filter(([name]) => name === 'vertexAttribDivisor').map((entry) => entry.slice(1)), [
        [1, 0], [5, 1], [6, 1], [4, 1], [5, 1], [6, 1], [4, 1], [0, 0], [4, 0],
      ]);
      assert.deepEqual(calls.filter(([name]) => name === 'drawArraysInstanced'), [
        ['drawArraysInstanced', 16, 0, 6, 1], ['drawArraysInstanced', 16, 0, 6, 2],
      ]);
      assert.equal(renderer.getDiagnostics().drawCalls, 3);
      const firstCalls = calls.slice();
      calls.length = 0;
      renderer.render(frame);
      const drawSetup = (entries) => entries.filter(([name]) => name !== 'bufferData' && name !== 'bindBuffer');
      assert.deepEqual(drawSetup(calls), drawSetup(firstCalls), 'retained batches preserve draw setup');
      assert.equal(renderer.getDiagnostics().uploadedBytes, 0);
    } finally { renderer.disconnect(); }
    assert.equal(shaderSources.length, 8, 'rendering reuses initialization-owned shader sources');
  }
});

test('WebGL2 attribute and uniform setup is per batch rather than per datum', () => {
  for (const size of [1, 1_000, 100_000]) {
    const value = webglFixture();
    const renderer = createChartRenderer(value.canvas, { mode: 'webgl2' });
    const frame = projection();
    frame.dataBatches = [{ ...frame.dataBatches[0], colors: undefined,
      geometry: { type: 'point', positions: new Float64Array(size * 2) } }];
    value.calls.length = 0;
    renderer.render(frame);
    assert.equal(value.calls.filter(([name]) => name === 'vertexAttribPointer').length, 1);
    assert.equal(value.calls.filter(([name]) => name === 'getAttribLocation').length, 2);
    assert.equal(value.calls.filter(([name]) => name === 'uniform2f').length, 5);
    assert.deepEqual(value.calls.find(([name]) => name === 'drawArrays'), ['drawArrays', 14, 0, size]);
    assert.equal(renderer.getDiagnostics().drawCalls, 1);
    renderer.disconnect();
    assertBalancedResources(value.resourceCounts(), `point batch ${size}`);
  }
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

test('WebGL2 construction rolls back every partial base-resource failure', () => {
  for (const [kind, at] of webglInitializationFailures) {
    const value = webglFixture();
    value.setFailure(kind, at);
    const result = tryCreateChartRenderer(value.canvas, { mode: 'webgl2' });
    assert.equal(result.ok, false, `${kind}:${at}`);
    assert.equal(result.error.code, 'invalid-boundary', `${kind}:${at}`);
    assertBalancedResources(value.resourceCounts(), `${kind}:${at}`);
  }

  const listenerFailure = webglFixture();
  listenerFailure.setFailure('listener-install', 2);
  const result = tryCreateChartRenderer(listenerFailure.canvas, { mode: 'webgl2' });
  assert.equal(result.ok, false);
  assertBalancedResources(listenerFailure.resourceCounts(), 'listener-install:2');
  assert.equal(listenerFailure.calls.filter(([name]) => name === 'removeEventListener').length, 2);
});

test('WebGL2 restoration rolls back every partial replacement and stays lost after failure', () => {
  for (const [kind, at] of webglInitializationFailures) {
    const value = webglFixture();
    const renderer = createChartRenderer(value.canvas, { mode: 'webgl2' });
    renderer.render(projection());
    const lost = value.calls.find(([name, type]) => name === 'addEventListener' && type === 'webglcontextlost')[2];
    const restored = value.calls.find(([name, type]) => name === 'addEventListener' && type === 'webglcontextrestored')[2];
    lost({ preventDefault() {} });
    assert.equal(renderer.getDiagnostics().liveResources, 0, `${kind}:${at}: lost`);

    value.setFailure(kind, at);
    const before = value.resourceCounts();
    assert.throws(() => restored(), undefined, `${kind}:${at}`);
    const after = value.resourceCounts();
    assertBalancedResourceDelta(before, after, `${kind}:${at}`);
    assert.equal(renderer.getDiagnostics().liveResources, 0, `${kind}:${at}: failed restore`);

    const uploads = value.calls.filter(([name]) => name === 'bufferData').length;
    const retained = value.resourceCounts();
    renderer.render(projection());
    renderer.flush();
    assert.equal(value.calls.filter(([name]) => name === 'bufferData').length, uploads, `${kind}:${at}: lost render`);
    assert.deepEqual(value.resourceCounts(), retained, `${kind}:${at}: lost resources`);
    renderer.disconnect();
  }
});

test('WebGL2 retains the latest projection while lost and ignores callbacks after disconnect', () => {
  const value = webglFixture();
  const renderer = createChartRenderer(value.canvas, { mode: 'webgl2' });
  renderer.render(projection());
  const uploads = value.calls.filter(([name]) => name === 'bufferData').length;
  const lost = value.calls.find(([name, type]) => name === 'addEventListener' && type === 'webglcontextlost')[2];
  const restored = value.calls.find(([name, type]) => name === 'addEventListener' && type === 'webglcontextrestored')[2];
  let prevented = false;
  lost({ preventDefault: () => { prevented = true; } });
  assert.equal(prevented, true);
  assert.equal(renderer.getDiagnostics().liveResources, 0);

  const lostResources = value.resourceCounts();
  const middle = projection();
  middle.viewport = { ...middle.viewport, width: 150 };
  const latest = projection();
  latest.viewport = { ...latest.viewport, width: 200 };
  renderer.render(middle);
  renderer.render(latest);
  assert.equal(value.calls.filter(([name]) => name === 'bufferData').length, uploads);
  assert.deepEqual(value.resourceCounts(), lostResources);

  const beforeRestore = value.calls.length;
  restored();
  const restoredViewportUniforms = value.calls.slice(beforeRestore)
    .filter(([name, uniform]) => name === 'uniform2f' && uniform === 'uViewport')
    .map((entry) => entry.slice(2));
  assert.equal(restoredViewportUniforms.length > 0, true);
  assert.deepEqual(restoredViewportUniforms, restoredViewportUniforms.map(() => [200, 80]));
  assert.equal(value.calls.filter(([name]) => name === 'bufferData').length > uploads, true);
  assert.equal(renderer.getDiagnostics().liveResources > 5, true);

  renderer.disconnect();
  const afterDisconnect = value.calls.filter(([name]) => name === 'bufferData').length;
  renderer.render(projection());
  restored();
  assert.equal(value.calls.filter(([name]) => name === 'bufferData').length, afterDisconnect);
});

test('renderer construction rejects invalid styles and unavailable explicit modes', () => {
  const { canvas } = fixture();
  assert.equal(tryCreateChartRenderer(canvas, { style: { pointRadius: 0 } }).error.code, 'invalid-boundary');
  assert.equal(tryCreateChartRenderer(canvas, { mode: 'webgl2' }).error.code, 'invalid-boundary');
});

test('fallible renderer construction contains throwing canvas boundaries', () => {
  const canvas = {
    getContext() { throw new Error('host context failed'); },
  };
  const result = tryCreateChartRenderer(canvas, { mode: 'canvas2d' });
  assert.equal(result.ok, false);
  assert.equal(result.error.code, 'invalid-boundary');
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
