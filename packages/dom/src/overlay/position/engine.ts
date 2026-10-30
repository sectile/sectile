import {
  solveAnchoredLayout,
  type AnchoredLayout,
} from '@sectile/core/anchored-layout';
import { readViewportRect as viewportRect } from '../../internal/viewport.js';
import {
  intersectRects,
  type Insets,
  type Rect,
  type RectAlign,
  type RectSide,
} from '@sectile/core/geometry';

export type PositionRoute = 'css-anchor' | 'javascript';
export type PositionStrategy = 'absolute' | 'fixed';
export type PositionTracking = 'events' | 'animation-frame';

export interface PositionEngineCapabilities {
  readonly anchorName: boolean;
  readonly positionAnchor: boolean;
  readonly positionArea: boolean;
  readonly positionVisibility: boolean;
  readonly anchorGeometry: boolean;
}

export interface PositionEngineOptions {
  readonly root: HTMLElement;
  readonly reference: HTMLElement;
  readonly anchorRect?: Rect | undefined;
  readonly measureAnchorRect?: (() => Rect | undefined) | undefined;
  readonly arrow?: HTMLElement | undefined;
  readonly side?: RectSide | undefined;
  readonly align?: RectAlign | undefined;
  readonly sideOffset?: number | undefined;
  readonly collisionPadding?: number | Partial<Insets> | undefined;
  readonly collisionBoundary?: 'viewport' | Element | undefined;
  readonly avoidCollisions?: boolean | undefined;
  readonly flip?: boolean | undefined;
  readonly shift?: boolean | undefined;
  readonly arrowPadding?: number | undefined;
  readonly hideWhenDetached?: boolean | undefined;
  readonly strategy?: PositionStrategy | undefined;
  readonly tracking?: PositionTracking | undefined;
  readonly observeLayoutShift?: boolean;
  readonly requiresLayoutObservables?: boolean;
  readonly capabilities?: PositionEngineCapabilities;
  readonly onLayout?: (layout: AnchoredLayout) => void;
  /** Completion notification without requesting measured layout observables. */
  readonly onPositioned?: (() => void) | undefined;
}

export interface PositionEngineDiagnostics {
  readonly route: PositionRoute;
  readonly discoveryRuns: number;
  readonly discoveredAncestors: number;
  readonly scheduledUpdates: number;
  readonly coalescedUpdates: number;
  readonly completedUpdates: number;
  readonly staleUpdates: number;
  readonly measurementReads: number;
  readonly projectionWrites: number;
  readonly candidateCount: number;
  readonly sourceSubscriptions: number;
  readonly resizeObservers: number;
  readonly layoutObservers: number;
  readonly pendingFrames: number;
}

export interface PositionSourceRegistryDiagnostics {
  readonly physicalListeners: number;
  readonly callbacks: number;
  readonly dispatches: number;
  readonly affectedDispatches: number;
}

export interface PositionEngineConnection {
  readonly route: PositionRoute;
  connect(): void;
  update(): void;
  disconnect(): void;
  diagnostics(): PositionEngineDiagnostics;
}

interface MutableDiagnostics {
  discoveryRuns: number;
  discoveredAncestors: number;
  scheduledUpdates: number;
  coalescedUpdates: number;
  completedUpdates: number;
  staleUpdates: number;
  measurementReads: number;
  projectionWrites: number;
  candidateCount: number;
  sourceSubscriptions: number;
  resizeObservers: number;
  layoutObservers: number;
  pendingFrames: number;
}

interface SourceEntry {
  readonly callbacks: Set<() => void>;
  readonly listener: EventListener;
}

interface DiscoveredAncestors {
  readonly clipping: readonly Element[];
  readonly sources: readonly Element[];
}

interface OwnedValue {
  readonly previous: string | null;
  applied: string;
}

interface Measurement {
  readonly reference: Rect;
  readonly floating: { readonly width: number; readonly height: number };
  readonly boundary: Rect;
  readonly arrow: { readonly width: number; readonly height: number } | null;
  readonly offsetParent: {
    readonly rect: Rect;
    readonly scrollLeft: number;
    readonly scrollTop: number;
    readonly clientLeft: number;
    readonly clientTop: number;
  } | null;
  readonly detached: boolean;
}

