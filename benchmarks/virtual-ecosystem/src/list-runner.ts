import { fixedAdapters, type BenchmarkAdapter, type MountedAdapter } from './adapters.js';
import { ITEM_COUNT, items, ROW_HEIGHT, VIEWPORT_HEIGHT, type RowProfile } from './constants.js';
import { createHeightOracle, type ExpectedLayout, type HeightOracle } from './fixture.js';
import {
  clampedScrollOffset,
  expectedScrollerExtent,
  requiresExactTotalHeight,
  visibleContentRange,
} from './baseline-policy.js';
import { waitForElement, waitForPresentationBoundary } from './dom-observation.js';
import {
  EMBEDDED_LONG_TASK_BUDGET_MS,
  exceedsEmbeddedLongTaskBudget,
} from './interactive-budget.js';
import {
  distributionIsStable,
  distributionSnapshot,
  formatElapsed,
  type DistributionSnapshot,
} from './adaptive-sampling.js';
import {
  automaticMutableAdapters,
  mutableAdapters,
  type MutableBenchmarkAdapter,
} from './mutable-adapters.js';
import {
  mutationConditions,
  runMutationBenchmarks,
  type MutationBenchmarkFilter,
  type MutationBenchmarkResult,
} from './mutation-runner.js';
import './style.css';

type HeightMode = 'fixed' | 'estimated' | 'automatic';

interface BenchmarkSource {
  readonly gitCommit: string;
  readonly gitDirty: boolean;
  readonly buildFingerprint: string;
}

interface BenchmarkRunMetadata {
  readonly id: string;
  readonly observedAt: string;
  readonly completedAt: string;
  readonly durationMs: number;
  readonly source: BenchmarkSource;
}

interface RunReferences {
  readonly runIds: readonly string[];
}

declare const __BENCHMARK_SOURCE__: BenchmarkSource;

interface BenchmarkCase {
  readonly rowProfile: RowProfile;
  readonly mode: HeightMode;
  readonly name: string;
  readonly version: string;
  readonly stack: string;
  readonly mount: (host: HTMLElement) => MountedAdapter;
}

interface BenchmarkResult {
  readonly rowProfile: RowProfile;
  readonly mode: HeightMode;
  readonly library: string;
  readonly version: string;
  readonly stack: string;
  readonly firstInstanceSetupMs: number;
  readonly firstInstanceFirstRowsMs: number;
  readonly firstInstanceLayoutReadyMs: number;
  readonly firstInstancePresentationReadyMs: number;
  readonly setupMs: number;
  readonly firstRowsMs: number;
  readonly mountMs: number;
  readonly initialTotalHeightErrorPercent: number;
  readonly scrollTotalHeightErrorMedianPercent: number;
  readonly scrollTotalHeightErrorP95Percent: number;
  readonly scrollMedianMs: number;
  readonly scrollMedianLowerBoundMs: number;
  readonly scrollP95Ms: number;
  readonly scrollMadMs: number;
  readonly scrollProbeMedianMs: number;
  readonly scrollChecksMedian: number;
  readonly scrollSampleCount: number;
  readonly scrollNoOpSampleCount: number;
  readonly scrollRoundMedianRangeMs: readonly [number, number];
  readonly scrollRoundP95RangeMs: readonly [number, number];
  readonly renderedRows: number;
  readonly domElements: number;
  readonly completedRounds: number;
  readonly plannedRounds: number;
  readonly earlyStopReason: 'stable-statistics' | null;
}

interface FirstInstanceTiming {
  readonly setupMs: number;
  readonly firstRowsMs: number;
  readonly layoutReadyMs: number;
  readonly presentationReadyMs: number;
}

interface BaselineBenchmarkFailure {
  readonly rowProfile: RowProfile;
  readonly mode: HeightMode;
  readonly library: string;
  readonly version: string;
  readonly stack: string;
  readonly round: number;
  readonly elapsedMs: number;
  readonly message: string;
}

interface ScrollMeasurement {
  readonly trigger: 'native-scroll' | 'no-op';
  readonly elapsedMs: number;
  readonly lowerBoundMs: number;
  readonly probeMs: number;
  readonly checks: number;
  readonly totalHeightErrorPercent: number;
}

interface BaselineSample extends ScrollMeasurement {
  readonly round: number;
  readonly sample: number;
}

interface RawBenchmarkResult extends Omit<BenchmarkResult,
  | 'firstInstanceSetupMs'
  | 'firstInstanceFirstRowsMs'
  | 'firstInstanceLayoutReadyMs'
  | 'firstInstancePresentationReadyMs'
  | 'setupMs'
  | 'firstRowsMs'
  | 'mountMs'
  | 'scrollMedianMs'
  | 'scrollMedianLowerBoundMs'
  | 'scrollP95Ms'
  | 'scrollMadMs'
  | 'scrollProbeMedianMs'
  | 'scrollChecksMedian'
  | 'scrollSampleCount'
  | 'scrollNoOpSampleCount'
  | 'scrollRoundMedianRangeMs'
  | 'scrollRoundP95RangeMs'
  | 'scrollTotalHeightErrorMedianPercent'
  | 'scrollTotalHeightErrorP95Percent'
  | 'completedRounds'
  | 'plannedRounds'
  | 'earlyStopReason'
> {
  readonly setupMs: number;
  readonly firstRowsMs: number;
  readonly mountMs: number;
  readonly scrollMeasurements: readonly ScrollMeasurement[];
}

interface BaselineRowSnapshot {
  readonly index: number;
  readonly rawIndex: string | undefined;
  readonly top: number;
  readonly bottom: number;
  readonly height: number;
}

interface BaselineLayoutSnapshot {
  readonly observedAt: number;
  readonly scrollHeight: number;
  readonly clientHeight: number;
  readonly scrollTop: number;
  readonly viewportTop: number;
  readonly viewportBottom: number;
  readonly rows: readonly BaselineRowSnapshot[];
}

interface HeightModeSupport {
  readonly library: string;
  readonly fixed: true;
  readonly estimated: true;
  readonly automatic: boolean;
  readonly automaticNote: string;
}

declare global {
  interface Window {
    __sectileVirtualBenchmarkResults?: readonly BenchmarkResult[];
    __sectileVirtualBenchmarkReport?: {
      readonly source: BenchmarkSource;
      readonly runs: Readonly<Record<string, BenchmarkRunMetadata>>;
      readonly baselineResults: readonly (BenchmarkResult & RunReferences)[];
      readonly baselineFailures: readonly (BaselineBenchmarkFailure & RunReferences)[];
      readonly baselineSamples: Readonly<Record<string, readonly (BaselineSample & { readonly runId: string })[]>>;
      readonly mutationResults: readonly (MutationBenchmarkResult & RunReferences)[];
      readonly heightModeSupport: readonly HeightModeSupport[];
    };
  }
}

