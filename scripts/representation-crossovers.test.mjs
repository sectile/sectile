import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
  crossoverGovernedSourcePaths,
  stableCrossoverEvidenceFingerprint,
  stableCrossoverSourceFingerprint,
  validateCrossoverDecisions,
  validateCrossoverProvenance,
} from './lib/representation-crossovers.mjs';

const load = async () => Promise.all([
  readFile('verification/representation-crossovers/decisions.json', 'utf8').then(JSON.parse),
  readFile('verification/representation-crossovers/baseline.json', 'utf8').then(JSON.parse),
]);

const loadGovernedSources = async (manifest) => Promise.all(crossoverGovernedSourcePaths(manifest).map(async (path) => ({
  path,
  source: await readFile(path, 'utf8'),
})));

test('frozen representation decisions have complete measured evidence and governed production provenance', async () => {
  const [manifest, baseline] = await load();
  const workerSource = await readFile('scripts/representation-crossovers-worker.mjs', 'utf8');
  const governedSources = await loadGovernedSources(manifest);
  assert.deepEqual(
    validateCrossoverProvenance(manifest, baseline, workerSource, governedSources),
    { decisions: 16, metrics: baseline.metrics.length },
  );
});

test('crossover source fingerprints are stable across LF and CRLF hosts', () => {
  const manifest = { schemaVersion: 2, decisions: [] };
  assert.equal(
    stableCrossoverSourceFingerprint('worker\nsource\n', manifest, [{ path: 'packages/core/src/example.ts', source: 'owner\nsource\n' }]),
    stableCrossoverSourceFingerprint('worker\r\nsource\r\n', manifest, [{ path: 'packages/core/src/example.ts', source: 'owner\r\nsource\r\n' }]),
  );
});

test('edited recorded evidence fails independent evidence attestation', async () => {
  const [manifest, baseline] = await load();
  const tampered = structuredClone(baseline);
  tampered.metrics[0].timing.median += 1;
  assert.throws(() => validateCrossoverDecisions(manifest, tampered), /recorded evidence changed/u);
});

test('governed production source drift fails source attestation', async () => {
  const [manifest, baseline] = await load();
  const workerSource = await readFile('scripts/representation-crossovers-worker.mjs', 'utf8');
  const governedSources = await loadGovernedSources(manifest);
  const drifted = governedSources.map((entry) => entry.path === 'packages/virtual/src/layout/spatial.ts'
    ? { ...entry, source: `${entry.source}\n// temporary representation drift` }
    : entry);
  assert.throws(
    () => validateCrossoverProvenance(manifest, baseline, workerSource, drifted),
    /governed production source changed/u,
  );
});

test('every crossover decision declares canonical production source ownership', async () => {
  const [manifest] = await load();
  const expected = crossoverGovernedSourcePaths(manifest);
  assert.ok(expected.includes('packages/virtual/src/layout/spatial.ts'));
  const missing = structuredClone(manifest);
  delete missing.decisions[0].governedSources;
  assert.throws(() => crossoverGovernedSourcePaths(missing), /governed production sources missing/u);
  const duplicate = structuredClone(manifest);
  duplicate.decisions[0].governedSources.push(duplicate.decisions[0].governedSources[0]);
  assert.throws(() => crossoverGovernedSourcePaths(duplicate), /sorted and unique/u);
  const invalid = structuredClone(manifest);
  invalid.decisions[0].governedSources = ['docs/performance/representations.md'];
  assert.throws(() => crossoverGovernedSourcePaths(invalid), /invalid governed production source/u);
});

test('missing decisions, candidate evidence, and Virtual repair bounds fail', async () => {
  const [manifest, baseline] = await load();
  assert.throws(() => validateCrossoverDecisions({ ...manifest, decisions: manifest.decisions.slice(1) }, baseline), /inventory/u);
  const withoutEvidence = structuredClone(manifest);
  withoutEvidence.decisions[0].evidence = withoutEvidence.decisions[0].evidence.filter((id) => !id.includes('chunked-piece-table'));
  assert.throws(() => validateCrossoverDecisions(withoutEvidence, baseline), /lacks measured/u);
  const unbounded = structuredClone(manifest);
  unbounded.decisions.find(({ id }) => id === 'virtual-spatial').parameters.repairBound = 'unknown';
  assert.throws(() => validateCrossoverDecisions(unbounded, baseline), /repair bound/u);
  const noisy = structuredClone(baseline);
  noisy.metrics[0].timing.relativeMAD = 0.11;
  const noisyManifest = { ...manifest, evidenceFingerprint: stableCrossoverEvidenceFingerprint(noisy) };
  assert.throws(() => validateCrossoverDecisions(noisyManifest, noisy), /dispersion/u);
  const tooFewProcesses = { ...baseline, processCount: 8 };
  const tooFewManifest = { ...manifest, evidenceFingerprint: stableCrossoverEvidenceFingerprint(tooFewProcesses) };
  assert.throws(
    () => validateCrossoverDecisions(tooFewManifest, tooFewProcesses),
    /at least nine isolated processes/u,
  );
});
