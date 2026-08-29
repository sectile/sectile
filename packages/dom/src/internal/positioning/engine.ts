import {
  solveAnchoredLayout,
  type AnchoredLayout,
} from '@sectile/core/anchored-layout';
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
  readonly positionTryFallbacks: boolean;
  readonly positionVisibility: boolean;
  readonly anchorCenter: boolean;
}

export interface PositionEngineOptions {
  readonly root: HTMLElement;
  readonly reference: HTMLElement;
  readonly arrow?: HTMLElement;
  readonly side?: RectSide;
  readonly align?: RectAlign;
  readonly sideOffset?: number;
  readonly collisionPadding?: number | Partial<Insets>;
  readonly collisionBoundary?: 'viewport' | Element;
  readonly avoidCollisions?: boolean;
  readonly arrowPadding?: number;
  readonly hideWhenDetached?: boolean;
  readonly strategy?: PositionStrategy;
  readonly tracking?: PositionTracking;
  readonly observeLayoutShift?: boolean;
  readonly requiresLayoutObservables?: boolean;
  readonly capabilities?: PositionEngineCapabilities;
  readonly onLayout?: (layout: AnchoredLayout) => void;
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
    positionTryFallbacks: supports('position-try-fallbacks', 'flip-block'),
    positionVisibility: supports('position-visibility', 'anchors-visible'),
    anchorCenter: supports('justify-self', 'anchor-center'),
  });
}

export function selectPositionRoute(options: PositionEngineOptions): PositionRoute {
  const view = options.root.ownerDocument.defaultView;
  if (view === null || options.reference.ownerDocument !== options.root.ownerDocument) return 'javascript';
  const capabilities = options.capabilities ?? detectPositionEngineCapabilities(view);
  const complete = capabilities.anchorName
    && capabilities.positionAnchor
    && capabilities.positionArea
    && ((options.align ?? 'center') !== 'center' || capabilities.anchorCenter)
    && (!(options.avoidCollisions ?? true) || capabilities.positionTryFallbacks)
    && (!(options.hideWhenDetached ?? true) || capabilities.positionVisibility);
  const semantic = (options.collisionBoundary === undefined || options.collisionBoundary === 'viewport')
    && options.arrow === undefined
    && options.avoidCollisions === false
    && options.tracking !== 'animation-frame'
    && options.requiresLayoutObservables !== true
    && options.onLayout === undefined;
  return complete && semantic ? 'css-anchor' : 'javascript';
}

export function readPositionSourceRegistryDiagnostics(): PositionSourceRegistryDiagnostics {
  return Object.freeze({ ...registry });
}

export function createPositionEngine(options: PositionEngineOptions): PositionEngineConnection {
  assertOptions(options);
  const route = selectPositionRoute(options);
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
    const layout = solveAnchoredLayout({
      reference: measurement.reference,
      floating: measurement.floating,
      boundary: measurement.boundary,
      ...(options.side === undefined ? {} : { side: options.side }),
      ...(options.align === undefined ? {} : { align: options.align }),
      offset: options.sideOffset ?? 8,
      padding: options.collisionPadding ?? 8,
      flip: options.avoidCollisions ?? true,
      shift: options.avoidCollisions ?? true,
      arrow: measurement.arrow,
      arrowPadding: options.arrowPadding ?? 8,
    });
    diagnostics.candidateCount += layout.candidateCount;
    projectJavaScript(options, layout, measurement, ownedStyles, ownedData, diagnostics);
    diagnostics.completedUpdates += 1;
    options.onLayout?.(layout);
  };

  const connect = (): void => {
    if (connected) return;
    connected = true;
    generation += 1;
    if (route === 'css-anchor') {
      anchorName = `--sectile-anchor-${++anchorSequence}`;
      projectCSS(options, anchorName, ownedStyles, ownedData, diagnostics);
      diagnostics.completedUpdates += 1;
      return;
    }
    diagnostics.discoveryRuns += 1;
    clippingAncestors = discoverOverflowAncestors(options.reference, options.root, view);
    diagnostics.discoveredAncestors = clippingAncestors.length;
    const invalidate = (): void => schedule();
    const sources = new Set<EventTarget>([view, ...clippingAncestors]);
    for (const source of sources) {
      disposers.push(subscribeSource(source, 'scroll', invalidate));
      diagnostics.sourceSubscriptions += 1;
    }
    disposers.push(subscribeSource(view, 'resize', invalidate));
    diagnostics.sourceSubscriptions += 1;
    if (typeof view.ResizeObserver === 'function') {
      resizeObserver = new view.ResizeObserver(invalidate);
      resizeObserver.observe(options.reference);
      resizeObserver.observe(options.root);
      if (options.collisionBoundary !== undefined && options.collisionBoundary !== 'viewport') resizeObserver.observe(options.collisionBoundary);
      diagnostics.resizeObservers = 1;
    }
    if (options.observeLayoutShift !== false && typeof view.IntersectionObserver === 'function') {
      layoutObserver = new view.IntersectionObserver(invalidate);
      layoutObserver.observe(options.reference);
      diagnostics.layoutObservers = 1;
    }
    writeStyle(ownedStyles, options.root, 'position', options.strategy ?? 'absolute', diagnostics);
    if (options.root.style.left === '' && options.root.style.top === '') writeStyle(ownedStyles, options.root, 'visibility', 'hidden', diagnostics);
    schedule();
  };

  const disconnect = (): void => {
    if (!connected) return;
    connected = false;
    generation += 1;
    cancelFrame();
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
      } else schedule();
    },
    disconnect,
    diagnostics: (): PositionEngineDiagnostics => Object.freeze({ route, ...diagnostics }),
  });
}

