import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';
import {
  performanceBaselinePath,
  promotePerformanceReport,
  selectPerformanceBaseline,
} from './performance/baselines.mjs';
import { assertComparable, compareReports, validateRunnerReport } from './performance/check.mjs';
import {
  appendPerformanceProcess,
  createPerformanceSession,
  finalizePerformanceSession,
  recordPerformanceBaseline,
  validatePerformanceRunID,
  writePerformanceReport,
} from './performance/session-log.mjs';
import { median, percentile, relativeMAD, summarize } from './performance/statistics.mjs';
import {
  PERFORMANCE_GC_PROTOCOL_VERSION,
  PERFORMANCE_MEASUREMENT_PROTOCOL_VERSION,
  PERFORMANCE_SCHEMA_VERSION,
  PERFORMANCE_STATISTICS_PROTOCOL_VERSION,
} from './performance/config.mjs';
import {
  PERFORMANCE_TIMING_PACKAGES,
  WORKLOAD_SCHEMA,
  classifyPerformanceMetric,
  normalizePerformanceSelection,
  performanceExecutionMode,
  performanceMetricSelected,
  performancePackageForFamily,
  performanceSelectionCovers,
  performanceSelectionID,
} from './performance/schema.mjs';
import { createWorkloads } from './performance/workloads.mjs';

test('performance statistics report stable median, p95, and relative MAD', () => {
  assert.equal(median([5, 1, 3, 2, 4]), 3);
  assert.equal(percentile([1, 2, 3, 4, 5], 0.95), 4.8);
  assert.equal(relativeMAD([90, 100, 100, 100, 110]), 0);
  assert.deepEqual(summarize([1, 2, 3]), {
    count: 3, median: 2, p95: 2.9, relativeMAD: 0.5, minimum: 1, maximum: 3,
  });
});

test('runner rejects calibration requiring a regression band above ten percent', () => {
  const report = fixture();
  report.metrics['runner:calibration'].timing.relativeMAD = 0.034;
  assert.throws(() => validateRunnerReport(report), /10% validity ceiling/u);
});

test('comparison rejects workload, runtime, hardware, flag, and protocol mismatches', () => {
  for (const [field, value] of [
    ['cpuModel', 'different'],
    ['measurementProfile', 'certification'],
    ['measurementProtocolVersion', PERFORMANCE_MEASUREMENT_PROTOCOL_VERSION + 1],
    ['statisticsProtocolVersion', PERFORMANCE_STATISTICS_PROTOCOL_VERSION + 1],
    ['gcProtocolVersion', PERFORMANCE_GC_PROTOCOL_VERSION + 1],
  ]) {
    const baseline = fixture();
    const current = fixture();
    current.provenance[field] = value;
    assert.throws(() => assertComparable(baseline, current), /mismatched workload, runtime, hardware, flags, or protocol/u);
  }
});

test('default performance baselines require one exact environment partition', async (context) => {
  const root = await mkdtemp(join(tmpdir(), 'sectile-performance-baselines-'));
  context.after(() => rm(root, { recursive: true, force: true }));
  const directory = join(root, 'baselines');
  await mkdir(directory);

  const current = fixture();
  const partitionedPath = performanceBaselinePath(directory, current);
  await mkdir(dirname(partitionedPath), { recursive: true });
  await writeFile(partitionedPath, `${JSON.stringify(current, null, 2)}\n`, 'utf8');
  const partitioned = await selectPerformanceBaseline({ current, directory });
  assert.equal(partitioned.path, partitionedPath);
  assert.deepEqual(partitioned.report, current);

  await rm(partitionedPath);
  const incompatible = structuredClone(current);
  incompatible.provenance.platform = 'different';
  const incompatiblePath = performanceBaselinePath(directory, incompatible);
  await mkdir(dirname(incompatiblePath), { recursive: true });
  await writeFile(
    incompatiblePath,
    `${JSON.stringify(incompatible, null, 2)}\n`,
    'utf8',
  );
  await assert.rejects(
    selectPerformanceBaseline({ current, directory }),
    /No compatible performance baseline exists/u,
  );

  const explicitPath = join(root, 'explicit.json');
  await writeFile(explicitPath, `${JSON.stringify(current, null, 2)}\n`, 'utf8');
  const explicit = await selectPerformanceBaseline({ current, explicitPath, directory });
  assert.equal(explicit.path, explicitPath);
});

