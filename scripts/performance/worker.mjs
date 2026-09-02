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

for (const workload of await createWorkloads({
  quick,
  packages: selection.owners.length === 0 ? undefined : selection.owners,
})) {
  if (!performanceMetricSelected(workload.metadata, selection)) continue;
  const warmupStartedAt = performance.now();
  for (let iteration = 0; iteration < workload.warmupIterations; iteration += 1) {
    sink = consume(sink, workload.operation(iteration));
  }
  const warmupNanosecondsPerOperation = Math.max(
    1,
    ((performance.now() - warmupStartedAt) * 1_000_000) / workload.warmupIterations,
  );
  const targetBatchNanoseconds = quick ? 2_000_000 : screening ? 10_000_000 : 20_000_000;
  const measuredIterations = Math.max(
    workload.iterations,
    Math.min(1_000_000, Math.ceil(targetBatchNanoseconds / warmupNanosecondsPerOperation)),
  );
  for (let warmupBatch = 0; warmupBatch < 3; warmupBatch += 1) {
    for (let iteration = 0; iteration < measuredIterations; iteration += 1) {
      sink = consume(sink, workload.operation(iteration + warmupBatch * measuredIterations));
    }
  }
  collectTransientGarbage();
  const samples = [];
  for (let batch = 0; batch < batchCount; batch += 1) {
    const startedAt = performance.now();
    for (let iteration = 0; iteration < measuredIterations; iteration += 1) {
      sink = consume(sink, workload.operation(iteration));
    }
    samples.push(((performance.now() - startedAt) * 1_000_000) / measuredIterations);
  }
  collectTransientGarbage();
  const heapBefore = getHeapStatistics().used_heap_size;
  for (let iteration = 0; iteration < workload.iterations; iteration += 1) {
    sink = consume(sink, workload.operation(iteration));
  }
  const heapAfterMeasurement = getHeapStatistics().used_heap_size;
  collectRetainedGarbage();
  const heapRetainedAfterGC = getHeapStatistics().used_heap_size;
  metrics.push(Object.freeze({
    id: workload.id,
    family: workload.family,
    metadata: workload.metadata,
    dimensions: workload.dimensions,
    iterationsPerBatch: measuredIterations,
    batchCount,
    samples: Object.freeze(samples),
    heap: Object.freeze({
      before: heapBefore,
      afterMeasurement: heapAfterMeasurement,
      afterGC: heapRetainedAfterGC,
      peakDelta: Math.max(0, heapAfterMeasurement - heapBefore),
      retainedDelta: heapRetainedAfterGC - heapBefore,
    }),
  }));
}

if (!Number.isFinite(sink)) throw new Error('Performance sink became invalid.');
process.stdout.write(JSON.stringify(Object.freeze({
  processIndex: Number(process.env['SECTILE_PERFORMANCE_PROCESS_INDEX'] ?? 0),
  sink,
  resourceUsage: process.resourceUsage(),
  metrics: Object.freeze(metrics),
})));

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
