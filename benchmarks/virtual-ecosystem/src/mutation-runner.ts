import { VIEWPORT_HEIGHT, type BenchmarkItem, type RowProfile } from './constants.js';
import {
  distributionIsStable,
  distributionSnapshot,
  formatElapsed,
  type DistributionSnapshot,
} from './adaptive-sampling.js';
import {
  advanceFailureReproduction,
  reproducibleFailureSignature,
  type FailureReproductionStreak,
} from './failure-reproduction.js';
import type { ExpectedLayout, HeightOracle } from './fixture.js';
import {
  EMBEDDED_LONG_TASK_BUDGET_MS,
  exceedsEmbeddedLongTaskBudget,
} from './interactive-budget.js';
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
import {
  nextFrame,
  positionBenchmarkTarget,
  TargetPositionError,
  waitForElement as waitForDOMElement,
  waitForFrameSettlement,
} from './dom-runner.js';
import {
  expectedScrollerExtent,
  expectedScrollerExtentDelta,
  visibleContentRange,
} from './baseline-policy.js';

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
  readonly plannedSamples: number;
  readonly earlyStopped: boolean;
  readonly earlyStopReason: MutationEarlyStopReason | null;
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

export interface MutationBenchmarkProgress {
  readonly completed: number;
  readonly executed: number;
  readonly total: number;
  readonly message: string;
}

type FailureCode =
  | 'exception'
  | 'target-position'
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

type MutationEarlyStopReason = 'interactive-budget' | 'reproducible-failure' | 'stable-statistics';

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

const mutationSearch = new URLSearchParams(window.location.search);
const EMBEDDED = mutationSearch.has('embedded');
const QUICK_RUN = mutationSearch.has('quick');
const requestedRounds = positiveInteger(mutationSearch.get('mutation-rounds'));
const requestedSamples = positiveInteger(mutationSearch.get('mutation-samples'));
const ADAPTIVE_SAMPLING = !QUICK_RUN && requestedRounds === undefined && requestedSamples === undefined;
const MUTATION_BATCH_SIZES = Object.freeze(
  QUICK_RUN
    ? [1]
    : requestedRounds !== undefined || requestedSamples !== undefined
      ? Array.from({ length: requestedRounds ?? 5 }, () => requestedSamples ?? 10)
      : [5, 5, 10, 10, 10, 10],
);
const MAX_MUTATION_SAMPLES = MUTATION_BATCH_SIZES.reduce((total, samples) => total + samples, 0);
const MINIMUM_STABLE_SAMPLES = 30;
const MINIMUM_P95_SAMPLES = 30;
const MEDIAN_RELATIVE_TOLERANCE = 0.05;
const P95_RELATIVE_TOLERANCE = 0.1;
const GOOD_RECOVERY_MS = 200;
const FRAME_TIMEOUT_MS = 500;
const STABLE_FAILURE_MIN_MS = 300;
const STABLE_FAILURE_FRAMES = 8;
const REPRODUCIBLE_FAILURE_ROUNDS = 2;
const REPRODUCIBLE_FAILURE_SAMPLES_PER_BATCH = 5;
const GEOMETRY_TOLERANCE_PX = 2;
const POSITION_MAX_FRAMES = 32;
const POSITION_STABLE_FRAMES = 2;

export const mutationConditions = Object.freeze({
  adaptiveSampling: ADAPTIVE_SAMPLING,
  rounds: MUTATION_BATCH_SIZES.length,
  batchSizes: MUTATION_BATCH_SIZES,
  samplesPerScenario: MAX_MUTATION_SAMPLES,
  maximumSamplesPerScenario: MAX_MUTATION_SAMPLES,
  minimumStableSamples: MINIMUM_STABLE_SAMPLES,
  minimumP95Samples: MINIMUM_P95_SAMPLES,
  medianRelativeTolerance: MEDIAN_RELATIVE_TOLERANCE,
  p95RelativeTolerance: P95_RELATIVE_TOLERANCE,
  goodRecoveryMs: GOOD_RECOVERY_MS,
  embeddedLongTaskBudgetMs: EMBEDDED_LONG_TASK_BUDGET_MS,
  frameTimeoutMs: FRAME_TIMEOUT_MS,
  stableFailureMinMs: STABLE_FAILURE_MIN_MS,
  stableFailureFrames: STABLE_FAILURE_FRAMES,
  reproducibleFailureRounds: REPRODUCIBLE_FAILURE_ROUNDS,
  reproducibleFailureSamplesPerBatch: REPRODUCIBLE_FAILURE_SAMPLES_PER_BATCH,
  geometryTolerancePx: GEOMETRY_TOLERANCE_PX,
  lifecycle: 'adaptive independent mounts use batches of 5, 5, 10, 10, 10, and 10 measured mutations; each sample restores a verified initial collection',
  completion: 'first animation frame with correct DOM order, row geometry, content-bearing viewport coverage, browser scroll extent, and attainable anchor position; exact scroll extent is required for uniform rows and recorded as estimation quality for heterogeneous rows',
  recovery: 'every frame after the mutation becomes observable is checked; recovery within 200ms is responsive, recovery from 200ms through 500ms is slow, and no correct frame within 500ms is a hard failure; an unchanged incorrect layout can fail earlier at the stable-failure threshold',
  earlyStop: 'a scenario stops after two independent batches reproduce the same hard failure five times each, or after at least 30 clean samples keep the cumulative median within 5% and p95 within 10%',
});

