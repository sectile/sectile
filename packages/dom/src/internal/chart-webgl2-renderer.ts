import type { ChartProjection, ChartProjectionBatch } from '@sectile/chart/projection';
import type {
  ChartRenderer,
  ChartRendererCapabilities,
  ChartRendererDiagnostics,
  NormalizedChartRenderStyle,
} from '../chart.js';

const VERTEX_POINT = `#version 300 es
in vec2 aPosition;
uniform vec2 uViewport;
uniform float uPointSize;
void main() {
  vec2 clip = vec2((aPosition.x / uViewport.x) * 2.0 - 1.0, 1.0 - (aPosition.y / uViewport.y) * 2.0);
  gl_Position = vec4(clip, 0.0, 1.0);
  gl_PointSize = uPointSize;
}`;

const VERTEX_RECTANGLE = `#version 300 es
in vec2 aCorner;
in vec4 aRectangle;
uniform vec2 uViewport;
void main() {
  vec2 position = aRectangle.xy + aCorner * aRectangle.zw;
  vec2 clip = vec2((position.x / uViewport.x) * 2.0 - 1.0, 1.0 - (position.y / uViewport.y) * 2.0);
  gl_Position = vec4(clip, 0.0, 1.0);
}`;

const VERTEX_ARC = `#version 300 es
in vec2 aCorner;
in vec4 aArcA;
in vec2 aArcB;
uniform vec2 uViewport;
out vec2 vPosition;
flat out vec4 vArcA;
flat out vec2 vArcB;
void main() {
  vec2 position = aArcA.xy + (aCorner * 2.0 - 1.0) * aArcA.w;
  vec2 clip = vec2((position.x / uViewport.x) * 2.0 - 1.0, 1.0 - (position.y / uViewport.y) * 2.0);
  gl_Position = vec4(clip, 0.0, 1.0);
  vPosition = position;
  vArcA = aArcA;
  vArcB = aArcB;
}`;

const FRAGMENT_COLOR = `#version 300 es
precision mediump float;
uniform vec4 uColor;
out vec4 outputColor;
void main() { outputColor = uColor; }`;

const FRAGMENT_POINT = `#version 300 es
precision mediump float;
uniform vec4 uColor;
out vec4 outputColor;
void main() {
  vec2 delta = gl_PointCoord * 2.0 - 1.0;
  if (dot(delta, delta) > 1.0) discard;
  outputColor = uColor;
}`;

const FRAGMENT_ARC = `#version 300 es
precision highp float;
uniform vec4 uColor;
in vec2 vPosition;
flat in vec4 vArcA;
flat in vec2 vArcB;
out vec4 outputColor;
const float TAU = 6.283185307179586;
void main() {
  vec2 delta = vPosition - vArcA.xy;
  float radius = length(delta);
  if (radius < vArcA.z || radius > vArcA.w) discard;
  float angle = mod(atan(delta.y, delta.x) + TAU, TAU);
  float start = mod(vArcB.x + TAU, TAU);
  float end = mod(vArcB.y + TAU, TAU);
  float sweep = vArcB.y - vArcB.x;
  bool inside = sweep >= TAU - 0.00001 || (start <= end ? angle >= start && angle <= end : angle >= start || angle <= end);
  if (!inside) discard;
  outputColor = uColor;
}`;

const QUAD = new Float32Array([0, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 1]);

export class WebGL2ChartRenderer implements ChartRenderer {
  public readonly capabilities: ChartRendererCapabilities;
  readonly #canvas: HTMLCanvasElement;
  readonly #gl: WebGL2RenderingContext;
  readonly #style: NormalizedChartRenderStyle;
  #pointProgram!: WebGLProgram;
  #lineProgram!: WebGLProgram;
  #rectangleProgram!: WebGLProgram;
  #arcProgram!: WebGLProgram;
  #dataBuffer!: WebGLBuffer;
  #quadBuffer!: WebGLBuffer;
  #diagnostics: ChartRendererDiagnostics = Object.freeze({ mode: 'webgl2', uploadedBytes: 0, drawCalls: 0, liveResources: 0 });
  #active = true;
  #lost = false;

