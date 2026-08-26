import type { Extent, ExtentIndex } from '../extent-index.js';
import type { LinearFlow } from '../linear-layout.js';

export interface TrackRange { readonly start: number; readonly end: number; }

export function extentValue(extent: Extent): number {
  return extent.kind === 'unknown' ? extent.fallback : extent.value;
}

export function trackContentExtent(index: ExtentIndex, gap: number): number {
  return index.totalExtent + gap * Math.max(0, index.size - 1);
}

export function trackRange(index: ExtentIndex, gap: number, flow: LinearFlow, visualStart: number, visualEnd: number): TrackRange {
  const content = trackContentExtent(index, gap);
  const start = flow === 'forward' ? visualStart : Math.max(0, content - visualEnd);
  const end = flow === 'forward' ? visualEnd : Math.max(0, content - visualStart);
  if (gap === 0) return Object.freeze({ start: directRangeStart(index, start), end: directRangeEnd(index, end) });
  return Object.freeze({ start: firstIntersecting(index, gap, start), end: firstStartingAtOrAfter(index, gap, end) });
}

export function trackSpan(index: ExtentIndex, gap: number, flow: LinearFlow, start: number, span: number): { readonly start: number; readonly extent: number } | null {
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(span) || start < 0 || span < 1 || start + span > index.size) return null;
  const offset = index.offsetAt(start);
  const after = index.offsetAt(start + span);
  if (offset === null || after === null) return null;
  const extent = after - offset + gap * (span - 1);
  const logicalStart = offset + gap * start;
  const visualStart = flow === 'forward' ? logicalStart : trackContentExtent(index, gap) - logicalStart - extent;
  return Object.freeze({ start: visualStart, extent });
}

function firstIntersecting(index: ExtentIndex, gap: number, offset: number): number {
  let low = 0;
  let high = index.size;
  while (low < high) {
    const middle = (low + high) >>> 1;
    const start = (index.offsetAt(middle) ?? 0) + gap * middle;
    const extent = index.extentAt(middle);
    const value = extent === null ? 0 : extentValue(extent);
    if (start + value <= offset) low = middle + 1;
    else high = middle;
  }
  return low;
}

function directRangeStart(index: ExtentIndex, offset: number): number {
  if (offset <= 0) return 0;
  if (offset >= index.totalExtent) return index.size;
  return index.locateOffset(offset)?.index ?? index.size;
}

function directRangeEnd(index: ExtentIndex, offset: number): number {
  if (offset <= 0) return 0;
  if (offset >= index.totalExtent) return index.size;
  const location = index.locateOffset(offset);
  if (location === null) return index.size;
  return location.offsetWithin === 0 ? location.index : location.index + 1;
}

function firstStartingAtOrAfter(index: ExtentIndex, gap: number, offset: number): number {
  let low = 0;
  let high = index.size;
  while (low < high) {
    const middle = (low + high) >>> 1;
    const start = (index.offsetAt(middle) ?? 0) + gap * middle;
    if (start < offset) low = middle + 1;
    else high = middle;
  }
  return low;
}