test('performance baselines partition environment and workload selection independently', async (context) => {
  const root = await mkdtemp(join(tmpdir(), 'sectile-performance-shards-'));
  context.after(() => rm(root, { recursive: true, force: true }));
  const directory = join(root, 'baselines');
  const full = fixture();
  full.runner = {
    processCount: 10,
    certification: true,
    quick: false,
    selection: normalizePerformanceSelection(),
  };
  const fullPath = performanceBaselinePath(directory, full);
  await mkdir(dirname(fullPath), { recursive: true });
  await writeFile(fullPath, `${JSON.stringify(full, null, 2)}\n`, 'utf8');

  const shard = structuredClone(full);
  shard.runner.selection = normalizePerformanceSelection({
    owners: ['core'],
    types: ['query'],
    domains: ['metric-index'],
    scales: ['representative'],
    evidence: ['timing'],
  });
  const shardPath = performanceBaselinePath(directory, shard);
  assert.notEqual(shardPath, fullPath);
  assert.equal((await selectPerformanceBaseline({ current: shard, directory })).path, fullPath);

  const owner = structuredClone(full);
  owner.runner.selection = normalizePerformanceSelection({
    owners: ['core'],
    scales: ['representative'],
    evidence: ['timing'],
  });
  const ownerPath = performanceBaselinePath(directory, owner);
  await writeFile(ownerPath, `${JSON.stringify(owner, null, 2)}\n`, 'utf8');
  assert.equal((await selectPerformanceBaseline({ current: shard, directory })).path, ownerPath);

  await mkdir(dirname(shardPath), { recursive: true });
  await writeFile(shardPath, `${JSON.stringify(shard, null, 2)}\n`, 'utf8');
  assert.equal((await selectPerformanceBaseline({ current: shard, directory })).path, shardPath);
});

test('performance selections cover only equal or broader selector axes', () => {
  const requested = normalizePerformanceSelection({
    owners: ['chart'],
    types: ['projection'],
    scales: ['representative'],
    evidence: ['timing'],
  });
  assert.equal(performanceSelectionCovers({ owners: ['chart'], scales: ['representative'], evidence: ['timing'] }, requested), true);
  assert.equal(performanceSelectionCovers({}, requested), true);
  assert.equal(performanceSelectionCovers({ owners: ['core'] }, requested), false);
  assert.equal(performanceSelectionCovers({ owners: ['chart'], types: ['projection'], scales: ['scaling'] }, requested), false);
  assert.equal(performanceSelectionCovers({ owners: ['chart'], scales: ['representative'] }, normalizePerformanceSelection({ owners: ['chart'] })), false);
});

test('retained full performance reports promote once without overwriting evidence', async (context) => {
  const root = await mkdtemp(join(tmpdir(), 'sectile-performance-promote-'));
  context.after(() => rm(root, { recursive: true, force: true }));
  const directory = join(root, 'baselines');
  const reportPath = join(root, 'report.json');
  const report = fixture();
  report.runner.quick = false;
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  const created = await promotePerformanceReport({ reportPath, directory });
  assert.equal(created.created, true);
  assert.deepEqual(JSON.parse(await readFile(created.path, 'utf8')), report);
  const unchanged = await promotePerformanceReport({ reportPath, directory });
  assert.equal(unchanged.created, false);

  const conflicting = structuredClone(report);
  conflicting.provenance.buildFingerprint = 'different-build';
  await writeFile(reportPath, `${JSON.stringify(conflicting, null, 2)}\n`, 'utf8');
  await assert.rejects(
    promotePerformanceReport({ reportPath, directory }),
    /already contains different evidence/u,
  );
});

