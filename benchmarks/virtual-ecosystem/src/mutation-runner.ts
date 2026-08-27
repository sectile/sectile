import { ITEM_COUNT, ROW_HEIGHT, VIEWPORT_HEIGHT, type BenchmarkItem } from './constants.js';
import {
  automaticMutableAdapters,
  mutableAdapters,
  type DynamicSizeMode,
  type HeightHandling,
  type MutableBenchmarkAdapter,
} from './mutable-adapters.js';
import {
  createMutationScenario,
  mutationLocations,
  mutationOperations,
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
  readonly library: string;
  readonly version: string;
  readonly stack: string;
  readonly sizeMode: DynamicSizeMode;
  readonly operation: MutationOperation;
  readonly location: MutationLocation;
  readonly medianMs: number | null;
  readonly p95Ms: number | null;
  readonly settledSamples: number;
  readonly correctSamples: number;
  readonly totalSamples: number;
  readonly heightHandling: HeightHandling;
  readonly failures: readonly MutationFailure[];
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
  readonly failures: MutationFailure[];
}

interface SampleOutcome {
  readonly elapsedMs: number | null;
  readonly failures: readonly MutationFailure[];
}

const QUICK_RUN = new URLSearchParams(window.location.search).has('quick');
const MUTATION_ROUNDS = QUICK_RUN ? 1 : 5;
const SAMPLES_PER_ROUND = QUICK_RUN ? 1 : 2;
const FRAME_TIMEOUT_MS = 2_000;
const GEOMETRY_TOLERANCE_PX = 2;
const INVALID_FRAME_LIMIT = 3;

export const mutationConditions = Object.freeze({
  rounds: MUTATION_ROUNDS,
  samplesPerRound: SAMPLES_PER_ROUND,
  samplesPerScenario: MUTATION_ROUNDS * SAMPLES_PER_ROUND,
  frameTimeoutMs: FRAME_TIMEOUT_MS,
  geometryTolerancePx: GEOMETRY_TOLERANCE_PX,
  consecutiveInvalidFramesToFail: INVALID_FRAME_LIMIT,
  completion: 'first animation frame with correct DOM order, row geometry, total height, viewport coverage, and anchor position',
});

export async function runMutationBenchmarks(
  host: HTMLElement,
  onProgress: (message: string) => void,
  libraries?: readonly string[],
): Promise<readonly MutationBenchmarkResult[]> {
  const selectedAdapters = libraries === undefined
    ? [...mutableAdapters, ...automaticMutableAdapters]
    : [...mutableAdapters, ...automaticMutableAdapters].filter((adapter) => libraries.includes(adapter.name));
  const scenarios = mutationOperations.flatMap((operation) =>
    mutationLocations.map((location) => createMutationScenario(operation, location)));
  const raw = new Map<string, RawScenarioResult>();
  const total = selectedAdapters.length * scenarios.length * MUTATION_ROUNDS * SAMPLES_PER_ROUND;
  let completed = 0;

  for (let round = 0; round < MUTATION_ROUNDS; round += 1) {
    const adapterOrder = rotate(selectedAdapters, round * 3);
    const scenarioOrder = rotate(scenarios, round * 5);
    for (const adapter of adapterOrder) {
      for (const scenario of scenarioOrder) {
        const key = resultKey(adapter, scenario);
        const result = raw.get(key) ?? { samples: [], failures: [] };
        raw.set(key, result);
        for (let localSample = 0; localSample < SAMPLES_PER_ROUND; localSample += 1) {
          const sample = round * SAMPLES_PER_ROUND + localSample + 1;
          completed += 1;
          onProgress(`Mutation ${completed}/${total} · ${adapter.name} · ${adapter.sizeMode} · ${scenario.operation}/${scenario.location}`);
          const outcome = await runMutationSample(adapter, scenario, host, sample);
          if (outcome.elapsedMs !== null) result.samples.push(outcome.elapsedMs);
          result.failures.push(...outcome.failures);
        }
      }
    }
  }

  return Object.freeze(selectedAdapters.flatMap((adapter) => scenarios.map((scenario) => {
    const collected = raw.get(resultKey(adapter, scenario)) ?? { samples: [], failures: [] };
    const sorted = [...collected.samples].sort((left, right) => left - right);
    return Object.freeze({
      library: adapter.name,
      version: adapter.version,
      stack: adapter.stack,
      sizeMode: adapter.sizeMode,
      operation: scenario.operation,
      location: scenario.location,
      medianMs: sorted.length === 0 ? null : round(percentile(sorted, 0.5)),
      p95Ms: sorted.length === 0 ? null : round(percentile(sorted, 0.95)),
      settledSamples: sorted.length,
      correctSamples: (MUTATION_ROUNDS * SAMPLES_PER_ROUND) - new Set(collected.failures.map((failure) => failure.sample)).size,
      totalSamples: MUTATION_ROUNDS * SAMPLES_PER_ROUND,
      heightHandling: adapter.heightHandling,
      failures: Object.freeze(collected.failures),
    });
  })));
}

