import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { validateCrossoverDecisions } from './lib/representation-crossovers.mjs';

const load = async () => Promise.all([
  readFile('verification/representation-crossovers/decisions.json', 'utf8').then(JSON.parse),
  readFile('verification/representation-crossovers/baseline.json', 'utf8').then(JSON.parse),
]);

test('frozen representation decisions have complete measured evidence', async () => {
  const [manifest, baseline] = await load();
  assert.deepEqual(validateCrossoverDecisions(manifest, baseline), { decisions: 16, metrics: baseline.metrics.length });
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
  assert.throws(() => validateCrossoverDecisions(manifest, noisy), /dispersion/u);
});
