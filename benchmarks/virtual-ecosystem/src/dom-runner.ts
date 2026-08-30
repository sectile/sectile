import type { MutationLocation } from './mutations.js';
export { waitForElement } from './dom-observation.js';
import {
  correctedTargetScroll,
  initialTargetScroll,
  intersectsViewportGeometry,
  sameTargetPositionGeometry,
  targetViewportOffset,
  type TargetPositionGeometry,
} from './target-position.js';

export interface FrameInspection<Failure> {
  readonly failures: readonly Failure[];
  readonly fingerprint: string;
}

export interface FrameSettlement<Failure> {
  readonly elapsedMs: number | null;
  readonly failures: readonly Failure[];
}

export interface FrameSettlementOptions<Failure> {
  readonly startedAt: number;
  readonly timeoutMs: number;
  readonly stableFailureMinMs: number;
  readonly stableFailureFrames: number;
  readonly observed?: () => boolean;
  readonly inspect: () => FrameInspection<Failure>;
  readonly failureKey: (failure: Failure) => string;
  readonly timeoutFailure: (last: FrameInspection<Failure> | undefined) => Failure;
}

export interface PositionTargetOptions {
  readonly scroller: HTMLElement;
  readonly root: ParentNode;
  readonly itemSelector: string;
  readonly targetID: string;
  readonly targetIndex: number;
  readonly itemCount: number;
  readonly targetWidth: number;
  readonly targetHeight: number;
  readonly location: MutationLocation;
  readonly horizontalProgress?: number;
  readonly targetViewportLeft?: number;
  readonly tolerance: number;
  readonly maximumFrames: number;
  readonly stableFrames: number;
}

export class TargetPositionError extends Error {
  readonly code = 'target-position' as const;

  constructor(message: string, readonly details: Readonly<Record<string, unknown>>) {
    super(message);
  }
}

