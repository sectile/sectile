import { failResult, okResult, type Result } from '@sectile/core/result';
import type { Point, Size } from '@sectile/core/geometry';
import { eventOrigin, gestureParent, hasPositiveAxisAlignedTransform, protectsNativeInteraction } from './interaction/gesture.js';

/** Native client-coordinate facts; media geometry and coordinate projection are caller-owned. */
export type MediaGestureInput =
  | { readonly kind: 'drag'; readonly before: Point; readonly after: Point }
  | { readonly kind: 'pinch'; readonly before: readonly [Point, Point]; readonly after: readonly [Point, Point] };
export type MediaGestureEnd = 'complete' | 'cancel' | 'capture-lost' | 'blur' | 'hidden' | 'manual' | 'disconnect' | 'unavailable';
export interface MediaWheelInput { readonly anchor: Point; readonly delta: number; readonly viewport: Size }
export interface MediaViewportMeasurement<Points extends readonly Point[] = readonly Point[]> {
  readonly viewport: Size;
  readonly points: { readonly [Index in keyof Points]: Point };
}
export interface MediaGestureOptions {
  readonly element: HTMLElement;
  readonly onStart: (input: { readonly pointerType: string; readonly point: Point }) => boolean;
  readonly onMove: (input: MediaGestureInput) => void;
  readonly onEnd?: (reason: MediaGestureEnd) => void;
  /** Opt-in unmodified vertical wheel input. Return true to consume the native action. */
  readonly onWheel?: (input: MediaWheelInput) => boolean;
}
export interface MediaGestureConnection {
  cancel(): void;
  disconnect(): void;
}
export type MediaGestureErrorCode = 'dom.media-gesture-invalid' | 'dom.media-gesture-unavailable';
interface Contact { readonly id: number; point: Point }
type ClientPoint = Pick<MouseEvent, 'clientX' | 'clientY'>;
const point = (event: ClientPoint): Point => Object.freeze({ x: event.clientX, y: event.clientY });
const validPoint = (event: ClientPoint): boolean => Number.isFinite(event.clientX) && Number.isFinite(event.clientY);
const pixels = (value: string): number => value?.endsWith('px') ? Number(value.slice(0, -2)) : NaN;
const positive = (value: number): boolean => Number.isFinite(value) && value > 0;
const measurementFailure = (): Result<never, MediaGestureErrorCode> => failResult('resource-rejection', 'dom.media-gesture-unavailable', 'The media surface has no supported local coordinate basis');
interface NativeMeasurement { readonly value: MediaViewportMeasurement; readonly lineHeight: number; readonly verticalRatio: number }
function measure(element: HTMLElement, points: readonly Point[]): Result<NativeMeasurement, MediaGestureErrorCode> {
  try {
    const document = element?.ownerDocument, view = document?.defaultView;
    if (!element || element.nodeType !== 1 || element.namespaceURI !== 'http://www.w3.org/1999/xhtml'
      || !element.isConnected || !view || !Array.isArray(points) || points.length > 4 || element.getClientRects().length !== 1) return measurementFailure();
    const style = view.getComputedStyle(element), width = pixels(style.width), height = pixels(style.height);
    if (!positive(width) || !positive(height) || ['auto', 'scroll'].includes(style.overflowX) || ['auto', 'scroll'].includes(style.overflowY)
      || [style.paddingTop, style.paddingRight, style.paddingBottom, style.paddingLeft,
        style.borderTopWidth, style.borderRightWidth, style.borderBottomWidth, style.borderLeftWidth].some(value => pixels(value) !== 0)) return measurementFailure();
    for (let node: Element | null = element; node; node = gestureParent(node)) {
      const current = node === element ? style : view.getComputedStyle(node);
      if (!hasPositiveAxisAlignedTransform(current, view) || current.offsetPath && current.offsetPath !== 'none') return measurementFailure();
    }
    const rect = element.getBoundingClientRect();
    if (!Number.isFinite(rect.left) || !Number.isFinite(rect.top) || !positive(rect.width) || !positive(rect.height)) return measurementFailure();
    const projected: Point[] = [];
    for (const point of points) {
      if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) return measurementFailure();
      const x = (point.x - rect.left) / rect.width * width, y = (point.y - rect.top) / rect.height * height;
      if (!Number.isFinite(x) || !Number.isFinite(y)) return measurementFailure();
      projected.push(Object.freeze({ x, y }));
    }
    if (!element.isConnected || element.ownerDocument !== document) return measurementFailure();
    return okResult({ value: Object.freeze({ viewport: Object.freeze({ width, height }), points: Object.freeze(projected) }),
      lineHeight: pixels(style.lineHeight), verticalRatio: height / rect.height });
  } catch { return measurementFailure(); }
}
/** One undecorated, non-scrolling native box; no observation or retained DOM authority. */
export function readMediaViewport(element: HTMLElement): Result<MediaViewportMeasurement<readonly []>, MediaGestureErrorCode>;
export function readMediaViewport<const Points extends readonly Point[]>(element: HTMLElement, points: Points): Result<MediaViewportMeasurement<Points>, MediaGestureErrorCode>;
export function readMediaViewport(element: HTMLElement, points: readonly Point[] = []): Result<MediaViewportMeasurement, MediaGestureErrorCode> {
  const result = measure(element, points);
  return result.ok ? okResult(result.value.value) : result;
}

