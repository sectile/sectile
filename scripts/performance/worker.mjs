import { performance } from 'node:perf_hooks';
import { getHeapStatistics } from 'node:v8';
import {
  DEFAULT_BATCH_COUNT,
  PERFORMANCE_MEASUREMENT_PROFILES,
  QUICK_BATCH_COUNT,
  TARGET_BATCH_COUNT,
} from './config.mjs';
import { collectRetainedGarbage, collectTransientGarbage } from './gc-policy.mjs';
import {
  calibratedTimingIterations,
  TIMING_WARMUP_BATCH_COUNT,
  timingCalibrationComplete,
} from './measurement.mjs';
import {
  normalizePerformanceSelection,
  performanceMetricSelected,
} from './schema.mjs';
import { createWorkloadGroups } from './workloads.mjs';

const quick = process.env['SECTILE_PERFORMANCE_QUICK'] === '1';
const measurementProfile = process.env['SECTILE_PERFORMANCE_PROFILE'] ?? 'screening';
if (!PERFORMANCE_MEASUREMENT_PROFILES.includes(measurementProfile)) {
  throw new Error(`unknown performance measurement profile: ${measurementProfile}`);
}
const screening = measurementProfile === 'screening';
const selection = normalizePerformanceSelection({
  owners: splitEnvironmentList('SECTILE_PERFORMANCE_PACKAGES'),
  types: splitEnvironmentList('SECTILE_PERFORMANCE_TYPES'),
  domains: splitEnvironmentList('SECTILE_PERFORMANCE_DOMAINS'),
  scales: splitEnvironmentList('SECTILE_PERFORMANCE_SCALES'),
  evidence: splitEnvironmentList('SECTILE_PERFORMANCE_EVIDENCE'),
});
const batchCount = quick ? QUICK_BATCH_COUNT : screening ? TARGET_BATCH_COUNT : DEFAULT_BATCH_COUNT;
const metricsByID = new Map();
let sink = 0;

for (const lane of evidenceLanes()) {
  if (lane === 'timing' && !evidenceRequested('timing')) {
    await measureCalibration();
    continue;
  }
  const laneSelection = selectionForEvidence(lane);
  for await (const createGroup of createWorkloadGroups({ quick, selection: laneSelection })) {
    await measureWorkloadGroup(createGroup, lane, laneSelection);
  }
}
const metrics = Object.freeze([...metricsByID.values()].map(finalizeMetric));

async function measureCalibration() {
  const laneSelection = selectionForEvidence('timing');
  const iterator = createWorkloadGroups({ quick, selection: laneSelection })[Symbol.asyncIterator]();
  try {
    const calibration = await iterator.next();
    if (calibration.done) throw new Error('performance calibration workload is missing');
    await measureWorkloadGroup(calibration.value, 'timing', laneSelection);
  } finally {
    await iterator.return?.();
  }
}

async function measureWorkloadGroup(createGroup, lane, laneSelection) {
  const workloads = await createGroup();
  for (const workload of workloads) {
    if (!performanceMetricSelected(workload.metadata, laneSelection)) continue;
    const calibration = workload.metadata.owner === 'runner';
    if (calibration ? lane !== 'timing' : !workload.metadata.evidence.includes(lane)) continue;
    const metric = metricResult(workload);
    if (lane === 'timing') measureTiming(workload, metric);
    else if (lane === 'allocation') measureAllocation(workload, metric);
    else measureRetention(workload, metric);
  }
}

function measureTiming(workload, metric) {
  const warmupStartedAt = performance.now();
  let calibrationIterations = 0;
  let warmupNanoseconds = 0;
  do {
    sink = consume(sink, workload.operation(calibrationIterations));
    calibrationIterations += 1;
    warmupNanoseconds = (performance.now() - warmupStartedAt) * 1_000_000;
  } while (!timingCalibrationComplete(
    warmupNanoseconds,
    calibrationIterations,
    workload.warmupIterations,
  ));
  const warmupNanosecondsPerOperation = Math.max(1, warmupNanoseconds / calibrationIterations);
  const targetBatchNanoseconds = quick ? 2_000_000 : screening ? 10_000_000 : 20_000_000;
  const measuredIterations = calibratedTimingIterations(
    targetBatchNanoseconds,
    warmupNanosecondsPerOperation,
  );
  for (let warmupBatch = 0; warmupBatch < TIMING_WARMUP_BATCH_COUNT; warmupBatch += 1) {
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
  metric.iterationsPerBatch = measuredIterations;
  metric.batchCount = batchCount;
  metric.samples = Object.freeze(samples);
}

function measureAllocation(workload, metric) {
  collectTransientGarbage();
  const before = getHeapStatistics().used_heap_size;
  for (let iteration = 0; iteration < workload.iterations; iteration += 1) {
    sink = consume(sink, workload.operation(iteration));
  }
  const afterMeasurement = getHeapStatistics().used_heap_size;
  const heap = heapResult(metric);
  heap.allocation = Object.freeze({ before, afterMeasurement });
  heap.peakDelta = Math.max(0, afterMeasurement - before);
}

function measureRetention(workload, metric) {
  collectTransientGarbage();
  const before = getHeapStatistics().used_heap_size;
  for (let iteration = 0; iteration < workload.iterations; iteration += 1) {
    sink = consume(sink, workload.operation(iteration));
  }
  collectRetainedGarbage();
  const afterGC = getHeapStatistics().used_heap_size;
  const heap = heapResult(metric);
  heap.retention = Object.freeze({ before, afterGC });
  heap.retainedDelta = afterGC - before;
}

function metricResult(workload) {
  let metric = metricsByID.get(workload.id);
  if (metric === undefined) {
    metric = {
      id: workload.id,
      family: workload.family,
      metadata: workload.metadata,
      dimensions: workload.dimensions,
      iterationsPerBatch: 0,
      batchCount: 0,
      samples: null,
      heap: null,
    };
    metricsByID.set(workload.id, metric);
  }
  return metric;
}

function heapResult(metric) {
  metric.heap ??= { allocation: null, retention: null, peakDelta: null, retainedDelta: null };
  return metric.heap;
}

function finalizeMetric(metric) {
  return Object.freeze({
    ...metric,
    heap: metric.heap === null ? null : Object.freeze({
      allocation: metric.heap.allocation,
      retention: metric.heap.retention,
      peakDelta: metric.heap.peakDelta,
      retainedDelta: metric.heap.retainedDelta,
    }),
  });
}

function evidenceLanes() {
  return Object.freeze([
    'timing',
    ...(evidenceRequested('allocation') ? ['allocation'] : []),
    ...(evidenceRequested('retention') ? ['retention'] : []),
  ]);
}

function selectionForEvidence(evidence) {
  return normalizePerformanceSelection({ ...selection, evidence: [evidence] });
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