export function waitForFrameSettlement<Failure>(
  options: FrameSettlementOptions<Failure>,
): Promise<FrameSettlement<Failure>> {
  return new Promise((resolve) => {
    let lastInspection: FrameInspection<Failure> | undefined;
    let lastFailureFingerprint: string | undefined;
    let stableFrames = 0;
    const observedFailures = new Map<string, Failure>();
    const frame = (): void => {
      const elapsed = performance.now() - options.startedAt;
      if (options.observed?.() ?? true) {
        const inspection = options.inspect();
        lastInspection = inspection;
        if (inspection.failures.length === 0) {
          resolve(Object.freeze({ elapsedMs: elapsed, failures: Object.freeze([...observedFailures.values()]) }));
          return;
        }
        if (inspection.fingerprint === lastFailureFingerprint) stableFrames += 1;
        else {
          lastFailureFingerprint = inspection.fingerprint;
          stableFrames = 1;
        }
        for (const failure of inspection.failures) {
          const key = options.failureKey(failure);
          if (!observedFailures.has(key)) observedFailures.set(key, failure);
        }
        if (elapsed >= options.stableFailureMinMs && stableFrames >= options.stableFailureFrames) {
          resolve(Object.freeze({ elapsedMs: null, failures: Object.freeze([...observedFailures.values()]) }));
          return;
        }
      }
      if (elapsed >= options.timeoutMs) {
        const timeout = options.timeoutFailure(lastInspection);
        observedFailures.set(options.failureKey(timeout), timeout);
        resolve(Object.freeze({ elapsedMs: null, failures: Object.freeze([...observedFailures.values()]) }));
        return;
      }
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  });
}

export async function positionBenchmarkTarget(options: PositionTargetOptions): Promise<void> {
  const desiredTop = targetViewportOffset(options.targetHeight, options.location, options.scroller.clientHeight);
  const desiredLeft = options.targetViewportLeft
    ?? targetViewportOffset(options.targetWidth, options.location, options.scroller.clientWidth);
  const scrollGeometry = () => ({
    targetIndex: options.targetIndex,
    itemCount: options.itemCount,
    scrollHeight: options.scroller.scrollHeight,
    targetHeight: options.targetHeight,
    location: options.location,
    viewportHeight: options.scroller.clientHeight,
  });
  let top = initialTargetScroll(scrollGeometry());
  let left = Math.max(0, options.scroller.scrollWidth - options.scroller.clientWidth)
    * Math.max(0, Math.min(1, options.horizontalProgress ?? 0));
  const trace: Array<Readonly<Record<string, unknown>>> = [];
  let previousGeometry: TargetPositionGeometry | undefined;
  let stableFrames = 0;
  for (let attempt = 0; attempt < options.maximumFrames; attempt += 1) {
    options.scroller.scrollLeft = left;
    options.scroller.scrollTop = top;
    options.scroller.dispatchEvent(new Event('scroll', { bubbles: true }));
    await nextFrame();
    const viewport = options.scroller.getBoundingClientRect();
    const target = Array.from(options.root.querySelectorAll<HTMLElement>(options.itemSelector))
      .find((candidate) => candidate.dataset['id'] === options.targetID && intersectsViewport(candidate, viewport, options.tolerance));
    if (target !== undefined) {
      const rect = target.getBoundingClientRect();
      const targetViewportLeft = rect.left - viewport.left;
      const targetViewportTop = rect.top - viewport.top;
      const horizontalSettled = options.scroller.scrollWidth <= options.scroller.clientWidth + options.tolerance
        || Math.abs(targetViewportLeft - desiredLeft) <= options.tolerance;
      if (horizontalSettled && Math.abs(targetViewportTop - desiredTop) <= options.tolerance) {
        const geometry = Object.freeze({
          scrollTop: options.scroller.scrollTop,
          scrollHeight: options.scroller.scrollHeight,
          targetViewportTop,
          targetHeight: rect.height,
          scrollLeft: options.scroller.scrollLeft,
          targetViewportLeft,
          targetWidth: rect.width,
        });
        stableFrames = previousGeometry !== undefined
          && sameTargetPositionGeometry(previousGeometry, geometry, options.tolerance)
          ? stableFrames + 1
          : 1;
        previousGeometry = geometry;
        if (stableFrames >= options.stableFrames) return;
        top = options.scroller.scrollTop;
        left = options.scroller.scrollLeft;
      } else {
        previousGeometry = undefined;
        stableFrames = 0;
        top = Math.max(0, options.scroller.scrollTop + targetViewportTop - desiredTop);
        left = Math.max(0, options.scroller.scrollLeft + targetViewportLeft - desiredLeft);
      }
      pushTrace(trace, {
        attempt,
        targetID: options.targetID,
        scrollTop: Math.round(options.scroller.scrollTop),
        scrollLeft: Math.round(options.scroller.scrollLeft),
        targetViewportTop: Math.round(targetViewportTop),
        targetViewportLeft: Math.round(targetViewportLeft),
        stableFrames,
      });
      continue;
    }
    previousGeometry = undefined;
    stableFrames = 0;
    const visible = Array.from(options.root.querySelectorAll<HTMLElement>(options.itemSelector))
      .map((element) => ({ element, index: Number(element.dataset['index']) }))
      .filter((entry) => Number.isInteger(entry.index) && intersectsViewport(entry.element, viewport, options.tolerance));
    pushTrace(trace, {
      attempt,
      targetID: options.targetID,
      scrollTop: Math.round(options.scroller.scrollTop),
      scrollLeft: Math.round(options.scroller.scrollLeft),
      minimumIndex: visible.length === 0 ? null : Math.min(...visible.map((entry) => entry.index)),
      maximumIndex: visible.length === 0 ? null : Math.max(...visible.map((entry) => entry.index)),
    });
    const reference = visible.sort((a, b) => (
      Math.abs(a.index - options.targetIndex) - Math.abs(b.index - options.targetIndex)
    ))[0];
    if (reference === undefined) {
      top = initialTargetScroll(scrollGeometry());
      continue;
    }
    top = correctedTargetScroll({
      ...scrollGeometry(),
      referenceIndex: reference.index,
      referenceViewportTop: reference.element.getBoundingClientRect().top - viewport.top,
      currentScrollTop: options.scroller.scrollTop,
    });
  }
  throw new TargetPositionError(
    `Could not position item ${options.targetIndex} in the viewport.`,
    Object.freeze({ trace: Object.freeze(trace) }),
  );
}

export function nextFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

function intersectsViewport(
  element: HTMLElement,
  viewport: DOMRect,
  tolerance: number,
): boolean {
  const rect = element.getBoundingClientRect();
  return intersectsViewportGeometry(rect.top, rect.bottom, viewport.top, viewport.bottom, tolerance)
    && intersectsViewportGeometry(rect.left, rect.right, viewport.left, viewport.right, tolerance);
}

function pushTrace(
  trace: Array<Readonly<Record<string, unknown>>>,
  entry: Readonly<Record<string, unknown>>,
): void {
  trace.push(Object.freeze(entry));
  if (trace.length > 8) trace.shift();
}
