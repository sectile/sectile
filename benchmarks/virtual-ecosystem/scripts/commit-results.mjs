import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const packageRoot = resolve(import.meta.dirname, '..');
const repoRoot = resolve(packageRoot, '../..');
const args = process.argv.slice(2);
const baselineOnly = args.includes('--baseline-only');
const mergeBaseline = args.includes('--merge-baseline');
const mergeMutations = args.includes('--merge-mutations');
const inputPath = resolve(args.find((argument) => !argument.startsWith('--')) ?? '/tmp/sectile-virtual-benchmark.json');
const rawOutputPath = resolve(packageRoot, 'results/chrome-151-macos-arm64.json');
const docsOutputPath = resolve(repoRoot, 'docs/.vitepress/theme/virtual-benchmark-data.ts');
const incomingReport = JSON.parse(await readFile(inputPath, 'utf8'));
if ([baselineOnly, mergeBaseline, mergeMutations].filter(Boolean).length > 1) {
  throw new Error('--baseline-only, --merge-baseline, and --merge-mutations are mutually exclusive.');
}
const previousReport = baselineOnly || mergeBaseline || mergeMutations
  ? JSON.parse(await readFile(rawOutputPath, 'utf8'))
  : undefined;
if (previousReport !== undefined) assertCompatibleConditions(previousReport, incomingReport);
if (baselineOnly && incomingReport.mutationResults.length !== 0) {
  throw new Error('A baseline-only report must not contain mutation results.');
}
if (mergeMutations && incomingReport.mutationResults.length === 0) {
  throw new Error('A mutation merge report must contain at least one mutation result.');
}
const normalizedIncoming = normalizeReport(incomingReport);
const normalizedPrevious = previousReport === undefined ? undefined : normalizeReport(previousReport);
const report = baselineOnly
  ? {
      ...normalizedPrevious,
      ...normalizedIncoming,
      conditions: {
        ...normalizedPrevious.conditions,
        ...normalizedIncoming.conditions,
        rowProfiles: mergeProfileConditions(normalizedPrevious, normalizedIncoming),
        mutations: normalizedPrevious.conditions.mutations,
      },
      mutationResults: normalizedPrevious.mutationResults,
    }
  : mergeBaseline
    ? {
        ...normalizedPrevious,
        environment: normalizedIncoming.environment,
        protocolVersion: normalizedIncoming.protocolVersion,
        conditions: {
          ...normalizedPrevious.conditions,
          ...normalizedIncoming.conditions,
          rowProfiles: mergeProfileConditions(normalizedPrevious, normalizedIncoming),
          mutations: normalizedPrevious.conditions.mutations,
        },
        baselineResults: mergeBaselineResults(normalizedPrevious.baselineResults, normalizedIncoming.baselineResults),
        baselineFailures: mergeBaselineResults(normalizedPrevious.baselineFailures ?? [], normalizedIncoming.baselineFailures ?? []),
        baselineSamples: { ...(normalizedPrevious.baselineSamples ?? {}), ...(normalizedIncoming.baselineSamples ?? {}) },
      }
  : mergeMutations
    ? {
        ...normalizedPrevious,
        environment: normalizedIncoming.environment,
        protocolVersion: normalizedIncoming.protocolVersion,
        conditions: {
          ...normalizedPrevious.conditions,
          ...normalizedIncoming.conditions,
          rowProfiles: mergeProfileConditions(normalizedPrevious, normalizedIncoming),
          baseline: normalizedPrevious.conditions.baseline,
        },
        mutationResults: mergeMutationResults(normalizedPrevious.mutationResults, normalizedIncoming.mutationResults),
      }
  : normalizedIncoming;
const observedAt = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date());
const conditions = {
  ...report.conditions,
  mutations: {
    ...report.conditions.mutations,
    recovery: 'every frame after the mutation becomes observable is checked; recovery within 200ms is responsive, recovery from 200ms through 500ms is slow, and no correct frame within 500ms is a hard failure; an unchanged incorrect layout can fail earlier at the stable-failure threshold',
  },
};

const rawReport = {
  ...report,
  conditions,
  observedAt,
};

