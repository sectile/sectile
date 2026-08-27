import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const packageRoot = resolve(import.meta.dirname, '..');
const repoRoot = resolve(packageRoot, '../..');
const args = process.argv.slice(2);
const baselineOnly = args.includes('--baseline-only');
const mergeMutations = args.includes('--merge-mutations');
const inputPath = resolve(args.find((argument) => !argument.startsWith('--')) ?? '/tmp/sectile-virtual-benchmark.json');
const rawOutputPath = resolve(packageRoot, 'results/chrome-151-macos-arm64.json');
const docsOutputPath = resolve(repoRoot, 'docs/.vitepress/theme/virtual-benchmark-data.ts');
const incomingReport = JSON.parse(await readFile(inputPath, 'utf8'));
if (baselineOnly && mergeMutations) {
  throw new Error('--baseline-only and --merge-mutations cannot be combined.');
}
const previousReport = baselineOnly || mergeMutations
  ? JSON.parse(await readFile(rawOutputPath, 'utf8'))
  : undefined;
if (baselineOnly && incomingReport.mutationResults.length !== 0) {
  throw new Error('A baseline-only report must not contain mutation results.');
}
if (mergeMutations && incomingReport.mutationResults.length === 0) {
  throw new Error('A mutation merge report must contain at least one mutation result.');
}
const report = baselineOnly
  ? {
      ...previousReport,
      ...incomingReport,
      conditions: {
        ...previousReport.conditions,
        ...incomingReport.conditions,
        mutations: previousReport.conditions.mutations,
      },
      mutationResults: previousReport.mutationResults,
    }
  : mergeMutations
    ? {
        ...previousReport,
        environment: incomingReport.environment,
        conditions: {
          ...previousReport.conditions,
          mutations: incomingReport.conditions.mutations,
        },
        mutationResults: mergeMutationResults(previousReport.mutationResults, incomingReport.mutationResults),
      }
  : incomingReport;
const observedAt = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date());
const conditions = {
  ...report.conditions,
  mutations: {
    ...report.conditions.mutations,
    recovery: 'every frame after the mutation becomes observable is checked; the first occurrence of each failure code is retained while recovery is observed until the frame timeout',
  },
};

const rawReport = {
  ...report,
  conditions,
  observedAt,
};

const baselineResults = report.baselineResults.map((result) => ({
  mode: result.mode,
  library: result.library,
  version: result.version,
  stack: result.stack,
  setupMs: result.setupMs,
  firstRowsMs: result.firstRowsMs,
  mountMs: result.mountMs,
  scrollMedianMs: result.scrollMedianMs,
  scrollMedianLowerBoundMs: result.scrollMedianLowerBoundMs,
  scrollP95Ms: result.scrollP95Ms,
  scrollMadMs: result.scrollMadMs,
  scrollProbeMedianMs: result.scrollProbeMedianMs,
  scrollChecksMedian: result.scrollChecksMedian,
  scrollSampleCount: result.scrollSampleCount,
  scrollRoundMedianRangeMs: result.scrollRoundMedianRangeMs,
  scrollRoundP95RangeMs: result.scrollRoundP95RangeMs,
}));

const mutationResults = report.mutationResults.map((result) => ({
  library: result.library,
  version: result.version,
  stack: result.stack,
  sizeMode: result.sizeMode,
  operation: result.operation,
  location: result.location,
  medianMs: result.medianMs,
  p95Ms: result.p95Ms,
  recoveryMedianMs: result.recoveryMedianMs,
  recoveryP95Ms: result.recoveryP95Ms,
  slowTailMs: result.p95Ms === null
    ? []
    : result.samples
        .map((sample) => sample.elapsedMs)
        .filter((value) => typeof value === 'number' && value > result.p95Ms)
        .sort((left, right) => left - right),
  settledSamples: result.settledSamples,
  correctSamples: result.correctSamples,
  recoveredSamples: result.recoveredSamples,
  failedSamples: result.failedSamples,
  totalSamples: result.totalSamples,
  heightHandling: result.heightHandling,
  failureCodes: [...new Set(result.failures.map((failure) => failure.code))],
}));