const scrollSources = new WeakMap<EventTarget, SourceEntry>();
const resizeSources = new WeakMap<EventTarget, SourceEntry>();
const registry = { physicalListeners: 0, callbacks: 0, dispatches: 0, affectedDispatches: 0 };
let anchorSequence = 0;

export function detectPositionEngineCapabilities(view: Window): PositionEngineCapabilities {
  const css = (view as Window & { readonly CSS?: { supports(property: string, value: string): boolean } }).CSS;
  const supports = (property: string, value: string): boolean => typeof css?.supports === 'function' && css.supports(property, value);
  return Object.freeze({
    anchorName: supports('anchor-name', '--sectile-probe'),
    positionAnchor: supports('position-anchor', '--sectile-probe'),
    positionArea: supports('position-area', 'bottom'),
    positionVisibility: supports('position-visibility', 'anchors-visible'),
    anchorGeometry: supports('width', 'anchor-size(width)')
      && supports('height', 'anchor-size(height)')
      && supports('max-width', 'max(0px, calc(100% - 8px))')
      && supports('max-height', 'max(0px, calc(100% - 8px))')
      && supports('left', 'anchor(left)') && supports('left', 'anchor(center)') && supports('left', 'anchor(right)')
      && supports('top', 'anchor(top)') && supports('top', 'anchor(center)') && supports('top', 'anchor(bottom)')
      && supports('translate', '-100% -50%'),
  });
}

interface ResolvedPositionEngineOptions extends PositionEngineOptions {
  readonly flip: boolean;
  readonly shift: boolean;
}

function resolvePositionOptions(options: PositionEngineOptions): ResolvedPositionEngineOptions {
  return { ...options, flip: options.flip ?? options.avoidCollisions ?? true,
    shift: options.shift ?? options.avoidCollisions ?? true };
}

export function selectPositionRoute(options: PositionEngineOptions): PositionRoute {
  return selectResolvedPositionRoute(resolvePositionOptions(options));
}

function selectResolvedPositionRoute(options: ResolvedPositionEngineOptions): PositionRoute {
  if (options.anchorRect !== undefined || options.measureAnchorRect !== undefined) return 'javascript';
  const view = options.root.ownerDocument.defaultView;
  if (view === null || options.reference.ownerDocument !== options.root.ownerDocument) return 'javascript';
  const capabilities = options.capabilities ?? detectPositionEngineCapabilities(view);
  const complete = capabilities.anchorName
    && capabilities.anchorGeometry
    && capabilities.positionAnchor
    && capabilities.positionArea
    && (!(options.hideWhenDetached ?? false) || capabilities.positionVisibility);
  const semantic = (options.collisionBoundary === undefined || options.collisionBoundary === 'viewport')
    && options.arrow === undefined
    && !options.flip && !options.shift
    && options.tracking !== 'animation-frame'
    && options.requiresLayoutObservables !== true
    && options.onLayout === undefined;
  return complete && semantic && viewportPositionArea(options, view) ? 'css-anchor' : 'javascript';
}

// Percentage size limits in a position area must describe the same viewport
// boundary as Core. A clipped or independently containing ancestor needs JS.
function viewportPositionArea(options: PositionEngineOptions, view: Window): boolean {
  const viewport = view.visualViewport;
  if (viewport != null && (viewport.scale !== 1 || viewport.offsetLeft !== 0 || viewport.offsetTop !== 0)) return false;
  const fixed = options.strategy === 'fixed';
  for (let current = parentElement(options.root); current !== null; current = parentElement(current)) {
    const style = view.getComputedStyle(current);
    if (clipsOrScrolls(style) || !initialContainingBlockStyle(style, fixed)) return false;
  }
  return true;
}

export function readPositionSourceRegistryDiagnostics(): PositionSourceRegistryDiagnostics {
  return Object.freeze({ ...registry });
}

