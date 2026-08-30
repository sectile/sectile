import { VIEWPORT_HEIGHT, VIEWPORT_WIDTH } from './constants.js';
import { distributionIsStable, distributionSnapshot } from './adaptive-sampling.js';
import {
  advanceFailureReproduction,
  reproducibleFailureSignature,
  type FailureOutcomeLike,
  type FailureReproductionStreak,
} from './failure-reproduction.js';
import { exceedsEmbeddedLongTaskBudget } from './interactive-budget.js';
import { benchmarkFamilyLabel, parseBenchmarkFamily, type BenchmarkSource } from './families.js';
import {
  layoutAdapters,
  layoutCapabilities,
  type LayoutBenchmarkAdapter,
  type LayoutSizeMode,
  type MountedLayoutAdapter,
} from './layout-adapters.js';
import {
  createLayoutFixture,
  createLayoutMutationScenario,
  expectedVisibleItems,
  type LayoutBenchmarkFamily,
  type LayoutBenchmarkFixture,
  type LayoutBenchmarkItem,
  type LayoutMutationLocation,
  type LayoutMutationOperation,
  type LayoutMutationScenario,
} from './layout-fixtures.js';
import './style.css';

declare const __BENCHMARK_SOURCE__: BenchmarkSource;

interface RunReferences { readonly runIds: readonly string[] }

interface LayoutBaselineResult {
  readonly family: LayoutBenchmarkFamily;
  readonly mode: LayoutSizeMode;
  readonly library: string;
  readonly version: string;
  readonly stack: string;
  readonly setupMs: number;
  readonly firstItemsMs: number;
  readonly stableLayoutMs: number;
  readonly scrollMedianMs: number;
  readonly scrollP95Ms: number;
  readonly scrollMadMs: number;
  readonly scrollSampleCount: number;
  readonly completedRounds: number;
  readonly plannedRounds: number;
  readonly renderedItems: number;
  readonly domElements: number;
}

interface LayoutBaselineFailure {
  readonly family: LayoutBenchmarkFamily;
  readonly mode: LayoutSizeMode;
  readonly library: string;
  readonly version: string;
  readonly stack: string;
  readonly round: number;
  readonly message: string;
}

interface LayoutMutationResult {
  readonly family: LayoutBenchmarkFamily;
  readonly mode: LayoutSizeMode;
  readonly library: string;
  readonly version: string;
  readonly stack: string;
  readonly operation: LayoutMutationOperation;
  readonly location: LayoutMutationLocation;
  readonly medianMs: number | null;
  readonly p95Ms: number | null;
  readonly samples: number;
  readonly failedSamples: number;
  readonly failureCodes: readonly string[];
  readonly plannedSamples: number;
  readonly earlyStopped: boolean;
  readonly earlyStopReason: 'interactive-budget' | 'reproducible-failure' | 'stable-statistics' | null;
}

interface RawBaselineRound {
  readonly setupMs: number;
  readonly firstItemsMs: number;
  readonly stableLayoutMs: number;
  readonly scrollSamples: readonly number[];
  readonly renderedItems: number;
  readonly domElements: number;
}