const search = new URLSearchParams(window.location.search);
const EMBEDDED = search.has('embedded');
const FIRST_INSTANCE_WORKER = search.has('first-instance-worker');
const FIRST_INSTANCE_CHANNEL = 'sectile-virtual-first-instance';
const QUICK_RUN = search.has('quick');
const requestedBaselineRounds = positiveInteger(search.get('baseline-rounds'));
const ADAPTIVE_BASELINE = !QUICK_RUN && requestedBaselineRounds === undefined;
const ROUNDS = requestedBaselineRounds ?? (QUICK_RUN ? 1 : 5);
const MINIMUM_BASELINE_ROUNDS = ADAPTIVE_BASELINE ? 3 : ROUNDS;
const BASELINE_MEDIAN_RELATIVE_TOLERANCE = 0.05;
const BASELINE_P95_RELATIVE_TOLERANCE = 0.1;
const WARMUP_SCROLLS = nonNegativeInteger(search.get('warmup-scrolls')) ?? (QUICK_RUN ? 1 : 5);
const RECORDED_SCROLLS = positiveInteger(search.get('scroll-samples')) ?? (QUICK_RUN ? 2 : 20);
const FRAME_TIMEOUT_MS = 4_000;
const STABLE_FAILURE_MIN_MS = 300;
const STABLE_FAILURE_FRAMES = 8;
const HEIGHT_TOLERANCE_PX = 2;
const rowProfile = parseRowProfile(search.get('row-profile'));

const benchmarkCases = Object.freeze([
  ...(rowProfile === 'uniform' ? fixedAdapters.map((adapter) => fixedCase(adapter)) : []),
  ...mutableAdapters.map((adapter) => dynamicCase(adapter, rowProfile)),
  ...automaticMutableAdapters.map((adapter) => dynamicCase(adapter, rowProfile)),
]);
const libraryFilter = search.get('library');
const baselineModeFilter = parseBaselineHeightMode(search.get('baseline-mode'));
const selectedLibraryNames = [...new Set(benchmarkCases
  .filter((entry) => (
    (!search.has('sectile') || entry.name === 'Sectile Virtual')
    && (libraryFilter === null || entry.name === libraryFilter)
  ))
  .map((entry) => entry.name))];
const activeCases = benchmarkCases.filter((entry) => (
  (!search.has('sectile') || entry.name === 'Sectile Virtual')
  && (libraryFilter === null || entry.name === libraryFilter)
  && (baselineModeFilter === undefined || entry.mode === baselineModeFilter)
  && (!search.has('fixed') || entry.mode === 'fixed')
));
const BASELINE_ROTATION_STEP = rotationStep(activeCases.length, ROUNDS);
const BASELINE_ONLY = search.has('baseline-only');
const MUTATIONS_ONLY = search.has('mutations-only');
const mutationFilter: MutationBenchmarkFilter = Object.freeze({
  sizeMode: parseHeightMode(search.get('mutation-mode')),
  operation: parseMutationOperation(search.get('mutation-operation')),
  location: parseMutationLocation(search.get('mutation-location')),
});

const automaticNames = new Set(automaticMutableAdapters.map((adapter) => adapter.name));
const automaticNotes: Readonly<Record<string, string>> = Object.freeze({
  'TanStack Virtual': 'estimateSize is required by the public API.',
  'react-window': 'A numeric rowHeight or dynamic defaultRowHeight is required.',
  'react-virtualized': 'CellMeasurerCache needs a defaultHeight to estimate unmeasured rows.',
  'Vue Virtual Scroller': 'DynamicScroller requires minItemSize for its initial layout.',
});
const heightModeSupport: readonly HeightModeSupport[] = Object.freeze(fixedAdapters.map((adapter) => Object.freeze({
  library: adapter.name,
  fixed: true,
  estimated: true,
  automatic: automaticNames.has(adapter.name),
  automaticNote: automaticNames.has(adapter.name)
    ? 'The application does not provide a height or estimate.'
    : automaticNotes[adapter.name] ?? 'No automatic adapter is available.',
})));

const root = document.querySelector<HTMLElement>('#app');
if (root === null) throw new Error('Missing benchmark root.');
document.documentElement.style.setProperty('--benchmark-row-height', `${ROW_HEIGHT}px`);

root.innerHTML = EMBEDDED || FIRST_INSTANCE_WORKER ? `
  <div id="mount" aria-hidden="true"></div>
` : `
  <header>
    <h1>Virtualization ecosystem benchmark</h1>
    <p>${ITEM_COUNT.toLocaleString()} rows · ${ROW_HEIGHT}px common estimate · ${rowProfile} DOM-height profile · fixed, estimated, and no-height-input conditions · 720 × 480 viewport</p>
    <button type="button" id="run">Run benchmark</button>
  </header>
  <section aria-live="polite">
    <p id="status">Ready.</p>
    <div id="mount"></div>
    <h2>Initial render and scrolling</h2>
    <table>
      <thead><tr><th>Row profile</th><th>Height input</th><th>Library</th><th>Stack</th><th>First layout</th><th>First presentation</th><th>Warm setup</th><th>Warm first rows</th><th>Warm layout</th><th>Scroll median</th><th>Scroll p95</th></tr></thead>
      <tbody id="results"></tbody>
    </table>
    <h2>Height input support</h2>
    <table>
      <thead><tr><th>Library</th><th>Fixed</th><th>Estimated</th><th>No height input</th><th>Note</th></tr></thead>
      <tbody id="support-results"></tbody>
    </table>
    <h2>Mutation results</h2>
    <table>
      <thead><tr><th>Row profile</th><th>Height input</th><th>Library</th><th>Operation</th><th>Location</th><th>Median</th><th>p95</th><th>Clean</th><th>Recovered</th><th>Failed</th><th>Failures</th></tr></thead>
      <tbody id="mutation-results"></tbody>
    </table>
    <pre id="json"></pre>
  </section>
`;

const runButton = document.querySelector<HTMLButtonElement>('#run');
const status = document.querySelector<HTMLElement>('#status');
const mountHost = document.querySelector<HTMLElement>('#mount');
const resultsBody = document.querySelector<HTMLElement>('#results');
const supportResultsBody = document.querySelector<HTMLElement>('#support-results');
const mutationResultsBody = document.querySelector<HTMLElement>('#mutation-results');
const json = document.querySelector<HTMLElement>('#json');
if (mountHost === null) throw new Error('Benchmark mount host is missing.');
const benchmarkMountHost: HTMLElement = mountHost;
if (!EMBEDDED && !FIRST_INSTANCE_WORKER && (
  runButton === null
  || status === null
  || resultsBody === null
  || supportResultsBody === null
  || mutationResultsBody === null
  || json === null
)) throw new Error('Benchmark UI is incomplete.');

if (!FIRST_INSTANCE_WORKER) {
  if (supportResultsBody !== null) for (const support of heightModeSupport) supportResultsBody.append(renderSupport(support));
  runButton?.addEventListener('click', () => { void runAll(); });
  if (EMBEDDED) queueMicrotask(() => { void runAll(); });
} else queueMicrotask(() => { void runFirstInstanceWorker(); });

let currentStatus = 'Ready.';

function setStatus(message: string): void {
  currentStatus = message;
  if (status !== null) status.textContent = message;
}

function publish(type: string, detail: Readonly<Record<string, unknown>> = {}): void {
  if (!EMBEDDED || window.parent === window) return;
  window.parent.postMessage({ channel: 'sectile-virtual-benchmark', type, ...detail }, window.location.origin);
}