export function createPositionEngine(options: PositionEngineOptions): PositionEngineConnection {
  assertOptions(options);
  const request = resolvePositionOptions(options);
  options = request;
  if (options.anchorRect !== undefined) options = { ...options, anchorRect: snapshotPositionRect(options.anchorRect) };
  const route = selectResolvedPositionRoute(request);
  const view = options.root.ownerDocument.defaultView!;
  const diagnostics: MutableDiagnostics = {
    discoveryRuns: 0,
    discoveredAncestors: 0,
    scheduledUpdates: 0,
    coalescedUpdates: 0,
    completedUpdates: 0,
    staleUpdates: 0,
    measurementReads: 0,
    projectionWrites: 0,
    candidateCount: 0,
    sourceSubscriptions: 0,
    resizeObservers: 0,
    layoutObservers: 0,
    pendingFrames: 0,
  };
  const ownedStyles = new Map<HTMLElement, Map<string, OwnedValue>>();
  const ownedData = new Map<HTMLElement, Map<string, OwnedValue>>();
  const disposers: (() => void)[] = [];
  const ancestorSubscriptions = new Map<EventTarget, () => void>();
  let clippingAncestors: readonly Element[] = Object.freeze([]);
  let resizeObserver: ResizeObserver | undefined;
  let layoutObserver: IntersectionObserver | undefined;
  let frame: number | ReturnType<typeof setTimeout> | undefined;
  let frameKind: 'raf' | 'timeout' | undefined;
  let connected = false;
  let generation = 0;
  let anchorName: string | undefined;

  const cancelFrame = (): void => {
    if (frame === undefined) return;
    if (frameKind === 'raf') view.cancelAnimationFrame(frame as number);
    else clearTimeout(frame as ReturnType<typeof setTimeout>);
    frame = undefined;
    frameKind = undefined;
    diagnostics.pendingFrames = 0;
  };

  const schedule = (): void => {
    if (!connected || route === 'css-anchor') return;
    if (frame !== undefined) {
      diagnostics.coalescedUpdates += 1;
      return;
    }
    const expectedGeneration = generation;
    diagnostics.scheduledUpdates += 1;
    const run = (): void => {
      frame = undefined;
      frameKind = undefined;
      diagnostics.pendingFrames = 0;
      if (!connected || generation !== expectedGeneration) {
        diagnostics.staleUpdates += 1;
        return;
      }
      updateJavaScript();
      if (connected && options.tracking === 'animation-frame') schedule();
    };
    if (typeof view.requestAnimationFrame === 'function') {
      frameKind = 'raf';
      frame = view.requestAnimationFrame(run);
    } else {
      frameKind = 'timeout';
      frame = setTimeout(run, 0);
    }
    diagnostics.pendingFrames = 1;
  };

  const updateJavaScript = (): void => {
    const measurement = measure(options, clippingAncestors, diagnostics);
    if (measurement === null) {
      writeStyle(ownedStyles, options.root, 'visibility', 'hidden', diagnostics);
      return;
    }
    const layout = solveAnchoredLayout({
      reference: measurement.reference,
      floating: measurement.floating,
      boundary: measurement.boundary,
      ...(options.side === undefined ? {} : { side: options.side }),
      ...(options.align === undefined ? {} : { align: options.align }),
      offset: options.sideOffset ?? 8,
      padding: options.collisionPadding ?? 8,
      flip: request.flip,
      shift: request.shift,
      arrow: measurement.arrow,
      arrowPadding: options.arrowPadding ?? 8,
    });
    diagnostics.candidateCount += layout.candidateCount;
    projectJavaScript(options, layout, measurement, ownedStyles, ownedData, diagnostics);
    diagnostics.completedUpdates += 1;
    options.onLayout?.(layout);
    options.onPositioned?.();
  };

  const reconcileAncestors = (ancestors: DiscoveredAncestors): void => {
    const nextSources = new Set<EventTarget>(ancestors.sources);
    const added: Array<readonly [EventTarget, () => void]> = [];
    try {
      for (const source of ancestors.sources) {
        if (!ancestorSubscriptions.has(source)) added.push([source, subscribeSource(source, 'scroll', schedule)]);
      }
    } catch (error) {
      for (let index = added.length - 1; index >= 0; index -= 1) added[index]![1]();
      throw error;
    }
    for (const [source, dispose] of ancestorSubscriptions) {
      if (nextSources.has(source)) continue;
      dispose();
      ancestorSubscriptions.delete(source);
      diagnostics.sourceSubscriptions -= 1;
    }
    for (const [source, dispose] of added) {
      ancestorSubscriptions.set(source, dispose);
      diagnostics.sourceSubscriptions += 1;
    }
    clippingAncestors = ancestors.clipping;
    diagnostics.discoveredAncestors = ancestors.sources.length;
  };

  const connect = (): void => {
    if (connected) return;
    connected = true;
    generation += 1;
    if (route === 'css-anchor') {
      anchorName = `--sectile-anchor-${++anchorSequence}`;
      projectCSS(options, anchorName, ownedStyles, ownedData, diagnostics);
      diagnostics.completedUpdates += 1;
      options.onPositioned?.();
      return;
    }
    diagnostics.discoveryRuns += 1;
    reconcileAncestors(discoverOverflowAncestors(options.reference, options.root, view));
    disposers.push(subscribeSource(view, 'scroll', schedule));
    diagnostics.sourceSubscriptions += 1;
    disposers.push(subscribeSource(view, 'resize', schedule));
    diagnostics.sourceSubscriptions += 1;
    if (options.measureAnchorRect !== undefined) {
      disposers.push(subscribeSource(options.reference, 'scroll', schedule));
      diagnostics.sourceSubscriptions += 1;
      for (const event of ['input', 'select', 'compositionend'] as const) {
        options.reference.addEventListener(event, schedule);
        disposers.push(() => options.reference.removeEventListener(event, schedule));
        diagnostics.sourceSubscriptions += 1;
      }
    }
    const visualViewport = view.visualViewport;
    if (visualViewport != null) {
      disposers.push(subscribeSource(visualViewport, 'scroll', schedule));
      disposers.push(subscribeSource(visualViewport, 'resize', schedule));
      diagnostics.sourceSubscriptions += 2;
    }
    if (typeof view.ResizeObserver === 'function') {
      resizeObserver = new view.ResizeObserver(schedule);
      resizeObserver.observe(options.reference);
      resizeObserver.observe(options.root);
      if (options.collisionBoundary !== undefined && options.collisionBoundary !== 'viewport') resizeObserver.observe(options.collisionBoundary);
      diagnostics.resizeObservers = 1;
    }
    if (options.observeLayoutShift !== false && typeof view.IntersectionObserver === 'function') {
      layoutObserver = new view.IntersectionObserver(schedule);
      layoutObserver.observe(options.reference);
      diagnostics.layoutObservers = 1;
    }
    writeStyle(ownedStyles, options.root, 'position', options.strategy ?? 'absolute', diagnostics);
    if (options.arrow !== undefined) writeStyle(ownedStyles, options.arrow, 'position', 'absolute', diagnostics);
    if (options.root.style.left === '' && options.root.style.top === '') writeStyle(ownedStyles, options.root, 'visibility', 'hidden', diagnostics);
    schedule();
  };

  const disconnect = (): void => {
    if (!connected) return;
    connected = false;
    generation += 1;
    cancelFrame();
    for (const dispose of [...ancestorSubscriptions.values()].reverse()) dispose();
    ancestorSubscriptions.clear();
    for (let index = disposers.length - 1; index >= 0; index -= 1) disposers[index]!();
    disposers.length = 0;
    resizeObserver?.disconnect();
    resizeObserver = undefined;
    layoutObserver?.disconnect();
    layoutObserver = undefined;
    diagnostics.sourceSubscriptions = 0;
    diagnostics.resizeObservers = 0;
    diagnostics.layoutObservers = 0;
    clippingAncestors = Object.freeze([]);
    restoreOwned(ownedStyles, false);
    restoreOwned(ownedData, true);
    anchorName = undefined;
  };

  return Object.freeze({
    route,
    connect,
    update: (): void => {
      if (!connected) return;
      if (route === 'css-anchor') {
        if (anchorName !== undefined) projectCSS(options, anchorName, ownedStyles, ownedData, diagnostics);
        options.onPositioned?.();
      } else {
        diagnostics.discoveryRuns += 1;
        reconcileAncestors(discoverOverflowAncestors(options.reference, options.root, view));
        schedule();
      }
    },
    disconnect,
    diagnostics: (): PositionEngineDiagnostics => Object.freeze({ route, ...diagnostics }),
  });
}

