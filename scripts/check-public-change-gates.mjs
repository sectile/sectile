#!/usr/bin/env node
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';

const expectedWorkItems = [
  ...range(2, 11), ...range(13, 15), 'WI-018', ...range(20, 23), ...range(25, 40),
];
const manifest = JSON.parse(await readFile('verification/public-change-gates.json', 'utf8'));
const packageJSON = JSON.parse(await readFile('package.json', 'utf8'));
assert.equal(manifest.schemaVersion, 1, 'unsupported public-change gate schema');
assert.equal(manifest.command, 'pnpm verify:public-change-gates');
assert.deepEqual(manifest.checks, [
  'public-signatures', 'breaking-changes', 'workstream-ownership', 'consumer-bundles', 'consumer-install',
]);
assert.deepEqual(manifest.workItems, expectedWorkItems, 'downstream public/runtime gate coverage drifted');
assert.equal(packageJSON.scripts['check:public-change-gates'], 'node scripts/check-public-change-gates.mjs');
assert.equal(packageJSON.scripts['verify:public-change-gates'], 'pnpm run build:workspace && node scripts/check-public-change-gates.mjs --full');

if (process.argv.includes('--full')) {
  for (const [command, arguments_] of [
    [process.execPath, ['scripts/check-public-signatures.mjs']],
    [process.execPath, ['scripts/check-breaking-changes.mjs']],
    [process.execPath, ['scripts/check-workstream-ownership.mjs']],
    [process.execPath, ['scripts/consumer-bundles/run.mjs', 'check']],
    [process.execPath, ['scripts/consumer-install/run.mjs', 'check']],
  ]) execFileSync(command, arguments_, { cwd: process.cwd(), stdio: 'inherit' });
}
console.log(JSON.stringify({ status: 'passed', gatedWorkItems: manifest.workItems.length, full: process.argv.includes('--full') }));

function range(start, end) {
  return Array.from({ length: end - start + 1 }, (_, offset) => `WI-${String(start + offset).padStart(3, '0')}`);
}