async function runAll(): Promise<void> {
  const runId = crypto.randomUUID();
  const observedAt = new Date().toISOString();
  const runStartedAt = performance.now();
  if (runButton !== null) runButton.disabled = true;
  resultsBody?.replaceChildren();
  mutationResultsBody?.replaceChildren();
  if (json !== null) json.textContent = '';
  const raw = new Map<string, RawBenchmarkResult[]>();
  const firstInstanceTimings = new Map<string, FirstInstanceTiming>();
  const baselineFailures: BaselineBenchmarkFailure[] = [];
  const baselineFailedCases = new Set<string>();
  const baselineEarlyStops = new Set<string>();
  const baselineStatistics = new Map<string, DistributionSnapshot>();
  const baselineTotal = activeCases.length * ROUNDS;
  let baselineResolved = 0;
  let baselineExecuted = 0;
  try {
    if (!MUTATIONS_ONLY && activeCases.length === 0) {
      throw new Error('No supported baseline conditions match the selected filters.');
    }
    setStatus(`Calibrating ${rowProfile} row heights…`);
    publish('progress', {
      phase: 'calibration',
      message: currentStatus,
      completed: 0,
      total: 1,
      run: Object.freeze({ id: runId, observedAt, source: __BENCHMARK_SOURCE__, environment: navigator.userAgent }),
    });
    const oracle = await createHeightOracle(rowProfile);
    if (!MUTATIONS_ONLY) {
      for (let index = 0; index < activeCases.length; index += 1) {
        const benchmarkCase = activeCases[index]!;
        setStatus(`First instance ${index + 1}/${activeCases.length} · ${benchmarkCase.mode} · ${benchmarkCase.name}…`);
        publish('progress', { phase: 'first-instance', message: currentStatus, completed: index, total: activeCases.length });
        firstInstanceTimings.set(caseKey(benchmarkCase), await measureIsolatedFirstInstance(benchmarkCase));
      }
      for (let index = 0; index < activeCases.length; index += 1) {
        const benchmarkCase = activeCases[index]!;
        setStatus(`Warming ${index + 1}/${activeCases.length} · ${benchmarkCase.mode} · ${benchmarkCase.name}…`);
        publish('progress', { phase: 'warmup', message: currentStatus, completed: index, total: activeCases.length });
        await idleFrame();
        await warmCase(benchmarkCase, benchmarkMountHost, oracle);
        await idleFrame();
      }
    }
    for (let roundIndex = 0; roundIndex < (MUTATIONS_ONLY ? 0 : ROUNDS); roundIndex += 1) {
      const order = rotate(activeCases, roundIndex * BASELINE_ROTATION_STEP);
      for (const benchmarkCase of order) {
        const key = caseKey(benchmarkCase);
        if (baselineEarlyStops.has(key) || baselineFailedCases.has(key)) {
          baselineResolved += 1;
          setStatus(baselineProgress(
            baselineResolved,
            baselineExecuted,
            baselineTotal,
            runStartedAt,
            `${benchmarkCase.mode} · ${benchmarkCase.name} · ${baselineFailedCases.has(key) ? 'stopped after failure' : 'stable statistics'}`,
          ));
          publish('progress', { phase: 'baseline', message: currentStatus, completed: baselineResolved, total: baselineTotal });
          continue;
        }
        setStatus(`Round ${roundIndex + 1}/${ROUNDS} · ${benchmarkCase.mode} · ${benchmarkCase.name}…`);
        publish('progress', { phase: 'baseline', message: currentStatus, completed: baselineResolved, total: baselineTotal });
        await idleFrame();
        const caseStartedAt = performance.now();
        let result: RawBenchmarkResult;
        try {
          result = await runCase(benchmarkCase, benchmarkMountHost, oracle);
        } catch (error) {
          const reason = error instanceof Error ? error.message : String(error);
          baselineFailedCases.add(key);
          baselineFailures.push(Object.freeze({
            rowProfile,
            mode: benchmarkCase.mode,
            library: benchmarkCase.name,
            version: benchmarkCase.version,
            stack: benchmarkCase.stack,
            round: roundIndex + 1,
            elapsedMs: round(performance.now() - caseStartedAt),
            message: reason,
          }));
          resultsBody?.append(renderBaselineFailure(benchmarkCase, reason));
          baselineResolved += 1;
          baselineExecuted += 1;
          publish('checkpoint', {
            phase: 'baseline',
            message: reason,
            completed: baselineResolved,
            total: baselineTotal,
            baselineFailure: baselineFailures.at(-1),
            baselineSampleKey: key,
            baselineSamples: baselineSampleRecords(runId, raw.get(key) ?? []),
          });
          await idleFrame();
          continue;
        }
        const samples = raw.get(key) ?? [];
        samples.push(result);
        raw.set(key, samples);
        baselineResolved += 1;
        baselineExecuted += 1;
        const currentStatistics = distributionSnapshot(samples.flatMap((sample) => (
          sample.scrollMeasurements.map((measurement) => measurement.elapsedMs)
        )));
        if (ADAPTIVE_BASELINE && distributionIsStable(baselineStatistics.get(key), currentStatistics, {
          minimumSamples: MINIMUM_BASELINE_ROUNDS * RECORDED_SCROLLS,
          medianRelativeTolerance: BASELINE_MEDIAN_RELATIVE_TOLERANCE,
          p95RelativeTolerance: BASELINE_P95_RELATIVE_TOLERANCE,
        })) baselineEarlyStops.add(key);
        if (currentStatistics !== undefined) baselineStatistics.set(key, currentStatistics);
        setStatus(baselineProgress(
          baselineResolved,
          baselineExecuted,
          baselineTotal,
          runStartedAt,
          `${benchmarkCase.mode} · ${benchmarkCase.name}`,
        ));
        publish('checkpoint', {
          phase: 'baseline',
          message: currentStatus,
          completed: baselineResolved,
          total: baselineTotal,
          ...(samples.length >= MINIMUM_BASELINE_ROUNDS
            ? { baselineResult: aggregate(benchmarkCase, samples, baselineEarlyStops.has(key), firstInstanceTimings.get(key)) }
            : {}),
          baselineSampleKey: key,
          baselineSamples: baselineSampleRecords(runId, samples),
        });
        await idleFrame();
      }
    }
    const baselineCases = MUTATIONS_ONLY ? [] : activeCases;
    const baselineResults = baselineCases.flatMap((entry) => {
      const rounds = raw.get(caseKey(entry)) ?? [];
      const failed = baselineFailures.some((failure) => baselineFailureKey(failure) === caseKey(entry));
      const complete = baselineEarlyStops.has(caseKey(entry)) || rounds.length === ROUNDS;
      return !failed && complete
        ? [aggregate(entry, rounds, baselineEarlyStops.has(caseKey(entry)), firstInstanceTimings.get(caseKey(entry)))]
        : [];
    });
    const baselineSamples = Object.freeze(Object.fromEntries(baselineCases.map((entry) => [
      caseKey(entry),
      baselineSampleRecords(runId, raw.get(caseKey(entry)) ?? []),
    ])));
    if (resultsBody !== null) for (const result of baselineResults) resultsBody.append(renderResult(result));
    const mutationResults = BASELINE_ONLY
      ? Object.freeze([])
      : await runMutationBenchmarks(
          benchmarkMountHost,
          (message) => { setStatus(message); },
          rowProfile,
          oracle,
          selectedLibraryNames,
          mutationFilter,
          (result, progress) => {
            publish('checkpoint', {
              phase: 'mutations',
              message: progress.message,
              completed: progress.completed,
              total: progress.total,
              mutationResult: result,
            });
          },
        );
    if (mutationResultsBody !== null) for (const result of mutationResults) mutationResultsBody.append(renderMutationResult(result));
    const run = Object.freeze({
      id: runId,
      observedAt,
      completedAt: new Date().toISOString(),
      durationMs: round(performance.now() - runStartedAt),
      source: __BENCHMARK_SOURCE__,
    });
    const reportedBaselineResults = Object.freeze(baselineResults.map((result) => Object.freeze({ runIds: Object.freeze([runId]), ...result })));
    const reportedBaselineFailures = Object.freeze(baselineFailures.map((failure) => Object.freeze({ runIds: Object.freeze([runId]), ...failure })));
    const reportedMutationResults = Object.freeze(mutationResults.map((result) => Object.freeze({ runIds: Object.freeze([runId]), ...result })));
    const runs = Object.freeze({ [runId]: run });
    window.__sectileVirtualBenchmarkResults = Object.freeze(baselineResults);
    window.__sectileVirtualBenchmarkReport = Object.freeze({
      source: __BENCHMARK_SOURCE__,
      runs,
      baselineResults: reportedBaselineResults,
      baselineFailures: reportedBaselineFailures,
      baselineSamples,
      mutationResults: reportedMutationResults,
      heightModeSupport,
    });
    const report = {
      benchmark: 'sectile-virtual-ecosystem',
      protocolVersion: 12,
      environment: navigator.userAgent,
      source: __BENCHMARK_SOURCE__,
      runs,
      conditions: {
        family: 'list',
        itemCount: ITEM_COUNT,
        rowProfile,
        commonEstimateHeight: ROW_HEIGHT,
        heightDistribution: oracle.distribution,
        contentCorpusVersion: oracle.corpusVersion,
        contentVariants: oracle.contentVariants,
        viewport: [720, VIEWPORT_HEIGHT],
        overscanRows: 8,
        baseline: {
          adaptiveSampling: ADAPTIVE_BASELINE,
          rounds: ROUNDS,
          maximumRounds: ROUNDS,
          minimumRounds: MINIMUM_BASELINE_ROUNDS,
          scrollSamplesPerRound: RECORDED_SCROLLS,
          medianRelativeTolerance: BASELINE_MEDIAN_RELATIVE_TOLERANCE,
          p95RelativeTolerance: BASELINE_P95_RELATIVE_TOLERANCE,
          completion: rowProfile === 'uniform'
            ? 'exact target row, contiguous row geometry, correct browser scroll extent, and complete coverage of the content-bearing viewport region'
            : 'correct visible row content and geometry, contiguous coverage of the content-bearing viewport region, and a separately recorded scroll-extent estimate error',
          trigger: 'programmatic scrollTop change; native samples observe browser-generated scroll delivery at document capture, while an unchanged clamped offset is recorded as a no-op sample',
          observation: 'native timing starts when the browser begins scroll-event delivery and ends after DOM geometry has been read; no-op samples report zero scroll latency and retain the untimed geometry-probe cost',
          diagnostics: 'raw samples retain trigger kind, round, sample, lower and upper timing bounds, geometry-probe cost, and correctness-check count; summaries retain no-op counts and per-round ranges',
          stableFailureMinMs: STABLE_FAILURE_MIN_MS,
          stableFailureFrames: STABLE_FAILURE_FRAMES,
          timing: {
            firstInstance: 'one fresh same-origin browsing context per condition; recorded separately and excluded from warm medians',
            firstInstancePresentationReadyMs: 'time until the first correct layout reaches the next browser presentation opportunity',
            setupMs: 'warm median for adapter and framework setup through committed scroller output',
            firstRowsMs: 'warm median until the first benchmark rows exist',
            mountMs: rowProfile === 'uniform'
              ? 'time until browser scroll extent and visible content geometry are correct'
              : 'time until the initial visible content geometry is correct; scroll-extent estimate error is recorded separately',
          },
        },
        mutations: mutationConditions,
      },
      heightModeSupport,
      baselineResults: reportedBaselineResults,
      baselineFailures: reportedBaselineFailures,
      baselineSamples,
      mutationResults: reportedMutationResults,
    };
    if (json !== null) json.textContent = JSON.stringify(report, null, 2);
    setStatus('Complete.');
    publish('complete', { report });
  } catch (error) {
    const message = `Failed during ${currentStatus}: ${error instanceof Error ? error.message : String(error)}`;
    setStatus(message);
    publish('error', { message });
    if (!EMBEDDED) throw error;
  } finally {
    if (runButton !== null) runButton.disabled = false;
  }
}