export async function runMutationBenchmarks(
  host: HTMLElement,
  onProgress: (message: string) => void,
  rowProfile: RowProfile,
  oracle: HeightOracle,
  libraries?: readonly string[],
  filter: MutationBenchmarkFilter = {},
  onCheckpoint?: (result: MutationBenchmarkResult, progress: MutationBenchmarkProgress) => void,
): Promise<readonly MutationBenchmarkResult[]> {
  const libraryAdapters = libraries === undefined
    ? [...mutableAdapters, ...automaticMutableAdapters]
    : [...mutableAdapters, ...automaticMutableAdapters].filter((adapter) => libraries.includes(adapter.name));
  const selectedAdapters = libraryAdapters.filter((adapter) => (
    filter.sizeMode === undefined || adapter.sizeMode === filter.sizeMode
  ));
  if (selectedAdapters.length === 0) {
    throw new Error('No supported mutation conditions match the selected filters.');
  }
  const scenarios = mutationOperations
    .filter((operation) => filter.operation === undefined || operation === filter.operation)
    .flatMap((operation) => mutationLocations
      .filter((location) => filter.location === undefined || location === filter.location)
      .map((location) => createMutationScenario(operation, location, rowProfile, oracle)));
  const raw = new Map<string, RawScenarioResult>();
  const failureReproductions = new Map<string, FailureReproductionStreak>();
  const earlyStops = new Map<string, MutationEarlyStopReason>();
  const previousStatistics = new Map<string, DistributionSnapshot>();
  const total = selectedAdapters.length * scenarios.length * MAX_MUTATION_SAMPLES;
  const progressStartedAt = performance.now();
  let resolved = 0;
  let executed = 0;

  for (let batch = 0; batch < MUTATION_BATCH_SIZES.length; batch += 1) {
    const batchSize = MUTATION_BATCH_SIZES[batch]!;
    const adapterOrder = rotate(selectedAdapters, batch * 3);
    const scenarioOrder = rotate(scenarios, batch * 5);
    for (const adapter of adapterOrder) {
      for (const scenario of scenarioOrder) {
        const key = resultKey(adapter, scenario);
        const result = raw.get(key) ?? { samples: [], recoverySamples: [], outcomes: [], failures: [] };
        raw.set(key, result);
        if (earlyStops.has(key)) {
          resolved += batchSize;
          onProgress(progressMessage(
            resolved,
            executed,
            total,
            progressStartedAt,
            `${adapter.name} · ${adapter.sizeMode} · ${scenario.operation}/${scenario.location} · ${earlyStops.get(key)}`,
          ));
          continue;
        }
        const sampleOffset = result.outcomes.length;
        const roundOutcomes = await runMutationRound(
          adapter,
          scenario,
          host,
          batchSize,
          (localSample) => sampleOffset + localSample + 1,
        );
        const interactiveBudgetExceeded = roundOutcomes.some(({ outcome }) => (
          exceedsEmbeddedLongTaskBudget(EMBEDDED, outcome.elapsedMs)
        ));
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
        if (interactiveBudgetExceeded) {
          earlyStops.set(key, 'interactive-budget');
        } else {
          const signature = reproducibleFailureSignature(
            roundOutcomes.map(({ outcome }) => outcome),
            Math.min(REPRODUCIBLE_FAILURE_SAMPLES_PER_BATCH, batchSize),
          );
          const reproduction = advanceFailureReproduction(failureReproductions.get(key), signature);
          if (reproduction === undefined) failureReproductions.delete(key);
          else {
            failureReproductions.set(key, reproduction);
            if (reproduction.rounds >= REPRODUCIBLE_FAILURE_ROUNDS) earlyStops.set(key, 'reproducible-failure');
          }
        }
        const currentStatistics = distributionSnapshot(result.samples);
        if (
          !interactiveBudgetExceeded
          && ADAPTIVE_SAMPLING
          && result.outcomes.every((outcome) => outcome.outcome === 'clean')
          && distributionIsStable(previousStatistics.get(key), currentStatistics, {
            minimumSamples: MINIMUM_STABLE_SAMPLES,
            medianRelativeTolerance: MEDIAN_RELATIVE_TOLERANCE,
            p95RelativeTolerance: P95_RELATIVE_TOLERANCE,
          })
        ) {
          earlyStops.set(key, 'stable-statistics');
        }
        if (currentStatistics !== undefined) previousStatistics.set(key, currentStatistics);
        resolved += interactiveBudgetExceeded ? batchSize : roundOutcomes.length;
        executed += roundOutcomes.length;
        const message = progressMessage(
          resolved,
          executed,
          total,
          progressStartedAt,
          `${adapter.name} · ${adapter.sizeMode} · ${scenario.operation}/${scenario.location}`,
        );
        onProgress(message);
        onCheckpoint?.(
          summarizeMutationResult(rowProfile, adapter, scenario, result, earlyStops.get(key) ?? null),
          Object.freeze({ completed: resolved, executed, total, message }),
        );
        await nextFrame();
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
    }
  }

  return Object.freeze(selectedAdapters.flatMap((adapter) => scenarios.map((scenario) => {
    const collected = raw.get(resultKey(adapter, scenario)) ?? { samples: [], recoverySamples: [], outcomes: [], failures: [] };
    return summarizeMutationResult(
      rowProfile,
      adapter,
      scenario,
      collected,
      earlyStops.get(resultKey(adapter, scenario)) ?? null,
    );
  })));
}

function summarizeMutationResult(
  rowProfile: RowProfile,
  adapter: MutableBenchmarkAdapter,
  scenario: MutationScenario,
  collected: RawScenarioResult,
  earlyStopReason: MutationEarlyStopReason | null,
): MutationBenchmarkResult {
  const sorted = [...collected.samples].sort((left, right) => left - right);
  const recoveries = [...collected.recoverySamples].sort((left, right) => left - right);
  const correctSamples = collected.outcomes.filter((sample) => sample.outcome === 'clean').length;
  const recoveredSamples = collected.outcomes.filter((sample) => sample.outcome === 'recovered').length;
  const failedSamples = collected.outcomes.filter((sample) => sample.outcome === 'failed').length;
  const plannedSamples = MAX_MUTATION_SAMPLES;
  const earlyStopped = earlyStopReason !== null && collected.outcomes.length < plannedSamples;
  return Object.freeze({
    rowProfile,
    library: adapter.name,
    version: adapter.version,
    stack: adapter.stack,
    sizeMode: adapter.sizeMode,
    operation: scenario.operation,
    location: scenario.location,
    medianMs: sorted.length === 0 ? null : round(percentile(sorted, 0.5)),
    p95Ms: sorted.length < MINIMUM_P95_SAMPLES ? null : round(percentile(sorted, 0.95)),
    recoveryMedianMs: recoveries.length === 0 ? null : round(percentile(recoveries, 0.5)),
    recoveryP95Ms: recoveries.length < MINIMUM_P95_SAMPLES ? null : round(percentile(recoveries, 0.95)),
    settledSamples: sorted.length,
    correctSamples,
    recoveredSamples,
    failedSamples,
    totalSamples: collected.outcomes.length,
    plannedSamples,
    earlyStopped,
    earlyStopReason: earlyStopped ? earlyStopReason : null,
    heightHandling: adapter.heightHandling,
    samples: Object.freeze([...collected.outcomes]),
    failures: Object.freeze([...collected.failures]),
  });
}

async function runMutationRound(
  adapter: MutableBenchmarkAdapter,
  scenario: MutationScenario,
  host: HTMLElement,
  sampleCount: number,
  beginSample: (localSample: number) => number,
): Promise<readonly { readonly sample: number; readonly outcome: SampleOutcome }[]> {
  host.replaceChildren();
  let mounted: MutableMountedAdapter | undefined;
  const outcomes: { sample: number; outcome: SampleOutcome }[] = [];
  try {
    mounted = adapter.mount(host, scenario.initialItems, scenario.rowProfile);
    await waitForElement(host, '.bench-scroller');
    await waitForRows(host);
    for (let localSample = 0; localSample < sampleCount; localSample += 1) {
      if (EMBEDDED && localSample > 0) await yieldToBrowser();
      const sample = beginSample(localSample);
      const execution = await runMountedMutationSample(adapter, mounted, scenario, host, sample);
      outcomes.push(Object.freeze({ sample, outcome: execution.outcome }));
      if (exceedsEmbeddedLongTaskBudget(EMBEDDED, execution.outcome.elapsedMs)) break;
      if (localSample === sampleCount - 1 || !execution.didMutate) continue;
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
    for (let localSample = outcomes.length; localSample < sampleCount; localSample += 1) {
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
    const expectedContentHeight = scenario.nextTotalHeight;
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
      expectedContentHeight,
      anchor,
      startedAt,
    });
    return Object.freeze({ didMutate: true, outcome });
  } catch (error) {
    return Object.freeze({
      didMutate,
      outcome: Object.freeze({ elapsedMs: null, failures: [Object.freeze({
        severity: adapter.name === 'Sectile Virtual' ? 'fatal' : 'failure',
        code: error instanceof TargetPositionError ? error.code : 'exception',
        message: error instanceof Error ? error.message : String(error),
        sample,
        scrollTop: scroller.scrollTop,
        details: Object.freeze({
          stack: error instanceof Error ? error.stack : undefined,
          ...(error instanceof TargetPositionError ? error.details : {}),
        }),
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
  readonly expectedContentHeight: number;
  readonly anchor: Anchor | undefined;
  readonly startedAt: number;
}

function waitForCorrectMutation(options: WaitOptions): Promise<SampleOutcome> {
  let lastInspection: LayoutInspection | undefined;
  return waitForFrameSettlement({
    startedAt: options.startedAt,
    timeoutMs: FRAME_TIMEOUT_MS,
    stableFailureMinMs: STABLE_FAILURE_MIN_MS,
    stableFailureFrames: STABLE_FAILURE_FRAMES,
    observed: () => mutationObserved(options.host, options.scenario, options.nextIndex),
    inspect: () => {
      const inspection = inspectLayout(
        options.scroller,
        options.nextIndex,
        options.scenario.nextLayout,
        options.expectedContentHeight,
        options.anchor,
        options.scenario.rowProfile === 'uniform' && options.adapter.sizeMode !== 'automatic',
      );
      lastInspection = inspection;
      return Object.freeze({
        failures: Object.freeze(inspection.failures.map((failure) => (
          makeFailure(options.adapter, options.sample, options.scroller, failure)
        ))),
        fingerprint: failureFingerprint(inspection, options.scroller),
      });
    },
    failureKey: (failure) => failure.code,
    timeoutFailure: () => makeFailure(options.adapter, options.sample, options.scroller, {
      code: 'timeout',
      message: `Mutation did not reach an observable correct DOM state within ${FRAME_TIMEOUT_MS}ms.`,
      details: lastInspection?.failures[0]?.details ?? describeRows(options.host),
    }),
  }).then((settlement) => Object.freeze({
    elapsedMs: settlement.elapsedMs === null ? null : round(settlement.elapsedMs),
    failures: settlement.failures,
  }));
}

function waitForInitialLayout(
  scroller: HTMLElement,
  scenario: MutationScenario,
  strictTotalHeight: boolean,
): Promise<boolean> {
  const expectedIndex = indexByID(scenario.initialItems);
  return waitForFrameSettlement({
    startedAt: performance.now(),
    timeoutMs: FRAME_TIMEOUT_MS,
    stableFailureMinMs: STABLE_FAILURE_MIN_MS,
    stableFailureFrames: STABLE_FAILURE_FRAMES,
    inspect: () => {
      const inspection = inspectLayout(
        scroller,
        expectedIndex,
        scenario.initialLayout,
        scenario.initialTotalHeight,
        undefined,
        strictTotalHeight,
      );
      return Object.freeze({
        failures: inspection.failures,
        fingerprint: failureFingerprint(inspection, scroller),
      });
    },
    failureKey: (failure) => failure.code,
    timeoutFailure: () => Object.freeze({
      code: 'timeout' as const,
      message: `Initial layout did not settle within ${FRAME_TIMEOUT_MS}ms.`,
      details: describeRows(scroller),
    }),
  }).then((settlement) => settlement.elapsedMs !== null);
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
  expectedContentHeight: number,
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
    failures.push({ code: 'blank-viewport', message: 'No row covers the visible content region.', details: describeRows(scroller) });
  } else {
    const first = visibleRows[0]!;
    const last = visibleRows.at(-1)!;
    const contentRange = visibleContentRange(expectedContentHeight, scroller.clientHeight, scroller.scrollTop);
    if (contentRange !== null) {
      const expectedTop = viewport.top + contentRange.start;
      const expectedBottom = viewport.top + contentRange.end;
      if (first.top > expectedTop + GEOMETRY_TOLERANCE_PX) {
        failures.push({ code: 'blank-viewport', message: 'Blank space appeared before the visible content.', details: { expectedTop, first } });
      }
      if (last.bottom < expectedBottom - GEOMETRY_TOLERANCE_PX) {
        failures.push({ code: 'blank-viewport', message: 'Blank space appeared after the visible content.', details: { expectedBottom, last } });
      }
    }
  }

  const expectedScrollHeight = expectedScrollerExtent(expectedContentHeight, scroller.clientHeight);
  if (strictTotalHeight && Math.abs(scroller.scrollHeight - expectedScrollHeight) > GEOMETRY_TOLERANCE_PX) {
    failures.push({
      code: 'scroll-height',
      message: `Scroll height was ${scroller.scrollHeight}px instead of ${expectedScrollHeight}px.`,
      details: { expectedContentHeight, expectedScrollHeight, actualScrollHeight: scroller.scrollHeight },
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
  const projectedScrollHeight = Math.max(
    scroller.clientHeight,
    scroller.scrollHeight + expectedScrollerExtentDelta(
      scenario.initialTotalHeight,
      scenario.nextTotalHeight,
      scroller.clientHeight,
    ),
  );
  const desiredScrollTop = Math.min(
    Math.max(0, projectedScrollHeight - scroller.clientHeight),
    Math.max(0, scroller.scrollTop + absoluteDelta),
  );
  const viewportOffset = (selected.top - viewport.top) + absoluteDelta - (desiredScrollTop - scroller.scrollTop);
  return Object.freeze({ id: selected.id, viewportOffset });
}

async function positionScenario(scroller: HTMLElement, scenario: MutationScenario, host: HTMLElement): Promise<void> {
  await positionBenchmarkTarget({
    scroller,
    root: host,
    itemSelector: '.bench-row[data-index]',
    targetID: scenario.initialItems[scenario.index]!.id,
    targetIndex: scenario.index,
    itemCount: scenario.initialItems.length,
    targetWidth: scroller.clientWidth,
    targetHeight: scenario.initialLayout.heightAt(scenario.index),
    location: scenario.location,
    tolerance: GEOMETRY_TOLERANCE_PX,
    maximumFrames: POSITION_MAX_FRAMES,
    stableFrames: POSITION_STABLE_FRAMES,
  });
}

function waitForRows(host: HTMLElement): Promise<void> {
  return waitForDOMElement(
    host,
    () => host.querySelector('.bench-row[data-id]') !== null,
    'initial rows',
    FRAME_TIMEOUT_MS,
  );
}

function waitForElement(host: HTMLElement, selector: string): Promise<void> {
  return waitForDOMElement(host, () => host.querySelector(selector) !== null, selector, FRAME_TIMEOUT_MS);
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

function progressMessage(
  resolved: number,
  executed: number,
  total: number,
  startedAt: number,
  detail: string,
): string {
  const elapsed = performance.now() - startedAt;
  const remainingUpperBound = executed === 0 ? 0 : (elapsed / executed) * Math.max(0, total - resolved);
  return `Mutation ${resolved}/${total} · elapsed ${formatElapsed(elapsed)} · ETA ≤ ${formatElapsed(remainingUpperBound)} · ${detail}`;
}

function rotate<T>(values: readonly T[], offset: number): readonly T[] {
  const start = offset % values.length;
  return [...values.slice(start), ...values.slice(0, start)];
}

function percentile(sorted: readonly number[], ratio: number): number {
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * ratio) - 1))] ?? 0;
}

function round(value: number): number { return Number(value.toFixed(3)); }
function yieldToBrowser(): Promise<void> { return new Promise((resolve) => setTimeout(resolve, 0)); }
function positiveInteger(value: string | null): number | undefined {
  if (value === null) return undefined;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 && parsed <= 50 ? parsed : undefined;
}