async function runMutationSample(
  adapter: MutableBenchmarkAdapter,
  scenario: MutationScenario,
  host: HTMLElement,
  sample: number,
): Promise<SampleOutcome> {
  host.replaceChildren();
  let mounted: ReturnType<MutableBenchmarkAdapter['mount']> | undefined;
  try {
    mounted = adapter.mount(host, scenario.initialItems);
    await waitForElement(host, '.bench-scroller');
    const scroller = mounted.scroller;
    await waitForRows(host);
    positionScenario(scroller, scenario);
    await waitForAffectedRow(host, scenario);
    await nextFrame();
    await nextFrame();

    const initialScrollHeight = scroller.scrollHeight;
    const initialIndex = indexByID(scenario.initialItems);
    const initialInspection = inspectLayout(scroller, initialIndex, scenario.initialItems, initialScrollHeight, undefined);
    if (initialInspection.failures.length > 0) {
      return Object.freeze({ elapsedMs: null, failures: [makeFailure(adapter, sample, scroller, initialInspection.failures[0]!)] });
    }
    const nextIndex = indexByID(scenario.nextItems);
    const expectedScrollHeight = initialScrollHeight + scenario.expectedScrollHeightDelta;
    const anchor = captureAnchor(scroller, initialInspection.rows, initialIndex, nextIndex, scenario, expectedScrollHeight);
    if (anchor === undefined) {
      return Object.freeze({
        elapsedMs: null,
        failures: [makeFailure(adapter, sample, scroller, {
          code: 'scroll-anchor', message: 'No unaffected visible row was available as a scroll anchor.', details: {},
        })],
      });
    }

    const startedAt = performance.now();
    mounted.update(scenario.nextItems, scenario);
    return await waitForCorrectMutation({
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
  } catch (error) {
    const scroller = host.querySelector<HTMLElement>('.bench-scroller');
    return Object.freeze({ elapsedMs: null, failures: [Object.freeze({
      severity: adapter.name === 'Sectile Virtual' ? 'fatal' : 'failure',
      code: 'exception',
      message: error instanceof Error ? error.message : String(error),
      sample,
      scrollTop: scroller?.scrollTop ?? 0,
      details: Object.freeze({ stack: error instanceof Error ? error.stack : undefined }),
    })] });
  } finally {
    mounted?.unmount();
    host.replaceChildren();
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
    const observedFailures = new Map<FailureCode, MutationFailure>();
    let lastInvalidSignature = '';
    let invalidFrames = 0;
    const frame = (): void => {
      const elapsed = performance.now() - options.startedAt;
      const observed = mutationObserved(options.host, options.scenario, options.nextIndex);
      if (observed) {
        const inspection = inspectLayout(
          options.scroller,
          options.nextIndex,
          options.scenario.nextItems,
          options.expectedScrollHeight,
          options.anchor,
        );
        lastInspection = inspection;
        if (inspection.failures.length === 0) {
          resolve(Object.freeze({ elapsedMs: round(elapsed), failures: Object.freeze([...observedFailures.values()]) }));
          return;
        }
        for (const failure of inspection.failures) {
          if (!observedFailures.has(failure.code)) {
            observedFailures.set(failure.code, makeFailure(options.adapter, options.sample, options.scroller, failure));
          }
        }
        const signature = JSON.stringify({
          failures: inspection.failures.map((failure) => ({ code: failure.code, details: failure.details })),
          scrollTop: options.scroller.scrollTop,
          scrollHeight: options.scroller.scrollHeight,
        });
        invalidFrames = signature === lastInvalidSignature ? invalidFrames + 1 : 1;
        lastInvalidSignature = signature;
        if (invalidFrames >= INVALID_FRAME_LIMIT) {
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

function inspectLayout(
  scroller: HTMLElement,
  expectedIndex: ReadonlyMap<string, number>,
  expectedItems: readonly BenchmarkItem[],
  expectedScrollHeight: number,
  anchor: Anchor | undefined,
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
    const expectedHeight = expectedItems[index]!.height;
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

  if (Math.abs(scroller.scrollHeight - expectedScrollHeight) > GEOMETRY_TOLERANCE_PX) {
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
    return target !== undefined && Math.abs(target.getBoundingClientRect().height - ROW_HEIGHT * 2) <= GEOMETRY_TOLERANCE_PX;
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
  expectedScrollHeight: number,
): Anchor | undefined {
  const viewport = scroller.getBoundingClientRect();
  const candidates = rows.filter((row) => nextIndex.has(row.id) && row.bottom > viewport.top && row.top < viewport.bottom);
  candidates.sort((left, right) => left.top - right.top);
  const selected = candidates[0];
  if (selected === undefined) return undefined;
  const beforeIndex = initialIndex.get(selected.id);
  const afterIndex = nextIndex.get(selected.id);
  if (beforeIndex === undefined || afterIndex === undefined) return undefined;
  const beforeAbsolute = beforeIndex * ROW_HEIGHT;
  const resizeDelta = scenario.operation === 'resize' && scenario.index < afterIndex ? ROW_HEIGHT : 0;
  const afterAbsolute = afterIndex * ROW_HEIGHT + resizeDelta;
  const absoluteDelta = afterAbsolute - beforeAbsolute;
  const desiredScrollTop = Math.min(
    Math.max(0, expectedScrollHeight - scroller.clientHeight),
    Math.max(0, scroller.scrollTop + absoluteDelta),
  );
  const viewportOffset = (selected.top - viewport.top) + absoluteDelta - (desiredScrollTop - scroller.scrollTop);
  return Object.freeze({ id: selected.id, viewportOffset });
}

function positionScenario(scroller: HTMLElement, scenario: MutationScenario): void {
  const maximum = Math.max(0, scroller.scrollHeight - scroller.clientHeight);
  const offset = scenario.location === 'start'
    ? 0
    : scenario.location === 'middle'
      ? Math.min(maximum, scenario.index * ROW_HEIGHT)
      : maximum;
  scroller.scrollTop = offset;
  scroller.dispatchEvent(new Event('scroll', { bubbles: true }));
}

function waitForAffectedRow(host: HTMLElement, scenario: MutationScenario): Promise<void> {
  const target = scenario.operation === 'insert'
    ? scenario.initialItems[scenario.index]!.id
    : scenario.affectedIDs[0]!;
  return waitUntil(() => host.querySelector(`.bench-row[data-id="${CSS.escape(target)}"]`) !== null, `row ${target}`);
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
  return `${adapter.name}:${adapter.sizeMode}:${scenario.operation}:${scenario.location}`;
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
