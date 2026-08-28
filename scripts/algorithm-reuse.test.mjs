import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
  classifyFindings,
  collectAlgorithmReuseInventory,
  renderAlgorithmReuseInventory,
  scanSource,
  validateGeneratedAlgorithmReuse,
  validateManifest,
} from './lib/algorithm-reuse.mjs';

const manifest = JSON.parse(await readFile('verification/algorithm-reuse/manifest.json', 'utf8'));

test('algorithm reuse inventory covers all packages and approved migration owners', async () => {
  const inventory = await collectAlgorithmReuseInventory(process.cwd(), manifest);
  assert.deepEqual(new Set(inventory.findings.map(({ path }) => path.split('/')[1])), new Set(inventory.packages));
  assert.ok(inventory.findings.length > 0);
  assert.ok(inventory.findings.every((entry) => entry.classification !== 'migration-required' || typeof entry.owner === 'string'));
});

test('intentional hot-path bypass fixtures are rejected as unclassified', () => {
  const fixtures = [
    ['raw identity lookup', 'values.find((value) => value.id === id)'],
    ['repeated immutable view', 'new IndexedSequence(values)'],
    ['whole-domain validation', 'const valid = tryCreateWidgetState(state)'],
    ['discarded index', 'new Map(values.map((value) => [value.id, value]))'],
    ['duplicate measurement', 'element.getBoundingClientRect()'],
    ['controller rebuild', 'watch(() => props.items, connect)'],
  ];
  for (const [name, source] of fixtures) {
    const findings = scanSource('packages/vue/src/intentional-fixture.ts', source, manifest.detectors);
    assert.ok(findings.length > 0, `${name}: detector did not fire`);
    assert.throws(() => classifyFindings(findings, { ...manifest, rules: [] }), /unclassified/u, name);
  }
});

test('multiply classified, multiply owned, and stale generated inventory fixtures fail', async () => {
  const finding = scanSource('packages/core/src/fixture.ts', 'values.find((value) => value)', manifest.detectors);
  const duplicateRules = [
    { id: 'a', detectors: ['raw-identity-lookup'], paths: ['packages/core/src/fixture.ts'], classification: 'reuse', owner: null, rationale: 'fixture' },
    { id: 'b', detectors: ['raw-identity-lookup'], paths: ['packages/core/src/fixture.ts'], classification: 'reuse', owner: null, rationale: 'fixture' },
  ];
  assert.throws(() => classifyFindings(finding, { ...manifest, rules: duplicateRules }), /multiply classified/u);
  assert.throws(() => validateManifest({
    ...manifest,
    rules: [{ id: 'owned', detectors: ['*'], paths: ['packages/core/src/fixture.ts'], classification: 'migration-required', owner: ['WI-013', 'WI-014'], rationale: 'fixture' }],
  }), /exactly one migration owner/u);
  const inventory = await collectAlgorithmReuseInventory(process.cwd(), manifest);
  assert.throws(
    () => validateGeneratedAlgorithmReuse(inventory, inventory, `${renderAlgorithmReuseInventory(inventory)}stale\n`),
    /documentation drifted/u,
  );
});

test('every downstream runtime work item retains the reuse ratchet', async () => {
  const gates = JSON.parse(await readFile('verification/algorithm-reuse/gates.json', 'utf8'));
  assert.equal(gates.schemaVersion, 1);
  assert.equal(gates.command, 'pnpm check:algorithm-reuse');
  assert.equal(new Set(gates.workItems).size, 33);
  assert.equal(gates.workItems.length, 33);
});
