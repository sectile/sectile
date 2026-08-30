import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { assertCompatibleSource, mergeRuns } from './source-metadata.mjs';

const [outputArgument, ...inputArguments] = process.argv.slice(2);
if (outputArgument === undefined || inputArguments.length === 0) {
  throw new Error('Usage: pnpm merge-shards <output.json> <input.json...>');
}

const outputPath = resolve(outputArgument);
const reports = await Promise.all(inputArguments.map(async (input) => (
  JSON.parse(await readFile(resolve(input), 'utf8'))
)));
for (const report of reports.slice(1)) {
  assertCompatible(reports[0], report);
  assertCompatibleSource(reports[0], report);
}
if (reports[0].conditions.family !== undefined && reports[0].conditions.family !== 'list') {
  const merged = {
    ...reports[0],
    environment: reports.at(-1).environment,
    source: reports[0].source,
    runs: mergeRuns(...reports),
    capabilities: mergeUnique(reports.flatMap((report) => report.capabilities ?? []), (entry) => `${entry.family}\u0000${entry.library}`),
    layoutResults: mergeUnique(reports.flatMap((report) => report.layoutResults ?? []), layoutBaselineKey),
    layoutFailures: mergeUnique(reports.flatMap((report) => report.layoutFailures ?? []), layoutBaselineKey),
    layoutMutationResults: mergeUnique(reports.flatMap((report) => report.layoutMutationResults ?? []), layoutMutationKey),
  };
  await writeFile(outputPath, `${JSON.stringify(merged, null, 2)}\n`, 'utf8');
  console.log(`Wrote ${outputPath}`);
  process.exit(0);
}
const mergedBaseline = mergeBaselineReports(reports);

const merged = {
  ...reports[0],
  environment: reports.at(-1).environment,
  source: reports[0].source,
  runs: mergeRuns(...reports),
  conditions: {
    ...reports[0].conditions,
    baseline: {
      ...reports.find((report) => (report.baselineResults?.length ?? 0) > 0)?.conditions.baseline,
      adaptiveSampling: reports.every((report) => report.conditions.baseline?.adaptiveSampling === true),
      rounds: mergedBaseline.rounds,
      maximumRounds: mergedBaseline.rounds,
      minimumRounds: reports.every((report) => report.conditions.baseline?.adaptiveSampling === true)
        ? Math.min(...reports.map((report) => report.conditions.baseline?.minimumRounds ?? mergedBaseline.rounds))
        : mergedBaseline.rounds,
    },
    rowProfiles: mergeRowProfiles(reports),
    mutations: mergeMutationConditions(reports),
  },
  baselineResults: mergedBaseline.results,
  baselineFailures: mergedBaseline.failures,
  baselineSamples: mergedBaseline.samples,
  mutationResults: mergeMutationResults(reports.flatMap((report) => report.mutationResults ?? [])),
};

await writeFile(outputPath, `${JSON.stringify(merged, null, 2)}\n`, 'utf8');
console.log(`Wrote ${outputPath}`);

function mergeMutationResults(results) {
  const groups = new Map();
  for (const result of results) {
    const key = mutationKey(result);
    const group = groups.get(key) ?? [];
    group.push(result);
    groups.set(key, group);
  }
  return [...groups.values()].map(mergeMutationGroup);
}

function mergeBaselineReports(reports) {
  const groups = new Map();
  for (const report of reports) {
    const resultByKey = new Map((report.baselineResults ?? []).map((result) => [baselineKey(result), result]));
    const failuresByKey = new Map();
    for (const failure of report.baselineFailures ?? []) {
      const key = baselineKey(failure);
      const failures = failuresByKey.get(key) ?? [];
      failures.push(failure);
      failuresByKey.set(key, failures);
    }
    for (const key of new Set([...resultByKey.keys(), ...failuresByKey.keys()])) {
      const entries = groups.get(key) ?? [];
      entries.push({
        result: resultByKey.get(key),
        failures: failuresByKey.get(key) ?? [],
        samples: report.baselineSamples?.[key.replaceAll('\u0000', ':')] ?? [],
        rounds: report.conditions.baseline?.rounds ?? 0,
      });
      groups.set(key, entries);
    }
  }

  const results = [];
  const failures = [];
  const samples = {};
  let rounds = 0;
  for (const [key, entries] of groups) {
    const mergedSamples = [];
    let roundOffset = 0;
    for (const entry of entries) {
      for (const sample of entry.samples) mergedSamples.push({ ...sample, round: Number(sample.round) + roundOffset });
      for (const failure of entry.failures) failures.push({ ...failure, round: Number(failure.round) + roundOffset });
      roundOffset += entry.rounds;
    }
    rounds = Math.max(rounds, roundOffset);
    samples[key.replaceAll('\u0000', ':')] = mergedSamples;
    if (entries.every((entry) => entry.result !== undefined)) {
      results.push(entries.length === 1
        ? entries[0].result
        : aggregateBaselineResults(entries.map((entry) => entry.result), mergedSamples));
    }
  }
  return { results, failures, samples, rounds };
}

