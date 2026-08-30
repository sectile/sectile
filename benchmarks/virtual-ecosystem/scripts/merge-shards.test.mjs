import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { promisify } from 'node:util';
import test from 'node:test';

const execFileAsync = promisify(execFile);
const mergeScript = resolve(import.meta.dirname, 'merge-shards.mjs');

test('merges adaptive shards before reporting p95', async () => {
  const directory = await mkdtemp(resolve(tmpdir(), 'sectile-virtual-merge-'));
  try {
    const firstPath = resolve(directory, 'first.json');
    const secondPath = resolve(directory, 'second.json');
    const outputPath = resolve(directory, 'merged.json');
    await writeFile(firstPath, JSON.stringify(report('first', 1)), 'utf8');
    await writeFile(secondPath, JSON.stringify(report('second', 16)), 'utf8');

    await execFileAsync(process.execPath, [mergeScript, outputPath, firstPath, secondPath]);
    const merged = JSON.parse(await readFile(outputPath, 'utf8'));
    const result = merged.mutationResults[0];

    assert.equal(result.totalSamples, 30);
    assert.equal(result.p95Ms, 29);
    assert.deepEqual(result.runIds, ['first', 'second']);
    assert.deepEqual(merged.conditions.mutations.batchSizes, [15, 15]);
    assert.equal(merged.conditions.mutations.maximumSamplesPerScenario, 30);
    assert.deepEqual(Object.keys(merged.runs), ['first', 'second']);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('merges distinct layout-family conditions without list result synthesis', async () => {
  const directory = await mkdtemp(resolve(tmpdir(), 'sectile-layout-merge-'));
  try {
    const firstPath = resolve(directory, 'first.json');
    const secondPath = resolve(directory, 'second.json');
    const outputPath = resolve(directory, 'merged.json');
    await writeFile(firstPath, JSON.stringify(layoutReport('first', 'Sectile Virtual', 'fixed')), 'utf8');
    await writeFile(secondPath, JSON.stringify(layoutReport('second', 'React Virtuoso', 'automatic')), 'utf8');

    await execFileAsync(process.execPath, [mergeScript, outputPath, firstPath, secondPath]);
    const merged = JSON.parse(await readFile(outputPath, 'utf8'));

    assert.equal(merged.conditions.family, 'flow-grid');
    assert.equal(merged.layoutResults.length, 2);
    assert.deepEqual(Object.keys(merged.runs), ['first', 'second']);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

function report(runId, firstSample) {
  const samples = Array.from({ length: 15 }, (_, index) => ({
    sample: index + 1,
    outcome: 'clean',
    elapsedMs: firstSample + index,
    failureCodes: [],
  }));
  return {
    benchmark: 'sectile-virtual-ecosystem',
    protocolVersion: 5,
    environment: 'test',
    source: { buildFingerprint: 'same-build' },
    runs: { [runId]: { id: runId } },
    conditions: {
      itemCount: 100_000,
      viewport: [720, 480],
      contentCorpusVersion: 'test',
      baseline: {
        adaptiveSampling: true,
        rounds: 0,
        maximumRounds: 0,
        minimumRounds: 0,
      },
      mutations: {
        adaptiveSampling: true,
        rounds: 1,
        batchSizes: [15],
        samplesPerScenario: 15,
        maximumSamplesPerScenario: 15,
      },
    },
    baselineResults: [],
    baselineFailures: [],
    baselineSamples: {},
    mutationResults: [{
      runIds: [runId],
      rowProfile: 'uniform',
      library: 'Sectile Virtual',
      version: 'test',
      stack: 'Vue',
      sizeMode: 'estimated',
      operation: 'insert',
      location: 'start',
      medianMs: null,
      p95Ms: null,
      recoveryMedianMs: null,
      recoveryP95Ms: null,
      settledSamples: 15,
      correctSamples: 15,
      recoveredSamples: 0,
      failedSamples: 0,
      totalSamples: 15,
      plannedSamples: 15,
      earlyStopped: false,
      earlyStopReason: null,
      samples,
      failures: [],
    }],
  };
}

function layoutReport(runId, library, mode) {
  return {
    benchmark: 'sectile-virtual-ecosystem', protocolVersion: 7, environment: 'test',
    source: { buildFingerprint: 'same-build' }, runs: { [runId]: { id: runId } },
    conditions: { family: 'flow-grid', itemCount: 100_000, viewport: [720, 480] },
    capabilities: [], layoutFailures: [], layoutMutationResults: [],
    layoutResults: [{
      runIds: [runId], family: 'flow-grid', mode, library, version: 'test', stack: 'test',
      setupMs: 1, firstItemsMs: 2, stableLayoutMs: 3, scrollMedianMs: 4, scrollP95Ms: 5,
      scrollMadMs: 1, scrollSampleCount: 20, completedRounds: 1, plannedRounds: 1,
      renderedItems: 20, domElements: 25,
    }],
  };
}