interface LayoutSnapshotItem {
  readonly id: string;
  readonly index: number;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

interface LayoutSnapshot {
  readonly observedAt: number;
  readonly scrollWidth: number;
  readonly scrollHeight: number;
  readonly scrollLeft: number;
  readonly scrollTop: number;
  readonly viewportWidth: number;
  readonly viewportHeight: number;
  readonly items: readonly LayoutSnapshotItem[];
}

const search = new URLSearchParams(window.location.search);
const family = parseBenchmarkFamily(search.get('family')) as LayoutBenchmarkFamily;
const embedded = search.has('embedded');
const quick = search.has('quick');
const itemCount = boundedInteger(search.get('rows'), 2, 1_000_000) ?? 100_000;
const rounds = boundedInteger(search.get('baseline-rounds'), 1, 50) ?? (quick ? 1 : 5);
const warmupScrolls = boundedInteger(search.get('warmup-scrolls'), 0, 100) ?? (quick ? 1 : 5);
const scrollSamples = boundedInteger(search.get('scroll-samples'), 1, 200) ?? (quick ? 2 : 20);
const mutationRounds = boundedInteger(search.get('mutation-rounds'), 1, 50) ?? (quick ? 1 : 5);
const mutationSamples = boundedInteger(search.get('mutation-samples'), 1, 50) ?? (quick ? 1 : 10);
const baselineOnly = search.has('baseline-only');
const mutationsOnly = search.has('mutations-only');
const requestedLibrary = search.get('library');
const requestedBaselineMode = parseLayoutMode(search.get('baseline-mode'));
const requestedMutationMode = parseLayoutMode(search.get('mutation-mode'));
const requestedOperation = parseOperation(search.get('mutation-operation'));
const requestedLocation = parseLocation(search.get('mutation-location'));
const activeAdapters = layoutAdapters.filter((adapter) => (
  adapter.family === family
  && (requestedLibrary === null || adapter.name === requestedLibrary)
  && (requestedBaselineMode === undefined || adapter.mode === requestedBaselineMode)
));
const mutationAdapters = layoutAdapters.filter((adapter) => (
  adapter.family === family
  && (requestedLibrary === null || adapter.name === requestedLibrary)
  && (requestedMutationMode === undefined || adapter.mode === requestedMutationMode)
));
const operations = requestedOperation === undefined
  ? Object.freeze(['insert', 'move', 'remove', 'resize'] as const)
  : Object.freeze([requestedOperation]);
const locations = requestedLocation === undefined
  ? Object.freeze(['start', 'middle', 'end'] as const)
  : Object.freeze([requestedLocation]);
const fixture = createLayoutFixture(family, itemCount);
const timeoutMs = 4_000;
const mutationTimeoutMs = 750;
const tolerance = 3;

const root = document.querySelector<HTMLElement>('#app');
if (root === null) throw new Error('Missing benchmark root.');
root.innerHTML = embedded ? '<div id="mount" aria-hidden="true"></div>' : `
  <header>
    <h1>${benchmarkFamilyLabel(family)} ecosystem benchmark</h1>
    <p>${itemCount.toLocaleString()} items · ${VIEWPORT_WIDTH} × ${VIEWPORT_HEIGHT} viewport</p>
    <button type="button" id="run">Run benchmark</button>
  </header>
  <section aria-live="polite">
    <p id="status">Ready.</p>
    <div id="mount"></div>
    <h2>Initial render and scrolling</h2>
    <table><thead><tr><th>Family</th><th>Mode</th><th>Library</th><th>Setup</th><th>First items</th><th>Stable layout</th><th>Scroll median</th><th>Scroll p95</th></tr></thead><tbody id="layout-results"></tbody></table>
    <h2>Mutation results</h2>
    <table><thead><tr><th>Family</th><th>Mode</th><th>Library</th><th>Operation</th><th>Location</th><th>Median</th><th>p95</th><th>Failed</th></tr></thead><tbody id="layout-mutations"></tbody></table>
    <pre id="json"></pre>
  </section>`;

const mountHost = requireElement<HTMLElement>('#mount');
const runButton = document.querySelector<HTMLButtonElement>('#run');
const status = document.querySelector<HTMLElement>('#status');
const resultsBody = document.querySelector<HTMLElement>('#layout-results');
const mutationsBody = document.querySelector<HTMLElement>('#layout-mutations');
const json = document.querySelector<HTMLElement>('#json');
runButton?.addEventListener('click', () => { void runAll(); });
if (embedded) queueMicrotask(() => { void runAll(); });

async function runAll(): Promise<void> {
  const runId = crypto.randomUUID();
  const observedAt = new Date().toISOString();
  const startedAt = performance.now();
  runButton?.setAttribute('disabled', '');
  resultsBody?.replaceChildren();
  mutationsBody?.replaceChildren();
  const baselineResults: (LayoutBaselineResult & RunReferences)[] = [];
  const baselineFailures: (LayoutBaselineFailure & RunReferences)[] = [];
  const mutationResults: (LayoutMutationResult & RunReferences)[] = [];
  try {
    if (!mutationsOnly && activeAdapters.length === 0) throw new Error('No baseline adapter supports the selected family and mode.');
    if (!baselineOnly && mutationAdapters.length === 0) throw new Error('No mutation adapter supports the selected family and mode.');
    if (!mutationsOnly) {
      for (let adapterIndex = 0; adapterIndex < activeAdapters.length; adapterIndex += 1) {
        const adapter = activeAdapters[adapterIndex]!;
        const raw: RawBaselineRound[] = [];
        for (let round = 0; round < rounds; round += 1) {
          setStatus(`Round ${round + 1}/${rounds} · ${adapter.mode} · ${adapter.name}…`);
          publish('progress', {
            phase: 'baseline', message: currentStatus,
            completed: adapterIndex * rounds + round,
            total: activeAdapters.length * rounds,
            run: { id: runId, observedAt, source: __BENCHMARK_SOURCE__, environment: navigator.userAgent },
          });
          try {
            raw.push(await runBaselineRound(adapter));
          } catch (error) {
            const failure = Object.freeze({
              runIds: Object.freeze([runId]), family, mode: adapter.mode,
              library: adapter.name, version: adapter.version, stack: adapter.stack,
              round: round + 1, message: errorMessage(error),
            });
            baselineFailures.push(failure);
            publish('checkpoint', { phase: 'baseline', message: failure.message, layoutFailure: failure });
            break;
          }
          const partial = aggregateBaseline(adapter, raw);
          publish('checkpoint', {
            phase: 'baseline', message: currentStatus,
            completed: adapterIndex * rounds + round + 1,
            total: activeAdapters.length * rounds,
            layoutResult: Object.freeze({ runIds: Object.freeze([runId]), ...partial }),
          });
          await yieldToBrowser();
        }
        if (raw.length === rounds) {
          const result = Object.freeze({ runIds: Object.freeze([runId]), ...aggregateBaseline(adapter, raw) });
          baselineResults.push(result);
          resultsBody?.append(renderBaselineResult(result));
        }
      }
    }
    if (!baselineOnly) {
      let completed = 0;
      const total = mutationAdapters.reduce((count, adapter) => (
        count + operations.filter((operation) => adapter.mutationOperations.includes(operation)).length * locations.length
      ), 0);
      for (const operation of operations) for (const location of locations) {
        const scenario = createLayoutMutationScenario(fixture, operation, location);
        for (const adapter of mutationAdapters) {
          if (!adapter.mutationOperations.includes(operation)) continue;
          setStatus(`Mutation ${completed + 1}/${total} · ${adapter.name} · ${operation}/${location}…`);
          publish('progress', {
            phase: 'mutations', message: currentStatus, completed, total,
            run: { id: runId, observedAt, source: __BENCHMARK_SOURCE__, environment: navigator.userAgent },
          });
          const result = await runMutationCondition(adapter, scenario, (partial, completedBatches) => {
            publish('progress', {
              phase: 'mutations',
              message: `${currentStatus} · batch ${completedBatches}/${mutationRounds}`,
              completed: completed + completedBatches / mutationRounds,
              total,
              layoutMutationResult: Object.freeze({ runIds: Object.freeze([runId]), ...partial }),
            });
          });
          const referenced = Object.freeze({ runIds: Object.freeze([runId]), ...result });
          mutationResults.push(referenced);
          mutationsBody?.append(renderMutationResult(referenced));
          completed += 1;
          publish('checkpoint', {
            phase: 'mutations', message: currentStatus, completed, total,
            layoutMutationResult: referenced,
          });
          await yieldToBrowser();
        }
      }
    }
    const completedAt = new Date().toISOString();
    const run = Object.freeze({
      id: runId, observedAt, completedAt,
      durationMs: round(performance.now() - startedAt), source: __BENCHMARK_SOURCE__,
    });
    const report = Object.freeze({
      benchmark: 'sectile-virtual-ecosystem', protocolVersion: 7,
      environment: navigator.userAgent, source: __BENCHMARK_SOURCE__,
      runs: Object.freeze({ [runId]: run }),
      conditions: Object.freeze({
        family, itemCount, viewport: Object.freeze([VIEWPORT_WIDTH, VIEWPORT_HEIGHT]),
        baseline: Object.freeze({ rounds, warmupScrolls, scrollSamples }),
        mutations: Object.freeze({ rounds: mutationRounds, samplesPerRound: mutationSamples, operations, locations }),
      }),
      capabilities: layoutCapabilities.filter((capability) => capability.family === family),
      layoutResults: Object.freeze(baselineResults),
      layoutFailures: Object.freeze(baselineFailures),
      layoutMutationResults: Object.freeze(mutationResults),
    });
    if (json !== null) json.textContent = JSON.stringify(report, null, 2);
    setStatus('Complete.');
    publish('complete', { report });
  } catch (error) {
    const message = `Failed during ${currentStatus}: ${errorMessage(error)}`;
    setStatus(message);
    publish('error', { message });
    if (!embedded) throw error;
  } finally {
    runButton?.removeAttribute('disabled');
  }
}

async function runBaselineRound(adapter: LayoutBenchmarkAdapter): Promise<RawBaselineRound> {
  mountHost.replaceChildren();
  const startedAt = performance.now();
  const mounted = adapter.mount(mountHost, fixture);
  try {
    const setupMs = performance.now() - startedAt;
    await waitForItems(mountHost);
    const firstItemsMs = performance.now() - startedAt;
    await waitForCorrectLayout(mounted.scroller, fixture);
    const stableLayoutMs = performance.now() - startedAt;
    const sampleCount = warmupScrolls + scrollSamples;
    const samples: number[] = [];
    for (let index = 0; index < sampleCount; index += 1) {
      const fraction = (((index + 1) * 19) % 47) / 46;
      const left = Math.floor(Math.max(0, mounted.scroller.scrollWidth - mounted.scroller.clientWidth) * fraction);
      const top = Math.floor(Math.max(0, mounted.scroller.scrollHeight - mounted.scroller.clientHeight) * fraction);
      const elapsed = await measureScroll(mounted.scroller, fixture, left, top);
      if (index >= warmupScrolls) samples.push(elapsed);
      if (embedded) await yieldToBrowser();
    }
    return Object.freeze({
      setupMs, firstItemsMs, stableLayoutMs,
      scrollSamples: Object.freeze(samples),
      renderedItems: mountHost.querySelectorAll('.bench-item').length,
      domElements: mountHost.querySelectorAll('*').length,
    });
  } finally {
    mounted.unmount();
    mountHost.replaceChildren();
  }
}

async function runMutationCondition(
  adapter: LayoutBenchmarkAdapter,
  scenario: LayoutMutationScenario,
  onBatch: (result: LayoutMutationResult, completedBatches: number) => void,
): Promise<LayoutMutationResult> {
  const samples: number[] = [];
  const failureCodes: string[] = [];
  let failedSamples = 0;
  let previousStatistics: ReturnType<typeof distributionSnapshot> = undefined;
  let failureReproduction: FailureReproductionStreak | undefined;
  let earlyStopReason: LayoutMutationResult['earlyStopReason'] = null;
  const { before: initial, operation, location } = scenario;
  for (let batch = 0; batch < mutationRounds; batch += 1) {
    mountHost.replaceChildren();
    let mounted: MountedLayoutAdapter | undefined;
    let attemptedSamples = 0;
    const batchOutcomes: FailureOutcomeLike[] = [];
    try {
      mounted = adapter.mount(mountHost, initial);
      await waitForItems(mountHost);
      await positionMutation(mounted.scroller, scenario.before, location);
      for (let sample = 0; sample < mutationSamples; sample += 1) {
        attemptedSamples += 1;
        try {
          const startedAt = performance.now();
          mounted.update(scenario.after);
          await waitForCorrectLayout(mounted.scroller, scenario.after, mutationTimeoutMs);
          const elapsed = performance.now() - startedAt;
          samples.push(elapsed);
          batchOutcomes.push(Object.freeze({ elapsedMs: elapsed, failures: Object.freeze([]) }));
          if (exceedsEmbeddedLongTaskBudget(embedded, elapsed)) earlyStopReason = 'interactive-budget';
        } catch (error) {
          failedSamples += 1;
          const code = classifyFailure(error);
          failureCodes.push(code);
          batchOutcomes.push(Object.freeze({ elapsedMs: null, failures: Object.freeze([{ code }]) }));
        }
        if (earlyStopReason === 'interactive-budget') break;
        if (sample + 1 < mutationSamples) {
          try {
            mounted.update(initial);
            await waitForCorrectLayout(mounted.scroller, initial, mutationTimeoutMs);
            await positionMutation(mounted.scroller, initial, location);
          } catch (error) {
            failureCodes.push(`reset-${classifyFailure(error)}`);
            mounted.unmount();
            mountHost.replaceChildren();
            mounted = adapter.mount(mountHost, initial);
            await waitForItems(mountHost);
            await positionMutation(mounted.scroller, initial, location);
          }
        }
        if (embedded) await yieldToBrowser();
      }
    } catch (error) {
      const remaining = mutationSamples - attemptedSamples;
      const code = classifyFailure(error);
      failedSamples += remaining;
      failureCodes.push(code);
      for (let index = 0; index < remaining; index += 1) {
        batchOutcomes.push(Object.freeze({ elapsedMs: null, failures: Object.freeze([{ code }]) }));
      }
    } finally {
      mounted?.unmount();
      mountHost.replaceChildren();
    }
    onBatch(aggregateLayoutMutation(adapter, operation, location, samples, failedSamples, failureCodes), batch + 1);
    if (earlyStopReason === 'interactive-budget') break;
    failureReproduction = advanceFailureReproduction(
      failureReproduction,
      reproducibleFailureSignature(batchOutcomes, mutationSamples),
    );
    if ((failureReproduction?.rounds ?? 0) >= 2) {
      earlyStopReason = 'reproducible-failure';
      break;
    }
    const currentStatistics = distributionSnapshot(samples);
    if (failedSamples === 0 && distributionIsStable(previousStatistics, currentStatistics, {
      minimumSamples: 30,
      medianRelativeTolerance: 0.05,
      p95RelativeTolerance: 0.1,
    })) {
      earlyStopReason = 'stable-statistics';
      break;
    }
    previousStatistics = currentStatistics;
    await yieldToBrowser();
  }
  return aggregateLayoutMutation(adapter, operation, location, samples, failedSamples, failureCodes, earlyStopReason);
}

function aggregateLayoutMutation(
  adapter: LayoutBenchmarkAdapter,
  operation: LayoutMutationOperation,
  location: LayoutMutationLocation,
  samples: readonly number[],
  failedSamples: number,
  failureCodes: readonly string[],
  earlyStopReason: LayoutMutationResult['earlyStopReason'] = null,
): LayoutMutationResult {
  const sorted = [...samples].sort(ascending);
  return Object.freeze({
    family, mode: adapter.mode, library: adapter.name, version: adapter.version, stack: adapter.stack,
    operation, location,
    medianMs: sorted.length === 0 ? null : round(percentile(sorted, 0.5)),
    p95Ms: sorted.length < 30 ? null : round(percentile(sorted, 0.95)),
    samples: samples.length,
    failedSamples,
    failureCodes: Object.freeze([...new Set(failureCodes)].sort()),
    plannedSamples: mutationRounds * mutationSamples,
    earlyStopped: earlyStopReason !== null,
    earlyStopReason,
  });
}

async function positionMutation(
  scroller: HTMLElement,
  fixture: LayoutBenchmarkFixture,
  location: LayoutMutationLocation,
): Promise<void> {
  const targetIndex = location === 'start' ? 0 : location === 'end' ? fixture.items.length - 1 : Math.floor(fixture.items.length / 2);
  const target = fixture.items[targetIndex]!;
  scroller.scrollLeft = Math.max(0, target.x - VIEWPORT_WIDTH / 2);
  scroller.scrollTop = Math.max(0, target.y - VIEWPORT_HEIGHT / 2);
  await waitForCorrectLayout(scroller, fixture);
}

function aggregateBaseline(
  adapter: LayoutBenchmarkAdapter,
  raw: readonly RawBaselineRound[],
): LayoutBaselineResult {
  const scrolls = raw.flatMap((round) => round.scrollSamples).sort(ascending);
  const median = percentile(scrolls, 0.5);
  const deviations = scrolls.map((sample) => Math.abs(sample - median)).sort(ascending);
  const last = raw.at(-1)!;
  return Object.freeze({
    family, mode: adapter.mode, library: adapter.name, version: adapter.version, stack: adapter.stack,
    setupMs: medianOf(raw.map((entry) => entry.setupMs)),
    firstItemsMs: medianOf(raw.map((entry) => entry.firstItemsMs)),
    stableLayoutMs: medianOf(raw.map((entry) => entry.stableLayoutMs)),
    scrollMedianMs: round(median),
    scrollP95Ms: round(percentile(scrolls, 0.95)),
    scrollMadMs: round(percentile(deviations, 0.5)),
    scrollSampleCount: scrolls.length,
    completedRounds: raw.length,
    plannedRounds: rounds,
    renderedItems: last.renderedItems,
    domElements: last.domElements,
  });
}

function measureScroll(
  scroller: HTMLElement,
  expected: LayoutBenchmarkFixture,
  left: number,
  top: number,
): Promise<number> {
  return new Promise((resolve, reject) => {
    const previousLeft = scroller.scrollLeft;
    const previousTop = scroller.scrollTop;
    let startedAt: number | undefined;
    const owner = createObservationOwner(scroller, () => {
      if (startedAt === undefined) return;
      try {
        assertCorrectLayout(captureLayout(scroller), expected);
        const elapsed = performance.now() - startedAt;
        owner.dispose();
        resolve(elapsed);
      } catch (error) {
        owner.remember(error);
      }
    }, reject);
    const onScroll = (event: Event): void => {
      if (event.target !== scroller || startedAt !== undefined) return;
      startedAt = performance.now();
      owner.check();
    };
    scroller.addEventListener('scroll', onScroll, { passive: true });
    owner.addCleanup(() => scroller.removeEventListener('scroll', onScroll));
    scroller.scrollTo({ left, top, behavior: 'instant' });
    if (scroller.scrollLeft === previousLeft && scroller.scrollTop === previousTop) {
      startedAt = performance.now();
      owner.check();
    }
  });
}

function waitForCorrectLayout(
  scroller: HTMLElement,
  expected: LayoutBenchmarkFixture,
  timeout = timeoutMs,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const owner = createObservationOwner(scroller, () => {
      try {
        assertCorrectLayout(captureLayout(scroller), expected);
        owner.dispose();
        resolve();
      } catch (error) {
        owner.remember(error);
      }
    }, reject, timeout);
    owner.check();
  });
}

