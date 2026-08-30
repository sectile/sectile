import type { Result, StableID } from '@sectile/core';
import type { ChartController } from '@sectile/chart/controller';
import type { ChartViewAction } from '@sectile/chart/view';
import type { ChartAxisLayout } from '@sectile/chart/layout';
import type { ChartProjection } from '@sectile/chart/projection';
import type {
  DOMChartLifecycleDiagnostics,
  DOMChartNavigation,
  NormalizedDOMChartNavigation,
} from '../chart.js';
import { tryNormalizeDOMChartNavigation } from '../chart.js';

type ChartWindow = Window & typeof globalThis;
type GestureMode = Exclude<NormalizedDOMChartNavigation['drag'], 'none'> | 'pinch';

interface PointerPosition {
  readonly x: number;
  readonly y: number;
}

interface ActiveGesture<ID extends StableID> {
  readonly mode: GestureMode;
  readonly axes: readonly ChartAxisLayout<ID>[];
  readonly start: PointerPosition;
  last: PointerPosition;
  distance: number;
}

export class ChartNavigationAdapter<ID extends StableID> {
  readonly #root: HTMLElement;
  readonly #canvas: HTMLCanvasElement;
  readonly #controller: ChartController<ID>;
  readonly #view: ChartWindow;
  readonly #getProjection: () => ChartProjection<ID> | null;
  readonly #touchAction: string;
  readonly #pointers = new Map<number, PointerPosition>();
  #navigation: NormalizedDOMChartNavigation<ID>;
  #gesture: ActiveGesture<ID> | null = null;
  #wheelTimer = 0;
  #listeners = 0;
  #active = true;
  #pendingTouchAction: string | null = null;
  #suppressClick = false;

  public constructor(
    root: HTMLElement,
    canvas: HTMLCanvasElement,
    controller: ChartController<ID>,
    view: ChartWindow,
    navigation: NormalizedDOMChartNavigation<ID>,
    getProjection: () => ChartProjection<ID> | null,
  ) {
    this.#root = root;
    this.#canvas = canvas;
    this.#controller = controller;
    this.#view = view;
    this.#navigation = navigation;
    this.#getProjection = getProjection;
    this.#touchAction = canvas.style.touchAction;
    this.#install();
  }

