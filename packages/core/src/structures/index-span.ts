import { unwrap } from '../result.js';
import type { Result, SectileError } from '../shared.js';
import { fail, ok } from '../internal/kernel/foundation.js';

export interface IndexSpan {
  readonly start: number;
  readonly endExclusive: number;
}

export interface IndexSpanSet {
  readonly spans: readonly IndexSpan[];
  readonly spanCount: number;
  readonly coveredCount: number;
}

export interface IndexSpanOptions {
  readonly maxExclusive?: number;
  readonly maxSpans?: number;
}

export const DEFAULT_MAX_SPANS = 1_000_000;

interface SpanLimits {
  readonly maxExclusive: number;
  readonly maxSpans: number;
}

export function createIndexSpan(
  start: number,
  endExclusive: number,
  options: IndexSpanOptions = {},
): IndexSpan | null {
  return unwrap(tryCreateIndexSpan(start, endExclusive, options));
}

export function tryCreateIndexSpan(
  start: number,
  endExclusive: number,
  options: IndexSpanOptions = {},
): Result<IndexSpan | null> {
  const limits = trySpanLimits(options);
  if (!limits.ok) return limits;
  return checkedSpan(start, endExclusive, limits.value);
}

export function containsIndex(span: IndexSpan, index: number): boolean {
  return Number.isSafeInteger(index) && index >= span.start && index < span.endExclusive;
}

export function clampIndexSpan(span: IndexSpan, bounds: IndexSpan): IndexSpan | null {
  const start = Math.max(span.start, bounds.start);
  const endExclusive = Math.min(span.endExclusive, bounds.endExclusive);
  return start >= endExclusive ? null : Object.freeze({ start, endExclusive });
}

export function translateIndexSpan(
  span: IndexSpan,
  delta: number,
  options: IndexSpanOptions = {},
): IndexSpan {
  if (!Number.isSafeInteger(delta)) throwSpanOverflow(delta);
  const start = span.start + delta;
  const endExclusive = span.endExclusive + delta;
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(endExclusive)) throwSpanOverflow(delta);
  const translated = createIndexSpan(start, endExclusive, options);
  if (translated === null) throw new Error('Internal invariant breach: translation erased a non-empty span.');
  return translated;
}

/** Adjusts the start and end boundaries independently. Empty results normalize to null. */
export function resizeIndexSpan(
  span: IndexSpan,
  startDelta: number,
  endDelta: number,
  options: IndexSpanOptions = {},
): IndexSpan | null {
  if (!Number.isSafeInteger(startDelta) || !Number.isSafeInteger(endDelta)) {
    throwSpanOverflow(!Number.isSafeInteger(startDelta) ? startDelta : endDelta);
  }
  const start = span.start + startDelta;
  const endExclusive = span.endExclusive + endDelta;
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(endExclusive)) {
    throwSpanOverflow(!Number.isSafeInteger(start) ? startDelta : endDelta);
  }
  if (start > endExclusive) {
    return unwrap(fail('construction', 'invalid-boundary', 'resized start must not exceed endExclusive.', {
      start,
      endExclusive,
    }));
  }
  return createIndexSpan(start, endExclusive, options);
}

export function createIndexSpanSet(
  spans: readonly IndexSpan[],
  options: IndexSpanOptions = {},
): IndexSpanSet {
  return unwrap(tryCreateIndexSpanSet(spans, options));
}

export function tryCreateIndexSpanSet(
  spans: readonly IndexSpan[],
  options: IndexSpanOptions = {},
): Result<IndexSpanSet> {
  const limits = trySpanLimits(options);
  if (!limits.ok) return limits;
  if (spans.length > limits.value.maxSpans) return spanCeilingFailure(spans.length, limits.value.maxSpans);
  const snapshot: IndexSpan[] = [];
  for (const span of spans) {
    const error = validateSpanBounds(span.start, span.endExclusive, limits.value);
    if (error !== null) return { ok: false, error };
    if (span.start !== span.endExclusive) snapshot.push(span);
  }
  snapshot.sort(compareSpans);
  return normalizedSpanSet(snapshot, limits.value.maxSpans);
}

