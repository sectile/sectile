import type { ChartAxisLayout } from '@sectile/chart/layout';
import type {
  ChartDataBatch,
  ChartProjection,
  ChartProjectionBatch,
} from '@sectile/chart/projection';
import type {
  ChartRenderer,
  ChartRendererCapabilities,
  ChartRendererDiagnostics,
  NormalizedChartRenderStyle,
} from '../contracts.js';

const SCALE_FUNCTION = `
float chartMap(float value, vec2 domain, vec2 range, float logarithmic) {
  float inputValue = logarithmic > 0.5 ? log(value) : value;
  vec2 inputDomain = logarithmic > 0.5 ? log(domain) : domain;
  float ratio = (inputValue - inputDomain.x) / (inputDomain.y - inputDomain.x);
  return mix(range.x, range.y, ratio);
}`;

// Assemble the fixed shaders once; shared text preserves their exact GLSL source.
const AXIS_UNIFORMS = `uniform vec2 uViewport;
uniform vec2 uXDomain;
uniform vec2 uXRange;
uniform vec2 uYDomain;
uniform vec2 uYRange;
uniform float uXLogarithmic;
uniform float uYLogarithmic;`;

const CLIP_POSITION = `  vec2 clip = vec2((position.x / uViewport.x) * 2.0 - 1.0, 1.0 - (position.y / uViewport.y) * 2.0);
  gl_Position = vec4(clip, 0.0, 1.0);`;

function mappedPosition(attribute: string, x = 'x', y = 'y'): string {
  return `vec2(
    chartMap(${attribute}.${x}, uXDomain, uXRange, uXLogarithmic),
    chartMap(${attribute}.${y}, uYDomain, uYRange, uYLogarithmic)
  )`;
}

const VERTEX_POINT = `#version 300 es
in vec2 aPosition;
in vec4 aColor;
${AXIS_UNIFORMS}
uniform float uPointSize;
out vec4 vColor;
${SCALE_FUNCTION}
void main() {
  vec2 position = ${/* @__PURE__ */ mappedPosition('aPosition')};
${CLIP_POSITION}
  gl_PointSize = uPointSize;
  vColor = aColor;
}`;

const VERTEX_LINE = `#version 300 es
in vec2 aCorner;
in vec2 aStart;
in vec2 aEnd;
in vec4 aColor;
${AXIS_UNIFORMS}
uniform float uLineWidth;
out vec4 vColor;
${SCALE_FUNCTION}
void main() {
  vec2 first = ${/* @__PURE__ */ mappedPosition('aStart')};
  vec2 second = ${/* @__PURE__ */ mappedPosition('aEnd')};
  vec2 delta = second - first;
  float segmentLength = max(length(delta), 0.0001);
  vec2 direction = delta / segmentLength;
  vec2 normal = vec2(-direction.y, direction.x);
  float halfWidth = uLineWidth * 0.5;
  float along = mix(-halfWidth, segmentLength + halfWidth, aCorner.x);
  vec2 position = first + direction * along + normal * mix(-halfWidth, halfWidth, aCorner.y);
${CLIP_POSITION}
  vColor = aColor;
}`;

const VERTEX_RECTANGLE = `#version 300 es
in vec2 aCorner;
in vec4 aRectangle;
in vec4 aColor;
${AXIS_UNIFORMS}
out vec4 vColor;
${SCALE_FUNCTION}
void main() {
  vec2 first = ${/* @__PURE__ */ mappedPosition('aRectangle')};
  vec2 second = ${/* @__PURE__ */ mappedPosition('aRectangle', 'z', 'w')};
  vec2 position = mix(first, second, aCorner);
${CLIP_POSITION}
  vColor = aColor;
}`;

const VERTEX_ARC = `#version 300 es
in vec2 aCorner;
in vec4 aArc;
in vec4 aColor;
uniform vec2 uViewport;
out vec2 vPosition;
flat out vec4 vArc;
flat out vec4 vColor;
void main() {
  float radius = min(uViewport.x, uViewport.y) * 0.5;
  vec2 center = uViewport * 0.5;
  vec2 position = center + (aCorner * 2.0 - 1.0) * aArc.y * radius;
${CLIP_POSITION}
  vPosition = position - center;
  vArc = vec4(aArc.xy * radius, aArc.zw);
  vColor = aColor;
}`;