  public isPointerGestureActive(): boolean { return this.#gesture !== null; }
  public consumeClick(): boolean {
    const suppressed = this.#suppressClick;
    this.#suppressClick = false;
    return suppressed;
  }

  public setNavigation(navigation: DOMChartNavigation<ID> | undefined): Result<void> {
    const normalized = tryNormalizeDOMChartNavigation(navigation);
    if (!normalized.ok) return normalized;
    if (this.#gesture !== null) return {
      ok: false,
      error: {
        class: 'transition-rejection',
        code: 'interaction-disabled',
        message: 'DOM Chart navigation cannot be reconfigured during an active pointer sequence.',
      },
    };
    this.#uninstall();
    this.#navigation = normalized.value;
    this.#install();
    this.refreshCapabilities(this.#getProjection());
    return { ok: true, value: undefined };
  }

  public refreshCapabilities(projection: ChartProjection<ID> | null): void {
    if (!this.#active) return;
    const axes = this.#axes(projection);
    const next = touchAction(this.#navigation, axes) ?? this.#touchAction;
    if (this.#gesture === null) this.#canvas.style.touchAction = next;
    else this.#pendingTouchAction = next;
  }

  public handleKeyDown(event: KeyboardEvent): boolean {
    if (!this.#active || !this.#navigation.keyboard) return false;
    const axes = this.#axes(this.#getProjection());
    if (axes.length === 0) return false;
    let changed = false;
    let recognized = true;
    if (event.key === '+' || event.key === '=') {
      changed = this.#zoomAxes(axes, 1.25, undefined, 'settled');
    } else if (event.key === '-' || event.key === '_') {
      changed = this.#zoomAxes(axes, 0.8, undefined, 'settled');
    } else if (event.key === '0') {
      changed = this.#dispatchAxes(axes, (axis) => ({ type: 'reset-axis-view', axisID: axis.axis.id, phase: 'settled' }));
    } else if (event.shiftKey && (event.key === 'ArrowLeft' || event.key === 'ArrowRight'
      || event.key === 'ArrowUp' || event.key === 'ArrowDown')) {
      changed = this.#dispatchAxes(axes.filter((axis) => event.key === 'ArrowLeft' || event.key === 'ArrowRight'
        ? axis.axis.orientation === 'x' : axis.axis.orientation === 'y'), (axis) => ({
        type: 'pan-axis-view', axisID: axis.axis.id,
        fraction: event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -0.1 : 0.1,
        phase: 'settled',
      }));
    } else recognized = false;
    if (changed) event.preventDefault();
    return recognized;
  }

  public diagnostics(): Pick<DOMChartLifecycleDiagnostics, 'listeners' | 'timers'> {
    return { listeners: this.#listeners, timers: this.#wheelTimer === 0 ? 0 : 1 };
  }

  public disconnect(): void {
    if (!this.#active) return;
    this.#active = false;
    this.#uninstall();
    this.#canvas.style.touchAction = this.#touchAction;
  }

  #install(): void {
    if (!this.#active) return;
    if (this.#navigation.drag !== 'none' || this.#navigation.pinch) {
      this.#canvas.addEventListener('pointerdown', this.#onPointerDown);
      this.#canvas.addEventListener('pointermove', this.#onPointerMove);
      this.#canvas.addEventListener('pointerup', this.#onPointerUp);
      this.#canvas.addEventListener('pointercancel', this.#onPointerCancel);
      this.#listeners += 4;
    }
    if (this.#navigation.wheel !== 'native') {
      this.#canvas.addEventListener('wheel', this.#onWheel, { passive: false });
      this.#listeners += 1;
    }
  }

  #uninstall(): void {
    if (this.#listeners > 0) {
      this.#canvas.removeEventListener('pointerdown', this.#onPointerDown);
      this.#canvas.removeEventListener('pointermove', this.#onPointerMove);
      this.#canvas.removeEventListener('pointerup', this.#onPointerUp);
      this.#canvas.removeEventListener('pointercancel', this.#onPointerCancel);
      this.#canvas.removeEventListener('wheel', this.#onWheel);
    }
    this.#listeners = 0;
    if (this.#wheelTimer !== 0) this.#view.clearTimeout(this.#wheelTimer);
    this.#wheelTimer = 0;
    this.#endGesture(false);
  }

  readonly #onPointerDown = (event: PointerEvent): void => {
    if (!this.#active || event.button !== 0) return;
    const point = this.#position(event);
    this.#pointers.set(event.pointerId, point);
    const axes = this.#axes(this.#getProjection());
    if (axes.length === 0) return;
    this.#canvas.setPointerCapture?.(event.pointerId);
    if (this.#navigation.pinch && this.#pointers.size === 2) {
      const pair = [...this.#pointers.values()];
      const midpoint = middle(pair[0] as PointerPosition, pair[1] as PointerPosition);
      this.#gesture = { mode: 'pinch', axes, start: midpoint, last: midpoint, distance: distance(pair[0] as PointerPosition, pair[1] as PointerPosition) };
      this.#zoomAxes(axes, 1, midpoint, 'start');
      return;
    }
    if (this.#navigation.drag === 'none') return;
    this.#gesture = { mode: this.#navigation.drag, axes, start: point, last: point, distance: 0 };
    this.#phase(axes, 'start');
  };

  readonly #onPointerMove = (event: PointerEvent): void => {
    if (!this.#active || !this.#pointers.has(event.pointerId) || this.#gesture === null) return;
    const point = this.#position(event);
    this.#pointers.set(event.pointerId, point);
    const gesture = this.#gesture;
    if (gesture.mode === 'pinch') {
      if (this.#pointers.size < 2) return;
      const pair = [...this.#pointers.values()];
      const nextDistance = distance(pair[0] as PointerPosition, pair[1] as PointerPosition);
      if (!(gesture.distance > 0) || !(nextDistance > 0)) return;
      const midpoint = middle(pair[0] as PointerPosition, pair[1] as PointerPosition);
      const changed = this.#zoomAxes(gesture.axes, nextDistance / gesture.distance, midpoint, 'update');
      gesture.distance = nextDistance;
      gesture.last = midpoint;
      if (!changed) this.#endGesture(true);
      return;
    }
    if (gesture.mode !== 'pan') { gesture.last = point; return; }
    const delta = { x: point.x - gesture.last.x, y: point.y - gesture.last.y };
    gesture.last = point;
    const changed = this.#dispatchAxes(gesture.axes, (axis) => ({
      type: 'pan-axis-view', axisID: axis.axis.id,
      fraction: -axisDelta(axis, delta) / (axis.descriptor.range.end - axis.descriptor.range.start),
      phase: 'update',
    }));
    if (!changed) this.#endGesture(true);
  };

  readonly #onPointerUp = (event: PointerEvent): void => {
    if (!this.#pointers.has(event.pointerId)) return;
    const point = this.#position(event);
    this.#pointers.set(event.pointerId, point);
    const gesture = this.#gesture;
    if (gesture !== null && gesture.mode !== 'pan' && gesture.mode !== 'pinch') this.#commitRegion(gesture, point);
    this.#canvas.releasePointerCapture?.(event.pointerId);
    this.#pointers.delete(event.pointerId);
    if (gesture !== null && (gesture.mode !== 'pinch' || this.#pointers.size < 2)) this.#endGesture(true);
  };

  readonly #onPointerCancel = (event: PointerEvent): void => {
    this.#canvas.releasePointerCapture?.(event.pointerId);
    this.#pointers.delete(event.pointerId);
    this.#endGesture(true);
  };

  readonly #onWheel = (event: WheelEvent): void => {
    if (!this.#active || !matchesModifier(event, this.#navigation.wheelModifier)) return;
    const projection = this.#getProjection();
    const axes = this.#axes(projection);
    if (projection === null || axes.length === 0) return;
    const point = this.#position(event);
    const delta = wheelPixels(event, projection.viewport);
    const changed = this.#navigation.wheel === 'zoom'
      ? this.#zoomAxes(axes, Math.exp(-delta.y * 0.002), point, 'update')
      : this.#dispatchAxes(axes, (axis) => ({
        type: 'pan-axis-view', axisID: axis.axis.id,
        fraction: axis.axis.orientation === 'x'
          ? (Math.abs(delta.x) > Math.abs(delta.y) ? delta.x : delta.y) / Math.abs(axis.descriptor.range.end - axis.descriptor.range.start)
          : delta.y / Math.abs(axis.descriptor.range.end - axis.descriptor.range.start),
        phase: 'update',
      }));
    if (!changed) return;
    if (event.cancelable) event.preventDefault();
    if (this.#wheelTimer !== 0) this.#view.clearTimeout(this.#wheelTimer);
    this.#wheelTimer = this.#view.setTimeout(() => {
      this.#wheelTimer = 0;
      if (!this.#active) return;
      this.#phase(this.#axes(this.#getProjection()), 'settled');
    }, 120);
  };

  #commitRegion(gesture: ActiveGesture<ID>, end: PointerPosition): void {
    if (Math.abs(end.x - gesture.start.x) < 4 && Math.abs(end.y - gesture.start.y) < 4) return;
    this.#suppressClick = true;
    if (gesture.mode === 'zoom-region') {
      this.#dispatchAxes(gesture.axes, (axis) => {
        const start = axis.geometryScale.invert(axis.axis.orientation === 'x' ? gesture.start.x : gesture.start.y);
        const finish = axis.geometryScale.invert(axis.axis.orientation === 'x' ? end.x : end.y);
        if (typeof start !== 'number' || typeof finish !== 'number') return null;
        const minimum = Math.min(start, finish);
        const maximum = Math.max(start, finish);
        return {
          type: 'set-axis-view', axisID: axis.axis.id,
          visible: axis.axis.domain.kind === 'categorical'
            ? { kind: 'categorical', start: Math.floor(minimum), end: Math.ceil(maximum) }
            : { kind: 'continuous', minimum, maximum },
          phase: 'end',
        };
      });
      return;
    }
    const x = gesture.axes.find((axis) => axis.axis.orientation === 'x');
    const y = gesture.axes.find((axis) => axis.axis.orientation === 'y');
    if (x !== undefined && y !== undefined) {
      const x1 = x.geometryScale.invert(gesture.start.x); const x2 = x.geometryScale.invert(end.x);
      const y1 = y.geometryScale.invert(gesture.start.y); const y2 = y.geometryScale.invert(end.y);
      if ([x1, x2, y1, y2].every((value) => typeof value === 'number')) this.#controller.dispatch({
        type: 'set-selection', selection: {
          type: 'domain-region', xAxisID: x.axis.id, xStart: Math.min(x1 as number, x2 as number), xEnd: Math.max(x1 as number, x2 as number),
          yAxisID: y.axis.id, yStart: Math.min(y1 as number, y2 as number), yEnd: Math.max(y1 as number, y2 as number),
        },
      });
    } else {
      const axis = x ?? y;
      if (axis === undefined) return;
      const first = axis.geometryScale.invert(axis.axis.orientation === 'x' ? gesture.start.x : gesture.start.y);
      const second = axis.geometryScale.invert(axis.axis.orientation === 'x' ? end.x : end.y);
      if (typeof first === 'number' && typeof second === 'number') {
        const start = Math.min(first, second);
        const end = Math.max(first, second);
        this.#controller.dispatch({
          type: 'set-selection', selection: {
            type: 'axis-interval', axisID: axis.axis.id,
            start: axis.axis.domain.kind === 'categorical' ? Math.floor(start) : start,
            end: axis.axis.domain.kind === 'categorical' ? Math.ceil(end) : end,
          },
        });
      }
    }
  }

  #endGesture(settled: boolean): void {
    const gesture = this.#gesture;
    this.#gesture = null;
    for (const pointerID of this.#pointers.keys()) {
      if (this.#canvas.hasPointerCapture?.(pointerID)) this.#canvas.releasePointerCapture(pointerID);
    }
    this.#pointers.clear();
    if (gesture !== null && settled) this.#phase(gesture.axes, 'settled');
    if (this.#pendingTouchAction !== null) {
      this.#canvas.style.touchAction = this.#pendingTouchAction;
      this.#pendingTouchAction = null;
    }
  }

  #phase(axes: readonly ChartAxisLayout<ID>[], phase: 'start' | 'end' | 'settled'): boolean {
    return this.#dispatchAxes(axes, (axis) => ({ type: 'pan-axis-view', axisID: axis.axis.id, fraction: 0, phase }));
  }

  #zoomAxes(
    axes: readonly ChartAxisLayout<ID>[],
    factor: number,
    point: PointerPosition | undefined,
    phase: 'start' | 'update' | 'settled',
  ): boolean {
    return this.#dispatchAxes(axes, (axis) => ({
      type: 'zoom-axis-view', axisID: axis.axis.id, factor,
      anchor: point === undefined ? 0.5 : axisAnchor(axis, point), phase,
    }));
  }

  #dispatchAxes(
    axes: readonly ChartAxisLayout<ID>[],
    action: (axis: ChartAxisLayout<ID>) => ChartViewAction<ID> | null,
  ): boolean {
    let changed = false;
    for (const axis of axes) {
      const next = action(axis);
      if (next === null) continue;
      const update = this.#controller.dispatch(next);
      if (!update.ok) continue;
      if (update.value.commands.some((command) => command.type === 'view-phase' && command.changed)) changed = true;
    }
    return changed;
  }

  #axes(projection: ChartProjection<ID> | null): readonly ChartAxisLayout<ID>[] {
    const layouts = projection?.layout?.axes;
    const view = this.#controller.getSnapshot().state.view;
    if (layouts === undefined || view === null) return [];
    const enabled = new Set(view.axes.map((axis) => axis.axisID));
    const requested = this.#navigation.axes === undefined ? null : new Set(this.#navigation.axes);
    return layouts.filter((axis) => enabled.has(axis.axis.id) && (requested === null || requested.has(axis.axis.id)));
  }

  #position(event: MouseEvent | PointerEvent | WheelEvent): PointerPosition {
    const rect = this.#canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }
}

