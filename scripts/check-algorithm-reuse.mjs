#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { collectAlgorithmReuseInventory, validateGeneratedAlgorithmReuse } from './lib/algorithm-reuse.mjs';

const manifest = JSON.parse(await readFile('verification/algorithm-reuse/manifest.json', 'utf8'));
const inventory = await collectAlgorithmReuseInventory(resolve('.'), manifest);
const stored = JSON.parse(await readFile('verification/algorithm-reuse/inventory.json', 'utf8'));
const documentation = await readFile('docs/engineering/algorithm-reuse.md', 'utf8');
validateGeneratedAlgorithmReuse(inventory, stored, documentation);
const gates = JSON.parse(await readFile('verification/algorithm-reuse/gates.json', 'utf8'));
const packageJSON = JSON.parse(await readFile('package.json', 'utf8'));
assert.equal(gates.schemaVersion, 1, 'unsupported algorithm-reuse gate schema');
assert.equal(gates.command, 'pnpm check:algorithm-reuse');
assert.equal(packageJSON.scripts['check:algorithm-reuse'], 'node scripts/check-algorithm-reuse.mjs');
assert.equal(new Set(gates.workItems).size, gates.workItems.length, 'duplicate algorithm-reuse work-item gate');
console.log(JSON.stringify({ status: 'passed', packages: inventory.packages.length, findings: inventory.findings.length, gatedWorkItems: gates.workItems.length }));