function createObservationOwner(
  scroller: HTMLElement,
  check: () => void,
  reject: (reason: Error) => void,
  timeoutDuration = timeoutMs,
) {
  let active = true;
  let queued = false;
  let frame = 0;
  let timeout = 0;
  let lastError = new Error('Layout has not settled.');
  const cleanups: (() => void)[] = [];
  const dispose = (): void => {
    if (!active) return;
    active = false;
    mutationObserver.disconnect();
    resizeObserver.disconnect();
    cancelAnimationFrame(frame);
    clearTimeout(timeout);
    for (const cleanup of cleanups.splice(0)) cleanup();
  };
  const schedule = (): void => {
    if (!active || queued) return;
    queued = true;
    queueMicrotask(() => {
      queued = false;
      if (active) check();
    });
  };
  const mutationObserver = new MutationObserver(schedule);
  const resizeObserver = new ResizeObserver(schedule);
  const frameCheck = (): void => {
    if (!active) return;
    check();
    if (active) frame = requestAnimationFrame(frameCheck);
  };
  mutationObserver.observe(scroller, { subtree: true, childList: true, attributes: true, characterData: true });
  resizeObserver.observe(scroller);
  timeout = window.setTimeout(() => {
    if (!active) return;
    dispose();
    reject(lastError);
  }, timeoutDuration);
  frame = requestAnimationFrame(frameCheck);
  return Object.freeze({
    check: schedule,
    remember(error: unknown) { lastError = error instanceof Error ? error : new Error(String(error)); },
    addCleanup(cleanup: () => void) { cleanups.push(cleanup); },
    dispose,
  });
}