function axisDelta(axis: ChartAxisLayout, delta: PointerPosition): number {
  return axis.axis.orientation === 'x' ? delta.x : delta.y;
}

function axisAnchor(axis: ChartAxisLayout, point: PointerPosition): number {
  const pixel = axis.axis.orientation === 'x' ? point.x : point.y;
  const range = axis.descriptor.range;
  return Math.max(0, Math.min(1, (pixel - range.start) / (range.end - range.start)));
}

function touchAction(navigation: NormalizedDOMChartNavigation, axes: readonly ChartAxisLayout[]): string | null {
  if (navigation.pinch) return 'none';
  if (navigation.drag === 'none' || axes.length === 0) return null;
  const x = axes.some((axis) => axis.axis.orientation === 'x');
  const y = axes.some((axis) => axis.axis.orientation === 'y');
  return x && y ? 'none' : x ? 'pan-y' : 'pan-x';
}

function matchesModifier(event: WheelEvent, modifier: NormalizedDOMChartNavigation['wheelModifier']): boolean {
  if (modifier === 'none') return !event.ctrlKey && !event.metaKey && !event.altKey && !event.shiftKey;
  if (modifier === 'control') return event.ctrlKey;
  if (modifier === 'meta') return event.metaKey;
  if (modifier === 'alt') return event.altKey;
  return event.shiftKey;
}

function wheelPixels(event: WheelEvent, viewport: { readonly width: number; readonly height: number }): PointerPosition {
  const multiplier = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? Math.max(viewport.width, viewport.height) : 1;
  return { x: event.deltaX * multiplier, y: event.deltaY * multiplier };
}

function distance(left: PointerPosition, right: PointerPosition): number {
  return Math.hypot(right.x - left.x, right.y - left.y);
}

function middle(left: PointerPosition, right: PointerPosition): PointerPosition {
  return { x: (left.x + right.x) / 2, y: (left.y + right.y) / 2 };
}
