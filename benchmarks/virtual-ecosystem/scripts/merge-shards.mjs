import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const [outputArgument, ...inputArguments] = process.argv.slice(2);
if (outputArgument === undefined || inputArguments.length === 0) {
  throw new Error('Usage: pnpm merge-shards <output.json> <input.json...>');
}

const outputPath = resolve(outputArgument);
const reports = await Promise.all(inputArguments.map(async (input) => (
  JSON.parse(await readFile(resolve(input), 'utf8'))
)));
for (const report of reports.slice(1)) assertCompatible(reports[0], report);

const merged = {
  ...reports[0],
  environment: reports.at(-1).environment,
  conditions: {
    ...reports[0].conditions,
    rowProfiles: Object.assign({}, ...reports.map((report) => report.conditions.rowProfiles ?? {})),
    mutations: {
      ...reports[0].conditions.mutations,
      rounds: mergedMutationRounds(reports),
    },
  },
  baselineResults: mergeByKey(reports.flatMap((report) => report.baselineResults ?? []), baselineKey),
  baselineFailures: reports.flatMap((report) => report.baselineFailures ?? []),
  baselineSamples: Object.assign({}, ...reports.map((report) => report.baselineSamples ?? {})),
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
  return {
    ...template,
    medianMs: elapsed.length === 0 ? null : round(percentile(elapsed, 0.5)),
    p95Ms: elapsed.length === 0 ? null : round(percentile(elapsed, 0.95)),
    recoveryMedianMs: recoveries.length === 0 ? null : round(percentile(recoveries, 0.5)),
    recoveryP95Ms: recoveries.length === 0 ? null : round(percentile(recoveries, 0.95)),
    settledSamples: elapsed.length,
    correctSamples: samples.filter((sample) => sample.outcome === 'clean').length,
    recoveredSamples: samples.filter((sample) => sample.outcome === 'recovered').length,
    failedSamples: samples.filter((sample) => sample.outcome === 'failed').length,
    totalSamples: samples.length,
    plannedSamples,
    earlyStopped: results.some((result) => result.earlyStopped === true),
    earlyStopReason: results.some((result) => result.earlyStopped === true) ? 'reproducible-failure' : null,
    samples,
    failures,
  };
}

function mergeByKey(values, keyOf) {
  const merged = new Map();
  for (const value of values) merged.set(keyOf(value), value);
  return [...merged.values()];
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

function percentile(sorted, ratio) {
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * ratio) - 1))] ?? 0;
}

function round(value) {
  return Number(value.toFixed(3));
}
