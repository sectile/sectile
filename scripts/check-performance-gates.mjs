#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const expectedWorkItems = Object.freeze([
  ...range(2, 11),
  ...range(13, 15),
  'WI-018',
  ...range(20, 23),
  ...range(25, 40),
]);
const manifest = JSON.parse(await readFile('verification/performance/gates.json', 'utf8'));
const packageJSON = JSON.parse(await readFile('package.json', 'utf8'));

assert.equal(manifest.schemaVersion, 1, 'unsupported performance gate schema');
assert.equal(manifest.repositoryCommand, 'pnpm verify:performance');
assert.equal(
  manifest.evidenceCommand,
  'pnpm performance:check -- --work-item <WI-NNN> --output <task-local-path>',
);
assert.deepEqual(manifest.requiredEvidence, [
  'latency',
  'allocation',
  'retainedHeap',
  'scaling',
  'packageFootprint',
]);
assert.deepEqual(manifest.workItems, expectedWorkItems, 'runtime-changing downstream work-item gate coverage drifted');
assert.equal(packageJSON.scripts['check:performance-gates'], 'node scripts/check-performance-gates.mjs');
assert.equal(packageJSON.scripts['verify:performance'], 'pnpm check:performance-gates && pnpm performance:check');

console.log(JSON.stringify({ status: 'passed', gatedWorkItems: manifest.workItems.length }));

function range(start, end) {
  return Array.from({ length: end - start + 1 }, (_, offset) => `WI-${String(start + offset).padStart(3, '0')}`);
}
