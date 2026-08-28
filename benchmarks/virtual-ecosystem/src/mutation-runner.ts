import { VIEWPORT_HEIGHT, type BenchmarkItem, type RowProfile } from './constants.js';
import type { ExpectedLayout, HeightOracle } from './fixture.js';
import {
  automaticMutableAdapters,
  mutableAdapters,
  type DynamicSizeMode,
  type HeightHandling,
  type MutableBenchmarkAdapter,
  type MutableMountedAdapter,
} from './mutable-adapters.js';
import {
  createMutationScenario,
  mutationLocations,
  mutationOperations,
  reverseMutationScenario,
  type MutationLocation,
  type MutationOperation,
  type MutationScenario,
} from './mutations.js';

export interface MutationFailure {
  readonly severity: 'failure' | 'fatal';
  readonly code: FailureCode;
  readonly message: string;
  readonly sample: number;
  readonly scrollTop: number;
  readonly details: Readonly<Record<string, unknown>>;
}

export interface MutationBenchmarkResult {
  readonly rowProfile: RowProfile;
  readonly library: string;
  readonly version: string;
  readonly stack: string;
  readonly sizeMode: DynamicSizeMode;
  readonly operation: MutationOperation;
  readonly location: MutationLocation;
  readonly medianMs: number | null;
  readonly p95Ms: number | null;
  readonly recoveryMedianMs: number | null;
  readonly recoveryP95Ms: number | null;
  readonly settledSamples: number;
  readonly correctSamples: number;
  readonly recoveredSamples: number;
  readonly failedSamples: number;
  readonly totalSamples: number;
  readonly heightHandling: HeightHandling;
  readonly samples: readonly MutationSampleRecord[];
  readonly failures: readonly MutationFailure[];
}

export interface MutationSampleRecord {
  readonly sample: number;
  readonly outcome: 'clean' | 'recovered' | 'failed';
  readonly elapsedMs: number | null;
  readonly failureCodes: readonly FailureCode[];
}

export interface MutationBenchmarkFilter {
  readonly sizeMode?: DynamicSizeMode;
  readonly operation?: MutationOperation;
  readonly location?: MutationLocation;
}

type FailureCode =
  | 'exception'
  | 'timeout'
  | 'duplicate-id'
  | 'unexpected-id'
  | 'row-order'
  | 'row-height'
  | 'row-gap'
  | 'row-overlap'
  | 'blank-viewport'
  | 'scroll-height'
  | 'scroll-anchor';

interface Anchor {
  readonly id: string;
  readonly viewportOffset: number;
}

interface LayoutInspection {
  readonly failures: readonly Omit<MutationFailure, 'severity' | 'sample' | 'scrollTop'>[];
  readonly rows: readonly RowGeometry[];
}

interface RowGeometry {
  readonly id: string;
  readonly index: number;
  readonly top: number;
  readonly bottom: number;
  readonly height: number;
}

interface RawScenarioResult {
  readonly samples: number[];
  readonly recoverySamples: number[];
  readonly outcomes: MutationSampleRecord[];
  readonly failures: MutationFailure[];
}

interface SampleOutcome {
  readonly elapsedMs: number | null;
  readonly failures: readonly MutationFailure[];
}

const QUICK_RUN = new URLSearchParams(window.location.search).has('quick');
const mutationSearch = new URLSearchParams(window.location.search);
const MUTATION_ROUNDS = positiveInteger(mutationSearch.get('mutation-rounds')) ?? (QUICK_RUN ? 1 : 5);
const SAMPLES_PER_ROUND = positiveInteger(mutationSearch.get('mutation-samples')) ?? (QUICK_RUN ? 1 : 10);
const GOOD_RECOVERY_MS = 200;
const FRAME_TIMEOUT_MS = 500;
const STABLE_FAILURE_MIN_MS = 300;
const STABLE_FAILURE_FRAMES = 8;
const GEOMETRY_TOLERANCE_PX = 2;

