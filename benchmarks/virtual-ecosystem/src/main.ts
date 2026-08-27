import { adapters, type BenchmarkAdapter } from './adapters.js';
import { ITEM_COUNT, ROW_HEIGHT, VIEWPORT_HEIGHT } from './constants.js';
import {
  mutationConditions,
  runMutationBenchmarks,
  type MutationBenchmarkResult,
} from './mutation-runner.js';
import './style.css';

interface BenchmarkResult {
  readonly library: string;
  readonly version: string;
  readonly stack: string;
  readonly mountMs: number;
  readonly scrollMedianMs: number;
  readonly scrollP95Ms: number;
  readonly renderedRows: number;
  readonly domElements: number;
}

interface RawBenchmarkResult extends Omit<BenchmarkResult, 'mountMs' | 'scrollMedianMs' | 'scrollP95Ms'> {
  readonly mountMs: number;
  readonly scrollSamples: readonly number[];
}

declare global {
  interface Window {
    __sectileVirtualBenchmarkResults?: readonly BenchmarkResult[];
    __sectileVirtualBenchmarkReport?: {
      readonly baselineResults: readonly BenchmarkResult[];
      readonly mutationResults: readonly MutationBenchmarkResult[];
    };
  }
}

const QUICK_RUN = new URLSearchParams(window.location.search).has('quick');
const ROUNDS = QUICK_RUN ? 1 : 5;
const WARMUP_SCROLLS = QUICK_RUN ? 1 : 5;
const RECORDED_SCROLLS = QUICK_RUN ? 2 : 40;

const root = document.querySelector<HTMLElement>('#app');
if (root === null) throw new Error('Missing benchmark root.');

root.innerHTML = `
  <header>
    <h1>Virtualization ecosystem benchmark</h1>
    <p>100,000 fixed-height rows · 720 × 480 viewport · 8-row overscan · identical row content</p>
    <button type="button" id="run">Run benchmark</button>
  </header>
  <section aria-live="polite">
    <p id="status">Ready.</p>
    <div id="mount"></div>
    <table>
      <thead><tr><th>Library</th><th>Stack</th><th>Mount</th><th>Scroll median</th><th>Scroll p95</th><th>Rows</th><th>DOM elements</th></tr></thead>
      <tbody id="results"></tbody>
    </table>
    <h2>Mutation results</h2>
    <table>
      <thead><tr><th>Library</th><th>Operation</th><th>Location</th><th>Median</th><th>p95</th><th>Correct</th><th>Failures</th></tr></thead>
      <tbody id="mutation-results"></tbody>
    </table>
    <pre id="json"></pre>
  </section>
`;

const runButton = document.querySelector<HTMLButtonElement>('#run');
const status = document.querySelector<HTMLElement>('#status');
const mountHost = document.querySelector<HTMLElement>('#mount');
const resultsBody = document.querySelector<HTMLElement>('#results');
const mutationResultsBody = document.querySelector<HTMLElement>('#mutation-results');
const json = document.querySelector<HTMLElement>('#json');
if (runButton === null || status === null || mountHost === null || resultsBody === null || mutationResultsBody === null || json === null) throw new Error('Benchmark UI is incomplete.');

runButton.addEventListener('click', () => { void runAll(); });

async function runAll(): Promise<void> {
  runButton!.disabled = true;
  resultsBody!.replaceChildren();
  mutationResultsBody!.replaceChildren();
  json!.textContent = '';
  const raw = new Map<string, RawBenchmarkResult[]>();
  try {
    for (let round = 0; round < ROUNDS; round += 1) {
      const order = adapters.map((_, index) => adapters[(index + round * 3) % adapters.length]!);
      for (const adapter of order) {
        status!.textContent = `Round ${round + 1}/${ROUNDS} · ${adapter.name}…`;
        const result = await runAdapter(adapter, mountHost!);
        const samples = raw.get(adapter.name) ?? [];
        samples.push(result);
        raw.set(adapter.name, samples);
        await idleFrame();
      }
    }
    const baselineResults = adapters.map((adapter) => aggregate(adapter, raw.get(adapter.name) ?? []));
    for (const result of baselineResults) resultsBody!.append(renderResult(result));
    const mutationResults = await runMutationBenchmarks(mountHost!, (message) => { status!.textContent = message; });
    for (const result of mutationResults) mutationResultsBody!.append(renderMutationResult(result));
    window.__sectileVirtualBenchmarkResults = Object.freeze(baselineResults);
    window.__sectileVirtualBenchmarkReport = Object.freeze({ baselineResults, mutationResults });
    json!.textContent = JSON.stringify({
      benchmark: 'sectile-virtual-ecosystem',
      environment: navigator.userAgent,
      conditions: {
        itemCount: ITEM_COUNT,
        initialRowHeight: ROW_HEIGHT,
        viewport: [720, VIEWPORT_HEIGHT],
        overscanRows: 8,
        baseline: { rounds: ROUNDS, scrollSamplesPerRound: RECORDED_SCROLLS },
        mutations: mutationConditions,
      },
      baselineResults,
      mutationResults,
    }, null, 2);
    status!.textContent = 'Complete.';
  } catch (error) {
    status!.textContent = `Failed: ${error instanceof Error ? error.message : String(error)}`;
    throw error;
  } finally {
    runButton!.disabled = false;
  }
}