function assertOptions(options: PositionEngineOptions): void {
  if (options.root.ownerDocument.defaultView === null) throw new TypeError('Positioning requires an attached DOM document with a Window.');
  assertPositionOptions(options);
}

/** Own only the four coordinates, never caller object identity or extra fields. */
export function snapshotPositionRect(value: Rect | null | undefined): Rect | undefined {
  if (value == null) return undefined;
  const { x, y, width, height } = value;
  if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(width) || !Number.isFinite(height)
    || width < 0 || height < 0) throw new TypeError('Position anchorRect requires finite coordinates and non-negative finite dimensions.');
  return Object.freeze({ x, y, width, height });
}

export function assertPositionOptions(options: Omit<PositionEngineOptions, 'root' | 'reference' | 'anchorRect'>): void {
  for (const key of ['avoidCollisions', 'flip', 'shift'] as const) {
    if (options[key] !== undefined && typeof options[key] !== 'boolean') throw new TypeError(`Position ${key} must be boolean.`);
  }
  if (!Number.isFinite(options.sideOffset ?? 8)) throw new TypeError('Position sideOffset must be finite.');
  if (!Number.isFinite(options.arrowPadding ?? 8) || (options.arrowPadding ?? 8) < 0) throw new TypeError('Position arrowPadding must be a non-negative finite number.');
  assertPadding(options.collisionPadding);
  if (options.side !== undefined && options.side !== 'top' && options.side !== 'right' && options.side !== 'bottom' && options.side !== 'left') throw new TypeError('Position side is invalid.');
  if (options.align !== undefined && options.align !== 'start' && options.align !== 'center' && options.align !== 'end') throw new TypeError('Position alignment is invalid.');
  if (options.strategy !== undefined && options.strategy !== 'absolute' && options.strategy !== 'fixed') throw new TypeError('Position strategy is invalid.');
  if (options.tracking !== undefined && options.tracking !== 'events' && options.tracking !== 'animation-frame') throw new TypeError('Position tracking mode is invalid.');
}