const FRAGMENT_COLOR = `#version 300 es
precision mediump float;
in vec4 vColor;
out vec4 outputColor;
void main() { outputColor = vColor; }`;

const FRAGMENT_POINT = `#version 300 es
precision mediump float;
in vec4 vColor;
out vec4 outputColor;
void main() {
  vec2 delta = gl_PointCoord * 2.0 - 1.0;
  if (dot(delta, delta) > 1.0) discard;
  outputColor = vColor;
}`;

const FRAGMENT_ARC = `#version 300 es
precision highp float;
in vec2 vPosition;
flat in vec4 vArc;
flat in vec4 vColor;
out vec4 outputColor;
const float TAU = 6.283185307179586;
void main() {
  float radius = length(vPosition);
  if (radius < vArc.x || radius > vArc.y) discard;
  float angle = mod(atan(vPosition.y, vPosition.x) + TAU, TAU);
  float start = mod(vArc.z + TAU, TAU);
  float end = mod(vArc.w + TAU, TAU);
  float sweep = vArc.w - vArc.z;
  bool inside = sweep >= TAU - 0.00001 || (start <= end ? angle >= start && angle <= end : angle >= start || angle <= end);
  if (!inside) discard;
  outputColor = vColor;
}`;

const QUAD = new Float32Array([0, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 1]);
const PARTIAL_UPLOAD_MINIMUM_BYTES = 4_096;
const PARTIAL_UPLOAD_MAXIMUM_RATIO = 0.25;

interface RetainedLayer {
  readonly buffer: WebGLBuffer;
  source: object;
  data: Float32Array;
  colors: Uint8Array | undefined;
  colorBuffer: WebGLBuffer | undefined;
}

type AxisUniforms = readonly [minimum: number, maximum: number, start: number, end: number, logarithmic: boolean];

type WebGLBaseResources = readonly [
  pointProgram: WebGLProgram, lineProgram: WebGLProgram, rectangleProgram: WebGLProgram,
  arcProgram: WebGLProgram, quadBuffer: WebGLBuffer,
];

export class WebGL2ChartRenderer implements ChartRenderer {
  public readonly capabilities: ChartRendererCapabilities;
  readonly #canvas: HTMLCanvasElement;
  readonly #gl: WebGL2RenderingContext;
  readonly #style: NormalizedChartRenderStyle;
  readonly #layers = new Map<number, RetainedLayer>();
  #pointProgram!: WebGLProgram;
  #lineProgram!: WebGLProgram;
  #rectangleProgram!: WebGLProgram;
  #arcProgram!: WebGLProgram;
  #quadBuffer!: WebGLBuffer;
  #diagnostics: ChartRendererDiagnostics = Object.freeze({ mode: 'webgl2', uploadedBytes: 0, drawCalls: 0, liveResources: 0 });
  #active = true;
  #lost = false;
  #lastProjection: ChartProjection | null = null;