function baselineSampleRecords(
  runId: string,
  rounds: readonly RawBenchmarkResult[],
): readonly (BaselineSample & { readonly runId: string })[] {
  return Object.freeze(rounds.flatMap((roundResult, roundIndex) => (
    roundResult.scrollMeasurements.map((measurement, sampleIndex) => Object.freeze({
      runId,
      round: roundIndex + 1,
      sample: sampleIndex + 1,
      ...measurement,
    }))
  )));
}

function parseHeightMode(value: string | null): MutationBenchmarkFilter['sizeMode'] {
  return value === 'estimated' || value === 'automatic' ? value : undefined;
}

function parseBaselineHeightMode(value: string | null): HeightMode | undefined {
  return value === 'fixed' || value === 'estimated' || value === 'automatic' ? value : undefined;
}

function positiveInteger(value: string | null): number | undefined {
  if (value === null) return undefined;
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

function nonNegativeInteger(value: string | null): number | undefined {
  if (value === null) return undefined;
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : undefined;
}

function parseRowProfile(value: string | null): RowProfile {
  return value === 'heterogeneous' ? 'heterogeneous' : 'uniform';
}

function parseMutationOperation(value: string | null): MutationBenchmarkFilter['operation'] {
  return value === 'insert' || value === 'move' || value === 'remove' || value === 'resize' ? value : undefined;
}

function parseMutationLocation(value: string | null): MutationBenchmarkFilter['location'] {
  return value === 'start' || value === 'middle' || value === 'end' ? value : undefined;
}

function fixedCase(adapter: BenchmarkAdapter): BenchmarkCase {
  return Object.freeze({ rowProfile: 'uniform', mode: 'fixed', ...adapter });
}

function dynamicCase(adapter: MutableBenchmarkAdapter, profile: RowProfile): BenchmarkCase {
  return Object.freeze({
    rowProfile: profile,
    mode: adapter.sizeMode,
    name: adapter.name,
    version: adapter.version,
    stack: adapter.stack,
    mount: (host: HTMLElement) => adapter.mount(host, items, profile),
  });
}

async function measureFirstInstance(
  benchmarkCase: BenchmarkCase,
  host: HTMLElement,
  oracle: HeightOracle,
): Promise<FirstInstanceTiming> {
  host.replaceChildren();
  const startedAt = performance.now();
  const mounted = benchmarkCase.mount(host);
  try {
    await waitForScroller(host);
    const setupMs = performance.now() - startedAt;
    await waitForAnyRows(host);
    const firstRowsMs = performance.now() - startedAt;
    const expectedLayout = oracle.layout(items);
    const strictTotalHeight = requiresExactTotalHeight(benchmarkCase.rowProfile);
    await waitForBaselineLayout(
      mounted.scroller,
      strictTotalHeight ? 0 : undefined,
      expectedLayout,
      strictTotalHeight,
    );
    const layoutReadyMs = performance.now() - startedAt;
    await waitForPresentationBoundary();
    return Object.freeze({
      setupMs,
      firstRowsMs,
      layoutReadyMs,
      presentationReadyMs: performance.now() - startedAt,
    });
  } finally {
    mounted.unmount();
    host.replaceChildren();
  }
}

async function warmCase(
  benchmarkCase: BenchmarkCase,
  host: HTMLElement,
  oracle: HeightOracle,
): Promise<void> {
  host.replaceChildren();
  const mounted = benchmarkCase.mount(host);
  try {
    await waitForAnyRows(host);
    const expectedLayout = oracle.layout(items);
    const strictTotalHeight = requiresExactTotalHeight(benchmarkCase.rowProfile);
    await waitForBaselineLayout(
      mounted.scroller,
      strictTotalHeight ? 0 : undefined,
      expectedLayout,
      strictTotalHeight,
    );
  } finally {
    mounted.unmount();
    host.replaceChildren();
  }
}

function measureIsolatedFirstInstance(benchmarkCase: BenchmarkCase): Promise<FirstInstanceTiming> {
  const source = new URL(window.location.href);
  source.searchParams.delete('embedded');
  source.searchParams.set('first-instance-worker', '');
  source.searchParams.set('row-profile', benchmarkCase.rowProfile);
  source.searchParams.set('library', benchmarkCase.name);
  source.searchParams.set('baseline-mode', benchmarkCase.mode);
  source.hash = '';
  const frame = document.createElement('iframe');
  frame.src = source.href;
  frame.tabIndex = -1;
  frame.setAttribute('aria-hidden', 'true');
  frame.style.cssText = 'position:fixed;left:-10000px;top:0;width:800px;height:600px;opacity:0;pointer-events:none;border:0';
  return new Promise((resolve, reject) => {
    let settled = false;
    const cleanup = (): void => {
      window.removeEventListener('message', receive);
      clearTimeout(timeoutID);
      frame.remove();
    };
    const finish = (callback: () => void): void => {
      if (settled) return;
      settled = true;
      cleanup();
      callback();
    };
    const receive = (event: MessageEvent): void => {
      if (event.origin !== window.location.origin || event.source !== frame.contentWindow) return;
      const message = event.data as Readonly<Record<string, unknown>> | null;
      if (message?.['channel'] !== FIRST_INSTANCE_CHANNEL) return;
      const timing = message['timing'];
      if (message['type'] === 'complete' && isFirstInstanceTiming(timing)) {
        finish(() => resolve(timing));
      } else if (message['type'] === 'error') {
        finish(() => reject(new Error(String(message['message'] ?? 'First-instance worker failed.'))));
      }
    };
    const timeoutID = window.setTimeout(() => {
      finish(() => reject(new Error(`Timed out measuring the first ${benchmarkCase.name} (${benchmarkCase.mode}) instance.`)));
    }, FRAME_TIMEOUT_MS * 3);
    window.addEventListener('message', receive);
    document.body.append(frame);
  });
}

async function runFirstInstanceWorker(): Promise<void> {
  try {
    if (activeCases.length !== 1) throw new Error(`Expected one first-instance condition, received ${activeCases.length}.`);
    const oracle = await createHeightOracle(rowProfile);
    const timing = await measureFirstInstance(activeCases[0]!, benchmarkMountHost, oracle);
    window.parent.postMessage({ channel: FIRST_INSTANCE_CHANNEL, type: 'complete', timing }, window.location.origin);
  } catch (error) {
    window.parent.postMessage({
      channel: FIRST_INSTANCE_CHANNEL,
      type: 'error',
      message: error instanceof Error ? error.message : String(error),
    }, window.location.origin);
  }
}

function isFirstInstanceTiming(value: unknown): value is FirstInstanceTiming {
  if (typeof value !== 'object' || value === null) return false;
  const timing = value as Readonly<Record<string, unknown>>;
  return ['setupMs', 'firstRowsMs', 'layoutReadyMs', 'presentationReadyMs']
    .every((key) => typeof timing[key] === 'number' && Number.isFinite(timing[key]));
}

async function runCase(benchmarkCase: BenchmarkCase, host: HTMLElement, oracle: HeightOracle): Promise<RawBenchmarkResult> {
  host.replaceChildren();
  const startedAt = performance.now();
  const mounted = benchmarkCase.mount(host);
  try {
    await waitForScroller(host);
    const setupMs = performance.now() - startedAt;
    await waitForAnyRows(host);
    const firstRowsMs = performance.now() - startedAt;
    const expectedLayout = oracle.layout(items);
    const strictTotalHeight = requiresExactTotalHeight(benchmarkCase.rowProfile);
    await waitForBaselineLayout(mounted.scroller, strictTotalHeight ? 0 : undefined, expectedLayout, strictTotalHeight);
    const mountMs = performance.now() - startedAt;
    const initialTotalHeightErrorPercent = totalHeightErrorPercent(
      mounted.scroller.scrollHeight,
      expectedScrollerExtent(expectedLayout.totalHeight, mounted.scroller.clientHeight),
    );
    const sampleCount = WARMUP_SCROLLS + RECORDED_SCROLLS;
    const fractions = Array.from({ length: sampleCount }, (_, index) => (((index + 1) * 19) % 47) / 46);
    const measurements: ScrollMeasurement[] = [];
    for (let index = 0; index < fractions.length; index += 1) {
      const fraction = fractions[index]!;
      const offset = Math.floor(Math.max(0, mounted.scroller.scrollHeight - VIEWPORT_HEIGHT) * fraction);
      const expected = strictTotalHeight
        ? expectedLayout.indexAt(offset + HEIGHT_TOLERANCE_PX)
        : undefined;
      const measurement = await measureScrollLayout(mounted.scroller, expected, offset, expectedLayout, strictTotalHeight);
      if (index >= WARMUP_SCROLLS) measurements.push(measurement);
      if (exceedsEmbeddedLongTaskBudget(EMBEDDED, measurement.elapsedMs)) {
        throw new Error(
          `Interactive runner stopped ${benchmarkCase.name} after a ${round(measurement.elapsedMs)}ms scroll exceeded the ${EMBEDDED_LONG_TASK_BUDGET_MS}ms responsiveness budget.`,
        );
      }
      if (EMBEDDED) await yieldToBrowser();
    }
    const renderedRows = host.querySelectorAll('.bench-row').length;
    const domElements = host.querySelectorAll('*').length;
    return Object.freeze({
      rowProfile: benchmarkCase.rowProfile,
      mode: benchmarkCase.mode,
      library: benchmarkCase.name,
      version: benchmarkCase.version,
      stack: benchmarkCase.stack,
      setupMs,
      firstRowsMs,
      mountMs,
      initialTotalHeightErrorPercent,
      scrollMeasurements: Object.freeze(measurements),
      renderedRows,
      domElements,
    });
  } finally {
    mounted.unmount();
    host.replaceChildren();
  }
}

function aggregate(
  benchmarkCase: BenchmarkCase,
  rounds: readonly RawBenchmarkResult[],
  stableStatistics: boolean,
  firstInstanceTiming: FirstInstanceTiming | undefined,
): BenchmarkResult {
  if (rounds.length < MINIMUM_BASELINE_ROUNDS) {
    throw new Error(`${benchmarkCase.name} (${benchmarkCase.mode}) produced ${rounds.length}/${MINIMUM_BASELINE_ROUNDS} required rounds.`);
  }
  if (firstInstanceTiming === undefined) {
    throw new Error(`${benchmarkCase.name} (${benchmarkCase.mode}) is missing its first-instance timing.`);
  }
  const setups = rounds.map((round) => round.setupMs).sort(ascending);
  const firstRows = rounds.map((round) => round.firstRowsMs).sort(ascending);
  const mounts = rounds.map((round) => round.mountMs).sort(ascending);
  const initialTotalHeightErrors = rounds.map((round) => round.initialTotalHeightErrorPercent).sort(ascending);
  const measurements = rounds.flatMap((round) => round.scrollMeasurements);
  const scrollNoOpSampleCount = measurements.filter((measurement) => measurement.trigger === 'no-op').length;
  const scrolls = measurements.map((measurement) => measurement.elapsedMs).sort(ascending);
  const lowerBounds = measurements.map((measurement) => measurement.lowerBoundMs).sort(ascending);
  const probes = measurements.map((measurement) => measurement.probeMs).sort(ascending);
  const checks = measurements.map((measurement) => measurement.checks).sort(ascending);
  const totalHeightErrors = measurements.map((measurement) => measurement.totalHeightErrorPercent).sort(ascending);
  const roundMedians = rounds.map((result) => percentile(result.scrollMeasurements.map((measurement) => measurement.elapsedMs).sort(ascending), 0.5));
  const roundP95s = rounds.map((result) => percentile(result.scrollMeasurements.map((measurement) => measurement.elapsedMs).sort(ascending), 0.95));
  const scrollMedianMs = percentile(scrolls, 0.5);
  const deviations = scrolls.map((value) => Math.abs(value - scrollMedianMs)).sort(ascending);
  const last = rounds.at(-1)!;
  return Object.freeze({
    rowProfile: benchmarkCase.rowProfile,
    mode: benchmarkCase.mode,
    library: benchmarkCase.name,
    version: benchmarkCase.version,
    stack: benchmarkCase.stack,
    firstInstanceSetupMs: round(firstInstanceTiming.setupMs),
    firstInstanceFirstRowsMs: round(firstInstanceTiming.firstRowsMs),
    firstInstanceLayoutReadyMs: round(firstInstanceTiming.layoutReadyMs),
    firstInstancePresentationReadyMs: round(firstInstanceTiming.presentationReadyMs),
    setupMs: round(percentile(setups, 0.5)),
    firstRowsMs: round(percentile(firstRows, 0.5)),
    mountMs: round(percentile(mounts, 0.5)),
    initialTotalHeightErrorPercent: round(percentile(initialTotalHeightErrors, 0.5)),
    scrollTotalHeightErrorMedianPercent: round(percentile(totalHeightErrors, 0.5)),
    scrollTotalHeightErrorP95Percent: round(percentile(totalHeightErrors, 0.95)),
    scrollMedianMs: round(scrollMedianMs),
    scrollMedianLowerBoundMs: round(percentile(lowerBounds, 0.5)),
    scrollP95Ms: round(percentile(scrolls, 0.95)),
    scrollMadMs: round(percentile(deviations, 0.5)),
    scrollProbeMedianMs: round(percentile(probes, 0.5)),
    scrollChecksMedian: round(percentile(checks, 0.5)),
    scrollSampleCount: measurements.length,
    scrollNoOpSampleCount,
    scrollRoundMedianRangeMs: Object.freeze([round(Math.min(...roundMedians)), round(Math.max(...roundMedians))] as const),
    scrollRoundP95RangeMs: Object.freeze([round(Math.min(...roundP95s)), round(Math.max(...roundP95s))] as const),
    renderedRows: last.renderedRows,
    domElements: last.domElements,
    completedRounds: rounds.length,
    plannedRounds: ROUNDS,
    earlyStopReason: stableStatistics ? 'stable-statistics' : null,
  });
}

function waitForBaselineLayout(
  scroller: HTMLElement,
  expectedIndex: number | undefined,
  expectedLayout: ExpectedLayout,
  strictTotalHeight: boolean,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const startedAt = performance.now();
    let settled = false;
    let lastFingerprint: string | undefined;
    let stableFrames = 0;
    let frameID = 0;
    let timeoutID = 0;
    const observer = new MutationObserver(() => { check(false); });
    const resizeObserver = new ResizeObserver(() => { check(false); });
    const cleanup = (): void => {
      observer.disconnect();
      resizeObserver.disconnect();
      cancelAnimationFrame(frameID);
      clearTimeout(timeoutID);
    };
    const check = (frameBoundary: boolean): void => {
      if (settled) return;
      const snapshot = captureBaselineLayout(scroller);
      try {
        assertBaselineSnapshot(snapshot, expectedIndex, expectedLayout, strictTotalHeight);
        settled = true;
        cleanup();
        resolve();
        return;
      } catch (error) {
        if (frameBoundary) {
          const fingerprint = baselineFailureFingerprint(snapshot);
          if (fingerprint === lastFingerprint) stableFrames += 1;
          else {
            lastFingerprint = fingerprint;
            stableFrames = 1;
          }
        }
        const elapsed = performance.now() - startedAt;
        const message = error instanceof Error ? error.message : String(error);
        if (elapsed >= STABLE_FAILURE_MIN_MS && stableFrames >= STABLE_FAILURE_FRAMES) {
          settled = true;
          cleanup();
          reject(new Error(`Stable incorrect initial layout: ${message}`));
        }
      }
    };
    const frame = (): void => {
      check(true);
      if (!settled) frameID = requestAnimationFrame(frame);
    };
    observer.observe(scroller, {
      attributes: true,
      childList: true,
      characterData: true,
      subtree: true,
    });
    resizeObserver.observe(scroller);
    timeoutID = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new Error('Timed out waiting for a correct initial layout.'));
    }, FRAME_TIMEOUT_MS);
    check(false);
    if (!settled) frameID = requestAnimationFrame(frame);
  });
}