function assertPadding(value: number | Partial<Insets> | undefined): void {
  if (value === undefined) return;
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || value < 0) throw new TypeError('Position collisionPadding must be non-negative and finite.');
    return;
  }
  for (const side of ['top', 'right', 'bottom', 'left'] as const) {
    const padding = value[side];
    if (padding !== undefined && (!Number.isFinite(padding) || padding < 0)) throw new TypeError('Position collisionPadding must be non-negative and finite.');
  }
}

function subscribeSource(target: EventTarget, type: 'scroll' | 'resize', callback: () => void): () => void {
  const owner = type === 'scroll' ? scrollSources : resizeSources;
  let entry = owner.get(target);
  if (entry === undefined) {
    const callbacks = new Set<() => void>();
    const listener: EventListener = () => {
      registry.dispatches += 1;
      registry.affectedDispatches += callbacks.size;
      for (const notify of callbacks) notify();
    };
    entry = { callbacks, listener };
    owner.set(target, entry);
    target.addEventListener(type, listener, { passive: true });
    registry.physicalListeners += 1;
  }
  entry.callbacks.add(callback);
  registry.callbacks += 1;
  let active = true;
  return (): void => {
    if (!active) return;
    active = false;
    const current = owner.get(target);
    if (current === undefined || !current.callbacks.delete(callback)) return;
    registry.callbacks -= 1;
    if (current.callbacks.size > 0) return;
    target.removeEventListener(type, current.listener);
    owner.delete(target);
    registry.physicalListeners -= 1;
  };
}

function discoverOverflowAncestors(reference: Element, root: Element, view: Window): DiscoveredAncestors {
  const clipping: Element[] = [];
  const sources: Element[] = [];
  const clippingSeen = new Set<Element>();
  const sourceSeen = new Set<Element>();
  for (const [start, clipsRoot] of [[reference, false], [root, true]] as const) {
    let current: Element | null = parentElement(start);
    while (current !== null) {
      if (clipsOrScrolls(view.getComputedStyle(current))) {
        if (!sourceSeen.has(current)) {
          sourceSeen.add(current);
          sources.push(current);
        }
        if (clipsRoot && !clippingSeen.has(current)) {
          clippingSeen.add(current);
          clipping.push(current);
        }
      }
      current = parentElement(current);
    }
  }
  return Object.freeze({ clipping: Object.freeze(clipping), sources: Object.freeze(sources) });
}

function parentElement(element: Element): Element | null {
  if (element.parentElement !== null) return element.parentElement;
  const root = element.getRootNode();
  return 'host' in root && root.host !== null && typeof root.host === 'object' && 'ownerDocument' in root.host
    ? root.host as Element
    : null;
}