const docsModule = `export type BenchmarkOperation = 'insert' | 'move' | 'remove' | 'resize';
export type BenchmarkLocation = 'start' | 'middle' | 'end';
export type BenchmarkHeightMode = 'fixed' | 'estimated' | 'automatic';

export interface BaselineBenchmarkResult {
  readonly mode: BenchmarkHeightMode;
  readonly library: string;
  readonly version: string;
  readonly stack: string;
  readonly setupMs: number;
  readonly firstRowsMs: number;
  readonly mountMs: number;
  readonly scrollMedianMs: number;
  readonly scrollMedianLowerBoundMs: number;
  readonly scrollP95Ms: number;
  readonly scrollMadMs: number;
  readonly scrollProbeMedianMs: number;
  readonly scrollChecksMedian: number;
  readonly scrollSampleCount: number;
  readonly scrollRoundMedianRangeMs: readonly [number, number];
  readonly scrollRoundP95RangeMs: readonly [number, number];
}

export interface MutationBenchmarkResult {
  readonly library: string;
  readonly version: string;
  readonly stack: string;
  readonly sizeMode: Exclude<BenchmarkHeightMode, 'fixed'>;
  readonly operation: BenchmarkOperation;
  readonly location: BenchmarkLocation;
  readonly medianMs: number | null;
  readonly p95Ms: number | null;
  readonly recoveryMedianMs: number | null;
  readonly recoveryP95Ms: number | null;
  readonly slowTailMs: readonly number[];
  readonly settledSamples: number;
  readonly correctSamples: number;
  readonly recoveredSamples: number;
  readonly failedSamples: number;
  readonly totalSamples: number;
  readonly heightHandling: {
    readonly sizeInput: 'dom-measurement' | 'application-size';
    readonly initialEstimate: boolean;
    readonly resizeNotification: 'automatic' | 'dependency-signal' | 'cache-invalidation';
    readonly applicationCalculatesHeight: boolean;
  };
  readonly failureCodes: readonly string[];
}

export interface HeightModeSupport {
  readonly library: string;
  readonly fixed: true;
  readonly estimated: true;
  readonly automatic: boolean;
  readonly automaticNote: string;
}

// Generated by benchmarks/virtual-ecosystem/scripts/commit-results.mjs.
export const baselineBenchmarkResults: readonly BaselineBenchmarkResult[] = Object.freeze(${JSON.stringify(baselineResults, null, 2)});

export const mutationBenchmarkResults: readonly MutationBenchmarkResult[] = Object.freeze(${JSON.stringify(mutationResults, null, 2)});

export const heightModeSupport: readonly HeightModeSupport[] = Object.freeze(${JSON.stringify(report.heightModeSupport, null, 2)});
`;

await Promise.all([
  writeFile(rawOutputPath, `${JSON.stringify(rawReport, null, 2)}\n`, 'utf8'),
  writeFile(docsOutputPath, docsModule, 'utf8'),
]);

console.log(`Wrote ${rawOutputPath}`);
console.log(`Wrote ${docsOutputPath}`);

function mergeMutationResults(previousResults, incomingResults) {
  const incomingByKey = new Map(incomingResults.map((result) => [mutationKey(result), result]));
  const merged = previousResults.map((result) => incomingByKey.get(mutationKey(result)) ?? result);
  const previousKeys = new Set(previousResults.map(mutationKey));
  for (const result of incomingResults) {
    if (!previousKeys.has(mutationKey(result))) merged.push(result);
  }
  return merged;
}

function mutationKey(result) {
  return `${result.library}\u0000${result.sizeMode}\u0000${result.operation}\u0000${result.location}`;
}
