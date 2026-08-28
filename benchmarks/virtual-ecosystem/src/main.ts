import { fixedAdapters, type BenchmarkAdapter, type MountedAdapter } from './adapters.js';
import { ITEM_COUNT, items, ROW_HEIGHT, VIEWPORT_HEIGHT, type RowProfile } from './constants.js';
import { createHeightOracle, type ExpectedLayout, type HeightOracle } from './fixture.js';
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
  readonly scrollRoundMedianRangeMs: readonly [number, number];
  readonly scrollRoundP95RangeMs: readonly [number, number];
  readonly renderedRows: number;
  readonly domElements: number;
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
  | 'scrollRoundMedianRangeMs'
  | 'scrollRoundP95RangeMs'
  | 'scrollTotalHeightErrorMedianPercent'
  | 'scrollTotalHeightErrorP95Percent'
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
      readonly baselineResults: readonly BenchmarkResult[];
      readonly baselineFailures: readonly BaselineBenchmarkFailure[];
      readonly baselineSamples: Readonly<Record<string, readonly BaselineSample[]>>;
      readonly mutationResults: readonly MutationBenchmarkResult[];
      readonly heightModeSupport: readonly HeightModeSupport[];
    };
  }
}

const search = new URLSearchParams(window.location.search);
const QUICK_RUN = search.has('quick');
const ROUNDS = positiveInteger(search.get('baseline-rounds')) ?? (QUICK_RUN ? 1 : 5);
const WARMUP_SCROLLS = QUICK_RUN ? 1 : 5;
const RECORDED_SCROLLS = QUICK_RUN ? 2 : 40;
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
const activeCases = benchmarkCases.filter((entry) => (
  (!search.has('sectile') || entry.name === 'Sectile Virtual')
  && (libraryFilter === null || entry.name === libraryFilter)
  && (!search.has('fixed') || entry.mode === 'fixed')
));
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