export const mutationConditions = Object.freeze({
  rounds: MUTATION_ROUNDS,
  samplesPerRound: SAMPLES_PER_ROUND,
  samplesPerScenario: MUTATION_ROUNDS * SAMPLES_PER_ROUND,
  goodRecoveryMs: GOOD_RECOVERY_MS,
  frameTimeoutMs: FRAME_TIMEOUT_MS,
  stableFailureMinMs: STABLE_FAILURE_MIN_MS,
  stableFailureFrames: STABLE_FAILURE_FRAMES,
  geometryTolerancePx: GEOMETRY_TOLERANCE_PX,
  lifecycle: 'five independent mounts; each mount runs ten measured mutations and restores a correct initial collection between samples',
  completion: 'first animation frame with correct DOM order, row geometry, viewport coverage, and anchor position; exact total height is required for uniform rows and recorded as estimation quality for heterogeneous rows',
  recovery: 'every frame after the mutation becomes observable is checked; recovery within 200ms is responsive, recovery from 200ms through 500ms is slow, and no correct frame within 500ms is a hard failure; an unchanged incorrect layout can fail earlier at the stable-failure threshold',
});

export async function runMutationBenchmarks(
  host: HTMLElement,
  onProgress: (message: string) => void,
  rowProfile: RowProfile,
  oracle: HeightOracle,
  libraries?: readonly string[],
  filter: MutationBenchmarkFilter = {},
): Promise<readonly MutationBenchmarkResult[]> {
  const libraryAdapters = libraries === undefined
    ? [...mutableAdapters, ...automaticMutableAdapters]
    : [...mutableAdapters, ...automaticMutableAdapters].filter((adapter) => libraries.includes(adapter.name));
  const selectedAdapters = libraryAdapters.filter((adapter) => (
    filter.sizeMode === undefined || adapter.sizeMode === filter.sizeMode
  ));
  const scenarios = mutationOperations
    .filter((operation) => filter.operation === undefined || operation === filter.operation)
    .flatMap((operation) => mutationLocations
      .filter((location) => filter.location === undefined || location === filter.location)
      .map((location) => createMutationScenario(operation, location, rowProfile, oracle)));
  const raw = new Map<string, RawScenarioResult>();
  const total = selectedAdapters.length * scenarios.length * MUTATION_ROUNDS * SAMPLES_PER_ROUND;
  let completed = 0;

  for (let round = 0; round < MUTATION_ROUNDS; round += 1) {
    const adapterOrder = rotate(selectedAdapters, round * 3);
    const scenarioOrder = rotate(scenarios, round * 5);
    for (const adapter of adapterOrder) {
      for (const scenario of scenarioOrder) {
        const key = resultKey(adapter, scenario);
        const result = raw.get(key) ?? { samples: [], recoverySamples: [], outcomes: [], failures: [] };
        raw.set(key, result);
        const roundOutcomes = await runMutationRound(adapter, scenario, host, (localSample) => {
          const sample = round * SAMPLES_PER_ROUND + localSample + 1;
          completed += 1;
          onProgress(`Mutation ${completed}/${total} · ${adapter.name} · ${adapter.sizeMode} · ${scenario.operation}/${scenario.location}`);
          return sample;
        });
        await nextFrame();
        await new Promise((resolve) => setTimeout(resolve, 50));
        for (const { sample, outcome } of roundOutcomes) {
          if (outcome.elapsedMs !== null) result.samples.push(outcome.elapsedMs);
          if (outcome.elapsedMs !== null && outcome.failures.length > 0) result.recoverySamples.push(outcome.elapsedMs);
          result.outcomes.push(Object.freeze({
            sample,
            outcome: outcome.elapsedMs === null ? 'failed' : outcome.failures.length === 0 ? 'clean' : 'recovered',
            elapsedMs: outcome.elapsedMs,
            failureCodes: Object.freeze([...new Set(outcome.failures.map((failure) => failure.code))]),
          }));
          result.failures.push(...outcome.failures);
        }
      }
    }
  }

  return Object.freeze(selectedAdapters.flatMap((adapter) => scenarios.map((scenario) => {
    const collected = raw.get(resultKey(adapter, scenario)) ?? { samples: [], recoverySamples: [], outcomes: [], failures: [] };
    const sorted = [...collected.samples].sort((left, right) => left - right);
    const recoveries = [...collected.recoverySamples].sort((left, right) => left - right);
    const correctSamples = collected.outcomes.filter((sample) => sample.outcome === 'clean').length;
    const recoveredSamples = collected.outcomes.filter((sample) => sample.outcome === 'recovered').length;
    const failedSamples = collected.outcomes.filter((sample) => sample.outcome === 'failed').length;
    return Object.freeze({
      rowProfile,
      library: adapter.name,
      version: adapter.version,
      stack: adapter.stack,
      sizeMode: adapter.sizeMode,
      operation: scenario.operation,
      location: scenario.location,
      medianMs: sorted.length === 0 ? null : round(percentile(sorted, 0.5)),
      p95Ms: sorted.length === 0 ? null : round(percentile(sorted, 0.95)),
      recoveryMedianMs: recoveries.length === 0 ? null : round(percentile(recoveries, 0.5)),
      recoveryP95Ms: recoveries.length === 0 ? null : round(percentile(recoveries, 0.95)),
      settledSamples: sorted.length,
      correctSamples,
      recoveredSamples,
      failedSamples,
      totalSamples: MUTATION_ROUNDS * SAMPLES_PER_ROUND,
      heightHandling: adapter.heightHandling,
      samples: Object.freeze(collected.outcomes),
      failures: Object.freeze(collected.failures),
    });
  })));
}

