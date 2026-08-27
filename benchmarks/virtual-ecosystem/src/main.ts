import { fixedAdapters, type BenchmarkAdapter, type MountedAdapter } from './adapters.js';
import { ITEM_COUNT, items, ROW_HEIGHT, VIEWPORT_HEIGHT } from './constants.js';
import {
  automaticMutableAdapters,
  mutableAdapters,
  type MutableBenchmarkAdapter,
} from './mutable-adapters.js';
import {
  mutationConditions,
  runMutationBenchmarks,
  type MutationBenchmarkResult,
} from './mutation-runner.js';
import './style.css';

type HeightMode = 'fixed' | 'estimated' | 'automatic';

interface BenchmarkCase {
  readonly mode: HeightMode;
  readonly name: string;
  readonly version: string;
  readonly stack: string;
  readonly mount: (host: HTMLElement) => MountedAdapter;
}

interface BenchmarkResult {
  readonly mode: HeightMode;
  readonly library: string;
  readonly version: string;
  readonly stack: string;
  readonly setupMs: number;
  readonly firstRowsMs: number;
  readonly mountMs: number;
  readonly scrollMedianMs: number;
  readonly scrollP95Ms: number;
  readonly renderedRows: number;
  readonly domElements: number;
}

interface RawBenchmarkResult extends Omit<BenchmarkResult, 'setupMs' | 'firstRowsMs' | 'mountMs' | 'scrollMedianMs' | 'scrollP95Ms'> {
  readonly setupMs: number;
  readonly firstRowsMs: number;
  readonly mountMs: number;
  readonly scrollSamples: readonly number[];
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
      readonly mutationResults: readonly MutationBenchmarkResult[];
      readonly heightModeSupport: readonly HeightModeSupport[];
    };
  }
}

const search = new URLSearchParams(window.location.search);
const QUICK_RUN = search.has('quick');
const ROUNDS = QUICK_RUN ? 1 : 5;
const WARMUP_SCROLLS = QUICK_RUN ? 1 : 5;
const RECORDED_SCROLLS = QUICK_RUN ? 2 : 40;
const FRAME_TIMEOUT_MS = 4_000;
const HEIGHT_TOLERANCE_PX = 2;

