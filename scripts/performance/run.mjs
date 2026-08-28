#!/usr/bin/env node
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { execFile as execFileCallback } from 'node:child_process';
import {
  DEFAULT_BASELINE_PATH,
  DEFAULT_PROCESS_COUNT,
  MINIMUM_PROCESS_COUNT,
  PERFORMANCE_SCHEMA_VERSION,
} from './config.mjs';
import { compareReports, validateRunnerReport } from './check.mjs';
import { collectProvenance } from './provenance.mjs';
import { summarize } from './statistics.mjs';
import { WORKLOAD_SCHEMA } from './workloads.mjs';

const execFile = promisify(execFileCallback);
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const options = parseArguments(process.argv.slice(2).filter((argument) => argument !== '--'));
if (options.processCount < MINIMUM_PROCESS_COUNT) {
  throw new Error(`Performance runs require at least ${MINIMUM_PROCESS_COUNT} isolated processes.`);
}

const workerPath = resolve(repoRoot, 'scripts/performance/worker.mjs');
const processReports = [];
for (let processIndex = 0; processIndex < options.processCount; processIndex += 1) {
  const { stdout } = await execFile(process.execPath, ['--expose-gc', workerPath], {
    cwd: repoRoot,
    env: {
      ...process.env,
      SECTILE_PERFORMANCE_PROCESS_INDEX: String(processIndex),
      SECTILE_PERFORMANCE_QUICK: options.quick ? '1' : '0',
    },
    maxBuffer: 64 * 1024 * 1024,
  });
  processReports.push(JSON.parse(stdout));
  process.stderr.write(`performance worker ${processIndex + 1}/${options.processCount} complete\n`);
}

const workloadFingerprint = createHash('sha256').update(JSON.stringify(WORKLOAD_SCHEMA)).digest('hex');
const report = Object.freeze({
  schemaVersion: PERFORMANCE_SCHEMA_VERSION,
  createdAt: new Date().toISOString(),
  provenance: await collectProvenance(repoRoot, workloadFingerprint),
  runner: Object.freeze({
    processCount: options.processCount,
    batchesPerProcess: processReports[0]?.metrics[0]?.batchCount ?? 0,
    isolatedProcesses: true,
    forcedGC: true,
    warmup: true,
    sink: processReports.reduce((total, entry) => (total + entry.sink) % 1_000_000_007, 0),
    quick: options.quick,
  }),
  workloadSchema: WORKLOAD_SCHEMA,
  metrics: aggregateMetrics(processReports),
  processResources: Object.freeze(processReports.map((entry) => entry.resourceUsage)),
});
validateRunnerReport(report);

if (options.mode === 'record') {
  await atomicWrite(options.baselinePath, report);
  process.stdout.write(`${JSON.stringify({ mode: options.mode, baseline: options.baselinePath, metrics: Object.keys(report.metrics).length })}\n`);
} else {
  const baseline = JSON.parse(await readFile(options.baselinePath, 'utf8'));
  const comparison = compareReports(baseline, report);
  const output = Object.freeze({
    mode: options.mode,
    workItem: options.workItem,
    baseline: options.baselinePath,
    baselineBuildFingerprint: baseline.provenance.buildFingerprint,
    currentBuildFingerprint: report.provenance.buildFingerprint,
    ...comparison,
  });
  if (options.outputPath !== null) await atomicWrite(options.outputPath, output);
  process.stdout.write(`${JSON.stringify(output)}\n`);
  if (options.mode === 'check') assert.equal(comparison.regressions.length, 0, 'performance regression detected');
}

function aggregateMetrics(processReports) {
  const byID = new Map();
  for (const reportEntry of processReports) {
    for (const metric of reportEntry.metrics) {
      const aggregate = byID.get(metric.id) ?? {
        family: metric.family,
        dimensions: metric.dimensions,
        processTimings: [],
        batchTimings: [],
        heapPeakDeltas: [],
        heapRetainedDeltas: [],
        operations: 0,
      };
      assert.equal(aggregate.family, metric.family);
      assert.deepEqual(aggregate.dimensions, metric.dimensions);
      aggregate.processTimings.push(summarize(metric.samples).median);
      aggregate.batchTimings.push(...metric.samples);
      aggregate.heapPeakDeltas.push(metric.heap.peakDelta);
      aggregate.heapRetainedDeltas.push(metric.heap.retainedDelta);
      aggregate.operations += metric.iterationsPerBatch * metric.batchCount;
      byID.set(metric.id, aggregate);
    }
  }
  return Object.freeze(Object.fromEntries([...byID].sort(([left], [right]) => left.localeCompare(right)).map(([id, value]) => [id, Object.freeze({
    family: value.family,
    dimensions: value.dimensions,
    unit: 'nanoseconds-per-operation',
    timing: summarize(value.processTimings),
    batchTiming: summarize(value.batchTimings),
    heap: Object.freeze({
      peakDelta: summarize(value.heapPeakDeltas),
      retainedDelta: summarize(value.heapRetainedDeltas),
      positivePeakDeltaMedian: Math.max(0, summarize(value.heapPeakDeltas).median),
      positiveRetainedDeltaMedian: Math.max(0, summarize(value.heapRetainedDeltas).median),
    }),
    operations: value.operations,
  })])));
}

function parseArguments(arguments_) {
  const mode = arguments_[0] ?? 'check';
  if (!['record', 'compare', 'check'].includes(mode)) throw new Error('Usage: run.mjs <record|compare|check> [options]');
  let baselinePath = resolve(repoRoot, DEFAULT_BASELINE_PATH);
  let outputPath = null;
  let processCount = DEFAULT_PROCESS_COUNT;
  let quick = false;
  let workItem = null;
  for (let index = 1; index < arguments_.length; index += 1) {
    const argument = arguments_[index];
    if (argument === '--quick') quick = true;
    else if (argument === '--baseline') baselinePath = resolve(repoRoot, requireValue(arguments_, ++index, argument));
    else if (argument === '--output') outputPath = resolve(repoRoot, requireValue(arguments_, ++index, argument));
    else if (argument === '--work-item') workItem = requireValue(arguments_, ++index, argument);
    else if (argument === '--processes') processCount = Number(requireValue(arguments_, ++index, argument));
    else throw new Error(`Unknown performance option: ${argument}`);
  }
  if (!Number.isSafeInteger(processCount) || processCount < 1) throw new Error('--processes must be a positive safe integer.');
  if (workItem !== null) {
    assert.match(workItem, /^WI-[0-9]{3}$/u, '--work-item must use WI-NNN.');
    assert.notEqual(mode, 'record', '--work-item is only valid for compare/check evidence.');
    assert.notEqual(outputPath, null, '--work-item requires --output so before/after evidence is retained.');
  }
  return Object.freeze({ mode, baselinePath, outputPath, processCount, quick, workItem });
}

function requireValue(arguments_, index, option) {
  const value = arguments_[index];
  if (value === undefined) throw new Error(`${option} requires a value.`);
  return value;
}

async function atomicWrite(path, value) {
  const temporary = `${path}.tmp-${process.pid}`;
  await mkdir(dirname(path), { recursive: true });
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  await rename(temporary, path);
}