function captureLayout(scroller: HTMLElement): LayoutSnapshot {
  const viewport = scroller.getBoundingClientRect();
  const items = Array.from(scroller.querySelectorAll<HTMLElement>('.bench-item'), (element) => {
    const rect = element.getBoundingClientRect();
    return Object.freeze({
      id: element.dataset['id'] ?? '',
      index: Number(element.dataset['index']),
      x: rect.left - viewport.left + scroller.scrollLeft,
      y: rect.top - viewport.top + scroller.scrollTop,
      width: rect.width,
      height: rect.height,
    });
  });
  return Object.freeze({
    observedAt: performance.now(),
    scrollWidth: scroller.scrollWidth,
    scrollHeight: scroller.scrollHeight,
    scrollLeft: scroller.scrollLeft,
    scrollTop: scroller.scrollTop,
    viewportWidth: scroller.clientWidth,
    viewportHeight: scroller.clientHeight,
    items: Object.freeze(items),
  });
}

function assertCorrectLayout(snapshot: LayoutSnapshot, fixture: LayoutBenchmarkFixture): void {
  if (Math.abs(snapshot.scrollWidth - fixture.contentWidth) > tolerance) {
    throw new Error(`content-width:${snapshot.scrollWidth}:${fixture.contentWidth}`);
  }
  if (Math.abs(snapshot.scrollHeight - fixture.contentHeight) > tolerance) {
    throw new Error(`content-height:${snapshot.scrollHeight}:${fixture.contentHeight}`);
  }
  const expectedByID = new Map(expectedVisibleItems(
    fixture,
    snapshot.scrollLeft,
    snapshot.scrollTop,
    0,
  ).map((item) => [item.id, item]));
  const seen = new Set<string>();
  for (const item of snapshot.items) {
    if (item.id.length === 0 || !Number.isInteger(item.index)) throw new Error('invalid-item-identity');
    if (seen.has(item.id)) throw new Error(`duplicate-item:${item.id}`);
    seen.add(item.id);
    const expected = fixture.items[item.index];
    if (expected?.id !== item.id) throw new Error(`stale-item:${item.id}:${item.index}`);
    if (
      Math.abs(item.x - expected.x) > tolerance
      || Math.abs(item.y - expected.y) > tolerance
      || Math.abs(item.width - expected.width) > tolerance
      || Math.abs(item.height - expected.height) > tolerance
    ) throw new Error(`geometry:${item.id}`);
  }
  for (const expected of expectedByID.values()) {
    if (!seen.has(expected.id)) throw new Error(`missing-visible-item:${expected.id}`);
  }
  if (expectedByID.size > 0 && snapshot.items.length === 0) throw new Error('empty-viewport');
}

