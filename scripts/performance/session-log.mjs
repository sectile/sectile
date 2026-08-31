import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';

export const PERFORMANCE_SESSION_SCHEMA_VERSION = 1;

export function createPerformanceRunID(now = new Date(), pid = process.pid, suffix = randomUUID().slice(0, 8)) {
  return `${now.toISOString().replaceAll(':', '-').replaceAll('.', '-')}-${pid}-${suffix}`;
}

export function validatePerformanceRunID(runID) {
  assert.match(runID, /^[A-Za-z0-9][A-Za-z0-9._-]*$/u, 'performance run ID must be one portable path segment');
  return runID;
}

export async function createPerformanceSession(options) {
  const runID = validatePerformanceRunID(options.runID ?? createPerformanceRunID());
  const directory = resolve(options.runsRoot, runID);
  await mkdir(options.runsRoot, { recursive: true });
  await mkdir(directory);
  const session = {
    schemaVersion: PERFORMANCE_SESSION_SCHEMA_VERSION,
    runID,
    mode: options.mode,
    status: 'running',
    startedAt: options.startedAt ?? new Date().toISOString(),
    completedAt: null,
    requiredProcesses: options.processCount,
    completedProcesses: 0,
    baseline: options.baseline,
    processReports: [],
    report: null,
    comparison: null,
    error: null,
    baselineUpdate: null,
  };
  const handle = { directory, manifestPath: join(directory, 'session.json'), session };
  await writeJSONAtomic(handle.manifestPath, session);
  return handle;
}

export async function appendPerformanceProcess(handle, index, report) {
  assert.equal(handle.session.status, 'running', 'performance session is already finalized');
  assert.equal(index, handle.session.completedProcesses, 'performance process reports must be appended in order');
  const name = `process-${String(index + 1).padStart(3, '0')}.json`;
  await writeJSONExclusive(join(handle.directory, name), report);
  handle.session.processReports.push(name);
  handle.session.completedProcesses += 1;
  await writeJSONAtomic(handle.manifestPath, handle.session);
}

export async function writePerformanceReport(handle, report) {
  const name = 'report.json';
  await writeJSONExclusive(join(handle.directory, name), report);
  handle.session.report = name;
  await writeJSONAtomic(handle.manifestPath, handle.session);
  return join(handle.directory, name);
}

export async function writePerformanceComparison(handle, comparison) {
  const name = 'comparison.json';
  await writeJSONExclusive(join(handle.directory, name), comparison);
  handle.session.comparison = name;
  await writeJSONAtomic(handle.manifestPath, handle.session);
  return join(handle.directory, name);
}

export async function finalizePerformanceSession(handle, status, error = null) {
  assert.notEqual(status, 'running', 'final performance status required');
  handle.session.status = status;
  handle.session.completedAt = new Date().toISOString();
  handle.session.error = error === null ? null : errorDetails(error);
  await writeJSONAtomic(handle.manifestPath, handle.session);
}

export async function recordPerformanceBaseline(handle, baselinePath, report) {
  assert.equal(handle.session.status, 'running', 'performance session is already finalized');
  assert.equal(handle.session.report, 'report.json', 'performance session has no completed report');
  assert.equal(report.runner.quick, false, 'quick performance runs cannot become an authoritative baseline');

  const previousPath = join(handle.directory, 'previous-baseline.json');
  let previous = null;
  try {
    previous = JSON.parse(await readFile(baselinePath, 'utf8'));
    await writeJSONExclusive(previousPath, previous);
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
  }

  await writeJSONAtomic(baselinePath, report);
  const baselineUpdate = {
    recordedAt: new Date().toISOString(),
    baseline: resolve(baselinePath),
    previousBaseline: previous === null ? null : 'previous-baseline.json',
    previousBuildFingerprint: previous?.provenance?.buildFingerprint ?? null,
    recordedBuildFingerprint: report.provenance.buildFingerprint,
  };
  await writeJSONExclusive(join(handle.directory, 'baseline-update.json'), baselineUpdate);
  handle.session.baselineUpdate = 'baseline-update.json';
  await writeJSONAtomic(handle.manifestPath, handle.session);
  return baselineUpdate;
}

export async function writeJSONAtomic(path, value) {
  const temporary = `${path}.tmp-${process.pid}-${randomUUID().slice(0, 8)}`;
  await mkdir(dirname(path), { recursive: true });
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  await rename(temporary, path);
}

async function writeJSONExclusive(path, value) {
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, { encoding: 'utf8', flag: 'wx' });
}

function errorDetails(error) {
  if (!(error instanceof Error)) return { message: String(error) };
  return {
    name: error.name,
    message: error.message,
    code: error.code ?? null,
    signal: error.signal ?? null,
    stdout: boundedText(error.stdout),
    stderr: boundedText(error.stderr),
  };
}

function boundedText(value) {
  if (value === undefined || value === null) return null;
  const text = value.toString('utf8');
  return text.length <= 32_768 ? text : `${text.slice(0, 32_768)}\n[truncated]`;
}