function clipsOrScrolls(style: CSSStyleDeclaration): boolean {
  return overflowValue(style.overflow) || overflowValue(style.overflowX) || overflowValue(style.overflowY);
}

function overflowValue(value: string): boolean {
  return value === 'auto' || value === 'scroll' || value === 'overlay' || value === 'hidden' || value === 'clip';
}

function initialStyle(value: string | undefined, initial: string): boolean {
  return value === undefined || value === '' || value === initial;
}

// Initial ancestor styles preserve the viewport containing block. A plain BODY
// can also be the native absolute offsetParent sentinel without owning that block.
function initialContainingBlockStyle(style: CSSStyleDeclaration, allowPositioned = false): boolean {
  return (allowPositioned || initialStyle(style.position, 'static')) && initialStyle(style.transform, 'none')
    && initialStyle(style.translate, 'none') && initialStyle(style.rotate, 'none') && initialStyle(style.scale, 'none')
    && initialStyle(style.perspective, 'none') && initialStyle(style.filter, 'none') && initialStyle(style.backdropFilter, 'none')
    && initialStyle(style.contain, 'none') && initialStyle(style.willChange, 'auto')
    && initialStyle(style.contentVisibility, 'visible') && initialStyle(style.containerType, 'normal');
}

function measure(options: PositionEngineOptions, ancestors: readonly Element[], diagnostics: MutableDiagnostics): Measurement | null {
  const view = options.root.ownerDocument.defaultView!;
  const dynamic = options.measureAnchorRect;
  const referenceRect = dynamic === undefined
    ? options.anchorRect ?? rect(options.reference.getBoundingClientRect())
    : snapshotPositionRect(dynamic());
  if (referenceRect === undefined) return null;
  const floatingRect = rect(options.root.getBoundingClientRect());
  let boundary = options.collisionBoundary !== undefined && options.collisionBoundary !== 'viewport'
    ? rect(options.collisionBoundary.getBoundingClientRect())
    : viewportRect(options.root.ownerDocument, view);
  diagnostics.measurementReads += options.anchorRect === undefined && dynamic === undefined ? 3 : 2;
  for (const ancestor of ancestors) {
    const clipped = intersectRects(boundary, rect(ancestor.getBoundingClientRect()));
    diagnostics.measurementReads += 1;
    boundary = clipped ?? Object.freeze({ x: boundary.x, y: boundary.y, width: 0, height: 0 });
  }
  let arrow: { readonly width: number; readonly height: number } | null = null;
  if (options.arrow !== undefined) {
    const measured = options.arrow.getBoundingClientRect();
    diagnostics.measurementReads += 1;
    arrow = Object.freeze({ width: measured.width, height: measured.height });
  }
  let offsetParent: Measurement['offsetParent'] = null;
  if ((options.strategy ?? 'absolute') === 'absolute') {
    const parent = options.root.offsetParent;
    diagnostics.measurementReads += 1;
    if (parent != null) {
      let initial = false;
      if (parent === options.root.ownerDocument.body) {
        initial = initialContainingBlockStyle(view.getComputedStyle(parent));
        diagnostics.measurementReads += 1;
      }
      if (initial) {
        offsetParent = Object.freeze({
          rect: Object.freeze({ x: -view.scrollX, y: -view.scrollY, width: 0, height: 0 }),
          scrollLeft: 0, scrollTop: 0, clientLeft: 0, clientTop: 0,
        });
      } else {
        offsetParent = Object.freeze({
          rect: rect(parent.getBoundingClientRect()),
          scrollLeft: parent.scrollLeft, scrollTop: parent.scrollTop,
          clientLeft: parent.clientLeft, clientTop: parent.clientTop,
        });
        diagnostics.measurementReads += 1;
      }
    }
  }
  return Object.freeze({
    reference: referenceRect,
    floating: Object.freeze({ width: floatingRect.width, height: floatingRect.height }),
    boundary,
    arrow,
    offsetParent,
    detached: !options.reference.isConnected || !options.root.isConnected,
  });
}

function rect(value: DOMRectReadOnly): Rect {
  return Object.freeze({ x: value.left, y: value.top, width: Math.max(0, value.width), height: Math.max(0, value.height) });
}