root.innerHTML = `
  <header>
    <h1>Virtualization ecosystem benchmark</h1>
    <p>100,000 rows · ${rowProfile} DOM-height profile · fixed, estimated, and no-height-input conditions · 720 × 480 viewport</p>
    <button type="button" id="run">Run benchmark</button>
  </header>
  <section aria-live="polite">
    <p id="status">Ready.</p>
    <div id="mount"></div>
    <h2>Initial render and scrolling</h2>
    <table>
      <thead><tr><th>Row profile</th><th>Height input</th><th>Library</th><th>Stack</th><th>Setup</th><th>First rows</th><th>Stable layout</th><th>Scroll median</th><th>Scroll p95</th></tr></thead>
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
if (
  runButton === null
  || status === null
  || mountHost === null
  || resultsBody === null
  || supportResultsBody === null
  || mutationResultsBody === null
  || json === null
) throw new Error('Benchmark UI is incomplete.');

for (const support of heightModeSupport) supportResultsBody.append(renderSupport(support));
runButton.addEventListener('click', () => { void runAll(); });

async function runAll(): Promise<void> {
  runButton!.disabled = true;
  resultsBody!.replaceChildren();
  mutationResultsBody!.replaceChildren();
  json!.textContent = '';
  const raw = new Map<string, RawBenchmarkResult[]>();
  const baselineFailures: BaselineBenchmarkFailure[] = [];
  try {
    status!.textContent = `Calibrating ${rowProfile} row heights…`;
    const oracle = await createHeightOracle(rowProfile);
    for (let roundIndex = 0; roundIndex < (MUTATIONS_ONLY ? 0 : ROUNDS); roundIndex += 1) {
      const order = rotate(activeCases, roundIndex * 3);
      for (const benchmarkCase of order) {
        status!.textContent = `Round ${roundIndex + 1}/${ROUNDS} · ${benchmarkCase.mode} · ${benchmarkCase.name}…`;
        const caseStartedAt = performance.now();
        let result: RawBenchmarkResult;
        try {
          result = await runCase(benchmarkCase, mountHost!, oracle);
        } catch (error) {
          const reason = error instanceof Error ? error.message : String(error);
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
          resultsBody!.append(renderBaselineFailure(benchmarkCase, reason));
          await idleFrame();
          continue;
        }
        const key = caseKey(benchmarkCase);
        const samples = raw.get(key) ?? [];
        samples.push(result);
        raw.set(key, samples);
        await idleFrame();
      }
    }
    const baselineCases = MUTATIONS_ONLY ? [] : activeCases;
    const baselineResults = baselineCases.flatMap((entry) => {
      const rounds = raw.get(caseKey(entry)) ?? [];
      return rounds.length === ROUNDS ? [aggregate(entry, rounds)] : [];
    });
    const baselineSamples = Object.freeze(Object.fromEntries(baselineCases.map((entry) => [
      caseKey(entry),
      Object.freeze((raw.get(caseKey(entry)) ?? []).flatMap((round, roundIndex) => (
        round.scrollMeasurements.map((measurement, sampleIndex) => Object.freeze({
          round: roundIndex + 1,
          sample: sampleIndex + 1,
          ...measurement,
        }))
      ))),
    ])));
    for (const result of baselineResults) resultsBody!.append(renderResult(result));
    const mutationResults = BASELINE_ONLY
      ? Object.freeze([])
      : await runMutationBenchmarks(
          mountHost!,
          (message) => { status!.textContent = message; },
          rowProfile,
          oracle,
          [...new Set(activeCases.map((entry) => entry.name))],
          mutationFilter,
        );
    for (const result of mutationResults) mutationResultsBody!.append(renderMutationResult(result));
    window.__sectileVirtualBenchmarkResults = Object.freeze(baselineResults);
    window.__sectileVirtualBenchmarkReport = Object.freeze({ baselineResults, baselineFailures, baselineSamples, mutationResults, heightModeSupport });
    json!.textContent = JSON.stringify({
      benchmark: 'sectile-virtual-ecosystem',
      protocolVersion: 3,
      environment: navigator.userAgent,
      conditions: {
        itemCount: ITEM_COUNT,
        rowProfile,
        commonEstimateHeight: ROW_HEIGHT,
        heightDistribution: oracle.distribution,
        contentCorpusVersion: oracle.corpusVersion,
        contentVariants: oracle.contentVariants,
        viewport: [720, VIEWPORT_HEIGHT],
        overscanRows: 8,
        baseline: {
          rounds: ROUNDS,
          scrollSamplesPerRound: RECORDED_SCROLLS,
          completion: rowProfile === 'uniform'
            ? 'exact target row, contiguous row geometry, correct total scroll height, and complete viewport coverage'
            : 'correct visible row content and geometry, contiguous viewport coverage, and a separately recorded total-height estimate error',
          trigger: 'programmatic scrollTop change; the browser-generated scroll event is observed at document capture before target listeners',
          observation: 'timing starts when the browser begins native scroll-event delivery and ends after DOM geometry has been read; correctness validation runs outside the timed interval',
          diagnostics: 'raw samples retain round, sample, lower and upper timing bounds, geometry-probe cost, and correctness-check count; summaries retain per-round ranges',
          stableFailureMinMs: STABLE_FAILURE_MIN_MS,
          stableFailureFrames: STABLE_FAILURE_FRAMES,
          timing: {
            setupMs: 'synchronous adapter and framework setup',
            firstRowsMs: 'time until the first benchmark rows exist',
            mountMs: rowProfile === 'uniform'
              ? 'time until total scroll height and viewport geometry are correct'
              : 'time until the initial viewport geometry is correct; total-height estimate error is recorded separately',
          },
        },
        mutations: mutationConditions,
      },
      heightModeSupport,
      baselineResults,
      baselineFailures,
      baselineSamples,
      mutationResults,
    }, null, 2);
    status!.textContent = 'Complete.';
  } catch (error) {
    const activeCase = status!.textContent;
    status!.textContent = `Failed during ${activeCase}: ${error instanceof Error ? error.message : String(error)}`;
    throw error;
  } finally {
    runButton!.disabled = false;
  }
}

function parseHeightMode(value: string | null): MutationBenchmarkFilter['sizeMode'] {
  return value === 'estimated' || value === 'automatic' ? value : undefined;
}

function positiveInteger(value: string | null): number | undefined {
  if (value === null) return undefined;
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
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

async function runCase(benchmarkCase: BenchmarkCase, host: HTMLElement, oracle: HeightOracle): Promise<RawBenchmarkResult> {
  host.replaceChildren();
  const startedAt = performance.now();
  const mounted = benchmarkCase.mount(host);
  try {
    const setupMs = performance.now() - startedAt;
    await waitForAnyRows(host);
    const firstRowsMs = performance.now() - startedAt;
    const expectedLayout = oracle.layout(items);
    const strictTotalHeight = benchmarkCase.rowProfile === 'uniform' && benchmarkCase.mode !== 'automatic';
    await waitForBaselineLayout(mounted.scroller, strictTotalHeight ? 0 : undefined, expectedLayout, strictTotalHeight);
    const mountMs = performance.now() - startedAt;
    const initialTotalHeightErrorPercent = totalHeightErrorPercent(mounted.scroller.scrollHeight, expectedLayout.totalHeight);
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

function aggregate(benchmarkCase: BenchmarkCase, rounds: readonly RawBenchmarkResult[]): BenchmarkResult {
  if (rounds.length !== ROUNDS) throw new Error(`${benchmarkCase.name} (${benchmarkCase.mode}) produced ${rounds.length}/${ROUNDS} rounds.`);
  const setups = rounds.map((round) => round.setupMs).sort(ascending);
  const firstRows = rounds.map((round) => round.firstRowsMs).sort(ascending);
  const mounts = rounds.map((round) => round.mountMs).sort(ascending);
  const initialTotalHeightErrors = rounds.map((round) => round.initialTotalHeightErrorPercent).sort(ascending);
  const measurements = rounds.flatMap((round) => round.scrollMeasurements);
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
    scrollRoundMedianRangeMs: Object.freeze([round(Math.min(...roundMedians)), round(Math.max(...roundMedians))] as const),
    scrollRoundP95RangeMs: Object.freeze([round(Math.min(...roundP95s)), round(Math.max(...roundP95s))] as const),
    renderedRows: last.renderedRows,
    domElements: last.domElements,
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
    let lastFingerprint: string | undefined;
    let stableFrames = 0;
    const frame = (): void => {
      const snapshot = captureBaselineLayout(scroller);
      try {
        assertBaselineSnapshot(snapshot, expectedIndex, expectedLayout, strictTotalHeight);
        resolve();
        return;
      } catch (error) {
        const fingerprint = baselineFailureFingerprint(snapshot);
        if (fingerprint === lastFingerprint) stableFrames += 1;
        else {
          lastFingerprint = fingerprint;
          stableFrames = 1;
        }
        const elapsed = performance.now() - startedAt;
        const message = error instanceof Error ? error.message : String(error);
        if (elapsed >= STABLE_FAILURE_MIN_MS && stableFrames >= STABLE_FAILURE_FRAMES) {
          reject(new Error(`Stable incorrect initial layout: ${message}`));
          return;
        }
        if (elapsed >= FRAME_TIMEOUT_MS) {
          reject(new Error(`Timed out waiting for a correct initial layout: ${message}`));
          return;
        }
      }
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
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
          elapsedMs: snapshot.observedAt - startedAt,
          lowerBoundMs: probeStartedAt - startedAt,
          probeMs,
          checks,
          totalHeightErrorPercent: totalHeightErrorPercent(snapshot.scrollHeight, expectedLayout.totalHeight),
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

    scroller.scrollTop = offset;
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
    viewportTop: viewport.top,
    viewportBottom: viewport.bottom,
    rows: Object.freeze(rows),
  });
}

function baselineFailureFingerprint(snapshot: BaselineLayoutSnapshot): string {
  return JSON.stringify({
    scrollHeight: snapshot.scrollHeight,
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
  const expectedHeight = expectedLayout.totalHeight;
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
  if (first.top > snapshot.viewportTop + HEIGHT_TOLERANCE_PX) throw new Error(`Blank space precedes benchmark row ${first.index}.`);
  if (last.bottom < snapshot.viewportBottom - HEIGHT_TOLERANCE_PX) throw new Error(`Blank space follows benchmark row ${last.index}.`);
  for (let index = 1; index < visible.length; index += 1) {
    if (visible[index]!.index !== visible[index - 1]!.index + 1) throw new Error(`Visible benchmark rows ${visible[index - 1]!.index} and ${visible[index]!.index} are not contiguous.`);
  }
}

function waitForAnyRows(host: HTMLElement): Promise<void> {
  return waitUntilFrame(() => host.querySelector('.bench-row[data-index]') !== null, 'the first benchmark rows');
}

function waitUntilFrame(predicate: () => boolean, label: string): Promise<void> {
  if (predicate()) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const startedAt = performance.now();
    const frame = (): void => {
      if (predicate()) { resolve(); return; }
      if (performance.now() - startedAt >= FRAME_TIMEOUT_MS) {
        reject(new Error(`Timed out waiting for ${label}.`));
        return;
      }
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  });
}

function renderResult(result: BenchmarkResult): HTMLTableRowElement {
  return renderCells([
    result.rowProfile,
    result.mode,
    `${result.library} ${result.version}`,
    result.stack,
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
function rotate<T>(values: readonly T[], offset: number): readonly T[] {
  if (values.length === 0) return values;
  const start = offset % values.length;
  return [...values.slice(start), ...values.slice(0, start)];
}
function ascending(left: number, right: number): number { return left - right; }
function percentile(sorted: readonly number[], ratio: number): number {
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * ratio) - 1))] ?? 0;
}
function round(value: number): number { return Number(value.toFixed(3)); }
function idleFrame(): Promise<void> { return new Promise((resolve) => setTimeout(resolve, 50)); }
function nextAnimationFrame(): Promise<void> { return new Promise((resolve) => requestAnimationFrame(() => resolve())); }
