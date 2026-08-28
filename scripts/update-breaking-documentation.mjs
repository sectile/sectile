#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { renderBreakingDocumentation } from './check-breaking-changes.mjs';

const fragments = [];
for (const packageName of ['core', 'dom', 'form', 'tabular', 'temporal', 'terminal', 'virtual', 'vue']) {
  fragments.push(JSON.parse(await readFile(resolve('verification/breaking-changes/fragments', `${packageName}.json`), 'utf8')));
}
await writeFile(resolve('docs/engineering/breaking-changes.md'), renderBreakingDocumentation(fragments), 'utf8');
console.log('breaking-change documentation updated');