test('targeted screening reports cannot become authoritative baselines', async (context) => {
  const root = await mkdtemp(join(tmpdir(), 'sectile-performance-targeted-promote-'));
  context.after(() => rm(root, { recursive: true, force: true }));
  const reportPath = join(root, 'report.json');
  const report = fixture();
  report.runner = { processCount: 3, certification: false, targetPackages: ['core'], quick: false };
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await assert.rejects(
    promotePerformanceReport({ reportPath, directory: join(root, 'baselines') }),
    /targeted performance screenings cannot become authoritative baselines/u,
  );
});

test('comparison reports an intentional timing regression', () => {
  const baseline = fixture();
  const current = fixture();
  current.metrics['core:case'].timing.median = 121;
  current.metrics['core:case'].timing.p95 = 121;
  current.metrics['core:case'].timing.minimum = 121;
  current.metrics['core:case'].timing.maximum = 121;
  const comparison = compareReports(baseline, current);
  assert.deepEqual(comparison.regressions.map(({ id }) => id), ['core:case']);
});

test('comparison reports intentional allocation and retained-heap regressions', () => {
  const baseline = fixture();
  const current = fixture();
  baseline.metrics['core:case'].heap = heapMetric(1_048_576);
  current.metrics['core:case'].heap = heapMetric(1_310_720);
  const comparison = compareReports(baseline, current);
  assert.deepEqual(comparison.regressions.map(({ id }) => id), ['core:case']);
});

test('comparison reports an intentional package-footprint regression only for certification', () => {
  const baseline = fixture();
  const current = fixture();
  current.provenance.packageFootprint.core = 121;
  assert.deepEqual(compareReports(baseline, current).regressions.map(({ id }) => id), ['package-footprint:core']);

  const targeted = structuredClone(current);
  targeted.runner = { processCount: 3, certification: false, targetPackages: ['core'] };
  assert.deepEqual(compareReports(baseline, targeted).regressions, []);
});

test('comparison does not call a bimodal median shift a regression without tail corroboration', () => {
  const baseline = fixture();
  const current = fixture();
  current.metrics['core:case'].timing.median = 180;
  current.metrics['core:case'].timing.p95 = 104;
  assert.deepEqual(compareReports(baseline, current).regressions, []);
});

test('comparison requires isolated-process distributions to separate', () => {
  const baseline = fixture();
  const current = fixture();
  current.metrics['core:case'].timing = {
    median: 121,
    p95: 121,
    relativeMAD: 0.01,
    minimum: 104,
    maximum: 125,
  };
  assert.deepEqual(compareReports(baseline, current).regressions, []);
});

test('workload schema covers required scales, patch depth, density, domains, and browser counters', async () => {
  assert.deepEqual(WORKLOAD_SCHEMA.scales, [1_000, 10_000, 100_000]);
  assert.deepEqual(WORKLOAD_SCHEMA.chartScales, [10_000, 100_000, 1_000_000]);
  assert.deepEqual(WORKLOAD_SCHEMA.patchDepths, [1, 8, 32, 64]);
  assert.deepEqual(WORKLOAD_SCHEMA.changedDensities, [1, 32, 'full']);
  assert.equal(WORKLOAD_SCHEMA.browserQualifiedRegistrations[0].portableTimingBudget, false);
  const workloads = await createWorkloads({ quick: true });
  assert.equal(new Set(workloads.map(({ id }) => id)).size, workloads.length);
  for (const family of WORKLOAD_SCHEMA.families) {
    if (family === 'runner') continue;
    assert.equal(workloads.some((workload) => workload.family === family), true, family);
  }
  assert.equal(workloads.some(({ id }) => id === 'core:text:replace:1000'), true);
  assert.equal(workloads.some(({ id }) => id === 'core:sequence-reorder:move:1000'), true);
  assert.equal(workloads.some(({ id }) => id === 'core:tree-reorder:move:1000'), true);
});