  readonly #onContextLost = (event: Event): void => {
    event.preventDefault();
    this.#lost = true;
    this.#layers.clear();
    this.#diagnostics = Object.freeze({ ...this.#diagnostics, liveResources: 0 });
  };
  readonly #onContextRestored = (): void => {
    if (!this.#active) return;
    try { this.#initialize(); }
    catch (error) {
      this.#lost = true;
      this.#diagnostics = Object.freeze({ ...this.#diagnostics, liveResources: 0 });
      throw error;
    }
    this.#lost = false;
    if (this.#lastProjection !== null) this.render(this.#lastProjection);
  };

  public constructor(canvas: HTMLCanvasElement, gl: WebGL2RenderingContext, style: NormalizedChartRenderStyle) {
    this.#canvas = canvas;
    this.#gl = gl;
    this.#style = style;
    this.capabilities = Object.freeze({
      canvas2d: false,
      webgl2: true,
      asynchronousGPUTiming: gl.getExtension('EXT_disjoint_timer_query_webgl2') !== null,
    });
    let initialized = false;
    try {
      this.#initialize();
      initialized = true;
      canvas.addEventListener('webglcontextlost', this.#onContextLost);
      canvas.addEventListener('webglcontextrestored', this.#onContextRestored);
    } catch (error) {
      canvas.removeEventListener('webglcontextlost', this.#onContextLost);
      canvas.removeEventListener('webglcontextrestored', this.#onContextRestored);
      if (initialized) this.#deleteResources();
      this.#active = false;
      this.#diagnostics = Object.freeze({ ...this.#diagnostics, liveResources: 0 });
      throw error;
    }
  }

  public render(projection: ChartProjection, batches: readonly ChartProjectionBatch[] = projection.batches): void {
    if (!this.#active) return;
    this.#lastProjection = projection;
    if (this.#lost) return;
    const gl = this.#gl;
    gl.viewport(0, 0, this.#canvas.width, this.#canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    const activeLayers = new Set<number>();
    let uploadedBytes = 0;
    let drawCalls = 0;
    let fullUploads = 0;
    let partialUploads = 0;
    let reusedGeometryBuffers = 0;
    const dataBatches = projection.dataBatches;
    if (dataBatches !== undefined) {
      const axes = new Map(projection.layout?.axes.map((axis) => [axis.axis.id, axis]) ?? []);
      for (const batch of dataBatches) {
        activeLayers.add(batch.layerIndex);
        const retained = this.#retain(batch.layerIndex, batch.geometry, () => toFloat32(batch), batch.colors);
        uploadedBytes += retained.uploadedBytes;
        fullUploads += retained.fullUploads;
        partialUploads += retained.partialUploads;
        reusedGeometryBuffers += retained.reusedGeometryBuffer ? 1 : 0;
        drawCalls += this.#drawDataBatch(batch, retained.layer, axes, projection);
      }
    } else {
      for (const batch of batches) {
        activeLayers.add(batch.layerIndex);
        const retained = this.#retain(batch.layerIndex, batch, () => convertScreenBatch(batch, projection), batch.colors);
        uploadedBytes += retained.uploadedBytes;
        fullUploads += retained.fullUploads;
        partialUploads += retained.partialUploads;
        reusedGeometryBuffers += retained.reusedGeometryBuffer ? 1 : 0;
        drawCalls += this.#drawScreenBatch(batch, retained.layer, projection);
      }
    }
    for (const [layerIndex, layer] of this.#layers) {
      if (activeLayers.has(layerIndex)) continue;
      this.#deleteLayer(layer);
      this.#layers.delete(layerIndex);
    }
    this.#diagnostics = Object.freeze({
      mode: 'webgl2', uploadedBytes, drawCalls, liveResources: this.#baseResourceCount() + resourceCount(this.#layers),
      fullUploads, partialUploads, reusedGeometryBuffers,
    });
  }

  public getDiagnostics(): ChartRendererDiagnostics { return this.#diagnostics; }
  public flush(): void { if (this.#active && !this.#lost) this.#gl.flush(); }

  public disconnect(): void {
    if (!this.#active) return;
    this.#active = false;
    this.#canvas.removeEventListener('webglcontextlost', this.#onContextLost);
    this.#canvas.removeEventListener('webglcontextrestored', this.#onContextRestored);
    if (!this.#lost) this.#deleteResources();
    this.#layers.clear();
    this.#lastProjection = null;
    this.#diagnostics = Object.freeze({ ...this.#diagnostics, liveResources: 0 });
  }

  #initialize(): void {
    [this.#pointProgram, this.#lineProgram, this.#rectangleProgram, this.#arcProgram, this.#quadBuffer] = createBaseResources(this.#gl);
    this.#diagnostics = Object.freeze({ mode: 'webgl2', uploadedBytes: 0, drawCalls: 0, liveResources: this.#baseResourceCount() });
  }

  #retain(
    layerIndex: number,
    source: object,
    convert: () => Float32Array,
    colors: Uint8Array | undefined,
  ): {
    readonly layer: RetainedLayer;
    readonly uploadedBytes: number;
    readonly fullUploads: number;
    readonly partialUploads: number;
    readonly reusedGeometryBuffer: boolean;
  } {
    const gl = this.#gl;
    let layer = this.#layers.get(layerIndex);
    let uploadedBytes = 0;
    let fullUploads = 0;
    let partialUploads = 0;
    let reusedGeometryBuffer = false;
    if (layer === undefined) {
      const converted = convert();
      layer = { buffer: requiredBuffer(gl), source, data: converted, colors: undefined, colorBuffer: undefined };
      this.#layers.set(layerIndex, layer);
      gl.bindBuffer(gl.ARRAY_BUFFER, layer.buffer);
      gl.bufferData(gl.ARRAY_BUFFER, converted, gl.STATIC_DRAW);
      uploadedBytes += converted.byteLength;
      fullUploads += 1;
    } else if (layer.source !== source) {
      const converted = convert();
      layer.source = source;
      gl.bindBuffer(gl.ARRAY_BUFFER, layer.buffer);
      const upload = updateBuffer(gl, layer.data, converted);
      layer.data = converted;
      uploadedBytes += upload.bytes;
      fullUploads += upload.full ? 1 : 0;
      partialUploads += upload.partial ? 1 : 0;
      reusedGeometryBuffer = true;
    } else reusedGeometryBuffer = true;
    if (layer.colors !== colors) {
      if (colors === undefined) {
        if (layer.colorBuffer !== undefined) gl.deleteBuffer(layer.colorBuffer);
        layer.colorBuffer = undefined;
      } else {
        const previous = layer.colors;
        const newlyAllocated = layer.colorBuffer === undefined;
        layer.colorBuffer ??= requiredBuffer(gl);
        gl.bindBuffer(gl.ARRAY_BUFFER, layer.colorBuffer);
        const upload = newlyAllocated || previous === undefined
          ? fullBufferUpload(gl, colors)
          : updateBuffer(gl, previous, colors);
        uploadedBytes += upload.bytes;
        fullUploads += upload.full ? 1 : 0;
        partialUploads += upload.partial ? 1 : 0;
      }
      layer.colors = colors;
    }
    return { layer, uploadedBytes, fullUploads, partialUploads, reusedGeometryBuffer };
  }

  #drawDataBatch(
    batch: ChartDataBatch,
    layer: RetainedLayer,
    axes: ReadonlyMap<unknown, ChartAxisLayout>,
    projection: ChartProjection,
  ): number {
    if (batch.type === 'arc') return this.#drawArcs(layer, projection);
    const x = axes.get(batch.xAxisID);
    const y = axes.get(batch.yAxisID);
    if (x === undefined || y === undefined) return 0;
    const xUniforms = axisUniforms(x);
    const yUniforms = axisUniforms(y);
    if (batch.type === 'point') return this.#drawPoints(layer, layer.data.length / 2, projection, xUniforms, yUniforms);
    if (batch.type === 'polyline') {
      return this.#drawLines(layer, batch.geometry.type === 'polyline' ? batch.geometry.offsets : undefined, projection, xUniforms, yUniforms);
    }
    return this.#drawRectangles(layer, layer.data.length / 4, projection, xUniforms, yUniforms);
  }

  #drawScreenBatch(batch: ChartProjectionBatch, layer: RetainedLayer, projection: ChartProjection): number {
    const x = identityAxis(projection.viewport.width);
    const y = identityAxis(projection.viewport.height);
    if (batch.type === 'point') return this.#drawPoints(layer, layer.data.length / 2, projection, x, y);
    if (batch.type === 'polyline') return this.#drawLines(layer, batch.offsets, projection, x, y);
    if (batch.type === 'rectangle' || batch.type === 'cell') return this.#drawRectangles(layer, layer.data.length / 4, projection, x, y);
    return this.#drawArcs(layer, projection);
  }

  #drawPoints(layer: RetainedLayer, count: number, projection: ChartProjection, x: AxisUniforms, y: AxisUniforms): number {
    const gl = this.#gl;
    gl.useProgram(this.#pointProgram);
    bindProjection(gl, this.#pointProgram, projection, x, y);
    gl.uniform1f(gl.getUniformLocation(this.#pointProgram, 'uPointSize'), this.#style.pointRadius * 2 * (projection.viewport.devicePixelRatio ?? 1));
    gl.bindBuffer(gl.ARRAY_BUFFER, layer.buffer);
    bindFloatAttribute(gl, this.#pointProgram, 'aPosition', 2, 0);
    bindColors(gl, this.#pointProgram, layer, this.#style.color, 0);
    gl.drawArrays(gl.POINTS, 0, count);
    return 1;
  }

  #drawLines(
    layer: RetainedLayer,
    offsets: Uint32Array | undefined,
    projection: ChartProjection,
    x: AxisUniforms,
    y: AxisUniforms,
  ): number {
    const gl = this.#gl;
    gl.useProgram(this.#lineProgram);
    bindProjection(gl, this.#lineProgram, projection, x, y);
    bindCorners(gl, this.#lineProgram, this.#quadBuffer);
    gl.uniform1f(gl.getUniformLocation(this.#lineProgram, 'uLineWidth'), this.#style.lineWidth);
    const spans = offsets ?? Uint32Array.of(0, layer.data.length / 2);
    let calls = 0;
    for (let index = 0; index + 1 < spans.length; index += 1) {
      const start = spans[index] as number;
      const count = (spans[index + 1] as number) - start;
      const segments = count - 1;
      if (segments <= 0) continue;
      bindLineEndpoints(gl, this.#lineProgram, layer.buffer, start);
      bindColors(gl, this.#lineProgram, layer, this.#style.color, 1, start * 4);
      gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, segments);
      calls += 1;
    }
    return calls;
  }

  #drawRectangles(layer: RetainedLayer, count: number, projection: ChartProjection, x: AxisUniforms, y: AxisUniforms): number {
    const gl = this.#gl;
    gl.useProgram(this.#rectangleProgram);
    bindProjection(gl, this.#rectangleProgram, projection, x, y);
    bindCorners(gl, this.#rectangleProgram, this.#quadBuffer);
    gl.bindBuffer(gl.ARRAY_BUFFER, layer.buffer);
    bindFloatAttribute(gl, this.#rectangleProgram, 'aRectangle', 4, 1);
    bindColors(gl, this.#rectangleProgram, layer, this.#style.color, 1);
    gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, count);
    return count === 0 ? 0 : 1;
  }

  #drawArcs(layer: RetainedLayer, projection: ChartProjection): number {
    const gl = this.#gl;
    gl.useProgram(this.#arcProgram);
    bindViewport(gl, this.#arcProgram, projection);
    bindCorners(gl, this.#arcProgram, this.#quadBuffer);
    gl.bindBuffer(gl.ARRAY_BUFFER, layer.buffer);
    bindFloatAttribute(gl, this.#arcProgram, 'aArc', 4, 1);
    bindColors(gl, this.#arcProgram, layer, this.#style.color, 1);
    const count = layer.data.length / 4;
    gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, count);
    return count === 0 ? 0 : 1;
  }

  #deleteResources(): void {
    const gl = this.#gl;
    for (const layer of this.#layers.values()) this.#deleteLayer(layer);
    gl.deleteProgram(this.#pointProgram);
    gl.deleteProgram(this.#lineProgram);
    gl.deleteProgram(this.#rectangleProgram);
    gl.deleteProgram(this.#arcProgram);
    gl.deleteBuffer(this.#quadBuffer);
  }

  #deleteLayer(layer: RetainedLayer): void {
    this.#gl.deleteBuffer(layer.buffer);
    if (layer.colorBuffer !== undefined) this.#gl.deleteBuffer(layer.colorBuffer);
  }

  #baseResourceCount(): number { return 5; }
}

function toFloat32(batch: ChartDataBatch): Float32Array {
  const geometry = batch.geometry;
  if (geometry.type === 'point' || geometry.type === 'polyline') return Float32Array.from(geometry.positions);
  if (geometry.type === 'rectangle') return Float32Array.from(geometry.segments);
  if (geometry.type === 'cell') return Float32Array.from(geometry.bounds);
  return geometry.type === 'arc' ? Float32Array.from(geometry.arcs) : new Float32Array();
}

function convertScreenBatch(batch: ChartProjectionBatch, projection: ChartProjection): Float32Array {
  if (batch.type === 'point' || batch.type === 'polyline') return batch.positions;
  if (batch.type === 'rectangle' || batch.type === 'cell') {
    const source = batch.type === 'rectangle' ? batch.rectangles : batch.cells;
    const stride = batch.type === 'rectangle' ? 4 : 5;
    const output = new Float32Array(source.length / stride * 4);
    for (let sourceOffset = 0, target = 0; sourceOffset < source.length; sourceOffset += stride, target += 4) {
      output[target] = source[sourceOffset] as number;
      output[target + 1] = source[sourceOffset + 1] as number;
      output[target + 2] = (source[sourceOffset] as number) + (source[sourceOffset + 2] as number);
      output[target + 3] = (source[sourceOffset + 1] as number) + (source[sourceOffset + 3] as number);
    }
    return output;
  }
  const radius = Math.min(projection.viewport.width, projection.viewport.height) / 2;
  const output = new Float32Array(batch.arcs.length / 6 * 4);
  for (let source = 0, target = 0; source < batch.arcs.length; source += 6, target += 4) {
    output[target] = (batch.arcs[source + 2] as number) / radius;
    output[target + 1] = (batch.arcs[source + 3] as number) / radius;
    output[target + 2] = batch.arcs[source + 4] as number;
    output[target + 3] = batch.arcs[source + 5] as number;
  }
  return output;
}

function axisUniforms(axis: ChartAxisLayout): AxisUniforms {
  const descriptor = axis.descriptor;
  return [descriptor.geometryDomain.minimum, descriptor.geometryDomain.maximum,
    descriptor.range.start, descriptor.range.end, descriptor.kind === 'logarithmic'];
}

function identityAxis(maximum: number): AxisUniforms {
  return [0, maximum, 0, maximum, false];
}

type UploadArray = Float32Array | Uint8Array;

interface UploadResult {
  readonly bytes: number;
  readonly full: boolean;
  readonly partial: boolean;
}

function fullBufferUpload(gl: WebGL2RenderingContext, data: UploadArray): UploadResult {
  gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
  return { bytes: data.byteLength, full: true, partial: false };
}

function updateBuffer(gl: WebGL2RenderingContext, previous: UploadArray, next: UploadArray): UploadResult {
  if (previous.constructor !== next.constructor || previous.length !== next.length) return fullBufferUpload(gl, next);
  let first = 0;
  while (first < next.length && previous[first] === next[first]) first += 1;
  if (first === next.length) return { bytes: 0, full: false, partial: false };
  let end = next.length;
  while (end > first && previous[end - 1] === next[end - 1]) end -= 1;
  const bytesPerElement = next.BYTES_PER_ELEMENT;
  const changedBytes = (end - first) * bytesPerElement;
  if (next.byteLength < PARTIAL_UPLOAD_MINIMUM_BYTES
    || changedBytes / next.byteLength > PARTIAL_UPLOAD_MAXIMUM_RATIO) return fullBufferUpload(gl, next);
  gl.bufferSubData(gl.ARRAY_BUFFER, first * bytesPerElement, next.subarray(first, end));
  return { bytes: changedBytes, full: false, partial: true };
}

function createBaseResources(gl: WebGL2RenderingContext): WebGLBaseResources {
  let pointProgram: WebGLProgram | undefined;
  let lineProgram: WebGLProgram | undefined;
  let rectangleProgram: WebGLProgram | undefined;
  let arcProgram: WebGLProgram | undefined;
  let quadBuffer: WebGLBuffer | undefined;
  try {
    pointProgram = createProgram(gl, VERTEX_POINT, FRAGMENT_POINT);
    lineProgram = createProgram(gl, VERTEX_LINE, FRAGMENT_COLOR);
    rectangleProgram = createProgram(gl, VERTEX_RECTANGLE, FRAGMENT_COLOR);
    arcProgram = createProgram(gl, VERTEX_ARC, FRAGMENT_ARC);
    quadBuffer = requiredBuffer(gl);
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, QUAD, gl.STATIC_DRAW);
    return [pointProgram, lineProgram, rectangleProgram, arcProgram, quadBuffer];
  } catch (error) {
    if (quadBuffer !== undefined) gl.deleteBuffer(quadBuffer);
    if (arcProgram !== undefined) gl.deleteProgram(arcProgram);
    if (rectangleProgram !== undefined) gl.deleteProgram(rectangleProgram);
    if (lineProgram !== undefined) gl.deleteProgram(lineProgram);
    if (pointProgram !== undefined) gl.deleteProgram(pointProgram);
    throw error;
  }
}

function createProgram(gl: WebGL2RenderingContext, vertexSource: string, fragmentSource: string): WebGLProgram {
  let vertex: WebGLShader | undefined;
  let fragment: WebGLShader | undefined;
  let program: WebGLProgram | null = null;
  try {
    vertex = createShader(gl, gl.VERTEX_SHADER, vertexSource);
    fragment = createShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
    program = gl.createProgram();
    if (program === null) throw new Error('WebGL2 chart program allocation failed.');
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const message = gl.getProgramInfoLog(program) ?? 'unknown link error';
      throw new Error(`WebGL2 chart program link failed: ${message}`);
    }
    return program;
  } catch (error) {
    if (program !== null) gl.deleteProgram(program);
    throw error;
  } finally {
    if (fragment !== undefined) gl.deleteShader(fragment);
    if (vertex !== undefined) gl.deleteShader(vertex);
  }
}

function createShader(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader {
  const shader = gl.createShader(type);
  if (shader === null) throw new Error('WebGL2 chart shader allocation failed.');
  try {
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const message = gl.getShaderInfoLog(shader) ?? 'unknown compile error';
      throw new Error(`WebGL2 chart shader compile failed: ${message}`);
    }
    return shader;
  } catch (error) {
    gl.deleteShader(shader);
    throw error;
  }
}

function requiredBuffer(gl: WebGL2RenderingContext): WebGLBuffer {
  const buffer = gl.createBuffer();
  if (buffer === null) throw new Error('WebGL2 chart buffer allocation failed.');
  return buffer;
}

function bindProjection(
  gl: WebGL2RenderingContext,
  program: WebGLProgram,
  projection: ChartProjection,
  x: AxisUniforms,
  y: AxisUniforms,
): void {
  bindViewport(gl, program, projection);
  gl.uniform2f(gl.getUniformLocation(program, 'uXDomain'), x[0], x[1]);
  gl.uniform2f(gl.getUniformLocation(program, 'uXRange'), x[2], x[3]);
  gl.uniform2f(gl.getUniformLocation(program, 'uYDomain'), y[0], y[1]);
  gl.uniform2f(gl.getUniformLocation(program, 'uYRange'), y[2], y[3]);
  gl.uniform1f(gl.getUniformLocation(program, 'uXLogarithmic'), x[4] ? 1 : 0);
  gl.uniform1f(gl.getUniformLocation(program, 'uYLogarithmic'), y[4] ? 1 : 0);
}

function bindViewport(gl: WebGL2RenderingContext, program: WebGLProgram, projection: ChartProjection): void {
  gl.uniform2f(gl.getUniformLocation(program, 'uViewport'), projection.viewport.width, projection.viewport.height);
}

function bindFloatAttribute(gl: WebGL2RenderingContext, program: WebGLProgram, name: string, size: number, divisor: number, byteOffset = 0): void {
  const location = gl.getAttribLocation(program, name);
  gl.enableVertexAttribArray(location);
  gl.vertexAttribPointer(location, size, gl.FLOAT, false, size * 4, byteOffset);
  gl.vertexAttribDivisor(location, divisor);
}

function bindLineEndpoints(
  gl: WebGL2RenderingContext,
  program: WebGLProgram,
  buffer: WebGLBuffer,
  start: number,
): void {
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  bindFloatAttribute(gl, program, 'aStart', 2, 1, start * 8);
  bindFloatAttribute(gl, program, 'aEnd', 2, 1, (start + 1) * 8);
}

function bindColors(
  gl: WebGL2RenderingContext,
  program: WebGLProgram,
  layer: RetainedLayer,
  fallback: readonly number[],
  divisor: number,
  byteOffset = 0,
): void {
  const location = gl.getAttribLocation(program, 'aColor');
  if (layer.colorBuffer === undefined) {
    gl.disableVertexAttribArray(location);
    gl.vertexAttrib4f(location, fallback[0] as number, fallback[1] as number, fallback[2] as number, fallback[3] as number);
    return;
  }
  gl.bindBuffer(gl.ARRAY_BUFFER, layer.colorBuffer);
  gl.enableVertexAttribArray(location);
  gl.vertexAttribPointer(location, 4, gl.UNSIGNED_BYTE, true, 4, byteOffset);
  gl.vertexAttribDivisor(location, divisor);
}

function bindCorners(gl: WebGL2RenderingContext, program: WebGLProgram, buffer: WebGLBuffer): void {
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  bindFloatAttribute(gl, program, 'aCorner', 2, 0);
}

function resourceCount(layers: ReadonlyMap<number, RetainedLayer>): number {
  let count = 0;
  for (const layer of layers.values()) count += layer.colorBuffer === undefined ? 1 : 2;
  return count;
}