  readonly #onContextLost = (event: Event): void => {
    event.preventDefault();
    this.#lost = true;
    this.#diagnostics = Object.freeze({ ...this.#diagnostics, liveResources: 0 });
  };
  readonly #onContextRestored = (): void => {
    if (!this.#active) return;
    this.#lost = false;
    this.#initialize();
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
    this.#initialize();
    canvas.addEventListener('webglcontextlost', this.#onContextLost);
    canvas.addEventListener('webglcontextrestored', this.#onContextRestored);
  }

  public render(projection: ChartProjection, batches: readonly ChartProjectionBatch[] = projection.batches): void {
    if (!this.#active || this.#lost) return;
    const gl = this.#gl;
    gl.viewport(0, 0, this.#canvas.width, this.#canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    let uploadedBytes = 0;
    let drawCalls = 0;
    for (const batch of batches) {
      if (batch.type === 'point') {
        this.#drawPoints(batch.positions, projection);
        uploadedBytes += batch.positions.byteLength;
        drawCalls += 1;
      } else if (batch.type === 'polyline') {
        this.#drawLines(batch.positions, batch.offsets, projection);
        uploadedBytes += batch.positions.byteLength;
        drawCalls += Math.max(0, batch.offsets.length - 1);
      } else if (batch.type === 'rectangle') {
        this.#drawRectangles(batch.rectangles, 16, projection);
        uploadedBytes += batch.rectangles.byteLength;
        drawCalls += 1;
      } else if (batch.type === 'cell') {
        this.#drawRectangles(batch.cells, 20, projection);
        uploadedBytes += batch.cells.byteLength;
        drawCalls += 1;
      } else {
        this.#drawArcs(batch.arcs, projection);
        uploadedBytes += batch.arcs.byteLength;
        drawCalls += 1;
      }
    }
    this.#diagnostics = Object.freeze({ mode: 'webgl2', uploadedBytes, drawCalls, liveResources: 6 });
  }

  public getDiagnostics(): ChartRendererDiagnostics { return this.#diagnostics; }
  public flush(): void { if (this.#active && !this.#lost) this.#gl.flush(); }

  public disconnect(): void {
    if (!this.#active) return;
    this.#active = false;
    this.#canvas.removeEventListener('webglcontextlost', this.#onContextLost);
    this.#canvas.removeEventListener('webglcontextrestored', this.#onContextRestored);
    if (!this.#lost) this.#deleteResources();
    this.#diagnostics = Object.freeze({ ...this.#diagnostics, liveResources: 0 });
  }

  #initialize(): void {
    const gl = this.#gl;
    this.#pointProgram = createProgram(gl, VERTEX_POINT, FRAGMENT_POINT);
    this.#lineProgram = createProgram(gl, VERTEX_POINT, FRAGMENT_COLOR);
    this.#rectangleProgram = createProgram(gl, VERTEX_RECTANGLE, FRAGMENT_COLOR);
    this.#arcProgram = createProgram(gl, VERTEX_ARC, FRAGMENT_ARC);
    this.#dataBuffer = requiredBuffer(gl);
    this.#quadBuffer = requiredBuffer(gl);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.#quadBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, QUAD, gl.STATIC_DRAW);
    this.#diagnostics = Object.freeze({ mode: 'webgl2', uploadedBytes: 0, drawCalls: 0, liveResources: 6 });
  }

  #drawPoints(positions: Float32Array, projection: ChartProjection): void {
    const gl = this.#gl;
    gl.useProgram(this.#pointProgram);
    bindViewport(gl, this.#pointProgram, projection);
    bindColor(gl, this.#pointProgram, this.#style.color);
    gl.uniform1f(gl.getUniformLocation(this.#pointProgram, 'uPointSize'), this.#style.pointRadius * 2 * (projection.viewport.devicePixelRatio ?? 1));
    gl.bindBuffer(gl.ARRAY_BUFFER, this.#dataBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.DYNAMIC_DRAW);
    const location = gl.getAttribLocation(this.#pointProgram, 'aPosition');
    gl.enableVertexAttribArray(location);
    gl.vertexAttribPointer(location, 2, gl.FLOAT, false, 8, 0);
    gl.vertexAttribDivisor(location, 0);
    gl.drawArrays(gl.POINTS, 0, positions.length / 2);
  }

  #drawLines(positions: Float32Array, offsets: Uint32Array, projection: ChartProjection): void {
    const gl = this.#gl;
    gl.useProgram(this.#lineProgram);
    bindViewport(gl, this.#lineProgram, projection);
    bindColor(gl, this.#lineProgram, this.#style.color);
    gl.lineWidth(this.#style.lineWidth * (projection.viewport.devicePixelRatio ?? 1));
    gl.bindBuffer(gl.ARRAY_BUFFER, this.#dataBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.DYNAMIC_DRAW);
    const location = gl.getAttribLocation(this.#lineProgram, 'aPosition');
    gl.enableVertexAttribArray(location);
    gl.vertexAttribPointer(location, 2, gl.FLOAT, false, 8, 0);
    gl.vertexAttribDivisor(location, 0);
    for (let index = 0; index + 1 < offsets.length; index += 1) {
      gl.drawArrays(gl.LINE_STRIP, offsets[index] as number, (offsets[index + 1] as number) - (offsets[index] as number));
    }
  }

  #drawRectangles(rectangles: Float32Array, stride: number, projection: ChartProjection): void {
    const gl = this.#gl;
    gl.useProgram(this.#rectangleProgram);
    bindViewport(gl, this.#rectangleProgram, projection);
    bindColor(gl, this.#rectangleProgram, this.#style.color);
    bindCorners(gl, this.#rectangleProgram, this.#quadBuffer);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.#dataBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, rectangles, gl.DYNAMIC_DRAW);
    const rectangle = gl.getAttribLocation(this.#rectangleProgram, 'aRectangle');
    gl.enableVertexAttribArray(rectangle);
    gl.vertexAttribPointer(rectangle, 4, gl.FLOAT, false, stride, 0);
    gl.vertexAttribDivisor(rectangle, 1);
    gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, rectangles.byteLength / stride);
  }

  #drawArcs(arcs: Float32Array, projection: ChartProjection): void {
    const gl = this.#gl;
    gl.useProgram(this.#arcProgram);
    bindViewport(gl, this.#arcProgram, projection);
    bindColor(gl, this.#arcProgram, this.#style.color);
    bindCorners(gl, this.#arcProgram, this.#quadBuffer);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.#dataBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, arcs, gl.DYNAMIC_DRAW);
    const first = gl.getAttribLocation(this.#arcProgram, 'aArcA');
    const second = gl.getAttribLocation(this.#arcProgram, 'aArcB');
    gl.enableVertexAttribArray(first); gl.vertexAttribPointer(first, 4, gl.FLOAT, false, 24, 0); gl.vertexAttribDivisor(first, 1);
    gl.enableVertexAttribArray(second); gl.vertexAttribPointer(second, 2, gl.FLOAT, false, 24, 16); gl.vertexAttribDivisor(second, 1);
    gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, arcs.length / 6);
  }

  #deleteResources(): void {
    const gl = this.#gl;
    gl.deleteProgram(this.#pointProgram);
    gl.deleteProgram(this.#lineProgram);
    gl.deleteProgram(this.#rectangleProgram);
    gl.deleteProgram(this.#arcProgram);
    gl.deleteBuffer(this.#dataBuffer);
    gl.deleteBuffer(this.#quadBuffer);
  }
}

function createProgram(gl: WebGL2RenderingContext, vertexSource: string, fragmentSource: string): WebGLProgram {
  const vertex = createShader(gl, gl.VERTEX_SHADER, vertexSource);
  const fragment = createShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
  const program = gl.createProgram();
  if (program === null) throw new Error('WebGL2 chart program allocation failed.');
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const message = gl.getProgramInfoLog(program) ?? 'unknown link error';
    gl.deleteProgram(program);
    throw new Error(`WebGL2 chart program link failed: ${message}`);
  }
  return program;
}

function createShader(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader {
  const shader = gl.createShader(type);
  if (shader === null) throw new Error('WebGL2 chart shader allocation failed.');
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const message = gl.getShaderInfoLog(shader) ?? 'unknown compile error';
    gl.deleteShader(shader);
    throw new Error(`WebGL2 chart shader compile failed: ${message}`);
  }
  return shader;
}

function requiredBuffer(gl: WebGL2RenderingContext): WebGLBuffer {
  const buffer = gl.createBuffer();
  if (buffer === null) throw new Error('WebGL2 chart buffer allocation failed.');
  return buffer;
}

function bindViewport(gl: WebGL2RenderingContext, program: WebGLProgram, projection: ChartProjection): void {
  gl.uniform2f(gl.getUniformLocation(program, 'uViewport'), projection.viewport.width, projection.viewport.height);
}

function bindColor(gl: WebGL2RenderingContext, program: WebGLProgram, color: readonly number[]): void {
  gl.uniform4f(gl.getUniformLocation(program, 'uColor'), color[0] as number, color[1] as number, color[2] as number, color[3] as number);
}

function bindCorners(gl: WebGL2RenderingContext, program: WebGLProgram, buffer: WebGLBuffer): void {
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  const location = gl.getAttribLocation(program, 'aCorner');
  gl.enableVertexAttribArray(location);
  gl.vertexAttribPointer(location, 2, gl.FLOAT, false, 8, 0);
  gl.vertexAttribDivisor(location, 0);
}
