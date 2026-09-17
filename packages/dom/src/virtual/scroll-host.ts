import type { VirtualScrollport, VirtualizerEnvironment } from './contracts.js';
import type { VirtualInsets, VirtualPoint } from '@sectile/virtual/layout';
import type { VirtualSurfaceFrame } from '@sectile/virtual/surface';
import { createVirtualSurfaceFrame } from '@sectile/virtual/surface';

export type VirtualScrollHost = readonly [
  ownerDocument: Document,
  scrollport: VirtualScrollport,
  geometryTarget: HTMLElement | null,
  view: Window | null,
  scrollElement: Element,
  viewportElement: Element,
  surface: HTMLElement,
];

export function createScrollHost(
  scrollport: VirtualScrollport,
  surface: HTMLElement,
): VirtualScrollHost {
  const document = (scrollport as { readonly nodeType?: unknown }).nodeType === 9
    ? scrollport as Document
    : (scrollport as HTMLElement).ownerDocument;
  const element = scrollport === document ? null : scrollport as HTMLElement;
  requireOwned(surface, document);
  if (element === surface) throw new TypeError('distinct elements');
  const view = element === null ? document.defaultView : null;
  const scrollingElement = element ?? document.scrollingElement;
  if (scrollingElement === null || (element === null && view === null)) {
    throw new TypeError('browser view and scrolling element');
  }
  const root = element ?? document.documentElement;
  if (
    element === null
    && (surface === scrollingElement || surface === root || surface === document.body)
  ) throw new TypeError('distinct physical owners');
  return [document, scrollport, element, view, scrollingElement, root, surface];
}

export function readHostSurfaceFrame(
  host: VirtualScrollHost,
  viewportInsets: VirtualInsets,
): VirtualSurfaceFrame {
  const scroll = host[4];
  const surfaceRect = host[6].getBoundingClientRect();
  const geometry = host[2];
  const scrollportRect = geometry?.getBoundingClientRect();
  return createVirtualSurfaceFrame({
    origin: {
      x: surfaceRect.left
        - (scrollportRect?.left ?? 0)
        - Math.max(0, finiteOrZero(geometry?.clientLeft))
        + finiteOrZero(scroll.scrollLeft),
      y: surfaceRect.top
        - (scrollportRect?.top ?? 0)
        - Math.max(0, finiteOrZero(geometry?.clientTop))
        + finiteOrZero(scroll.scrollTop),
    },
    viewportInsets,
  });
}

export function clampHostScroll(
  host: VirtualScrollHost,
  point: VirtualPoint,
): VirtualPoint {
  const scrollport = host[2];
  const maxX = scrollport !== null
    && finiteNonNegative(scrollport.scrollWidth)
    && finiteNonNegative(scrollport.clientWidth)
    ? Math.max(0, scrollport.scrollWidth - scrollport.clientWidth)
    : null;
  const maxY = scrollport !== null
    && finiteNonNegative(scrollport.scrollHeight)
    && finiteNonNegative(scrollport.clientHeight)
    ? Math.max(0, scrollport.scrollHeight - scrollport.clientHeight)
    : null;
  return Object.freeze({
    x: maxX === null ? Math.max(0, point.x) : Math.min(Math.max(0, point.x), maxX),
    y: maxY === null ? Math.max(0, point.y) : Math.min(Math.max(0, point.y), maxY),
  });
}

export function requireOwned(element: HTMLElement, ownerDocument: Document): void {
  if (element.ownerDocument && element.ownerDocument !== ownerDocument) {
    throw new TypeError('scrollport document');
  }
}

function finiteNonNegative(value: unknown): value is number {
  return typeof value === 'number'
    && Number.isFinite(value)
    && value >= 0;
}

function finiteOrZero(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

export function browserEnvironment(ownerDocument: Document): VirtualizerEnvironment {
  const view = ownerDocument.defaultView;
  if (view === null || typeof view.ResizeObserver !== 'function') {
    throw new TypeError('ResizeObserver');
  }
  return {
    requestFrame: view.requestAnimationFrame.bind(view),
    cancelFrame: view.cancelAnimationFrame.bind(view),
    createResizeObserver: (callback: ResizeObserverCallback): ResizeObserver =>
      new view.ResizeObserver(callback),
  };
}