function assertOptions(options: PositionEngineOptions): void {
  if (options.root.ownerDocument.defaultView === null) throw new TypeError('Positioning requires an attached DOM document with a Window.');
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

function discoverOverflowAncestors(reference: Element, root: Element, view: Window): readonly Element[] {
  const output: Element[] = [];
  const seen = new Set<Element>();
  for (const start of [reference, root]) {
    let current: Element | null = parentElement(start);
    while (current !== null) {
      if (!seen.has(current) && clipsOrScrolls(view.getComputedStyle(current))) {
        seen.add(current);
        output.push(current);
      }
      current = parentElement(current);
    }
  }
  return Object.freeze(output);
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

function measure(options: PositionEngineOptions, ancestors: readonly Element[], diagnostics: MutableDiagnostics): Measurement {
  const view = options.root.ownerDocument.defaultView!;
  const referenceRect = rect(options.reference.getBoundingClientRect());
  const floatingRect = rect(options.root.getBoundingClientRect());
  let boundary = options.collisionBoundary !== undefined && options.collisionBoundary !== 'viewport'
    ? rect(options.collisionBoundary.getBoundingClientRect())
    : viewportRect(options.root.ownerDocument, view);
  diagnostics.measurementReads += 3;
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
      offsetParent = Object.freeze({
        rect: rect(parent.getBoundingClientRect()),
        scrollLeft: parent.scrollLeft,
        scrollTop: parent.scrollTop,
        clientLeft: parent.clientLeft,
        clientTop: parent.clientTop,
      });
      diagnostics.measurementReads += 1;
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

function viewportRect(document: Document, view: Window): Rect {
  const viewport = view.visualViewport;
  return viewport == null
    ? Object.freeze({ x: 0, y: 0, width: document.documentElement.clientWidth, height: document.documentElement.clientHeight })
    : Object.freeze({ x: viewport.offsetLeft, y: viewport.offsetTop, width: viewport.width, height: viewport.height });
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
  writeStyle(styles, options.root, 'visibility', (options.hideWhenDetached ?? true) && hidden ? 'hidden' : '', diagnostics);
  writeStyle(styles, options.root, '--sectile-position-available-width', `${layout.availableSize.width}px`, diagnostics);
  writeStyle(styles, options.root, '--sectile-position-available-height', `${layout.availableSize.height}px`, diagnostics);
  writeStyle(styles, options.root, '--sectile-position-anchor-width', `${measurement.reference.width}px`, diagnostics);
  writeStyle(styles, options.root, '--sectile-position-anchor-height', `${measurement.reference.height}px`, diagnostics);
  writeData(data, options.root, 'positionRoute', 'javascript', diagnostics);
  writeData(data, options.root, 'side', layout.side, diagnostics);
  writeData(data, options.root, 'align', layout.align, diagnostics);
  writeData(data, options.root, 'referenceHidden', String(hidden), diagnostics);
  if (options.arrow !== undefined) {
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
  writeStyle(styles, options.root, 'justify-self', align === 'center' ? 'anchor-center' : align, diagnostics);
  writeStyle(styles, options.root, 'position-try-fallbacks', (options.avoidCollisions ?? true) ? 'flip-block, flip-inline' : '', diagnostics);
  writeStyle(styles, options.root, 'position-visibility', (options.hideWhenDetached ?? true) ? 'anchors-visible' : '', diagnostics);
  writeStyle(styles, options.root, sideMargin(side), `${options.sideOffset ?? 8}px`, diagnostics);
  writeStyle(styles, options.root, '--sectile-position-anchor-width', 'anchor-size(width)', diagnostics);
  writeStyle(styles, options.root, '--sectile-position-anchor-height', 'anchor-size(height)', diagnostics);
  const padding = cssPadding(options.collisionPadding);
  const offset = options.sideOffset ?? 8;
  const availableWidth = side === 'left'
    ? `max(0px, calc(anchor(left) - ${padding.left + offset}px))`
    : side === 'right'
      ? `max(0px, calc(100vw - anchor(right) - ${padding.right + offset}px))`
      : `max(0px, calc(100vw - ${padding.left + padding.right}px))`;
  const availableHeight = side === 'top'
    ? `max(0px, calc(anchor(top) - ${padding.top + offset}px))`
    : side === 'bottom'
      ? `max(0px, calc(100vh - anchor(bottom) - ${padding.bottom + offset}px))`
      : `max(0px, calc(100vh - ${padding.top + padding.bottom}px))`;
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
    owned = { previous: element.style.getPropertyValue(property), applied: value };
    properties.set(property, owned);
  } else owned.applied = value;
  element.style.setProperty(property, value);
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