async function measureScrollLayout(
  scroller: HTMLElement,
  expectedIndex: number | undefined,
  offset: number,
  expectedLayout: ExpectedLayout,
  strictTotalHeight: boolean,
): Promise<ScrollMeasurement> {
  await nextAnimationFrame();
  const targetOffset = clampedScrollOffset(offset, scroller.scrollHeight, scroller.clientHeight);
  if (Math.abs(scroller.scrollTop - targetOffset) <= 0.5) {
    const probeStartedAt = performance.now();
    const snapshot = captureBaselineLayout(scroller);
    assertBaselineSnapshot(snapshot, expectedIndex, expectedLayout, strictTotalHeight);
    return Object.freeze({
      trigger: 'no-op',
      elapsedMs: 0,
      lowerBoundMs: 0,
      probeMs: snapshot.observedAt - probeStartedAt,
      checks: 1,
      totalHeightErrorPercent: totalHeightErrorPercent(
        snapshot.scrollHeight,
        expectedScrollerExtent(expectedLayout.totalHeight, snapshot.clientHeight),
      ),
    });
  }
  return new Promise((resolve, reject) => {
    let settled = false;
    let checkQueued = false;
    let checks = 0;
    let frameID = 0;
    let timeoutID = 0;
    let startedAt: number | undefined;
    let lastFailureFingerprint: string | undefined;
    let stableFailureFrames = 0;
    let lastFailureMessage = 'The scroll layout remained incorrect.';
    const observer = new MutationObserver(scheduleCheck);
    const resizeObserver = new ResizeObserver(scheduleCheck);

    const cleanup = (): void => {
      observer.disconnect();
      resizeObserver.disconnect();
      document.removeEventListener('scroll', startTiming, true);
      cancelAnimationFrame(frameID);
      clearTimeout(timeoutID);
    };
    const check = (): void => {
      if (settled || startedAt === undefined) return;
      checks += 1;
      const probeStartedAt = performance.now();
      const snapshot = captureBaselineLayout(scroller);
      const probeMs = snapshot.observedAt - probeStartedAt;
      try {
        assertBaselineSnapshot(snapshot, expectedIndex, expectedLayout, strictTotalHeight);
        settled = true;
        cleanup();
        resolve(Object.freeze({
          trigger: 'native-scroll',
          elapsedMs: snapshot.observedAt - startedAt,
          lowerBoundMs: probeStartedAt - startedAt,
          probeMs,
          checks,
          totalHeightErrorPercent: totalHeightErrorPercent(
            snapshot.scrollHeight,
            expectedScrollerExtent(expectedLayout.totalHeight, snapshot.clientHeight),
          ),
        }));
      } catch (error) {
        lastFailureMessage = error instanceof Error ? error.message : String(error);
        const fingerprint = baselineFailureFingerprint(snapshot);
        if (fingerprint === lastFailureFingerprint) stableFailureFrames += 1;
        else {
          lastFailureFingerprint = fingerprint;
          stableFailureFrames = 1;
        }
        const elapsed = snapshot.observedAt - startedAt;
        if (elapsed >= STABLE_FAILURE_MIN_MS && stableFailureFrames >= STABLE_FAILURE_FRAMES) {
          settled = true;
          cleanup();
          reject(new Error(`Stable incorrect scroll layout: ${lastFailureMessage}`));
        }
      }
    };
    const checkFrame = (): void => {
      check();
      if (!settled) frameID = requestAnimationFrame(checkFrame);
    };

    function scheduleCheck(): void {
      if (settled || checkQueued) return;
      checkQueued = true;
      queueMicrotask(() => {
        checkQueued = false;
        check();
      });
    }

    function startTiming(event: Event): void {
      if (settled || startedAt !== undefined || event.target !== scroller) return;
      startedAt = performance.now();
      scheduleCheck();
      queueMicrotask(() => {
        if (!settled && frameID === 0) frameID = requestAnimationFrame(checkFrame);
      });
    }

    observer.observe(scroller, { subtree: true, childList: true, attributes: true, characterData: true });
    resizeObserver.observe(scroller);
    document.addEventListener('scroll', startTiming, { capture: true, passive: true });
    timeoutID = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new Error(`Timed out waiting for a correct scroll layout: ${lastFailureMessage}`));
    }, FRAME_TIMEOUT_MS);

    scroller.scrollTop = targetOffset;
  });
}