function waitForItems(host: HTMLElement): Promise<void> {
  if (host.querySelector('.bench-item') !== null) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const observer = new MutationObserver(() => {
      if (host.querySelector('.bench-item') === null) return;
      observer.disconnect();
      clearTimeout(timeout);
      resolve();
    });
    observer.observe(host, { childList: true, subtree: true });
    const timeout = window.setTimeout(() => {
      observer.disconnect();
      reject(new Error('first-items-timeout'));
    }, timeoutMs);
  });
}

function renderBaselineResult(result: LayoutBaselineResult): HTMLTableRowElement {
  const row = document.createElement('tr');
  row.innerHTML = `<td>${result.family}</td><td>${result.mode}</td><td>${result.library}</td><td>${result.setupMs}ms</td><td>${result.firstItemsMs}ms</td><td>${result.stableLayoutMs}ms</td><td>${result.scrollMedianMs}ms</td><td>${result.scrollP95Ms}ms</td>`;
  return row;
}

function renderMutationResult(result: LayoutMutationResult): HTMLTableRowElement {
  const row = document.createElement('tr');
  row.innerHTML = `<td>${result.family}</td><td>${result.mode}</td><td>${result.library}</td><td>${result.operation}</td><td>${result.location}</td><td>${result.medianMs ?? '—'}</td><td>${result.p95Ms ?? '—'}</td><td>${result.failedSamples}</td>`;
  return row;
}

