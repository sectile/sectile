import { readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { normalizeMutationResult } from './result-normalization.mjs';
import { assertCompatibleSource, mergeRuns } from './source-metadata.mjs';
import { root as repoRoot } from '../lib/repository.mjs';

const packageRoot = resolve(repoRoot, 'benchmarks/virtual-ecosystem');
const args = process.argv.slice(2);
const baselineOnly = args.includes('--baseline-only');
const mergeBaseline = args.includes('--merge-baseline');
const mergeMutations = args.includes('--merge-mutations');
const inputPath = resolve(args.find((argument) => !argument.startsWith('--')) ?? resolve(tmpdir(), 'sectile-virtual-benchmark.json'));
const fullRawOutputPath = resolve(packageRoot, 'results/chrome-151-macos-arm64.json');
const baselineRawOutputPath = resolve(packageRoot, 'results/chrome-151-macos-arm64-baseline.json');
const layoutRawOutputPath = resolve(packageRoot, 'results/chrome-151-macos-arm64-layouts.json');
const incomingReport = JSON.parse(await readFile(inputPath, 'utf8'));
if ([baselineOnly, mergeBaseline, mergeMutations].filter(Boolean).length > 1) {
  throw new Error('--baseline-only, --merge-baseline, and --merge-mutations are mutually exclusive.');
}
const previousReport = mergeBaseline || mergeMutations
  ? JSON.parse(await readFile(fullRawOutputPath, 'utf8'))
  : undefined;
if (previousReport !== undefined) {
  assertCompatibleConditions(previousReport, incomingReport);
  assertCompatibleSource(previousReport, incomingReport);
}
if (baselineOnly && incomingReport.mutationResults.length !== 0) {
  throw new Error('A baseline-only report must not contain mutation results.');
}
if (baselineOnly) assertCompleteBaselineReport(incomingReport);
if (mergeMutations && incomingReport.mutationResults.length === 0) {
  throw new Error('A mutation merge report must contain at least one mutation result.');
}
const normalizedIncoming = normalizeReport(incomingReport);
const normalizedPrevious = previousReport === undefined ? undefined : normalizeReport(previousReport);
const report = baselineOnly
  ? normalizedIncoming
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
        source: normalizedIncoming.source,
        runs: mergeRuns(normalizedPrevious, normalizedIncoming),
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
        source: normalizedIncoming.source,
        runs: mergeRuns(normalizedPrevious, normalizedIncoming),
      }
  : normalizedIncoming;
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
};
const layoutBundle = await readJsonIfExists(layoutRawOutputPath);
const layoutReports = layoutBundle?.reports ?? [];
for (const layoutReport of layoutReports) assertCompatibleSource(rawReport, layoutReport);
const layoutBaselineResults = layoutReports.flatMap((layoutReport) => layoutReport.layoutResults ?? []);
const layoutBaselineFailures = layoutReports.flatMap((layoutReport) => layoutReport.layoutFailures ?? []);
const layoutMutationResults = layoutReports.flatMap((layoutReport) => layoutReport.layoutMutationResults ?? []);
const benchmarkRuns = mergeRuns(report, ...layoutReports);

const baselineResults = report.baselineResults.map((result) => ({
  runIds: result.runIds,
  rowProfile: result.rowProfile,
  mode: result.mode,
  library: result.library,
  version: result.version,
  stack: result.stack,
  firstInstanceSetupMs: result.firstInstanceSetupMs,
  firstInstanceFirstRowsMs: result.firstInstanceFirstRowsMs,
  firstInstanceLayoutReadyMs: result.firstInstanceLayoutReadyMs,
  firstInstancePresentationReadyMs: result.firstInstancePresentationReadyMs,
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
  completedRounds: result.completedRounds,
  plannedRounds: result.plannedRounds,
  earlyStopReason: result.earlyStopReason,
}));

const baselineFailures = (report.baselineFailures ?? []).map((failure) => ({
  runIds: [...new Set((report.baselineFailures ?? [])
    .filter((entry) => entry.rowProfile === failure.rowProfile && entry.mode === failure.mode && entry.library === failure.library)
    .flatMap((entry) => entry.runIds ?? []))],
  rowProfile: failure.rowProfile,
  mode: failure.mode,
  library: failure.library,
  version: failure.version,
  stack: failure.stack,
  failedRounds: (report.baselineFailures ?? []).filter((entry) => entry.rowProfile === failure.rowProfile && entry.mode === failure.mode && entry.library === failure.library).length,
  totalRounds: report.conditions.baseline.maximumRounds ?? report.conditions.baseline.rounds,
  message: failure.message,
})).filter((failure, index, failures) => failures.findIndex((candidate) => (
  candidate.rowProfile === failure.rowProfile && candidate.mode === failure.mode && candidate.library === failure.library
)) === index);

const mutationReport = baselineOnly
  ? normalizeReport(JSON.parse(await readFile(fullRawOutputPath, 'utf8')))
  : report;
const mutationResults = mutationReport.mutationResults.map((result) => ({
  runIds: result.runIds,
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
  plannedSamples: result.plannedSamples ?? result.totalSamples,
  earlyStopped: result.earlyStopped ?? false,
  earlyStopReason: result.earlyStopReason ?? null,
  heightHandling: result.heightHandling,
  failureCodes: [...new Set(result.failures.map((failure) => failure.code))],
}));

await writeFile(
  baselineOnly ? baselineRawOutputPath : fullRawOutputPath,
  `${JSON.stringify(rawReport, null, 2)}\n`,
  'utf8',
);

console.log(`Wrote ${baselineOnly ? baselineRawOutputPath : fullRawOutputPath}`);

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
    mutationResults: (report.mutationResults ?? []).map((result) => normalizeMutationResult({ rowProfile: result.rowProfile ?? profile, ...result })),
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

function assertCompleteBaselineReport(report) {
  const profiles = new Set([
    ...(report.baselineResults ?? []).map((result) => result.rowProfile),
    ...(report.baselineFailures ?? []).map((failure) => failure.rowProfile),
  ]);
  if (!profiles.has('uniform') || !profiles.has('heterogeneous')) {
    throw new Error('A committed baseline report must contain both row profiles. Merge both baseline shards first.');
  }
}

async function readJsonIfExists(path) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch (error) {
    if (error?.code === 'ENOENT') return undefined;
    throw error;
  }
}