test('timing workload families have explicit package owners', async () => {
  assert.deepEqual(PERFORMANCE_TIMING_PACKAGES, ['core', 'chart', 'tabular', 'virtual']);
  assert.equal(performancePackageForFamily('core-runtime'), 'core');
  assert.equal(performancePackageForFamily('chart-projection'), 'chart');
  assert.equal(performancePackageForFamily('tabular-resolution'), 'tabular');
  assert.equal(performancePackageForFamily('virtual-layout'), 'virtual');
  assert.equal(performancePackageForFamily('runner'), null);
  const coreWorkloads = await createWorkloads({ quick: true, packages: ['core'] });
  assert.equal(coreWorkloads.some(({ family }) => family.startsWith('chart-') || family.startsWith('tabular-') || family === 'virtual-layout'), false);
  assert.equal(coreWorkloads.some(({ family }) => family.startsWith('core-')), true);
});

test('every central workload has one selectable owner, type, domain, scale, and evidence contract', async () => {
  const workloads = await createWorkloads({ quick: true });
  for (const workload of workloads) {
    assert.deepEqual(workload.metadata, classifyPerformanceMetric(workload.id, workload.family, workload.dimensions));
  }
  const selection = normalizePerformanceSelection({
    owners: ['core'],
    types: ['query'],
    domains: ['metric-index'],
    scales: ['representative'],
    evidence: ['timing'],
  });
  assert.equal(performanceSelectionID(selection), 'core__query__metric-index__representative__timing');
  const selected = workloads.filter(({ metadata }) => performanceMetricSelected(metadata, selection));
  assert.ok(selected.length > 1);
  assert.equal(selected.every(({ metadata }) => metadata.owner === 'runner'
    || (metadata.owner === 'core' && metadata.type === 'query' && metadata.domain === 'metric-index')), true);
  const targeted = await createWorkloads({ quick: true, selection });
  assert.deepEqual(targeted.map(({ id }) => id), selected.map(({ id }) => id));
});

test('quick performance runs are smoke checks rather than baseline comparisons', () => {
  assert.equal(performanceExecutionMode('check', true), 'smoke');
  assert.equal(performanceExecutionMode('compare', true), 'smoke');
  assert.equal(performanceExecutionMode('check', false), 'check');
  assert.equal(performanceExecutionMode('record', false), 'record');
});

test('targeted screening accepts three processes and uses a coarse regression band', () => {
  const baseline = fixture();
  const current = fixture();
  current.runner = { processCount: 3, certification: false, targetPackages: ['core'] };
  current.metrics['core:case'].timing = {
    median: 121,
    p95: 121,
    relativeMAD: 0.01,
    minimum: 100,
    maximum: 125,
  };
  const comparison = compareReports(baseline, current);
  assert.equal(comparison.runnerBand, 0.2);
  assert.deepEqual(comparison.regressions.map(({ id }) => id), ['core:case']);
});

test('targeted reports may compare a workload subset against a certification baseline', () => {
  const baseline = fixture();
  baseline.metrics['core:extra'] = metric(100, 0.01);
  const current = fixture();
  current.runner = { processCount: 3, certification: false, targetPackages: ['core'] };
  assert.doesNotThrow(() => assertComparable(baseline, current));
});

test('certification shards may compare a workload subset against a full certification baseline', () => {
  const baseline = fixture();
  baseline.metrics['core:extra'] = metric(100, 0.01);
  const current = fixture();
  current.runner = {
    processCount: 10,
    certification: true,
    selection: normalizePerformanceSelection({
      owners: ['core'], types: ['query'], domains: ['metric-index'], scales: ['representative'], evidence: ['timing'],
    }),
  };
  assert.doesNotThrow(() => assertComparable(baseline, current));
});

test('performance sessions retain completed workers and reject run ID reuse', async (context) => {
  const root = await mkdtemp(join(tmpdir(), 'sectile-performance-session-'));
  context.after(() => rm(root, { recursive: true, force: true }));
  const handle = await createPerformanceSession({
    runsRoot: root,
    runID: 'windows-release-candidate',
    mode: 'record',
    processCount: 10,
    baseline: 'baseline.json',
  });
  await appendPerformanceProcess(handle, 0, { process: 0 });
  const running = JSON.parse(await readFile(handle.manifestPath, 'utf8'));
  assert.equal(running.status, 'running');
  assert.equal(running.completedProcesses, 1);
  assert.deepEqual(running.processReports, ['process-001.json']);
  assert.deepEqual(JSON.parse(await readFile(join(handle.directory, 'process-001.json'), 'utf8')), { process: 0 });
  await assert.rejects(
    createPerformanceSession({
      runsRoot: root,
      runID: 'windows-release-candidate',
      mode: 'record',
      processCount: 10,
      baseline: 'baseline.json',
    }),
    (error) => error?.code === 'EEXIST',
  );
  assert.throws(() => validatePerformanceRunID('../escape'), /portable path segment/u);
});