function renderMutationResult(result: MutationBenchmarkResult): HTMLTableRowElement {
  const row = document.createElement('tr');
  const values = [
    `${result.library} ${result.version}`,
    result.operation,
    result.location,
    result.medianMs === null ? '—' : `${result.medianMs.toFixed(2)} ms`,
    result.p95Ms === null ? '—' : `${result.p95Ms.toFixed(2)} ms`,
    `${result.correctSamples}/${result.totalSamples}`,
    result.failures.length === 0 ? '0' : `${result.failures.length} (${result.failures[0]!.code})`,
  ];
  for (const value of values) {
    const cell = document.createElement('td');
    cell.textContent = value;
    row.append(cell);
  }
  if (result.failures.some((failure) => failure.severity === 'fatal')) row.dataset['severity'] = 'fatal';
  return row;
}

async function runAdapter(adapter: BenchmarkAdapter, host: HTMLElement): Promise<RawBenchmarkResult> {
  host.replaceChildren();
  const startedAt = performance.now();
  const mounted = adapter.mount(host);
  await waitForRows(host, 0);
  await nextFrame();
  const mountMs = performance.now() - startedAt;
  const maximum = (ITEM_COUNT * ROW_HEIGHT) - VIEWPORT_HEIGHT;
  const sampleCount = WARMUP_SCROLLS + RECORDED_SCROLLS;
  const offsets = Array.from({ length: sampleCount }, (_, index) => Math.floor(maximum * (((index * 19) % 47) / 46)));
  const samples: number[] = [];
  for (let index = 0; index < offsets.length; index += 1) {
    const offset = offsets[index]!;
    const expected = Math.floor(offset / ROW_HEIGHT);
    const scrollStartedAt = performance.now();
    mounted.scroller.scrollTop = offset;
    mounted.scroller.dispatchEvent(new Event('scroll', { bubbles: true }));
    await waitForRows(host, expected);
    const elapsed = performance.now() - scrollStartedAt;
    if (index >= WARMUP_SCROLLS) samples.push(elapsed);
  }
  const renderedRows = host.querySelectorAll('.bench-row').length;
  const domElements = host.querySelectorAll('*').length;
  mounted.unmount();
  host.replaceChildren();
  return Object.freeze({
    library: adapter.name,
    version: adapter.version,
    stack: adapter.stack,
    mountMs,
    scrollSamples: Object.freeze(samples),
    renderedRows,
    domElements,
  });
}

function aggregate(adapter: BenchmarkAdapter, rounds: readonly RawBenchmarkResult[]): BenchmarkResult {
  if (rounds.length !== ROUNDS) throw new Error(`${adapter.name} produced ${rounds.length}/${ROUNDS} rounds.`);
  const mounts = rounds.map((round) => round.mountMs).sort((left, right) => left - right);
  const scrolls = rounds.flatMap((round) => round.scrollSamples).sort((left, right) => left - right);
  const last = rounds.at(-1)!;
  return Object.freeze({
    library: adapter.name,
    version: adapter.version,
    stack: adapter.stack,
    mountMs: round(percentile(mounts, 0.5)),
    scrollMedianMs: round(percentile(scrolls, 0.5)),
    scrollP95Ms: round(percentile(scrolls, 0.95)),
    renderedRows: last.renderedRows,
    domElements: last.domElements,
  });
}

function waitForRows(host: HTMLElement, expectedIndex: number): Promise<void> {
  const matches = (): boolean => Array.from(host.querySelectorAll<HTMLElement>('.bench-row'))
    .some((row) => Math.abs(Number(row.dataset['index']) - expectedIndex) <= 20);
  if (matches()) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const observer = new MutationObserver(() => {
      if (!matches()) return;
      clearTimeout(timeout);
      observer.disconnect();
      resolve();
    });
    const timeout = window.setTimeout(() => {
      observer.disconnect();
      const indexes = Array.from(host.querySelectorAll<HTMLElement>('.bench-row')).map((row) => row.dataset['index']);
      reject(new Error(`Timed out waiting for row ${expectedIndex}; rendered ${indexes.join(', ') || 'none'}.`));
    }, 4_000);
    observer.observe(host, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-index'] });
  });
}

function renderResult(result: BenchmarkResult): HTMLTableRowElement {
  const row = document.createElement('tr');
  const values = [
    `${result.library} ${result.version}`,
    result.stack,
    `${result.mountMs.toFixed(2)} ms`,
    `${result.scrollMedianMs.toFixed(2)} ms`,
    `${result.scrollP95Ms.toFixed(2)} ms`,
    String(result.renderedRows),
    String(result.domElements),
  ];
  for (const value of values) {
    const cell = document.createElement('td');
    cell.textContent = value;
    row.append(cell);
  }
  return row;
}

function percentile(sorted: readonly number[], ratio: number): number {
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * ratio) - 1))] ?? 0;
}

function round(value: number): number { return Number(value.toFixed(3)); }
function nextFrame(): Promise<void> { return new Promise((resolve) => requestAnimationFrame(() => resolve())); }
function idleFrame(): Promise<void> { return new Promise((resolve) => setTimeout(resolve, 50)); }