function captureBaselineLayout(scroller: HTMLElement): BaselineLayoutSnapshot {
  const scrollHeight = scroller.scrollHeight;
  const viewport = scroller.getBoundingClientRect();
  const rows = Array.from(scroller.querySelectorAll<HTMLElement>('.bench-row'), (row) => {
    const rect = row.getBoundingClientRect();
    return Object.freeze({
      index: Number(row.dataset['index']),
      rawIndex: row.dataset['index'],
      top: rect.top,
      bottom: rect.bottom,
      height: rect.height,
    });
  });
  return Object.freeze({
    observedAt: performance.now(),
    scrollHeight,
    clientHeight: scroller.clientHeight,
    scrollTop: scroller.scrollTop,
    viewportTop: viewport.top,
    viewportBottom: viewport.bottom,
    rows: Object.freeze(rows),
  });
}

function baselineFailureFingerprint(snapshot: BaselineLayoutSnapshot): string {
  return JSON.stringify({
    scrollHeight: snapshot.scrollHeight,
    clientHeight: snapshot.clientHeight,
    scrollTop: Math.round(snapshot.scrollTop),
    rows: snapshot.rows.map((row) => Object.freeze({
      index: row.index,
      top: Math.round(row.top),
      bottom: Math.round(row.bottom),
      height: Math.round(row.height),
    })),
  });
}

