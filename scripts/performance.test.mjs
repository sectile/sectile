import assert from 'node:assert/strict';
import test from 'node:test';
import { assertComparable, compareReports, validateRunnerReport } from './performance/check.mjs';
import { median, percentile, relativeMAD, summarize } from './performance/statistics.mjs';
import { PERFORMANCE_SCHEMA_VERSION } from './performance/config.mjs';
import { WORKLOAD_SCHEMA, createWorkloads } from './performance/workloads.mjs';

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

test('comparison rejects workload, runtime, hardware, and flag mismatches', () => {
  const baseline = fixture();
  const current = fixture();
  current.provenance.cpuModel = 'different';
  assert.throws(() => assertComparable(baseline, current), /mismatched workload, runtime, hardware, or flags/u);
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

test('workload schema covers required scales, patch depth, density, domains, and browser counters', () => {
  assert.deepEqual(WORKLOAD_SCHEMA.scales, [1_000, 10_000, 100_000]);
  assert.deepEqual(WORKLOAD_SCHEMA.patchDepths, [1, 8, 32, 64]);
  assert.deepEqual(WORKLOAD_SCHEMA.changedDensities, [1, 32, 'full']);
  assert.equal(WORKLOAD_SCHEMA.browserQualifiedRegistrations[0].portableTimingBudget, false);
  const workloads = createWorkloads({ quick: true });
  assert.equal(new Set(workloads.map(({ id }) => id)).size, workloads.length);
  for (const family of WORKLOAD_SCHEMA.families) {
    if (family === 'runner') continue;
    assert.equal(workloads.some((workload) => workload.family === family), true, family);
  }
});

function fixture() {
  return {
    schemaVersion: PERFORMANCE_SCHEMA_VERSION,
    provenance: {
      node: 'v1', v8: '1', platform: 'test', architecture: 'test', osRelease: '1',
      cpuModel: 'test', cpuCount: 1, execArgv: [], workloadFingerprint: 'schema', buildFingerprint: 'build',
    },
    runner: { processCount: 5 },
    metrics: {
      'runner:calibration': metric(10, 0.01),
      'core:case': metric(100, 0.01),
    },
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