async function runMutationRound(
  adapter: MutableBenchmarkAdapter,
  scenario: MutationScenario,
  host: HTMLElement,
  beginSample: (localSample: number) => number,
): Promise<readonly { readonly sample: number; readonly outcome: SampleOutcome }[]> {
  host.replaceChildren();
  let mounted: MutableMountedAdapter | undefined;
  const outcomes: { sample: number; outcome: SampleOutcome }[] = [];
  try {
    mounted = adapter.mount(host, scenario.initialItems, scenario.rowProfile);
    await waitForElement(host, '.bench-scroller');
    await waitForRows(host);
    for (let localSample = 0; localSample < SAMPLES_PER_ROUND; localSample += 1) {
      const sample = beginSample(localSample);
      const execution = await runMountedMutationSample(adapter, mounted, scenario, host, sample);
      outcomes.push(Object.freeze({ sample, outcome: execution.outcome }));
      if (localSample === SAMPLES_PER_ROUND - 1 || !execution.didMutate) continue;
      if (execution.outcome.elapsedMs === null) {
        mounted.unmount();
        host.replaceChildren();
        await nextFrame();
        await new Promise((resolve) => setTimeout(resolve, 50));
        mounted = adapter.mount(host, scenario.initialItems, scenario.rowProfile);
        await waitForElement(host, '.bench-scroller');
        await waitForRows(host);
        continue;
      }
      const reset = reverseMutationScenario(scenario);
      mounted.update(scenario.initialItems, reset);
      const resetSucceeded = await waitForInitialLayout(
        mounted.scroller,
        scenario,
        scenario.rowProfile === 'uniform' && adapter.sizeMode !== 'automatic',
      );
      if (resetSucceeded) continue;
      mounted.unmount();
      host.replaceChildren();
      await nextFrame();
      await new Promise((resolve) => setTimeout(resolve, 50));
      mounted = adapter.mount(host, scenario.initialItems, scenario.rowProfile);
      await waitForElement(host, '.bench-scroller');
      await waitForRows(host);
    }
    return Object.freeze(outcomes);
  } catch (error) {
    for (let localSample = outcomes.length; localSample < SAMPLES_PER_ROUND; localSample += 1) {
      const sample = beginSample(localSample);
      outcomes.push(Object.freeze({
        sample,
        outcome: Object.freeze({
          elapsedMs: null,
          failures: Object.freeze([Object.freeze({
            severity: adapter.name === 'Sectile Virtual' ? 'fatal' : 'failure',
            code: 'exception' as const,
            message: error instanceof Error ? error.message : String(error),
            sample,
            scrollTop: 0,
            details: Object.freeze({ stack: error instanceof Error ? error.stack : undefined }),
          })]),
        }),
      }));
    }
    return Object.freeze(outcomes);
  } finally {
    mounted?.unmount();
    host.replaceChildren();
  }
}

