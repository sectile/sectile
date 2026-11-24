import type { Rect } from '@sectile/core/geometry';
import { gestureParent } from '../interaction/gesture.js';

/** Native visible box in layout-viewport CSS coordinates. No allocation policy. */
export function readViewportRect(document: Document, view: Window): Rect {
  const viewport = view.visualViewport;
  return viewport == null
    ? Object.freeze({ x: 0, y: 0, width: document.documentElement.clientWidth, height: document.documentElement.clientHeight })
    : Object.freeze({ x: viewport.offsetLeft, y: viewport.offsetTop, width: viewport.width, height: viewport.height });
}

/** Cumulative conversion from local CSS units to viewport units. */
export function readAxisAlignedScale(
  element: Element, view: Window | null | undefined = element.ownerDocument?.defaultView,
): { readonly x: number; readonly y: number; readonly styleReads: number } {
  const Matrix = (view as (Window & typeof globalThis) | null | undefined)?.DOMMatrixReadOnly;
  let x = 1, y = 1, styleReads = 0;
  if (view != null) for (let current: Element | null = element; current !== null; current = gestureParent(current)) {
    const style = view.getComputedStyle(current);
    styleReads += 1;
    if ((hasTransform(style.rotate) && style.rotate !== '0deg') || hasTransform(style.perspective)) return unscaled(styleReads);
    if (hasTransform(style.transform)) {
      if (Matrix === undefined) return unscaled(styleReads);
      const matrix = new Matrix(style.transform);
      if (!matrix.is2D || matrix.b !== 0 || matrix.c !== 0 || matrix.a <= 0 || matrix.d <= 0) return unscaled(styleReads);
      x *= matrix.a;
      y *= matrix.d;
    }
    if (hasTransform(style.scale)) {
      const [first, second = first, depth] = style.scale.split(/\s+/u);
      const sx = scaleValue(first), sy = scaleValue(second);
      if (depth !== undefined || !(sx > 0) || !(sy > 0)) return unscaled(styleReads);
      x *= sx;
      y *= sy;
    }
    const zoom = scaleValue(style.zoom);
    if (zoom > 0) { x *= zoom; y *= zoom; }
  }
  return Number.isFinite(x) && Number.isFinite(y) && x > 0 && y > 0 ? { x, y, styleReads } : unscaled(styleReads);
}

function unscaled(styleReads: number) { return { x: 1, y: 1, styleReads }; }

function hasTransform(value: string | undefined): boolean { return value !== undefined && value !== '' && value !== 'none'; }

function scaleValue(value: string | undefined): number {
  return value?.endsWith('%') ? Number.parseFloat(value) / 100 : Number(value);
}
