#!/usr/bin/env node
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { execFile as execFileCallback } from 'node:child_process';
import {
  DEFAULT_BASELINE_DIRECTORY,
  DEFAULT_LATEST_COMPARISON_PATH,
  DEFAULT_PROCESS_COUNT,
  DEFAULT_RUNS_PATH,
  MINIMUM_PROCESS_COUNT,
  MINIMUM_TARGET_PROCESS_COUNT,
  PERFORMANCE_SCHEMA_VERSION,
  TARGET_PROCESS_COUNT,
} from './config.mjs';
import { performanceBaselinePath, selectPerformanceBaseline } from './baselines.mjs';
import { compareReports, validateRunnerReport } from './check.mjs';
import { collectProvenance } from './provenance.mjs';
import {
  appendPerformanceProcess,
  createPerformanceSession,
  finalizePerformanceSession,
  recordPerformanceBaseline,
  writeJSONAtomic,
  writePerformanceComparison,
  writePerformanceReport,
} from './session-log.mjs';
import { summarize } from './statistics.mjs';
import { publishedPackageDirectories } from '../lib/published-packages.mjs';
import {
  PERFORMANCE_TIMING_PACKAGES,
  WORKLOAD_SCHEMA,
  performanceExecutionMode,
} from './schema.mjs';

const execFile = promisify(execFileCallback);
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
await main();