export function connectMediaGesture(options: MediaGestureOptions): Result<MediaGestureConnection, MediaGestureErrorCode> {
  const element = options?.element, document = element?.ownerDocument, window = document?.defaultView;
  if (!element || element.nodeType !== 1 || element.namespaceURI !== 'http://www.w3.org/1999/xhtml'
    || !document || !window || typeof options.onStart !== 'function' || typeof options.onMove !== 'function'
    || (options.onEnd !== undefined && typeof options.onEnd !== 'function') || (options.onWheel !== undefined && typeof options.onWheel !== 'function')) {
    return failResult('construction', 'dom.media-gesture-invalid', 'Media gestures require an HTML surface and native input hooks');
  }
  if (!element.isConnected || typeof element.setPointerCapture !== 'function' || typeof element.releasePointerCapture !== 'function') {
    return failResult('resource-rejection', 'dom.media-gesture-unavailable', 'Native pointer capture is unavailable');
  }
  return MediaGestureOwner.connect(element, document, window, options.onStart, options.onMove, options.onEnd, options.onWheel);
}

class MediaGestureOwner implements MediaGestureConnection {
  #element: HTMLElement | undefined;
  #document: Document | undefined;
  #window: Window | undefined;
  #start: MediaGestureOptions['onStart'] | undefined;
  #move: MediaGestureOptions['onMove'] | undefined;
  #end: MediaGestureOptions['onEnd'];
  #wheelHook: MediaGestureOptions['onWheel'];
  #first: Contact | undefined;
  #second: Contact | undefined;
  #listeners = 0;
  #handling = false;
  #generation = {};
  readonly #pointer = (event: Event): void => {
    if (this.#handling || !this.#element) return;
    this.#handling = true;
    try { this.#handle(event as PointerEvent); }
    catch (error) { this.#retire(); throw error; }
    finally { this.#handling = false; }
  };
  readonly #blur = (): void => { this.#finish('blur'); };
  readonly #visibility = (): void => { if (this.#document?.hidden) this.#finish('hidden'); };
  readonly #wheel = (native: Event): void => {
    const event = native as WheelEvent, element = this.#element;
    if (this.#handling || !element || !this.#wheelHook || this.#first || this.#document?.hidden || event.defaultPrevented || !event.cancelable
      || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey || !validPoint(event)
      || !Number.isFinite(event.deltaX) || !Number.isFinite(event.deltaY) || event.deltaY === 0 || Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
    this.#handling = true;
    try {
      if (!element.isConnected || element.ownerDocument !== this.#document) { this.#retire(); return; }
      const origin = eventOrigin(event);
      if (!origin || protectsNativeInteraction(origin, element)) return;
      const measured = measure(element, [point(event)]);
      if (!measured.ok) return;
      const facts = measured.value, multiplier = event.deltaMode === 0 ? facts.verticalRatio : event.deltaMode === 1 ? facts.lineHeight
        : event.deltaMode === 2 ? facts.value.viewport.height : NaN;
      const delta = event.deltaY * multiplier;
      if (!positive(multiplier) || !Number.isFinite(delta) || delta === 0) return;
      const generation = this.#generation;
      const accepted = this.#wheelHook(Object.freeze({ anchor: facts.value.points[0]!, delta, viewport: facts.value.viewport }));
      if (accepted && this.#element === element && generation === this.#generation && element.isConnected && element.ownerDocument === this.#document) event.preventDefault();
    } catch (error) { this.#retire(); throw error; }
    finally { this.#handling = false; }
  };
  private constructor(element: HTMLElement, document: Document, window: Window,
    start: MediaGestureOptions['onStart'], move: MediaGestureOptions['onMove'], end: MediaGestureOptions['onEnd'], wheel: MediaGestureOptions['onWheel']) {
    this.#element = element; this.#document = document; this.#window = window;
    this.#start = start; this.#move = move; this.#end = end; this.#wheelHook = wheel;
  }
  static connect(element: HTMLElement, document: Document, window: Window,
    start: MediaGestureOptions['onStart'], move: MediaGestureOptions['onMove'], end: MediaGestureOptions['onEnd'], wheel: MediaGestureOptions['onWheel']): Result<MediaGestureConnection, MediaGestureErrorCode> {
    const owner = new MediaGestureOwner(element, document, window, start, move, end, wheel);
    try {
      for (const type of ['pointerdown', 'pointermove', 'pointerup', 'pointercancel', 'lostpointercapture']) {
        owner.#listeners++; element.addEventListener(type, owner.#pointer);
      }
      owner.#listeners++; document.addEventListener('visibilitychange', owner.#visibility);
      owner.#listeners++; window.addEventListener('blur', owner.#blur);
      if (wheel) { owner.#listeners++; element.addEventListener('wheel', owner.#wheel, { passive: false }); }
    } catch {
      owner.#retire();
      return failResult('resource-rejection', 'dom.media-gesture-unavailable', 'Native gesture observation is unavailable');
    }
    return okResult(owner);
  }
  cancel(): void { this.#finish('manual'); }
  disconnect(): void {
    const end = this.#end, active = this.#first !== undefined;
    this.#retire();
    if (active) end?.('disconnect');
  }
  #handle(event: PointerEvent): void {
    const element = this.#element!;
    if (!element.isConnected || element.ownerDocument !== this.#document) { this.#finish('unavailable'); this.#retire(); return; }
    const contact = this.#first?.id === event.pointerId ? this.#first : this.#second?.id === event.pointerId ? this.#second : undefined;
    if (event.type === 'pointerdown') {
      if (event.defaultPrevented || contact || this.#second || !validPoint(event) || !Number.isSafeInteger(event.pointerId)
        || this.#document?.hidden || event.button !== 0 || (event.pointerType === 'mouse' && !event.isPrimary)) return;
      const origin = eventOrigin(event);
      if (!origin || protectsNativeInteraction(origin, element)) return;
      const generation = this.#generation, next: Contact = { id: event.pointerId, point: point(event) };
      if (!this.#start?.(Object.freeze({ pointerType: event.pointerType, point: next.point }))
        || this.#element !== element || generation !== this.#generation) return;
      if (!this.#first) this.#first = next; else this.#second = next;
      if (!element.isConnected || element.ownerDocument !== this.#document) { this.#finish('unavailable'); this.#retire(); return; }
      try { element.setPointerCapture(event.pointerId); }
      catch { this.#finish('unavailable'); return; }
      if (this.#element === element && this.#first && event.cancelable) event.preventDefault();
      return;
    }
    if (!contact) return;
    if (event.type === 'pointercancel' || event.type === 'lostpointercapture') {
      this.#finish(event.type === 'pointercancel' ? 'cancel' : 'capture-lost'); return;
    }
    if (!validPoint(event)) { this.#finish('unavailable'); return; }
    const next = point(event), before = contact.point;
    if (before.x !== next.x || before.y !== next.y) {
      const pair = this.#second ? Object.freeze([this.#first!.point, this.#second.point] as const) : undefined;
      contact.point = next;
      const input: MediaGestureInput = pair
        ? Object.freeze({ kind: 'pinch', before: pair, after: Object.freeze([this.#first!.point, this.#second!.point] as const) })
        : Object.freeze({ kind: 'drag', before, after: next });
      this.#move?.(input);
    }
    if (this.#element !== element || (this.#first !== contact && this.#second !== contact)) return;
    if (!element.isConnected || element.ownerDocument !== this.#document) { this.#finish('unavailable'); this.#retire(); return; }
    if (event.cancelable) event.preventDefault();
    if (event.type === 'pointerup') {
      if (this.#first === contact) { this.#first = this.#second; this.#second = undefined; } else this.#second = undefined;
      this.#release(element, contact.id);
      if (!this.#first) this.#finish('complete', true);
    }
  }
  #release(element: HTMLElement, id: number): void {
    try { element.releasePointerCapture(id); } catch { /* Native implicit release may already have occurred. */ }
  }
  #clear(): boolean {
    const first = this.#first, second = this.#second, element = this.#element;
    this.#first = undefined; this.#second = undefined; this.#generation = {};
    if (element) {
      if (first) this.#release(element, first.id);
      if (second) this.#release(element, second.id);
    }
    return first !== undefined;
  }
  #finish(reason: MediaGestureEnd, completed = false): void {
    const active = this.#clear();
    if (!active && !completed) return;
    try { this.#end?.(reason); } catch (error) { this.#retire(); throw error; }
  }
  #retire(): void {
    const element = this.#element, document = this.#document, window = this.#window, listeners = this.#listeners;
    this.#start = undefined; this.#move = undefined; this.#end = undefined; this.#wheelHook = undefined;
    this.#clear();
    this.#element = undefined; this.#document = undefined; this.#window = undefined; this.#listeners = 0;
    const types = ['pointerdown', 'pointermove', 'pointerup', 'pointercancel', 'lostpointercapture'];
    for (let index = 0; index < Math.min(5, listeners); index++) element?.removeEventListener(types[index]!, this.#pointer);
    if (listeners >= 6) document?.removeEventListener('visibilitychange', this.#visibility);
    if (listeners >= 7) window?.removeEventListener('blur', this.#blur);
    if (listeners >= 8) element?.removeEventListener('wheel', this.#wheel);
  }
}