let currentStatus = 'Ready.';
function setStatus(message: string): void {
  currentStatus = message;
  if (status !== null) status.textContent = message;
}

function publish(type: string, detail: Readonly<Record<string, unknown>> = {}): void {
  if (!embedded || window.parent === window) return;
  window.parent.postMessage({ channel: 'sectile-virtual-benchmark', type, ...detail }, window.location.origin);
}

function classifyFailure(error: unknown): string {
  const message = errorMessage(error);
  const separator = message.indexOf(':');
  return separator < 0 ? message : message.slice(0, separator);
}

function parseLayoutMode(value: string | null): LayoutSizeMode | undefined {
  return value === 'fixed' || value === 'estimated' || value === 'automatic' || value === 'positioned'
    ? value
    : undefined;
}

function parseOperation(value: string | null): LayoutMutationOperation | undefined {
  return value === 'insert' || value === 'move' || value === 'remove' || value === 'resize' ? value : undefined;
}

function parseLocation(value: string | null): LayoutMutationLocation | undefined {
  return value === 'start' || value === 'middle' || value === 'end' ? value : undefined;
}

function boundedInteger(value: string | null, minimum: number, maximum: number): number | undefined {
  if (value === null) return undefined;
  const parsed = Number.parseInt(value, 10);
  return Number.isSafeInteger(parsed) && parsed >= minimum && parsed <= maximum ? parsed : undefined;
}

function medianOf(values: readonly number[]): number { return round(percentile([...values].sort(ascending), 0.5)); }
function percentile(sorted: readonly number[], ratio: number): number { return sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * ratio) - 1))] ?? 0; }
function ascending(left: number, right: number): number { return left - right; }
function round(value: number): number { return Number(value.toFixed(3)); }
function errorMessage(error: unknown): string { return error instanceof Error ? error.message : String(error); }
function yieldToBrowser(): Promise<void> { return new Promise((resolve) => setTimeout(resolve, 0)); }
function requireElement<Element extends HTMLElement>(selector: string): Element {
  const element = document.querySelector<Element>(selector);
  if (element === null) throw new Error(`Missing ${selector}.`);
  return element;
}
