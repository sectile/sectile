import assert from 'node:assert/strict';
import {
  MAXIMUM_REGRESSION_BAND,
  MINIMUM_PROCESS_COUNT,
  MINIMUM_REGRESSION_BAND,
  PERFORMANCE_SCHEMA_VERSION,
} from './config.mjs';
import { compatibilityMetadata } from './provenance.mjs';

export function validateRunnerReport(report) {
  assert.equal(report.schemaVersion, PERFORMANCE_SCHEMA_VERSION, 'performance schema mismatch');
  assert.ok(
    report.runner.processCount >= MINIMUM_PROCESS_COUNT,
    `performance checks require at least ${MINIMUM_PROCESS_COUNT} isolated processes`,
  );
  const calibration = report.metrics['runner:calibration'];
  assert.ok(calibration, 'runner calibration metric is missing');
  const requiredBand = Math.max(MINIMUM_REGRESSION_BAND, calibration.timing.relativeMAD * 3);
  assert.ok(
    requiredBand <= MAXIMUM_REGRESSION_BAND,
    `runner calibration requires a ${(requiredBand * 100).toFixed(2)}% band, exceeding the 10% validity ceiling`,
  );
}

export function assertComparable(baseline, current) {
  assert.deepEqual(
    compatibilityMetadata(current.provenance),
    compatibilityMetadata(baseline.provenance),
    'performance reports have mismatched workload, runtime, hardware, or flags metadata',
  );
  assert.deepEqual(
    Object.keys(current.metrics).sort(),
    Object.keys(baseline.metrics).sort(),
    'performance reports have mismatched workload keys',
  );
}

export function compareReports(baseline, current) {
  validateRunnerReport(baseline);
  validateRunnerReport(current);
  assertComparable(baseline, current);
  const calibrationBand = Math.max(
    baseline.metrics['runner:calibration'].timing.relativeMAD,
    current.metrics['runner:calibration'].timing.relativeMAD,
  );
  const runnerBand = Math.max(MINIMUM_REGRESSION_BAND, calibrationBand * 3);
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
    if ((medianRatio > 1 + band && p95Ratio > 1 + band && timingFloorRatio > 1 + band)
      || (allocationRatio !== null && allocationRatio > 1 + allocationBand
        && allocationP95Ratio > 1 + allocationBand
        && allocationFloorRatio > 1 + allocationBand)
      || (heapRatio !== null && heapRatio > 1 + heapBand
        && heapP95Ratio > 1 + heapBand
        && heapFloorRatio > 1 + heapBand)) {
      regressions.push(comparison);
    }
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
  assert.deepEqual(Object.keys(after).sort(), Object.keys(before).sort(), 'performance reports have mismatched package footprint keys');
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