test('baseline recording preserves the previous baseline and update audit', async (context) => {
  const root = await mkdtemp(join(tmpdir(), 'sectile-performance-record-'));
  context.after(() => rm(root, { recursive: true, force: true }));
  const baselinePath = join(root, 'baseline.json');
  const previous = fixture();
  previous.provenance.buildFingerprint = 'previous-build';
  await writeFile(baselinePath, `${JSON.stringify(previous, null, 2)}\n`, 'utf8');
  const candidate = fixture();
  candidate.provenance.buildFingerprint = 'candidate-build';
  candidate.runner.quick = false;
  const handle = await createPerformanceSession({
    runsRoot: join(root, 'runs'),
    runID: 'candidate',
    mode: 'record',
    processCount: 10,
    baseline: baselinePath,
  });
  await writePerformanceReport(handle, candidate);
  const baselineUpdate = await recordPerformanceBaseline(handle, baselinePath, candidate);
  await finalizePerformanceSession(handle, 'recorded');

  assert.deepEqual(JSON.parse(await readFile(baselinePath, 'utf8')), candidate);
  assert.deepEqual(JSON.parse(await readFile(join(handle.directory, 'previous-baseline.json'), 'utf8')), previous);
  assert.equal(baselineUpdate.previousBuildFingerprint, 'previous-build');
  assert.equal(baselineUpdate.recordedBuildFingerprint, 'candidate-build');
  const session = JSON.parse(await readFile(handle.manifestPath, 'utf8'));
  assert.equal(session.baselineUpdate, 'baseline-update.json');

  const quick = structuredClone(candidate);
  quick.runner.quick = true;
  const quickHandle = await createPerformanceSession({
    runsRoot: join(root, 'runs'),
    runID: 'quick-candidate',
    mode: 'record',
    processCount: 10,
    baseline: baselinePath,
  });
  await writePerformanceReport(quickHandle, quick);
  await assert.rejects(
    recordPerformanceBaseline(quickHandle, baselinePath, quick),
    /quick performance runs cannot become an authoritative baseline/u,
  );
});

function fixture() {
  return {
    schemaVersion: PERFORMANCE_SCHEMA_VERSION,
    provenance: {
      node: 'v1', v8: '1', platform: 'test', architecture: 'test', osRelease: '1',
      cpuModel: 'test', cpuCount: 1, execArgv: [], workloadFingerprint: 'schema',
      measurementProfile: 'screening',
      measurementProtocolVersion: PERFORMANCE_MEASUREMENT_PROTOCOL_VERSION,
      statisticsProtocolVersion: PERFORMANCE_STATISTICS_PROTOCOL_VERSION,
      gcProtocolVersion: PERFORMANCE_GC_PROTOCOL_VERSION,
      buildFingerprint: 'build',
      packageFootprint: { core: 100 },
    },
    runner: { processCount: 10 },
    metrics: {
      'runner:calibration': metric(10, 0.01),
      'core:case': metric(100, 0.01),
    },
  };
}

function heapMetric(value) {
  return {
    peakDelta: { p95: value, minimum: value, maximum: value },
    retainedDelta: { p95: value, minimum: value, maximum: value },
    positivePeakDeltaMedian: value,
    positiveRetainedDeltaMedian: value,
  };
}

function metric(value, dispersion) {
  return {
    timing: { median: value, p95: value, relativeMAD: dispersion, minimum: value, maximum: value },
    heap: {
      peakDelta: { p95: 0, minimum: 0, maximum: 0 },
      retainedDelta: { p95: 0, minimum: 0, maximum: 0 },
      positivePeakDeltaMedian: 0,
      positiveRetainedDeltaMedian: 0,
    },
  };
}
