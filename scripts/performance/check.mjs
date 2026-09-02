import assert from 'node:assert/strict';
import {
  MAXIMUM_REGRESSION_BAND,
  MINIMUM_PROCESS_COUNT,
  MINIMUM_REGRESSION_BAND,
  MINIMUM_TARGET_PROCESS_COUNT,
  PERFORMANCE_SCHEMA_VERSION,
  TARGET_REGRESSION_BAND,
} from './config.mjs';
import { compatibilityMetadata } from './provenance.mjs';

export function validateRunnerReport(report) {
  assert.equal(report.schemaVersion, PERFORMANCE_SCHEMA_VERSION, 'performance schema mismatch');
  const certification = report.runner.certification !== false;
  const minimumProcesses = certification ? MINIMUM_PROCESS_COUNT : MINIMUM_TARGET_PROCESS_COUNT;
  assert.ok(
    report.runner.processCount >= minimumProcesses,
    `performance checks require at least ${minimumProcesses} isolated processes`,
  );
  const calibration = report.metrics['runner:calibration'];
  assert.ok(calibration, 'runner calibration metric is missing');
  const requiredBand = Math.max(MINIMUM_REGRESSION_BAND, calibration.timing.relativeMAD * 3);
  const maximumBand = certification ? MAXIMUM_REGRESSION_BAND : TARGET_REGRESSION_BAND;
  assert.ok(
    requiredBand <= maximumBand,
    `runner calibration requires a ${(requiredBand * 100).toFixed(2)}% band, exceeding the ${(maximumBand * 100).toFixed(0)}% validity ceiling`,
  );
}

export function assertComparable(baseline, current) {
  assert.deepEqual(
    compatibilityMetadata(current.provenance),
    compatibilityMetadata(baseline.provenance),
    'performance reports have mismatched workload, runtime, hardware, or flags metadata',
  );
  const currentKeys = Object.keys(current.metrics).sort();
  const baselineKeys = new Set(Object.keys(baseline.metrics));
  if (current.runner.certification === false) {
    assert.deepEqual(
      currentKeys.filter((key) => !baselineKeys.has(key)),
      [],
      'targeted performance report contains workload keys missing from the certification baseline',
    );
  } else {
    assert.deepEqual(currentKeys, [...baselineKeys].sort(), 'performance reports have mismatched workload keys');
  }
}

export function compareReports(baseline, current) {
  validateRunnerReport(baseline);
  validateRunnerReport(current);
  assertComparable(baseline, current);
  const calibrationBand = Math.max(
    baseline.metrics['runner:calibration'].timing.relativeMAD,
    current.metrics['runner:calibration'].timing.relativeMAD,
  );
  const certification = current.runner.certification !== false;
  const runnerBand = certification
    ? Math.max(MINIMUM_REGRESSION_BAND, calibrationBand * 3)
    : Math.max(TARGET_REGRESSION_BAND, calibrationBand * 3);
  const comparisons = [];
  const regressions = [];
  for (const id of Object.keys(current.metrics).sort()) {
    if (id === 'runner:calibration') continue;
    const before = baseline.metrics[id];
    const after = current.metrics[id];
    const band = runnerBand;
    const medianRatio = ratio(after.timing.median, before.timing.median);
    const p95Ratio = ratio(after.timing.p95, before.timing.p95);
    const timingFloorRatio = ratio(after.timing.minimum, before.timing.maximum);
    const allocationRatio = before.heap.positivePeakDeltaMedian < 65_536
      ? null
      : ratio(after.heap.positivePeakDeltaMedian, before.heap.positivePeakDeltaMedian);
    const allocationP95Ratio = allocationRatio === null
      ? null
      : ratio(after.heap.peakDelta.p95, before.heap.peakDelta.p95);
    const allocationFloorRatio = allocationRatio === null
      ? null
      : ratio(after.heap.peakDelta.minimum, before.heap.peakDelta.maximum);
    const heapRatio = before.heap.positiveRetainedDeltaMedian < 65_536
      ? null
      : ratio(after.heap.positiveRetainedDeltaMedian, before.heap.positiveRetainedDeltaMedian);
    const heapP95Ratio = heapRatio === null
      ? null
      : ratio(after.heap.retainedDelta.p95, before.heap.retainedDelta.p95);
    const heapFloorRatio = heapRatio === null
      ? null
      : ratio(after.heap.retainedDelta.minimum, before.heap.retainedDelta.maximum);
    const allocationBand = allocationRatio === null ? null : Math.max(0.1, band);
    const heapBand = heapRatio === null ? null : Math.max(0.1, band);
    const comparison = Object.freeze({
      id,
      medianRatio,
      p95Ratio,
      timingFloorRatio,
      allocationRatio,
      allocationP95Ratio,
      allocationFloorRatio,
      allocationBand,
      heapRatio,
      heapP95Ratio,
      heapFloorRatio,
      heapBand,
      band,
    });
    comparisons.push(comparison);
    const timingRegression = certification
      ? medianRatio > 1 + band && p95Ratio > 1 + band && timingFloorRatio > 1 + band
      : medianRatio > 1 + band && p95Ratio > 1 + band;
    const allocationRegression = allocationRatio !== null
      && allocationRatio > 1 + allocationBand
      && allocationP95Ratio > 1 + allocationBand
      && (!certification || allocationFloorRatio > 1 + allocationBand);
    const heapRegression = heapRatio !== null
      && heapRatio > 1 + heapBand
      && heapP95Ratio > 1 + heapBand
      && (!certification || heapFloorRatio > 1 + heapBand);
    if (timingRegression || allocationRegression || heapRegression) regressions.push(comparison);
  }
  const footprintComparisons = comparePackageFootprints(baseline, current, runnerBand);
  regressions.push(...footprintComparisons.filter(({ footprintRatio, band }) => footprintRatio > 1 + band));
  return Object.freeze({
    runnerBand,
    comparisons: Object.freeze(comparisons),
    footprintComparisons,
    regressions: Object.freeze(regressions),
  });
}

function comparePackageFootprints(baseline, current, runnerBand) {
  const before = baseline.provenance.packageFootprint;
  const after = current.provenance.packageFootprint;
  assert.ok(before !== null && typeof before === 'object', 'baseline package footprint is missing');
  assert.ok(after !== null && typeof after === 'object', 'current package footprint is missing');
  assert.deepEqual(
    Object.keys(after).filter((packageName) => before[packageName] === undefined),
    [],
    'performance report contains package footprint keys missing from the certification baseline',
  );
  return Object.freeze(Object.keys(after).sort().map((packageName) => {
    assert.ok(Number.isSafeInteger(before[packageName]) && before[packageName] >= 0, `invalid baseline footprint for ${packageName}`);
    assert.ok(Number.isSafeInteger(after[packageName]) && after[packageName] >= 0, `invalid current footprint for ${packageName}`);
    return Object.freeze({
      id: `package-footprint:${packageName}`,
      kind: 'footprint',
      package: packageName,
      baselineBytes: before[packageName],
      currentBytes: after[packageName],
      footprintRatio: ratio(after[packageName], before[packageName]),
      band: runnerBand,
    });
  }));
}

function ratio(current, baseline) {
  if (baseline === 0) return current === 0 ? 1 : Number.POSITIVE_INFINITY;
  return Number((current / baseline).toPrecision(12));
}
