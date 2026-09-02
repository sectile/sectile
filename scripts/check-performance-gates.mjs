#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const manifest = JSON.parse(await readFile('verification/performance/gates.json', 'utf8'));
const packageJSON = JSON.parse(await readFile('package.json', 'utf8'));

assert.equal(manifest.schemaVersion, 3, 'unsupported performance gate schema');
assert.equal(manifest.certificationCommand, 'pnpm performance:certify');
assert.equal(manifest.targetedCommand, 'pnpm performance:check -- <package> [--type <type>] [--domain <domain>] [--scale <scale>] [--evidence <evidence>]');
assert.deepEqual(manifest.selectorAxes, ['owner', 'type', 'domain', 'scale', 'evidence']);
assert.deepEqual(manifest.defaultEvidence, [
  'complexity',
  'deterministicWork',
  'resourceBounds',
]);
assert.deepEqual(manifest.timingEvidenceWhen, [
  'a changed operation has an explicit latency or throughput target',
  'a registered timing-workload owner is changed in a performance-sensitive path',
  'a representation or crossover decision requires measured evidence',
]);
assert.deepEqual(manifest.certificationWhen, [
  'release certification',
  'nightly or dedicated benchmark execution',
  'an explicit selected or full performance certification request',
]);
assert.equal(packageJSON.scripts['check:performance-gates'], 'node scripts/check-performance-gates.mjs');
assert.equal(packageJSON.scripts['performance:certify'], 'pnpm check:performance-gates && node scripts/performance/run.mjs check --certify');
assert.equal(packageJSON.scripts['performance:certify:prepared'], 'pnpm check:performance-gates && node scripts/performance/run.mjs check --certify --prepared');
assert.equal(packageJSON.scripts['verify:performance'], 'pnpm performance:certify');

console.log(JSON.stringify({ status: 'passed', schemaVersion: manifest.schemaVersion }));