const benchmarkCases = Object.freeze([
  ...fixedAdapters.map((adapter) => fixedCase(adapter)),
  ...mutableAdapters.map((adapter) => dynamicCase(adapter)),
  ...automaticMutableAdapters.map((adapter) => dynamicCase(adapter)),
]);
const activeCases = search.has('sectile')
  ? benchmarkCases.filter((entry) => entry.name === 'Sectile Virtual')
  : benchmarkCases;

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
    <p>100,000 identical rows · fixed, estimated, and no-height-input conditions · 720 × 480 viewport</p>
    <button type="button" id="run">Run benchmark</button>
  </header>
  <section aria-live="polite">
    <p id="status">Ready.</p>
    <div id="mount"></div>
    <h2>Initial render and scrolling</h2>
    <table>
      <thead><tr><th>Height input</th><th>Library</th><th>Stack</th><th>Setup</th><th>First rows</th><th>Stable layout</th><th>Scroll median</th><th>Scroll p95</th></tr></thead>
      <tbody id="results"></tbody>
    </table>
    <h2>Height input support</h2>
    <table>
      <thead><tr><th>Library</th><th>Fixed</th><th>Estimated</th><th>No height input</th><th>Note</th></tr></thead>
      <tbody id="support-results"></tbody>
    </table>
    <h2>Mutation results</h2>
    <table>
      <thead><tr><th>Height input</th><th>Library</th><th>Operation</th><th>Location</th><th>Median</th><th>p95</th><th>Clean</th><th>Recovered</th><th>Failed</th><th>Failures</th></tr></thead>
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
  try {
    for (let round = 0; round < ROUNDS; round += 1) {
      const order = rotate(activeCases, round * 3);
      for (const benchmarkCase of order) {
        status!.textContent = `Round ${round + 1}/${ROUNDS} · ${benchmarkCase.mode} · ${benchmarkCase.name}…`;
        let result: RawBenchmarkResult;
        try {
          result = await runCase(benchmarkCase, mountHost!);
        } catch (error) {
          const reason = error instanceof Error ? error.message : String(error);
          throw new Error(`${benchmarkCase.mode} · ${benchmarkCase.name}: ${reason}`, { cause: error });
        }
        const key = caseKey(benchmarkCase);
        const samples = raw.get(key) ?? [];
        samples.push(result);
        raw.set(key, samples);
        await idleFrame();
      }
    }
    const baselineResults = activeCases.map((entry) => aggregate(entry, raw.get(caseKey(entry)) ?? []));
    for (const result of baselineResults) resultsBody!.append(renderResult(result));
    const mutationResults = await runMutationBenchmarks(
      mountHost!,
      (message) => { status!.textContent = message; },
      [...new Set(activeCases.map((entry) => entry.name))],
    );
    for (const result of mutationResults) mutationResultsBody!.append(renderMutationResult(result));
    window.__sectileVirtualBenchmarkResults = Object.freeze(baselineResults);
    window.__sectileVirtualBenchmarkReport = Object.freeze({ baselineResults, mutationResults, heightModeSupport });
    json!.textContent = JSON.stringify({
      benchmark: 'sectile-virtual-ecosystem',
      environment: navigator.userAgent,
      conditions: {
        itemCount: ITEM_COUNT,
        actualRowHeight: ROW_HEIGHT,
        viewport: [720, VIEWPORT_HEIGHT],
        overscanRows: 8,
        baseline: {
          rounds: ROUNDS,
          scrollSamplesPerRound: RECORDED_SCROLLS,
          completion: 'exact target row, contiguous row geometry, correct total scroll height, and complete viewport coverage',
          timing: {
            setupMs: 'synchronous adapter and framework setup',
            firstRowsMs: 'time until the first benchmark rows exist',
            mountMs: 'time until total scroll height and viewport geometry are correct',
          },
        },
        mutations: mutationConditions,
      },
      heightModeSupport,
      baselineResults,
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

function fixedCase(adapter: BenchmarkAdapter): BenchmarkCase {
  return Object.freeze({ mode: 'fixed', ...adapter });
}

function dynamicCase(adapter: MutableBenchmarkAdapter): BenchmarkCase {
  return Object.freeze({
    mode: adapter.sizeMode,
    name: adapter.name,
    version: adapter.version,
    stack: adapter.stack,
    mount: (host: HTMLElement) => adapter.mount(host, items),
  });
}

async function runCase(benchmarkCase: BenchmarkCase, host: HTMLElement): Promise<RawBenchmarkResult> {
  host.replaceChildren();
  const startedAt = performance.now();
  const mounted = benchmarkCase.mount(host);
  const setupMs = performance.now() - startedAt;
  await waitForAnyRows(host);
  const firstRowsMs = performance.now() - startedAt;
  await waitForBaselineLayout(mounted.scroller, 0);
  const mountMs = performance.now() - startedAt;
  const maximum = mounted.scroller.scrollHeight - VIEWPORT_HEIGHT;
  const sampleCount = WARMUP_SCROLLS + RECORDED_SCROLLS;
  const offsets = Array.from({ length: sampleCount }, (_, index) => Math.floor(maximum * (((index * 19) % 47) / 46)));
  const samples: number[] = [];
  for (let index = 0; index < offsets.length; index += 1) {
    const offset = offsets[index]!;
    const expected = Math.floor(offset / ROW_HEIGHT);
    const scrollStartedAt = performance.now();
    mounted.scroller.scrollTop = offset;
    mounted.scroller.dispatchEvent(new Event('scroll', { bubbles: true }));
    await waitForBaselineLayout(mounted.scroller, expected);
    const elapsed = performance.now() - scrollStartedAt;
    if (index >= WARMUP_SCROLLS) samples.push(elapsed);
  }
  const renderedRows = host.querySelectorAll('.bench-row').length;
  const domElements = host.querySelectorAll('*').length;
  mounted.unmount();
  host.replaceChildren();
  return Object.freeze({
    mode: benchmarkCase.mode,
    library: benchmarkCase.name,
    version: benchmarkCase.version,
    stack: benchmarkCase.stack,
    setupMs,
    firstRowsMs,
    mountMs,
    scrollSamples: Object.freeze(samples),
    renderedRows,
    domElements,
  });
}

function aggregate(benchmarkCase: BenchmarkCase, rounds: readonly RawBenchmarkResult[]): BenchmarkResult {
  if (rounds.length !== ROUNDS) throw new Error(`${benchmarkCase.name} (${benchmarkCase.mode}) produced ${rounds.length}/${ROUNDS} rounds.`);
  const setups = rounds.map((round) => round.setupMs).sort(ascending);
  const firstRows = rounds.map((round) => round.firstRowsMs).sort(ascending);
  const mounts = rounds.map((round) => round.mountMs).sort(ascending);
  const scrolls = rounds.flatMap((round) => round.scrollSamples).sort(ascending);
  const last = rounds.at(-1)!;
  return Object.freeze({
    mode: benchmarkCase.mode,
    library: benchmarkCase.name,
    version: benchmarkCase.version,
    stack: benchmarkCase.stack,
    setupMs: round(percentile(setups, 0.5)),
    firstRowsMs: round(percentile(firstRows, 0.5)),
    mountMs: round(percentile(mounts, 0.5)),
    scrollMedianMs: round(percentile(scrolls, 0.5)),
    scrollP95Ms: round(percentile(scrolls, 0.95)),
    renderedRows: last.renderedRows,
    domElements: last.domElements,
  });
}

function waitForBaselineLayout(scroller: HTMLElement, expectedIndex: number): Promise<void> {
  return waitUntilFrame(() => {
    try {
      assertBaselineLayout(scroller, expectedIndex);
      return true;
    } catch {
      return false;
    }
  }, 'a correct total height and viewport layout');
}

function assertBaselineLayout(scroller: HTMLElement, expectedIndex: number): void {
  const expectedHeight = ITEM_COUNT * ROW_HEIGHT;
  if (Math.abs(scroller.scrollHeight - expectedHeight) > HEIGHT_TOLERANCE_PX) {
    throw new Error(`Scroll height ${scroller.scrollHeight}px did not match ${expectedHeight}px.`);
  }
  const viewport = scroller.getBoundingClientRect();
  const seen = new Set<number>();
  const rows = Array.from(scroller.querySelectorAll<HTMLElement>('.bench-row')).flatMap((row) => {
    const index = Number(row.dataset['index']);
    const rect = row.getBoundingClientRect();
    if (rect.bottom < viewport.top - VIEWPORT_HEIGHT * 2 || rect.top > viewport.bottom + VIEWPORT_HEIGHT * 2) return [];
    if (!Number.isInteger(index) || index < 0 || index >= ITEM_COUNT) throw new Error(`Invalid benchmark row index ${row.dataset['index'] ?? 'missing'}.`);
    if (seen.has(index)) throw new Error(`Benchmark row ${index} appeared more than once.`);
    seen.add(index);
    if (Math.abs(rect.height - ROW_HEIGHT) > HEIGHT_TOLERANCE_PX) throw new Error(`Benchmark row ${index} measured ${round(rect.height)}px instead of ${ROW_HEIGHT}px.`);
    return [{ index, top: rect.top, bottom: rect.bottom }];
  });
  rows.sort((left, right) => left.top - right.top || left.index - right.index);
  for (let index = 1; index < rows.length; index += 1) {
    const previous = rows[index - 1]!;
    const current = rows[index]!;
    if (current.index !== previous.index + 1) continue;
    const gap = current.top - previous.bottom;
    if (Math.abs(gap) > HEIGHT_TOLERANCE_PX) throw new Error(`Benchmark rows ${previous.index} and ${current.index} have a ${round(gap)}px gap or overlap.`);
  }
  const visible = rows.filter((row) => row.bottom > viewport.top + HEIGHT_TOLERANCE_PX && row.top < viewport.bottom - HEIGHT_TOLERANCE_PX);
  if (visible.length === 0) throw new Error('No benchmark row covers the viewport.');
  if (!visible.some((row) => row.index === expectedIndex)) throw new Error(`Expected benchmark row ${expectedIndex} is absent from the viewport.`);
  const first = visible[0]!;
  const last = visible.at(-1)!;
  if (first.top > viewport.top + HEIGHT_TOLERANCE_PX) throw new Error(`Blank space precedes benchmark row ${first.index}.`);
  if (last.bottom < viewport.bottom - HEIGHT_TOLERANCE_PX) throw new Error(`Blank space follows benchmark row ${last.index}.`);
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

function caseKey(entry: BenchmarkCase): string { return `${entry.mode}:${entry.name}`; }
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