function assertBaselineSnapshot(
  snapshot: BaselineLayoutSnapshot,
  expectedIndex: number | undefined,
  expectedLayout: ExpectedLayout,
  strictTotalHeight: boolean,
): void {
  const expectedHeight = expectedScrollerExtent(expectedLayout.totalHeight, snapshot.clientHeight);
  if (strictTotalHeight && Math.abs(snapshot.scrollHeight - expectedHeight) > HEIGHT_TOLERANCE_PX) {
    throw new Error(`Scroll height ${snapshot.scrollHeight}px did not match ${expectedHeight}px.`);
  }
  const seen = new Set<number>();
  const rows = snapshot.rows.flatMap((row) => {
    if (row.bottom < snapshot.viewportTop - VIEWPORT_HEIGHT * 2 || row.top > snapshot.viewportBottom + VIEWPORT_HEIGHT * 2) return [];
    if (!Number.isInteger(row.index) || row.index < 0 || row.index >= ITEM_COUNT) throw new Error(`Invalid benchmark row index ${row.rawIndex ?? 'missing'}.`);
    if (seen.has(row.index)) throw new Error(`Benchmark row ${row.index} appeared more than once.`);
    seen.add(row.index);
    const rowHeight = expectedLayout.heightAt(row.index);
    if (Math.abs(row.height - rowHeight) > HEIGHT_TOLERANCE_PX) throw new Error(`Benchmark row ${row.index} measured ${round(row.height)}px instead of ${rowHeight}px.`);
    return [{ index: row.index, top: row.top, bottom: row.bottom }];
  });
  rows.sort((left, right) => left.top - right.top || left.index - right.index);
  for (let index = 1; index < rows.length; index += 1) {
    const previous = rows[index - 1]!;
    const current = rows[index]!;
    if (current.index !== previous.index + 1) continue;
    const gap = current.top - previous.bottom;
    if (Math.abs(gap) > HEIGHT_TOLERANCE_PX) throw new Error(`Benchmark rows ${previous.index} and ${current.index} have a ${round(gap)}px gap or overlap.`);
  }
  const visible = rows.filter((row) => row.bottom > snapshot.viewportTop + HEIGHT_TOLERANCE_PX && row.top < snapshot.viewportBottom - HEIGHT_TOLERANCE_PX);
  if (visible.length === 0) throw new Error('No benchmark row covers the viewport.');
  if (expectedIndex !== undefined && !visible.some((row) => row.index === expectedIndex)) {
    throw new Error(`Expected benchmark row ${expectedIndex} is absent from the viewport; visible rows are ${visible[0]?.index ?? 'none'}-${visible.at(-1)?.index ?? 'none'}.`);
  }
  const first = visible[0]!;
  const last = visible.at(-1)!;
  const contentRange = visibleContentRange(
    expectedLayout.totalHeight,
    snapshot.clientHeight,
    snapshot.scrollTop,
  );
  if (contentRange !== null) {
    const expectedTop = snapshot.viewportTop + contentRange.start;
    const expectedBottom = snapshot.viewportTop + contentRange.end;
    if (first.top > expectedTop + HEIGHT_TOLERANCE_PX) throw new Error(`Blank space precedes benchmark row ${first.index}.`);
    if (last.bottom < expectedBottom - HEIGHT_TOLERANCE_PX) throw new Error(`Blank space follows benchmark row ${last.index}.`);
  }
  for (let index = 1; index < visible.length; index += 1) {
    if (visible[index]!.index !== visible[index - 1]!.index + 1) throw new Error(`Visible benchmark rows ${visible[index - 1]!.index} and ${visible[index]!.index} are not contiguous.`);
  }
}