export function containsIndexInSpanSet(set: IndexSpanSet, index: number): boolean {
  if (!Number.isSafeInteger(index) || index < 0) return false;
  let low = 0;
  let high = set.spans.length - 1;
  while (low <= high) {
    const middle = low + ((high - low) >> 1);
    const span = set.spans[middle];
    if (span === undefined) return false;
    if (index < span.start) high = middle - 1;
    else if (index >= span.endExclusive) low = middle + 1;
    else return true;
  }
  return false;
}

export function unionIndexSpanSets(
  left: IndexSpanSet,
  right: IndexSpanSet,
  options: IndexSpanOptions = {},
): IndexSpanSet {
  const limits = unwrap(trySpanLimits(options));
  const output: IndexSpan[] = [];
  let leftIndex = 0;
  let rightIndex = 0;
  while (leftIndex < left.spans.length || rightIndex < right.spans.length) {
    const a = left.spans[leftIndex];
    const b = right.spans[rightIndex];
    if (b === undefined || (a !== undefined && compareSpans(a, b) <= 0)) {
      emitNormalized(output, a as IndexSpan, limits.maxSpans);
      leftIndex += 1;
    } else {
      emitNormalized(output, b, limits.maxSpans);
      rightIndex += 1;
    }
  }
  return freezeSpanSet(output);
}

export function intersectIndexSpanSets(
  left: IndexSpanSet,
  right: IndexSpanSet,
  options: IndexSpanOptions = {},
): IndexSpanSet {
  const limits = unwrap(trySpanLimits(options));
  const output: IndexSpan[] = [];
  let leftIndex = 0;
  let rightIndex = 0;
  while (leftIndex < left.spans.length && rightIndex < right.spans.length) {
    const a = left.spans[leftIndex] as IndexSpan;
    const b = right.spans[rightIndex] as IndexSpan;
    const overlap = clampIndexSpan(a, b);
    if (overlap !== null) emitNormalized(output, overlap, limits.maxSpans);
    if (a.endExclusive <= b.endExclusive) leftIndex += 1;
    else rightIndex += 1;
  }
  return freezeSpanSet(output);
}

export function subtractIndexSpanSets(
  left: IndexSpanSet,
  right: IndexSpanSet,
  options: IndexSpanOptions = {},
): IndexSpanSet {
  const limits = unwrap(trySpanLimits(options));
  const output: IndexSpan[] = [];
  let rightIndex = 0;
  for (const span of left.spans) {
    let cursor = span.start;
    while (rightIndex < right.spans.length && (right.spans[rightIndex] as IndexSpan).endExclusive <= cursor) {
      rightIndex += 1;
    }
    let scan = rightIndex;
    while (scan < right.spans.length) {
      const excluded = right.spans[scan] as IndexSpan;
      if (excluded.start >= span.endExclusive) break;
      if (excluded.start > cursor) {
        emitNormalized(output, Object.freeze({ start: cursor, endExclusive: Math.min(excluded.start, span.endExclusive) }), limits.maxSpans);
      }
      cursor = Math.max(cursor, excluded.endExclusive);
      if (cursor >= span.endExclusive) break;
      scan += 1;
    }
    if (cursor < span.endExclusive) {
      emitNormalized(output, Object.freeze({ start: cursor, endExclusive: span.endExclusive }), limits.maxSpans);
    }
    rightIndex = scan;
  }
  return freezeSpanSet(output);
}

export function clampIndexSpanSet(
  set: IndexSpanSet,
  bounds: IndexSpan,
  options: IndexSpanOptions = {},
): IndexSpanSet {
  const limits = unwrap(trySpanLimits(options));
  const output: IndexSpan[] = [];
  for (const span of set.spans) {
    if (span.endExclusive <= bounds.start) continue;
    if (span.start >= bounds.endExclusive) break;
    const overlap = clampIndexSpan(span, bounds);
    if (overlap !== null) emitNormalized(output, overlap, limits.maxSpans);
  }
  return freezeSpanSet(output);
}

export function translateIndexSpanSet(
  set: IndexSpanSet,
  delta: number,
  options: IndexSpanOptions = {},
): IndexSpanSet {
  const limits = unwrap(trySpanLimits(options));
  const output: IndexSpan[] = [];
  for (const span of set.spans) {
    emitNormalized(output, translateIndexSpan(span, delta, limits), limits.maxSpans);
  }
  return freezeSpanSet(output);
}