function mergeRowProfiles(reports) {
  const profiles = {};
  for (const report of reports) {
    Object.assign(profiles, report.conditions.rowProfiles ?? {});
    const profile = report.conditions.rowProfile;
    if (profile === undefined) continue;
    profiles[profile] = {
      commonEstimateHeight: report.conditions.commonEstimateHeight,
      contentCorpusVersion: report.conditions.contentCorpusVersion,
      contentVariants: report.conditions.contentVariants,
      heightDistribution: report.conditions.heightDistribution,
    };
  }
  return profiles;
}

function aggregateBaselineResults(results, samples) {
  const template = results[0];
  const elapsed = samples.map((sample) => sample.elapsedMs).sort((left, right) => left - right);
  const lowerBounds = samples.map((sample) => sample.lowerBoundMs).sort((left, right) => left - right);
  const probes = samples.map((sample) => sample.probeMs).sort((left, right) => left - right);
  const checks = samples.map((sample) => sample.checks).sort((left, right) => left - right);
  const heightErrors = samples.map((sample) => sample.totalHeightErrorPercent).sort((left, right) => left - right);
  const scrollMedian = percentile(elapsed, 0.5);
  const deviations = elapsed.map((value) => Math.abs(value - scrollMedian)).sort((left, right) => left - right);
  return {
    ...template,
    runIds: unique(results.flatMap((result) => result.runIds ?? [])),
    firstInstanceSetupMs: round(percentile(results.map((result) => result.firstInstanceSetupMs).sort((left, right) => left - right), 0.5)),
    firstInstanceFirstRowsMs: round(percentile(results.map((result) => result.firstInstanceFirstRowsMs).sort((left, right) => left - right), 0.5)),
    firstInstanceLayoutReadyMs: round(percentile(results.map((result) => result.firstInstanceLayoutReadyMs).sort((left, right) => left - right), 0.5)),
    firstInstancePresentationReadyMs: round(percentile(results.map((result) => result.firstInstancePresentationReadyMs).sort((left, right) => left - right), 0.5)),
    setupMs: round(percentile(results.map((result) => result.setupMs).sort((left, right) => left - right), 0.5)),
    firstRowsMs: round(percentile(results.map((result) => result.firstRowsMs).sort((left, right) => left - right), 0.5)),
    mountMs: round(percentile(results.map((result) => result.mountMs).sort((left, right) => left - right), 0.5)),
    initialTotalHeightErrorPercent: round(percentile(results.map((result) => result.initialTotalHeightErrorPercent).sort((left, right) => left - right), 0.5)),
    scrollTotalHeightErrorMedianPercent: round(percentile(heightErrors, 0.5)),
    scrollTotalHeightErrorP95Percent: round(percentile(heightErrors, 0.95)),
    scrollMedianMs: round(scrollMedian),
    scrollMedianLowerBoundMs: round(percentile(lowerBounds, 0.5)),
    scrollP95Ms: round(percentile(elapsed, 0.95)),
    scrollMadMs: round(percentile(deviations, 0.5)),
    scrollProbeMedianMs: round(percentile(probes, 0.5)),
    scrollChecksMedian: round(percentile(checks, 0.5)),
    scrollSampleCount: samples.length,
    scrollRoundMedianRangeMs: [
      Math.min(...results.map((result) => result.scrollRoundMedianRangeMs[0])),
      Math.max(...results.map((result) => result.scrollRoundMedianRangeMs[1])),
    ],
    scrollRoundP95RangeMs: [
      Math.min(...results.map((result) => result.scrollRoundP95RangeMs[0])),
      Math.max(...results.map((result) => result.scrollRoundP95RangeMs[1])),
    ],
    completedRounds: results.reduce((total, result) => total + (result.completedRounds ?? 0), 0),
    plannedRounds: results.reduce((total, result) => total + (result.plannedRounds ?? 0), 0),
    earlyStopReason: results.every((result) => result.earlyStopReason === 'stable-statistics')
      ? 'stable-statistics'
      : null,
  };
}

function mergedMutationRounds(reports) {
  const keySets = reports.map((report) => (
    [...new Set((report.mutationResults ?? []).map(mutationKey))].sort().join('\n')
  ));
  const sameShard = keySets[0] !== '' && keySets.every((keys) => keys === keySets[0]);
  if (sameShard) {
    return reports.reduce((total, report) => total + (report.conditions.mutations?.rounds ?? 0), 0);
  }
  return Math.max(...reports.map((report) => report.conditions.mutations?.rounds ?? 0));
}