const baselineResults = report.baselineResults.map((result) => ({
  rowProfile: result.rowProfile,
  mode: result.mode,
  library: result.library,
  version: result.version,
  stack: result.stack,
  setupMs: result.setupMs,
  firstRowsMs: result.firstRowsMs,
  mountMs: result.mountMs,
  initialTotalHeightErrorPercent: result.initialTotalHeightErrorPercent ?? 0,
  scrollTotalHeightErrorMedianPercent: result.scrollTotalHeightErrorMedianPercent ?? 0,
  scrollTotalHeightErrorP95Percent: result.scrollTotalHeightErrorP95Percent ?? 0,
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

const baselineFailures = (report.baselineFailures ?? []).map((failure) => ({
  rowProfile: failure.rowProfile,
  mode: failure.mode,
  library: failure.library,
  version: failure.version,
  stack: failure.stack,
  failedRounds: (report.baselineFailures ?? []).filter((entry) => entry.rowProfile === failure.rowProfile && entry.mode === failure.mode && entry.library === failure.library).length,
  totalRounds: report.conditions.baseline.rounds,
  message: failure.message,
})).filter((failure, index, failures) => failures.findIndex((candidate) => (
  candidate.rowProfile === failure.rowProfile && candidate.mode === failure.mode && candidate.library === failure.library
)) === index);

const mutationResults = report.mutationResults.map((result) => ({
  rowProfile: result.rowProfile,
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
export type BenchmarkRowProfile = 'uniform' | 'heterogeneous';

export interface BaselineBenchmarkResult {
  readonly rowProfile: BenchmarkRowProfile;
  readonly mode: BenchmarkHeightMode;
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
}

export interface BaselineBenchmarkFailure {
  readonly rowProfile: BenchmarkRowProfile;
  readonly mode: BenchmarkHeightMode;
  readonly library: string;
  readonly version: string;
  readonly stack: string;
  readonly failedRounds: number;
  readonly totalRounds: number;
  readonly message: string;
}

export interface MutationBenchmarkResult {
  readonly rowProfile: BenchmarkRowProfile;
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

export interface BenchmarkRowProfileConditions {
  readonly commonEstimateHeight: number;
  readonly contentCorpusVersion: number;
  readonly contentVariants: number;
  readonly heightDistribution: {
    readonly minimum: number;
    readonly median: number;
    readonly p95: number;
    readonly maximum: number;
    readonly distinct: number;
  };
}

// Generated by benchmarks/virtual-ecosystem/scripts/commit-results.mjs.
export const baselineBenchmarkResults: readonly BaselineBenchmarkResult[] = Object.freeze(${JSON.stringify(baselineResults, null, 2)});

export const baselineBenchmarkFailures: readonly BaselineBenchmarkFailure[] = Object.freeze(${JSON.stringify(baselineFailures, null, 2)});

export const mutationBenchmarkResults: readonly MutationBenchmarkResult[] = Object.freeze(${JSON.stringify(mutationResults, null, 2)});

export const heightModeSupport: readonly HeightModeSupport[] = Object.freeze(${JSON.stringify(report.heightModeSupport, null, 2)});

export const benchmarkRowProfiles: Readonly<Partial<Record<BenchmarkRowProfile, BenchmarkRowProfileConditions>>> = Object.freeze(${JSON.stringify(report.conditions.rowProfiles, null, 2)});
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

function mergeBaselineResults(previousResults, incomingResults) {
  const incomingByKey = new Map(incomingResults.map((result) => [baselineKey(result), result]));
  const merged = previousResults.map((result) => incomingByKey.get(baselineKey(result)) ?? result);
  const previousKeys = new Set(previousResults.map(baselineKey));
  for (const result of incomingResults) {
    if (!previousKeys.has(baselineKey(result))) merged.push(result);
  }
  return merged;
}

function baselineKey(result) {
  return `${result.rowProfile}\u0000${result.mode}\u0000${result.library}`;
}

function mutationKey(result) {
  return `${result.rowProfile}\u0000${result.library}\u0000${result.sizeMode}\u0000${result.operation}\u0000${result.location}`;
}

function assertCompatibleConditions(previous, incoming) {
  const previousKey = JSON.stringify({
    protocolVersion: previous.protocolVersion,
    itemCount: previous.conditions?.itemCount,
    contentCorpusVersion: previous.conditions?.contentCorpusVersion,
    viewport: previous.conditions?.viewport,
  });
  const incomingKey = JSON.stringify({
    protocolVersion: incoming.protocolVersion,
    itemCount: incoming.conditions?.itemCount,
    contentCorpusVersion: incoming.conditions?.contentCorpusVersion,
    viewport: incoming.conditions?.viewport,
  });
  if (previousKey !== incomingKey) {
    throw new Error('Cannot merge benchmark reports from different protocols or geometry conditions. Run and commit the complete suite.');
  }
}

function normalizeReport(report) {
  const profile = report.conditions?.rowProfile ?? 'uniform';
  const rowProfiles = {
    ...(report.conditions?.rowProfiles ?? {}),
    [profile]: profileConditions(report.conditions),
  };
  return {
    ...report,
    baselineResults: (report.baselineResults ?? []).map((result) => ({ rowProfile: result.rowProfile ?? profile, ...result })),
    baselineFailures: (report.baselineFailures ?? []).map((result) => ({ rowProfile: result.rowProfile ?? profile, ...result })),
    mutationResults: (report.mutationResults ?? []).map((result) => ({ rowProfile: result.rowProfile ?? profile, ...result })),
    conditions: { ...report.conditions, rowProfile: profile, rowProfiles },
  };
}

function profileConditions(conditions = {}) {
  return {
    commonEstimateHeight: conditions.commonEstimateHeight ?? conditions.actualRowHeight ?? 72,
    contentCorpusVersion: conditions.contentCorpusVersion ?? 0,
    contentVariants: conditions.contentVariants ?? 1,
    heightDistribution: conditions.heightDistribution ?? {
      minimum: conditions.actualRowHeight ?? 72,
      median: conditions.actualRowHeight ?? 72,
      p95: conditions.actualRowHeight ?? 72,
      maximum: conditions.actualRowHeight ?? 72,
      distinct: 1,
    },
  };
}

function mergeProfileConditions(previous, incoming) {
  return { ...(previous.conditions.rowProfiles ?? {}), ...(incoming.conditions.rowProfiles ?? {}) };
}