function projectJavaScript(
  options: PositionEngineOptions,
  layout: AnchoredLayout,
  measurement: Measurement,
  styles: Map<HTMLElement, Map<string, OwnedValue>>,
  data: Map<HTMLElement, Map<string, OwnedValue>>,
  diagnostics: MutableDiagnostics,
): void {
  let x = layout.rect.x;
  let y = layout.rect.y;
  if (measurement.offsetParent !== null) {
    x = x - measurement.offsetParent.rect.x + measurement.offsetParent.scrollLeft - measurement.offsetParent.clientLeft;
    y = y - measurement.offsetParent.rect.y + measurement.offsetParent.scrollTop - measurement.offsetParent.clientTop;
  }
  const hidden = measurement.detached || layout.referenceHidden;
  writeStyle(styles, options.root, 'position', options.strategy ?? 'absolute', diagnostics);
  writeStyle(styles, options.root, 'left', `${x}px`, diagnostics);
  writeStyle(styles, options.root, 'top', `${y}px`, diagnostics);
  writeStyle(styles, options.root, 'visibility', (options.hideWhenDetached ?? false) && hidden ? 'hidden' : '', diagnostics);
  writeStyle(styles, options.root, '--sectile-position-available-width', `${layout.availableSize.width}px`, diagnostics);
  writeStyle(styles, options.root, '--sectile-position-available-height', `${layout.availableSize.height}px`, diagnostics);
  writeStyle(styles, options.root, '--sectile-position-anchor-width', `${measurement.reference.width}px`, diagnostics);
  writeStyle(styles, options.root, '--sectile-position-anchor-height', `${measurement.reference.height}px`, diagnostics);
  writeData(data, options.root, 'positionRoute', 'javascript', diagnostics);
  writeData(data, options.root, 'side', layout.side, diagnostics);
  writeData(data, options.root, 'align', layout.align, diagnostics);
  writeData(data, options.root, 'referenceHidden', String(hidden), diagnostics);
  if (options.arrow !== undefined) {
    writeStyle(styles, options.arrow, 'position', 'absolute', diagnostics);
    writeData(data, options.arrow, 'side', layout.side, diagnostics);
    writeStyle(styles, options.arrow, 'left', layout.arrow === null ? '' : `${layout.arrow.x}px`, diagnostics);
    writeStyle(styles, options.arrow, 'top', layout.arrow === null ? '' : `${layout.arrow.y}px`, diagnostics);
    writeData(data, options.arrow, 'centerOffset', String(layout.arrow?.centerOffset ?? 0), diagnostics);
  }
}