export function resizeIndexSpanSet(
  set: IndexSpanSet,
  startDelta: number,
  endDelta: number,
  options: IndexSpanOptions = {},
): IndexSpanSet {
  const limits = unwrap(trySpanLimits(options));
  const output: IndexSpan[] = [];
  for (const span of set.spans) {
    const resized = resizeIndexSpan(span, startDelta, endDelta, limits);
    if (resized !== null) emitNormalized(output, resized, limits.maxSpans);
  }
  return freezeSpanSet(output);
}

function trySpanLimits(options: IndexSpanOptions): Result<SpanLimits> {
  const maxExclusive = options.maxExclusive ?? Number.MAX_SAFE_INTEGER;
  const maxSpans = options.maxSpans ?? DEFAULT_MAX_SPANS;
  if (!Number.isSafeInteger(maxExclusive) || maxExclusive < 0) {
    return fail('construction', 'invalid-boundary', 'maxExclusive must be a non-negative safe integer.', { maxExclusive });
  }
  if (!Number.isSafeInteger(maxSpans) || maxSpans < 0) {
    return fail('construction', 'invalid-max-count', 'maxSpans must be a non-negative safe integer.', { maxSpans });
  }
  return ok(Object.freeze({ maxExclusive, maxSpans }));
}

function checkedSpan(start: number, endExclusive: number, limits: SpanLimits): Result<IndexSpan | null> {
  const error = validateSpanBounds(start, endExclusive, limits);
  if (error !== null) return { ok: false, error };
  return ok(start === endExclusive ? null : Object.freeze({ start, endExclusive }));
}

function validateSpanBounds(start: number, endExclusive: number, limits: SpanLimits): SectileError | null {
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(endExclusive) || start < 0 || start > endExclusive) {
    return {
      class: 'construction',
      code: 'invalid-boundary',
      message: 'span bounds must be non-negative safe integers with start <= endExclusive.',
      details: { start, endExclusive },
    };
  }
  if (endExclusive > limits.maxExclusive) {
    return {
      class: 'resource-rejection',
      code: 'count-ceiling-exceeded',
      message: 'span exceeds maxExclusive.',
      details: { endExclusive, maxExclusive: limits.maxExclusive },
    };
  }
  return null;
}

function normalizedSpanSet(spans: readonly IndexSpan[], maxSpans: number): Result<IndexSpanSet> {
  const output: IndexSpan[] = [];
  for (const span of spans) {
    if (output.length >= maxSpans && !canMergeLast(output, span)) return spanCeilingFailure(output.length + 1, maxSpans);
    emitNormalized(output, span, maxSpans);
  }
  return ok(freezeSpanSet(output));
}

function emitNormalized(output: IndexSpan[], span: IndexSpan, maxSpans: number): void {
  const last = output.at(-1);
  if (last !== undefined && span.start <= last.endExclusive) {
    if (span.endExclusive > last.endExclusive) {
      (last as { start: number; endExclusive: number }).endExclusive = span.endExclusive;
    }
    return;
  }
  if (output.length >= maxSpans) unwrap(spanCeilingFailure(output.length + 1, maxSpans));
  output.push({ start: span.start, endExclusive: span.endExclusive });
}

function canMergeLast(output: readonly IndexSpan[], span: IndexSpan): boolean {
  const last = output.at(-1);
  return last !== undefined && span.start <= last.endExclusive;
}

function freezeSpanSet(spans: IndexSpan[]): IndexSpanSet {
  for (const span of spans) Object.freeze(span);
  const frozenSpans = Object.freeze(spans);
  let coveredCount = 0;
  for (const span of frozenSpans) coveredCount += span.endExclusive - span.start;
  return Object.freeze({ spans: frozenSpans, spanCount: frozenSpans.length, coveredCount });
}

function spanCeilingFailure(count: number, maxSpans: number): Result<never> {
  return fail('resource-rejection', 'count-ceiling-exceeded', 'normalized span count exceeds maxSpans.', { count, maxSpans });
}

function throwSpanOverflow(delta: number): never {
  return unwrap(fail('resource-rejection', 'count-not-safe', 'span translation leaves the safe-integer domain.', { delta }));
}

function compareSpans(left: IndexSpan, right: IndexSpan): number {
  return left.start - right.start || left.endExclusive - right.endExclusive;
}