async function runMountedMutationSample(
  adapter: MutableBenchmarkAdapter,
  mounted: MutableMountedAdapter,
  scenario: MutationScenario,
  host: HTMLElement,
  sample: number,
): Promise<{ readonly outcome: SampleOutcome; readonly didMutate: boolean }> {
  const scroller = mounted.scroller;
  let didMutate = false;
  try {
    await positionScenario(scroller, scenario, host);
    const initialIndex = indexByID(scenario.initialItems);
    const initialInspection = inspectLayout(
      scroller,
      initialIndex,
      scenario.initialLayout,
      scenario.initialTotalHeight,
      undefined,
      scenario.rowProfile === 'uniform' && adapter.sizeMode !== 'automatic',
    );
    if (initialInspection.failures.length > 0) {
      return Object.freeze({
        didMutate: false,
        outcome: Object.freeze({ elapsedMs: null, failures: [makeFailure(adapter, sample, scroller, initialInspection.failures[0]!)] }),
      });
    }
    const nextIndex = indexByID(scenario.nextItems);
    const expectedScrollHeight = scenario.nextTotalHeight;
    const anchor = captureAnchor(scroller, initialInspection.rows, initialIndex, nextIndex, scenario);
    if (anchor === undefined) {
      return Object.freeze({
        didMutate: false,
        outcome: Object.freeze({
          elapsedMs: null,
          failures: [makeFailure(adapter, sample, scroller, {
            code: 'scroll-anchor', message: 'No unaffected visible row was available as a scroll anchor.', details: {},
          })],
        }),
      });
    }
    const startedAt = performance.now();
    didMutate = true;
    mounted.update(scenario.nextItems, scenario);
    const outcome = await waitForCorrectMutation({
      adapter,
      scenario,
      sample,
      scroller,
      host,
      nextIndex,
      expectedScrollHeight,
      anchor,
      startedAt,
    });
    return Object.freeze({ didMutate: true, outcome });
  } catch (error) {
    return Object.freeze({
      didMutate,
      outcome: Object.freeze({ elapsedMs: null, failures: [Object.freeze({
        severity: adapter.name === 'Sectile Virtual' ? 'fatal' : 'failure',
        code: 'exception',
        message: error instanceof Error ? error.message : String(error),
        sample,
        scrollTop: scroller.scrollTop,
        details: Object.freeze({ stack: error instanceof Error ? error.stack : undefined }),
      })] }),
    });
  }
}

interface WaitOptions {
  readonly adapter: MutableBenchmarkAdapter;
  readonly scenario: MutationScenario;
  readonly sample: number;
  readonly scroller: HTMLElement;
  readonly host: HTMLElement;
  readonly nextIndex: ReadonlyMap<string, number>;
  readonly expectedScrollHeight: number;
  readonly anchor: Anchor | undefined;
  readonly startedAt: number;
}

