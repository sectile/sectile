#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { collectAlgorithmReuseInventory, renderAlgorithmReuseInventory } from './lib/algorithm-reuse.mjs';

const manifest = JSON.parse(await readFile('verification/algorithm-reuse/manifest.json', 'utf8'));
const inventory = await collectAlgorithmReuseInventory(resolve('.'), manifest);
await writeFile('verification/algorithm-reuse/inventory.json', `${JSON.stringify(inventory, null, 2)}\n`, 'utf8');
await writeFile('docs/engineering/algorithm-reuse.md', renderAlgorithmReuseInventory(inventory), 'utf8');
console.log(JSON.stringify({ status: 'updated', packages: inventory.packages.length, findings: inventory.findings.length }));