function projectCSS(
  options: PositionEngineOptions,
  anchorName: string,
  styles: Map<HTMLElement, Map<string, OwnedValue>>,
  data: Map<HTMLElement, Map<string, OwnedValue>>,
  diagnostics: MutableDiagnostics,
): void {
  const side = options.side ?? 'bottom';
  const align = options.align ?? 'center';
  writeStyle(styles, options.reference, 'anchor-name', anchorName, diagnostics);
  writeStyle(styles, options.root, 'position-anchor', anchorName, diagnostics);
  writeStyle(styles, options.root, 'position', options.strategy ?? 'absolute', diagnostics);
  writeStyle(styles, options.root, 'position-area', side, diagnostics);
  writeStyle(styles, options.root, 'justify-self', 'normal', diagnostics);
  writeStyle(styles, options.root, 'align-self', 'normal', diagnostics);
  for (const inset of ['top', 'right', 'bottom', 'left'] as const) writeStyle(styles, options.root, inset, 'auto', diagnostics);
  const vertical = side === 'top' || side === 'bottom';
  const crossEdge = align === 'center' ? 'center' : vertical
    ? align === 'start' ? 'left' : 'right'
    : align === 'start' ? 'top' : 'bottom';
  writeStyle(styles, options.root, vertical ? 'left' : 'top', `anchor(${crossEdge})`, diagnostics);
  writeStyle(styles, options.root, side === 'top' ? 'bottom' : side === 'bottom' ? 'top' : side === 'left' ? 'right' : 'left', '0px', diagnostics);
  const crossTranslate = align === 'start' ? '0%' : align === 'center' ? '-50%' : '-100%';
  writeStyle(styles, options.root, 'translate', vertical ? `${crossTranslate} 0%` : `0% ${crossTranslate}`, diagnostics);
  writeStyle(styles, options.root, 'position-try-fallbacks', '', diagnostics);
  writeStyle(styles, options.root, 'position-visibility', (options.hideWhenDetached ?? false) ? 'anchors-visible' : '', diagnostics);
  writeStyle(styles, options.root, sideMargin(side), `${options.sideOffset ?? 8}px`, diagnostics);
  writeStyle(styles, options.root, '--sectile-position-anchor-width', 'anchor-size(width)', diagnostics);
  writeStyle(styles, options.root, '--sectile-position-anchor-height', 'anchor-size(height)', diagnostics);
  const padding = cssPadding(options.collisionPadding);
  const offset = options.sideOffset ?? 8;
  // Percentages resolve against the selected position area. anchor() itself is
  // invalid in max-width/max-height, including when substituted through var().
  const availableWidth = `max(0px, calc(100% - ${side === 'left' ? padding.left + offset
    : side === 'right' ? padding.right + offset : padding.left + padding.right}px))`;
  const availableHeight = `max(0px, calc(100% - ${side === 'top' ? padding.top + offset
    : side === 'bottom' ? padding.bottom + offset : padding.top + padding.bottom}px))`;
  writeStyle(styles, options.root, '--sectile-position-available-width', availableWidth, diagnostics);
  writeStyle(styles, options.root, '--sectile-position-available-height', availableHeight, diagnostics);
  writeData(data, options.root, 'positionRoute', 'css-anchor', diagnostics);
  writeData(data, options.root, 'side', side, diagnostics);
  writeData(data, options.root, 'align', align, diagnostics);
  writeData(data, options.root, 'referenceHidden', 'false', diagnostics);
}

function cssPadding(value: number | Partial<Insets> | undefined): Insets {
  if (typeof value === 'number') {
    return Object.freeze({ top: value, right: value, bottom: value, left: value });
  }
  return Object.freeze({
    top: value?.top ?? 8,
    right: value?.right ?? 8,
    bottom: value?.bottom ?? 8,
    left: value?.left ?? 8,
  });
}

function sideMargin(side: RectSide): string {
  if (side === 'top') return 'margin-bottom';
  if (side === 'right') return 'margin-left';
  if (side === 'bottom') return 'margin-top';
  return 'margin-right';
}

function writeStyle(
  owners: Map<HTMLElement, Map<string, OwnedValue>>,
  element: HTMLElement,
  property: string,
  value: string,
  diagnostics: MutableDiagnostics,
): void {
  let properties = owners.get(element);
  if (properties === undefined) {
    properties = new Map();
    owners.set(element, properties);
  }
  let owned = properties.get(property);
  if (owned === undefined) {
    owned = { previous: element.style.getPropertyValue(property), applied: '' };
    properties.set(property, owned);
  }
  element.style.setProperty(property, value);
  owned.applied = element.style.getPropertyValue(property);
  diagnostics.projectionWrites += 1;
}

function writeData(
  owners: Map<HTMLElement, Map<string, OwnedValue>>,
  element: HTMLElement,
  property: string,
  value: string,
  diagnostics: MutableDiagnostics,
): void {
  let properties = owners.get(element);
  if (properties === undefined) {
    properties = new Map();
    owners.set(element, properties);
  }
  let owned = properties.get(property);
  if (owned === undefined) {
    owned = { previous: element.dataset[property] ?? null, applied: value };
    properties.set(property, owned);
  } else owned.applied = value;
  element.dataset[property] = value;
  diagnostics.projectionWrites += 1;
}

function restoreOwned(owners: Map<HTMLElement, Map<string, OwnedValue>>, dataset: boolean): void {
  for (const [element, properties] of owners) {
    for (const [property, owned] of properties) {
      const current = dataset ? element.dataset[property] ?? '' : element.style.getPropertyValue(property);
      if (current !== owned.applied) continue;
      if (dataset) {
        if (owned.previous === null) delete element.dataset[property];
        else element.dataset[property] = owned.previous;
      } else if (owned.previous === null || owned.previous === '') element.style.removeProperty(property);
      else element.style.setProperty(property, owned.previous);
    }
  }
  owners.clear();
}
