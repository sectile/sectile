#!/usr/bin/env node
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { summarize } from './performance/statistics.mjs';
import { renderCrossoverDocumentation, stableCrossoverFingerprint, validateCrossoverDecisions } from './lib/representation-crossovers.mjs';

const mode = process.argv[2] ?? 'check';
assert.ok(mode === 'record' || mode === 'check', `unknown crossover mode: ${mode}`);
const manifestPath = resolve('verification/representation-crossovers/decisions.json');
const baselinePath = resolve('verification/representation-crossovers/baseline.json');
const documentationPath = resolve('docs/performance/representations.md');
const workerPath = resolve('scripts/representation-crossovers-worker.mjs');
const PROCESS_COUNT = 9;
const [workerSource, manifestSource] = await Promise.all([
  readFile(workerPath, 'utf8'),
  readFile(manifestPath, 'utf8'),
]);
const manifest = JSON.parse(manifestSource);
const fingerprintInput = { ...manifest };
delete fingerprintInput.fingerprint;
const fingerprint = stableCrossoverFingerprint(workerSource, fingerprintInput);

if (mode === 'record') {
  const processes = [];
  for (let processIndex = 0; processIndex < PROCESS_COUNT; processIndex += 1) {
    const output = execFileSync(process.execPath, ['--expose-gc', workerPath], {
      cwd: resolve('.'),
      encoding: 'utf8',
      maxBuffer: 32 * 1024 * 1024,
    });
    processes.push(JSON.parse(output));
  }
  const byID = new Map();
  for (const processResult of processes) {
    for (const metric of processResult.metrics) {
      const entries = byID.get(metric.id) ?? [];
      entries.push(metric);
      byID.set(metric.id, entries);
    }
  }
  const metrics = [...byID].sort(([left], [right]) => left.localeCompare(right)).map(([id, entries]) => {
    assert.equal(entries.length, PROCESS_COUNT, `${id}: missing isolated process result`);
    const first = entries[0];
    return Object.freeze({
      id,
      family: first.family,
      candidate: first.candidate,
      input: first.input,
      timing: summarize(entries.map(({ nanos }) => nanos)),
      work: first.work,
      allocationUnits: first.allocationUnits,
      retainedBytes: first.retainedBytes,
      heapDeltaBytes: summarize(entries.map(({ heapDeltaBytes }) => heapDeltaBytes)).median,
      sourceBytes: first.sourceBytes,
    });
  });
  const recordedManifest = { ...manifest, fingerprint };
  const baseline = {
    schemaVersion: 1,
    workItem: 'WI-018',
    fingerprint,
    processCount: PROCESS_COUNT,
    runtime: {
      node: process.version,
      v8: process.versions.v8,
      platform: process.platform,
      architecture: process.arch,
    },
    metrics,
  };
  validateCrossoverDecisions(recordedManifest, baseline);
  const documentation = renderCrossoverDocumentation(recordedManifest, baseline);
  await Promise.all([
    writeFile(manifestPath, `${JSON.stringify(recordedManifest, null, 2)}\n`, 'utf8'),
    writeFile(baselinePath, `${JSON.stringify(baseline, null, 2)}\n`, 'utf8'),
    writeFile(documentationPath, documentation, 'utf8'),
  ]);
  console.log(JSON.stringify({ status: 'recorded', decisions: manifest.decisions.length, metrics: metrics.length, processCount: PROCESS_COUNT }));
} else {
  assert.equal(manifest.fingerprint, fingerprint, 'crossover source or decisions changed; re-record required');
  const baseline = JSON.parse(await readFile(baselinePath, 'utf8'));
  const report = validateCrossoverDecisions(manifest, baseline);
  assert.equal(normalizeText(await readFile(documentationPath, 'utf8')), renderCrossoverDocumentation(manifest, baseline), 'crossover documentation drifted');
  console.log(JSON.stringify({ status: 'passed', ...report, processCount: baseline.processCount }));
}

function normalizeText(value) {
  return value.replaceAll('\r\n', '\n');
}