async function main() {
  const options = parseArguments(process.argv.slice(2).filter((argument) => argument !== '--'));
  const executionMode = performanceExecutionMode(options.mode, options.quick);
  const minimumProcesses = options.quick ? 1 : options.all ? MINIMUM_PROCESS_COUNT : MINIMUM_TARGET_PROCESS_COUNT;
  if (options.processCount < minimumProcesses) {
    throw new Error(`Performance runs require at least ${minimumProcesses} isolated processes.`);
  }
  const unsupportedTargets = options.targetPackages.filter((packageName) => !PERFORMANCE_TIMING_PACKAGES.includes(packageName));
  if (!options.all && unsupportedTargets.length === options.targetPackages.length) {
    process.stdout.write(`${JSON.stringify({
      status: 'skipped',
      mode: executionMode,
      requestedMode: options.mode,
      targetPackages: options.targetPackages,
      reason: 'no central timing workloads are registered for these packages',
    })}\n`);
    return;
  }

  if (!options.prepared) await prepareBuild(options);
  const session = await createPerformanceSession({
    runsRoot: options.runsRoot,
    mode: executionMode,
    processCount: options.processCount,
    baseline: executionMode === 'smoke' ? null : options.baselinePath ?? options.baselineDirectory,
  });
  try {
    const workerPath = resolve(repoRoot, 'scripts/performance/worker.mjs');
    const processReports = [];
    for (let processIndex = 0; processIndex < options.processCount; processIndex += 1) {
      const { stdout } = await execFile(process.execPath, ['--expose-gc', workerPath], {
        cwd: repoRoot,
        env: {
          ...process.env,
          SECTILE_PERFORMANCE_PROCESS_INDEX: String(processIndex),
          SECTILE_PERFORMANCE_QUICK: options.quick ? '1' : '0',
          SECTILE_PERFORMANCE_SCREENING: options.all ? '0' : '1',
          SECTILE_PERFORMANCE_PACKAGES: options.targetPackages.join(','),
        },
        maxBuffer: 64 * 1024 * 1024,
      });
      const processReport = JSON.parse(stdout);
      processReports.push(processReport);
      await appendPerformanceProcess(session, processIndex, processReport);
      process.stderr.write(`performance worker ${processIndex + 1}/${options.processCount} complete\n`);
    }

    const workloadFingerprint = createHash('sha256').update(JSON.stringify(WORKLOAD_SCHEMA)).digest('hex');
    const report = Object.freeze({
      schemaVersion: PERFORMANCE_SCHEMA_VERSION,
      createdAt: new Date().toISOString(),
      provenance: await collectProvenance(repoRoot, workloadFingerprint, {
        packageNames: options.all ? publishedPackageDirectories : options.targetPackages,
      }),
      runner: Object.freeze({
        processCount: options.processCount,
        batchesPerProcess: processReports[0]?.metrics[0]?.batchCount ?? 0,
        isolatedProcesses: true,
        forcedGC: true,
        warmup: true,
        sink: processReports.reduce((total, entry) => (total + entry.sink) % 1_000_000_007, 0),
        quick: options.quick,
        certification: executionMode !== 'smoke' && options.all,
        targetPackages: Object.freeze([...options.targetPackages]),
      }),
      workloadSchema: WORKLOAD_SCHEMA,
      metrics: aggregateMetrics(processReports),
      processResources: Object.freeze(processReports.map((entry) => entry.resourceUsage)),
    });
    const reportPath = await writePerformanceReport(session, report);
    try {
      validateRunnerReport(report);
    } catch (error) {
      await finalizePerformanceSession(session, 'invalid', error);
      throw error;
    }

    if (executionMode === 'smoke') {
      await finalizePerformanceSession(session, 'passed');
      process.stdout.write(`${JSON.stringify({
        status: 'passed',
        mode: executionMode,
        requestedMode: options.mode,
        certification: false,
        targetPackages: options.targetPackages,
        runID: session.session.runID,
        session: session.manifestPath,
        report: reportPath,
        metrics: Object.keys(report.metrics).length,
      })}\n`);
      return;
    }

    if (options.mode === 'record') {
      const baselinePath = options.baselinePath ?? performanceBaselinePath(options.baselineDirectory, report);
      await recordPerformanceBaseline(session, baselinePath, report);
      await finalizePerformanceSession(session, 'recorded');
      process.stdout.write(`${JSON.stringify({
        mode: options.mode,
        runID: session.session.runID,
        session: session.manifestPath,
        report: reportPath,
        baseline: baselinePath,
        metrics: Object.keys(report.metrics).length,
      })}\n`);
      return;
    }

    const selectedBaseline = await selectPerformanceBaseline({
      current: report,
      explicitPath: options.baselinePath,
      directory: options.baselineDirectory,
    });
    const baselinePath = selectedBaseline.path;
    const baseline = selectedBaseline.report;
    const comparison = compareReports(baseline, report);
    const comparisonPath = resolve(session.directory, 'comparison.json');
    const output = Object.freeze({
      mode: options.mode,
      certification: options.all,
      targetPackages: options.targetPackages,
      workItem: options.workItem,
      runID: session.session.runID,
      session: session.manifestPath,
      currentRunReport: reportPath,
      comparisonReport: comparisonPath,
      baseline: baselinePath,
      baselineBuildFingerprint: baseline.provenance.buildFingerprint,
      currentBuildFingerprint: report.provenance.buildFingerprint,
      ...comparison,
    });
    await writePerformanceComparison(session, output);
    await writeJSONAtomic(options.latestComparisonPath, output);
    if (options.outputPath !== null) await writeJSONAtomic(options.outputPath, output);
    const failed = options.mode === 'check' && comparison.regressions.length > 0;
    await finalizePerformanceSession(session, failed ? 'failed' : options.mode === 'check' ? 'passed' : 'compared',
      failed ? new Error('performance regression detected') : null);
    process.stdout.write(`${JSON.stringify(output)}\n`);
    assert.equal(failed, false, 'performance regression detected');
  } catch (error) {
    if (session.session.status === 'running') await finalizePerformanceSession(session, 'failed', error);
    throw error;
  }
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
  if (!['record', 'compare', 'check'].includes(mode)) {
    throw new Error('Usage: run.mjs <record|compare|check> [package ... | --all] [options]');
  }
  let baselinePath = null;
  const baselineDirectory = resolve(repoRoot, DEFAULT_BASELINE_DIRECTORY);
  const latestComparisonPath = resolve(repoRoot, DEFAULT_LATEST_COMPARISON_PATH);
  const runsRoot = resolve(repoRoot, DEFAULT_RUNS_PATH);
  let outputPath = null;
  let all = mode === 'record';
  let prepared = false;
  let processCount = null;
  let quick = false;
  let workItem = null;
  const targetPackages = [];
  for (let index = 1; index < arguments_.length; index += 1) {
    const argument = arguments_[index];
    if (argument === '--all') all = true;
    else if (argument === '--prepared') prepared = true;
    else if (argument === '--quick') quick = true;
    else if (argument === '--baseline') baselinePath = resolve(repoRoot, requireValue(arguments_, ++index, argument));
    else if (argument === '--output') outputPath = resolve(repoRoot, requireValue(arguments_, ++index, argument));
    else if (argument === '--work-item') workItem = requireValue(arguments_, ++index, argument);
    else if (argument === '--processes') processCount = Number(requireValue(arguments_, ++index, argument));
    else if (argument.startsWith('--')) throw new Error(`Unknown performance option: ${argument}`);
    else targetPackages.push(normalizePerformanceTarget(argument));
  }
  const uniqueTargets = [...new Set(targetPackages)];
  if (all && uniqueTargets.length > 0) throw new Error('--all cannot be combined with package targets');
  if (!all && uniqueTargets.length === 0) {
    throw new Error('targeted performance checks require at least one package; use pnpm performance:certify for the full suite');
  }
  if (mode === 'record') assert.equal(all, true, 'record always captures the complete certification suite');
  if (quick && mode === 'record') throw new Error('record does not accept --quick; authoritative baselines require full certification');
  if (quick && baselinePath !== null) throw new Error('--quick smoke mode does not accept --baseline');
  if (quick && outputPath !== null) throw new Error('--quick smoke mode does not accept --output');
  if (quick && workItem !== null) throw new Error('--quick smoke mode does not accept --work-item');
  processCount ??= quick ? 1 : all ? DEFAULT_PROCESS_COUNT : TARGET_PROCESS_COUNT;
  if (!Number.isSafeInteger(processCount) || processCount < 1) throw new Error('--processes must be a positive safe integer.');
  if (mode === 'record') assert.equal(outputPath, null, 'record writes its report to the performance session log');
  if (workItem !== null) {
    assert.match(workItem, /^WI-[0-9]{3}$/u, '--work-item must use WI-NNN.');
    assert.notEqual(mode, 'record', '--work-item is only valid for compare/check evidence.');
    assert.notEqual(outputPath, null, '--work-item requires --output so before/after evidence is retained.');
  }
  return Object.freeze({
    mode,
    all,
    prepared,
    targetPackages: Object.freeze(uniqueTargets),
    baselinePath,
    baselineDirectory,
    latestComparisonPath,
    runsRoot,
    outputPath,
    processCount,
    quick,
    workItem,
  });
}

function normalizePerformanceTarget(value) {
  const normalized = value.startsWith('@sectile/') ? value.slice('@sectile/'.length) : value;
  if (!publishedPackageDirectories.includes(normalized)) {
    throw new Error(`unknown performance target ${value}; expected ${publishedPackageDirectories.join(', ')}`);
  }
  return normalized;
}

async function prepareBuild(options) {
  const filters = options.all
    ? []
    : options.targetPackages.flatMap((packageName) => ['--filter', `@sectile/${packageName}...`]);
  const args = options.all
    ? ['-r', '--workspace-concurrency=1', '--if-present', 'build']
    : ['-r', '--workspace-concurrency=1', ...filters, '--if-present', 'build'];
  await execFile('pnpm', args, { cwd: repoRoot, maxBuffer: 64 * 1024 * 1024 });
}

function requireValue(arguments_, index, option) {
  const value = arguments_[index];
  if (value === undefined) throw new Error(`${option} requires a value.`);
  return value;
}