function mergeMutationConditions(reports) {
  const rounds = mergedMutationRounds(reports);
  const keySets = reports.map((report) => (
    [...new Set((report.mutationResults ?? []).map(mutationKey))].sort().join('\n')
  ));
  const sameShard = keySets[0] !== '' && keySets.every((keys) => keys === keySets[0]);
  const maximumSamples = sameShard
    ? reports.reduce((total, report) => total + (report.conditions.mutations?.maximumSamplesPerScenario ?? report.conditions.mutations?.samplesPerScenario ?? 0), 0)
    : Math.max(...reports.map((report) => report.conditions.mutations?.maximumSamplesPerScenario ?? report.conditions.mutations?.samplesPerScenario ?? 0));
  return {
    ...reports[0].conditions.mutations,
    adaptiveSampling: reports.every((report) => report.conditions.mutations?.adaptiveSampling === true),
    rounds,
    batchSizes: sameShard
      ? reports.flatMap((report) => report.conditions.mutations?.batchSizes ?? [])
      : reports[0].conditions.mutations?.batchSizes,
    samplesPerScenario: maximumSamples,
    maximumSamplesPerScenario: maximumSamples,
  };
}

function mergeMutationGroup(results) {
  const template = results[0];
  const samples = [];
  const failures = [];
  const plannedSamples = results.reduce((total, result) => total + (result.plannedSamples ?? result.totalSamples ?? 0), 0);
  for (const result of results) {
    const offset = samples.length;
    for (const sample of result.samples ?? []) {
      samples.push({ ...sample, sample: offset + Number(sample.sample) });
    }
    for (const failure of result.failures ?? []) {
      failures.push({ ...failure, sample: offset + Number(failure.sample) });
    }
  }
  const elapsed = samples
    .map((sample) => sample.elapsedMs)
    .filter((value) => typeof value === 'number')
    .sort((left, right) => left - right);
  const recoveries = samples
    .filter((sample) => sample.outcome === 'recovered' && typeof sample.elapsedMs === 'number')
    .map((sample) => sample.elapsedMs)
    .sort((left, right) => left - right);
  const minimumP95Samples = 30;
  const earlyStopReason = results.some((result) => result.earlyStopReason === 'interactive-budget')
    ? 'interactive-budget'
    : results.some((result) => result.earlyStopReason === 'reproducible-failure')
      ? 'reproducible-failure'
      : results.some((result) => result.earlyStopReason === 'stable-statistics')
        ? 'stable-statistics'
        : null;
  return {
    ...template,
    runIds: unique(results.flatMap((result) => result.runIds ?? [])),
    medianMs: elapsed.length === 0 ? null : round(percentile(elapsed, 0.5)),
    p95Ms: elapsed.length < minimumP95Samples ? null : round(percentile(elapsed, 0.95)),
    recoveryMedianMs: recoveries.length === 0 ? null : round(percentile(recoveries, 0.5)),
    recoveryP95Ms: recoveries.length < minimumP95Samples ? null : round(percentile(recoveries, 0.95)),
    settledSamples: elapsed.length,
    correctSamples: samples.filter((sample) => sample.outcome === 'clean').length,
    recoveredSamples: samples.filter((sample) => sample.outcome === 'recovered').length,
    failedSamples: samples.filter((sample) => sample.outcome === 'failed').length,
    totalSamples: samples.length,
    plannedSamples,
    earlyStopped: results.some((result) => result.earlyStopped === true),
    earlyStopReason,
    samples,
    failures,
  };
}

function assertCompatible(left, right) {
  const leftGeometry = compatibilityKey(left);
  const rightGeometry = compatibilityKey(right);
  if (leftGeometry !== rightGeometry) {
    throw new Error('Cannot merge benchmark shards with different protocols or geometry.');
  }
}

function compatibilityKey(report) {
  return JSON.stringify({
    protocolVersion: report.protocolVersion,
    family: report.conditions.family ?? 'list',
    itemCount: report.conditions.itemCount,
    viewport: report.conditions.viewport,
    contentCorpusVersion: report.conditions.contentCorpusVersion,
  });
}

function baselineKey(result) {
  return `${result.rowProfile}:${result.mode}:${result.library}`;
}

function mutationKey(result) {
  return `${result.rowProfile}:${result.library}:${result.sizeMode}:${result.operation}:${result.location}`;
}

function layoutBaselineKey(result) {
  return `${result.family}\u0000${result.mode}\u0000${result.library}`;
}

function layoutMutationKey(result) {
  return `${layoutBaselineKey(result)}\u0000${result.operation}\u0000${result.location}`;
}

function mergeUnique(values, keyFor) {
  const merged = new Map();
  for (const value of values) {
    const key = keyFor(value);
    if (merged.has(key)) throw new Error(`Cannot merge duplicate layout condition ${key.replaceAll('\u0000', ':')} without raw samples.`);
    merged.set(key, value);
  }
  return [...merged.values()];
}

function percentile(sorted, ratio) {
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * ratio) - 1))] ?? 0;
}

function round(value) {
  return Number(value.toFixed(3));
}

function unique(values) {
  return [...new Set(values)];
}