function waitForAnyRows(host: HTMLElement): Promise<void> {
  return waitForElement(
    host,
    () => host.querySelector('.bench-row[data-index]') !== null,
    'the first benchmark rows',
    FRAME_TIMEOUT_MS,
  );
}

function waitForScroller(host: HTMLElement): Promise<void> {
  return waitForElement(
    host,
    () => host.querySelector('.bench-scroller') !== null,
    'the scroller shell',
    FRAME_TIMEOUT_MS,
  );
}

function renderResult(result: BenchmarkResult): HTMLTableRowElement {
  return renderCells([
    result.rowProfile,
    result.mode,
    `${result.library} ${result.version}`,
    result.stack,
    `${result.firstInstanceLayoutReadyMs.toFixed(2)} ms`,
    `${result.firstInstancePresentationReadyMs.toFixed(2)} ms`,
    `${result.setupMs.toFixed(2)} ms`,
    `${result.firstRowsMs.toFixed(2)} ms`,
    `${result.mountMs.toFixed(2)} ms`,
    `${result.scrollMedianMs.toFixed(2)} ms`,
    `${result.scrollP95Ms.toFixed(2)} ms`,
  ]);
}

function totalHeightErrorPercent(actual: number, expected: number): number {
  if (expected === 0) return actual === 0 ? 0 : 100;
  return Math.abs(actual - expected) / expected * 100;
}

function renderBaselineFailure(benchmarkCase: BenchmarkCase, reason: string): HTMLTableRowElement {
  return renderCells([
    benchmarkCase.rowProfile,
    benchmarkCase.mode,
    `${benchmarkCase.name} ${benchmarkCase.version}`,
    benchmarkCase.stack,
    'failed',
    'failed',
    'failed',
    'failed',
    reason,
    'failed',
    'failed',
  ]);
}

function renderSupport(result: HeightModeSupport): HTMLTableRowElement {
  return renderCells([
    result.library,
    'yes',
    'yes',
    result.automatic ? 'yes' : 'unsupported',
    result.automaticNote,
  ]);
}

function renderMutationResult(result: MutationBenchmarkResult): HTMLTableRowElement {
  const row = renderCells([
    result.rowProfile,
    result.sizeMode,
    `${result.library} ${result.version}`,
    result.operation,
    result.location,
    result.medianMs === null ? '—' : `${result.medianMs.toFixed(2)} ms`,
    result.p95Ms === null ? '—' : `${result.p95Ms.toFixed(2)} ms`,
    `${result.correctSamples}/${result.totalSamples}`,
    `${result.recoveredSamples}/${result.totalSamples}`,
    `${result.failedSamples}/${result.totalSamples}`,
    result.failures.length === 0 ? '0' : `${result.failures.length} (${result.failures[0]!.code})`,
  ]);
  if (result.failures.some((failure) => failure.severity === 'fatal')) row.dataset['severity'] = 'fatal';
  return row;
}

function renderCells(values: readonly string[]): HTMLTableRowElement {
  const row = document.createElement('tr');
  for (const value of values) {
    const cell = document.createElement('td');
    cell.textContent = value;
    row.append(cell);
  }
  return row;
}

function caseKey(entry: BenchmarkCase): string { return `${entry.rowProfile}:${entry.mode}:${entry.name}`; }
function baselineFailureKey(entry: BaselineBenchmarkFailure): string { return `${entry.rowProfile}:${entry.mode}:${entry.library}`; }

function baselineProgress(
  resolved: number,
  executed: number,
  total: number,
  startedAt: number,
  detail: string,
): string {
  const elapsed = performance.now() - startedAt;
  const remainingUpperBound = executed === 0 ? 0 : (elapsed / executed) * Math.max(0, total - resolved);
  return `Baseline ${resolved}/${total} · elapsed ${formatElapsed(elapsed)} · ETA ≤ ${formatElapsed(remainingUpperBound)} · ${detail}`;
}

function rotate<T>(values: readonly T[], offset: number): readonly T[] {
  if (values.length === 0) return values;
  const start = offset % values.length;
  return [...values.slice(start), ...values.slice(0, start)];
}

function rotationStep(caseCount: number, rounds: number): number {
  if (caseCount <= 1) return 0;
  let candidate = Math.max(1, Math.floor(caseCount / Math.max(1, rounds)));
  while (greatestCommonDivisor(candidate, caseCount) !== 1) candidate += 1;
  return candidate;
}

function greatestCommonDivisor(left: number, right: number): number {
  let a = Math.abs(left);
  let b = Math.abs(right);
  while (b !== 0) [a, b] = [b, a % b];
  return a;
}
function ascending(left: number, right: number): number { return left - right; }
function percentile(sorted: readonly number[], ratio: number): number {
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * ratio) - 1))] ?? 0;
}
function round(value: number): number { return Number(value.toFixed(3)); }
function idleFrame(): Promise<void> { return new Promise((resolve) => setTimeout(resolve, 50)); }
function yieldToBrowser(): Promise<void> { return new Promise((resolve) => setTimeout(resolve, 0)); }
function nextAnimationFrame(): Promise<void> { return new Promise((resolve) => requestAnimationFrame(() => resolve())); }
