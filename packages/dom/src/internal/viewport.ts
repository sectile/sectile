import type { Rect } from '@sectile/core/geometry';

/** Native visible box in layout-viewport CSS coordinates. No allocation policy. */
export function readViewportRect(document: Document, view: Window): Rect {
  const viewport = view.visualViewport;
  return viewport == null
    ? Object.freeze({ x: 0, y: 0, width: document.documentElement.clientWidth, height: document.documentElement.clientHeight })
    : Object.freeze({ x: viewport.offsetLeft, y: viewport.offsetTop, width: viewport.width, height: viewport.height });
}