function waitForCorrectMutation(options: WaitOptions): Promise<SampleOutcome> {
  return new Promise((resolve) => {
    let lastInspection: LayoutInspection | undefined;
    let lastFailureFingerprint: string | undefined;
    let stableFailureFrames = 0;
    const observedFailures = new Map<FailureCode, MutationFailure>();
    const frame = (): void => {
      const elapsed = performance.now() - options.startedAt;
      const observed = mutationObserved(options.host, options.scenario, options.nextIndex);
      if (observed) {
        const inspection = inspectLayout(
          options.scroller,
          options.nextIndex,
          options.scenario.nextLayout,
          options.expectedScrollHeight,
          options.anchor,
          options.scenario.rowProfile === 'uniform' && options.adapter.sizeMode !== 'automatic',
        );
        lastInspection = inspection;
        if (inspection.failures.length === 0) {
          resolve(Object.freeze({ elapsedMs: round(elapsed), failures: Object.freeze([...observedFailures.values()]) }));
          return;
        }
        const fingerprint = failureFingerprint(inspection, options.scroller);
        if (fingerprint === lastFailureFingerprint) stableFailureFrames += 1;
        else {
          lastFailureFingerprint = fingerprint;
          stableFailureFrames = 1;
        }
        for (const failure of inspection.failures) {
          if (!observedFailures.has(failure.code)) {
            observedFailures.set(failure.code, makeFailure(options.adapter, options.sample, options.scroller, failure));
          }
        }
        if (elapsed >= STABLE_FAILURE_MIN_MS && stableFailureFrames >= STABLE_FAILURE_FRAMES) {
          resolve(Object.freeze({ elapsedMs: null, failures: Object.freeze([...observedFailures.values()]) }));
          return;
        }
      }
      if (elapsed >= FRAME_TIMEOUT_MS) {
        const details = lastInspection?.failures[0]?.details ?? describeRows(options.host);
        observedFailures.set('timeout', makeFailure(options.adapter, options.sample, options.scroller, {
          code: 'timeout',
          message: `Mutation did not reach an observable correct DOM state within ${FRAME_TIMEOUT_MS}ms.`,
          details,
        }));
        resolve(Object.freeze({ elapsedMs: null, failures: Object.freeze([...observedFailures.values()]) }));
        return;
      }
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  });
}

function waitForInitialLayout(
  scroller: HTMLElement,
  scenario: MutationScenario,
  strictTotalHeight: boolean,
): Promise<boolean> {
  const expectedIndex = indexByID(scenario.initialItems);
  return new Promise((resolve) => {
    const startedAt = performance.now();
    let lastFingerprint: string | undefined;
    let stableFrames = 0;
    const frame = (): void => {
      const inspection = inspectLayout(
        scroller,
        expectedIndex,
        scenario.initialLayout,
        scenario.initialTotalHeight,
        undefined,
        strictTotalHeight,
      );
      if (inspection.failures.length === 0) {
        resolve(true);
        return;
      }
      const fingerprint = failureFingerprint(inspection, scroller);
      if (fingerprint === lastFingerprint) stableFrames += 1;
      else {
        lastFingerprint = fingerprint;
        stableFrames = 1;
      }
      const elapsed = performance.now() - startedAt;
      if (
        (elapsed >= STABLE_FAILURE_MIN_MS && stableFrames >= STABLE_FAILURE_FRAMES)
        || elapsed >= FRAME_TIMEOUT_MS
      ) {
        resolve(false);
        return;
      }
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  });
}

function failureFingerprint(inspection: LayoutInspection, scroller: HTMLElement): string {
  return JSON.stringify({
    failures: inspection.failures.map((failure) => failure.code),
    rows: inspection.rows.map((row) => Object.freeze({
      id: row.id,
      index: row.index,
      top: Math.round(row.top),
      bottom: Math.round(row.bottom),
      height: Math.round(row.height),
    })),
    scrollTop: Math.round(scroller.scrollTop),
    scrollHeight: scroller.scrollHeight,
  });
}

function inspectLayout(
  scroller: HTMLElement,
  expectedIndex: ReadonlyMap<string, number>,
  expectedLayout: ExpectedLayout,
  expectedScrollHeight: number,
  anchor: Anchor | undefined,
  strictTotalHeight: boolean,
): LayoutInspection {
  const viewport = scroller.getBoundingClientRect();
  const elements = Array.from(scroller.querySelectorAll<HTMLElement>('.bench-row'));
  const failures: Omit<MutationFailure, 'severity' | 'sample' | 'scrollTop'>[] = [];
  const seen = new Set<string>();
  const rows: RowGeometry[] = [];

  for (const element of elements) {
    const id = element.dataset['id'];
    const rect = element.getBoundingClientRect();
    if (id === undefined || rect.height <= 0 || rect.bottom < viewport.top - VIEWPORT_HEIGHT * 2 || rect.top > viewport.bottom + VIEWPORT_HEIGHT * 2) continue;
    if (seen.has(id)) {
      failures.push({ code: 'duplicate-id', message: `Rendered row ID ${id} appeared more than once.`, details: { id } });
      continue;
    }
    seen.add(id);
    const index = expectedIndex.get(id);
    if (index === undefined) {
      failures.push({ code: 'unexpected-id', message: `Rendered row ID ${id} is absent from the expected data.`, details: { id } });
      continue;
    }
    const expectedHeight = expectedLayout.heightAt(index);
    if (Math.abs(rect.height - expectedHeight) > GEOMETRY_TOLERANCE_PX) {
      failures.push({
        code: 'row-height',
        message: `Row ${id} measured ${round(rect.height)}px instead of ${expectedHeight}px.`,
        details: { id, expectedHeight, actualHeight: round(rect.height) },
      });
    }
    rows.push({ id, index, top: rect.top, bottom: rect.bottom, height: rect.height });
  }

  rows.sort((left, right) => left.top - right.top || left.index - right.index);
  for (let index = 1; index < rows.length; index += 1) {
    const previous = rows[index - 1]!;
    const current = rows[index]!;
    if (current.index <= previous.index) {
      failures.push({
        code: 'row-order',
        message: `DOM geometry placed ${current.id} before its expected order.`,
        details: { previous, current },
      });
      continue;
    }
    if (current.index !== previous.index + 1) continue;
    const distance = current.top - previous.bottom;
    if (distance < -GEOMETRY_TOLERANCE_PX) {
      failures.push({ code: 'row-overlap', message: `Rows ${previous.id} and ${current.id} overlap.`, details: { previous, current, overlap: round(-distance) } });
    } else if (distance > GEOMETRY_TOLERANCE_PX) {
      failures.push({ code: 'row-gap', message: `Rows ${previous.id} and ${current.id} have an unexpected gap.`, details: { previous, current, gap: round(distance) } });
    }
  }

  const visibleRows = rows.filter((row) => row.bottom > viewport.top + GEOMETRY_TOLERANCE_PX && row.top < viewport.bottom - GEOMETRY_TOLERANCE_PX);
  if (visibleRows.length === 0) {
    failures.push({ code: 'blank-viewport', message: 'No row covers the viewport.', details: describeRows(scroller) });
  } else {
    const first = visibleRows[0]!;
    const last = visibleRows.at(-1)!;
    if (scroller.scrollTop > GEOMETRY_TOLERANCE_PX && first.top > viewport.top + GEOMETRY_TOLERANCE_PX) {
      failures.push({ code: 'blank-viewport', message: 'Blank space appeared at the top of the viewport.', details: { viewportTop: viewport.top, first } });
    }
    const maximum = scroller.scrollHeight - scroller.clientHeight;
    if (scroller.scrollTop < maximum - GEOMETRY_TOLERANCE_PX && last.bottom < viewport.bottom - GEOMETRY_TOLERANCE_PX) {
      failures.push({ code: 'blank-viewport', message: 'Blank space appeared at the bottom of the viewport.', details: { viewportBottom: viewport.bottom, last } });
    }
  }

  if (strictTotalHeight && Math.abs(scroller.scrollHeight - expectedScrollHeight) > GEOMETRY_TOLERANCE_PX) {
    failures.push({
      code: 'scroll-height',
      message: `Scroll height was ${scroller.scrollHeight}px instead of ${expectedScrollHeight}px.`,
      details: { expectedScrollHeight, actualScrollHeight: scroller.scrollHeight },
    });
  }

  if (anchor !== undefined) {
    const row = rows.find((candidate) => candidate.id === anchor.id);
    const actualOffset = row === undefined ? undefined : row.top - viewport.top;
    if (actualOffset === undefined || Math.abs(actualOffset - anchor.viewportOffset) > GEOMETRY_TOLERANCE_PX) {
      failures.push({
        code: 'scroll-anchor',
        message: `The surviving anchor ${anchor.id} moved in the viewport.`,
        details: { id: anchor.id, expectedOffset: round(anchor.viewportOffset), actualOffset: actualOffset === undefined ? null : round(actualOffset) },
      });
    }
  }
  return { failures, rows };
}

function mutationObserved(host: HTMLElement, scenario: MutationScenario, nextIndex: ReadonlyMap<string, number>): boolean {
  const rows = Array.from(host.querySelectorAll<HTMLElement>('.bench-row'));
  const byID = new Map(rows.map((row) => [row.dataset['id'], row]));
  if (scenario.operation === 'insert') return byID.has(scenario.affectedIDs[0]);
  if (scenario.operation === 'remove') return !byID.has(scenario.affectedIDs[0]);
  if (scenario.operation === 'resize') {
    const target = byID.get(scenario.affectedIDs[0]);
    const index = nextIndex.get(scenario.affectedIDs[0]);
    return target !== undefined
      && index !== undefined
      && Math.abs(target.getBoundingClientRect().height - scenario.nextLayout.heightAt(index)) <= GEOMETRY_TOLERANCE_PX;
  }
  const affected = scenario.affectedIDs
    .map((id) => ({ id, row: byID.get(id), index: nextIndex.get(id) }))
    .filter((entry): entry is { id: string; row: HTMLElement; index: number } => entry.row !== undefined && entry.index !== undefined)
    .sort((left, right) => left.index - right.index);
  return affected.length === 2 && affected[0]!.row.getBoundingClientRect().top < affected[1]!.row.getBoundingClientRect().top;
}

function captureAnchor(
  scroller: HTMLElement,
  rows: readonly RowGeometry[],
  initialIndex: ReadonlyMap<string, number>,
  nextIndex: ReadonlyMap<string, number>,
  scenario: MutationScenario,
): Anchor | undefined {
  const viewport = scroller.getBoundingClientRect();
  const candidates = rows.filter((row) => nextIndex.has(row.id) && row.bottom > viewport.top && row.top < viewport.bottom);
  candidates.sort((left, right) => left.top - right.top);
  const selected = candidates[0];
  if (selected === undefined) return undefined;
  const beforeIndex = initialIndex.get(selected.id);
  const afterIndex = nextIndex.get(selected.id);
  if (beforeIndex === undefined || afterIndex === undefined) return undefined;
  const beforeAbsolute = scenario.initialLayout.offsetAt(beforeIndex);
  const afterAbsolute = scenario.nextLayout.offsetAt(afterIndex);
  const absoluteDelta = afterAbsolute - beforeAbsolute;
  const desiredScrollTop = Math.min(
    Math.max(0, scroller.scrollHeight + scenario.expectedScrollHeightDelta - scroller.clientHeight),
    Math.max(0, scroller.scrollTop + absoluteDelta),
  );
  const viewportOffset = (selected.top - viewport.top) + absoluteDelta - (desiredScrollTop - scroller.scrollTop);
  return Object.freeze({ id: selected.id, viewportOffset });
}

async function positionScenario(scroller: HTMLElement, scenario: MutationScenario, host: HTMLElement): Promise<void> {
  const targetID = scenario.initialItems[scenario.index]!.id;
  if (scenario.location === 'end') {
    for (let attempt = 0; attempt < 32; attempt += 1) {
      scroller.scrollTop = Math.max(0, scroller.scrollHeight - scroller.clientHeight);
      scroller.dispatchEvent(new Event('scroll', { bubbles: true }));
      await nextFrame();
      const target = host.querySelector<HTMLElement>(`.bench-row[data-id="${targetID}"]`);
      if (target !== null && intersectsViewport(target, scroller)) return;
    }
    throw new Error(`Could not position row ${scenario.index} in the viewport.`);
  }
  let low = 0;
  let high = Math.max(0, scroller.scrollHeight - scroller.clientHeight);
  let offset = scenario.location === 'start'
    ? 0
    : scenario.location === 'middle'
      ? high / 2
      : high;
  for (let attempt = 0; attempt < 16; attempt += 1) {
    scroller.scrollTop = offset;
    scroller.dispatchEvent(new Event('scroll', { bubbles: true }));
    await nextFrame();
    const target = host.querySelector<HTMLElement>(`.bench-row[data-id="${targetID}"]`);
    if (target !== null) {
      const targetRect = target.getBoundingClientRect();
      const viewport = scroller.getBoundingClientRect();
      const centerDelta = targetRect.top - viewport.top - Math.max(0, (scroller.clientHeight - targetRect.height) / 2);
      if (Math.abs(centerDelta) <= GEOMETRY_TOLERANCE_PX) return;
      scroller.scrollTop += centerDelta;
      scroller.dispatchEvent(new Event('scroll', { bubbles: true }));
      await nextFrame();
      const centered = host.querySelector<HTMLElement>(`.bench-row[data-id="${targetID}"]`);
      if (centered !== null && intersectsViewport(centered, scroller)) return;
    }
    const visibleIndices = Array.from(host.querySelectorAll<HTMLElement>('.bench-row[data-index]'))
      .map((row) => Number(row.dataset['index']))
      .filter(Number.isInteger);
    if (visibleIndices.length === 0) {
      high = Math.max(0, scroller.scrollHeight - scroller.clientHeight);
      offset = Math.min(high, Math.max(0, offset));
      continue;
    }
    const minimum = Math.min(...visibleIndices);
    const maximum = Math.max(...visibleIndices);
    if (scenario.index < minimum) high = Math.min(high, offset);
    else if (scenario.index > maximum) low = Math.max(low, offset);
    else return;
    const currentMaximum = Math.max(0, scroller.scrollHeight - scroller.clientHeight);
    high = Math.min(currentMaximum, Math.max(low, high));
    offset = (low + high) / 2;
  }
  throw new Error(`Could not position row ${scenario.index} in the viewport.`);
}

function intersectsViewport(row: HTMLElement, scroller: HTMLElement): boolean {
  const rect = row.getBoundingClientRect();
  const viewport = scroller.getBoundingClientRect();
  return rect.bottom > viewport.top + GEOMETRY_TOLERANCE_PX
    && rect.top < viewport.bottom - GEOMETRY_TOLERANCE_PX;
}

function waitForRows(host: HTMLElement): Promise<void> {
  return waitUntil(() => host.querySelector('.bench-row[data-id]') !== null, 'initial rows');
}

function waitForElement(host: HTMLElement, selector: string): Promise<void> {
  return waitUntil(() => host.querySelector(selector) !== null, selector);
}

function waitUntil(predicate: () => boolean, label: string): Promise<void> {
  if (predicate()) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const startedAt = performance.now();
    const frame = (): void => {
      if (predicate()) { resolve(); return; }
      if (performance.now() - startedAt >= FRAME_TIMEOUT_MS) { reject(new Error(`Timed out waiting for ${label}.`)); return; }
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  });
}

function makeFailure(
  adapter: MutableBenchmarkAdapter,
  sample: number,
  scroller: HTMLElement,
  failure: Omit<MutationFailure, 'severity' | 'sample' | 'scrollTop'>,
): MutationFailure {
  return Object.freeze({
    severity: adapter.name === 'Sectile Virtual' ? 'fatal' : 'failure',
    ...failure,
    sample,
    scrollTop: round(scroller.scrollTop),
    details: Object.freeze(failure.details),
  });
}

function describeRows(root: ParentNode): Readonly<Record<string, unknown>> {
  return Object.freeze({
    rows: Array.from(root.querySelectorAll<HTMLElement>('.bench-row')).slice(0, 30).map((row) => {
      const rect = row.getBoundingClientRect();
      return { id: row.dataset['id'], index: row.dataset['index'], top: round(rect.top), height: round(rect.height) };
    }),
  });
}

function indexByID(items: readonly BenchmarkItem[]): ReadonlyMap<string, number> {
  return new Map(items.map((item, index) => [item.id, index]));
}

function resultKey(adapter: MutableBenchmarkAdapter, scenario: MutationScenario): string {
  return `${scenario.rowProfile}:${adapter.name}:${adapter.sizeMode}:${scenario.operation}:${scenario.location}`;
}

function rotate<T>(values: readonly T[], offset: number): readonly T[] {
  const start = offset % values.length;
  return [...values.slice(start), ...values.slice(0, start)];
}

function percentile(sorted: readonly number[], ratio: number): number {
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * ratio) - 1))] ?? 0;
}

function round(value: number): number { return Number(value.toFixed(3)); }
function nextFrame(): Promise<void> { return new Promise((resolve) => requestAnimationFrame(() => resolve())); }
function positiveInteger(value: string | null): number | undefined {
  if (value === null) return undefined;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 && parsed <= 50 ? parsed : undefined;
}
