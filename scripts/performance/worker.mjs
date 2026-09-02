import { performance } from 'node:perf_hooks';
import { getHeapStatistics } from 'node:v8';
import {
  DEFAULT_BATCH_COUNT,
  QUICK_BATCH_COUNT,
  TARGET_BATCH_COUNT,
} from './config.mjs';
import { collectRetainedGarbage, collectTransientGarbage } from './gc-policy.mjs';
import {
  normalizePerformanceSelection,
  performanceMetricSelected,
} from './schema.mjs';
import { createWorkloads } from './workloads.mjs';

const quick = process.env['SECTILE_PERFORMANCE_QUICK'] === '1';
const screening = process.env['SECTILE_PERFORMANCE_SCREENING'] === '1';
const selection = normalizePerformanceSelection({
  owners: splitEnvironmentList('SECTILE_PERFORMANCE_PACKAGES'),
  types: splitEnvironmentList('SECTILE_PERFORMANCE_TYPES'),
  domains: splitEnvironmentList('SECTILE_PERFORMANCE_DOMAINS'),
  scales: splitEnvironmentList('SECTILE_PERFORMANCE_SCALES'),
  evidence: splitEnvironmentList('SECTILE_PERFORMANCE_EVIDENCE'),
});
const batchCount = quick ? QUICK_BATCH_COUNT : screening ? TARGET_BATCH_COUNT : DEFAULT_BATCH_COUNT;
const metrics = [];
let sink = 0;

for (const workload of await createWorkloads({ quick, selection })) {
  if (!performanceMetricSelected(workload.metadata, selection)) continue;
  const calibration = workload.metadata.owner === 'runner';
  const timingRequested = calibration || evidenceRequested('timing');
  const allocationRequested = !calibration && evidenceRequested('allocation');
  const retentionRequested = !calibration && evidenceRequested('retention');
  let measuredIterations = workload.iterations;
  let samples = null;

  if (timingRequested) {
    const warmupStartedAt = performance.now();
    for (let iteration = 0; iteration < workload.warmupIterations; iteration += 1) {
      sink = consume(sink, workload.operation(iteration));
    }
    const warmupNanosecondsPerOperation = Math.max(
      1,
      ((performance.now() - warmupStartedAt) * 1_000_000) / workload.warmupIterations,
    );
    const targetBatchNanoseconds = quick ? 2_000_000 : screening ? 10_000_000 : 20_000_000;
    measuredIterations = Math.max(
      workload.iterations,
      Math.min(1_000_000, Math.ceil(targetBatchNanoseconds / warmupNanosecondsPerOperation)),
    );
    for (let warmupBatch = 0; warmupBatch < 3; warmupBatch += 1) {
      for (let iteration = 0; iteration < measuredIterations; iteration += 1) {
        sink = consume(sink, workload.operation(iteration + warmupBatch * measuredIterations));
      }
    }
    collectTransientGarbage();
    const timingSamples = [];
    for (let batch = 0; batch < batchCount; batch += 1) {
      const startedAt = performance.now();
      for (let iteration = 0; iteration < measuredIterations; iteration += 1) {
        sink = consume(sink, workload.operation(iteration));
      }
      timingSamples.push(((performance.now() - startedAt) * 1_000_000) / measuredIterations);
    }
    samples = Object.freeze(timingSamples);
  }

  let heap = null;
  if (allocationRequested || retentionRequested) {
    collectTransientGarbage();
    const before = getHeapStatistics().used_heap_size;
    for (let iteration = 0; iteration < workload.iterations; iteration += 1) {
      sink = consume(sink, workload.operation(iteration));
    }
    const afterMeasurement = getHeapStatistics().used_heap_size;
    let afterGC = null;
    if (retentionRequested) {
      collectRetainedGarbage();
      afterGC = getHeapStatistics().used_heap_size;
    }
    heap = Object.freeze({
      before,
      afterMeasurement,
      afterGC,
      peakDelta: allocationRequested ? Math.max(0, afterMeasurement - before) : null,
      retainedDelta: retentionRequested ? afterGC - before : null,
    });
  }

  metrics.push(Object.freeze({
    id: workload.id,
    family: workload.family,
    metadata: workload.metadata,
    dimensions: workload.dimensions,
    iterationsPerBatch: timingRequested ? measuredIterations : 0,
    batchCount: timingRequested ? batchCount : 0,
    samples,
    heap,
  }));
}

if (!Number.isFinite(sink)) throw new Error('Performance sink became invalid.');
process.stdout.write(JSON.stringify(Object.freeze({
  processIndex: Number(process.env['SECTILE_PERFORMANCE_PROCESS_INDEX'] ?? 0),
  sink,
  resourceUsage: process.resourceUsage(),
  metrics: Object.freeze(metrics),
})));

function evidenceRequested(name) {
  return selection.evidence.length === 0 || selection.evidence.includes(name);
}

function splitEnvironmentList(name) {
  return (process.env[name] ?? '').split(',').map((entry) => entry.trim()).filter(Boolean);
}

function consume(previous, value) {
  if (typeof value === 'number') return (previous + (Number.isFinite(value) ? value : 0)) % 1_000_000_007;
  if (typeof value === 'bigint') return (previous + Number(value % 1_000_000_007n)) % 1_000_000_007;
  if (typeof value === 'string') return (previous + value.length) % 1_000_000_007;
  if (typeof value === 'boolean') return (previous + Number(value)) % 1_000_000_007;
  if (value === null || value === undefined) return previous;
  if (Array.isArray(value)) return (previous + value.length) % 1_000_000_007;
  if (typeof value === 'object') {
    const candidate = value.size ?? value.length ?? value.revision ?? value.generation ?? 1;
    return consume(previous, candidate);
  }
  return previous;
}
