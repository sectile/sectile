import assert from 'node:assert/strict';
import { readdir, readFile, stat } from 'node:fs/promises';

const publicSources = ['sequence.ts', 'range.ts', 'grid.ts', 'tree.ts'];
for (const file of publicSources) {
  assert.equal((await stat(`packages/primitives/src/structures/${file}`)).isFile(), true);
}

const root = await readFile('packages/primitives/src/index.ts', 'utf8');
assert.equal(/export\s+(?!type)/u.test(root), false, 'root must remain type-only');

const sourceFiles = (await readdir('packages/primitives/src', { recursive: true, withFileTypes: true }))
  .filter((entry) => entry.isFile() && entry.name.endsWith('.ts')).length;

console.log(JSON.stringify({ status: 'passed', sourceFiles, requiredPublicRuntimeSubpaths: 4 }, null, 2));
