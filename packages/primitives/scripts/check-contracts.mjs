import assert from 'node:assert/strict';
import { readdir, readFile, stat } from 'node:fs/promises';

const publicSources = ['sequence.ts', 'range.ts', 'grid.ts', 'tree.ts'];
for (const file of publicSources) {
  assert.equal((await stat(`src/structures/${file}`)).isFile(), true);
}

const root = await readFile('src/index.ts', 'utf8');
assert.equal(/export\s+(?!type)/u.test(root), false, 'root must remain type-only');
for (const file of ['listbox.ts', 'revision.ts']) {
  assert.equal((await stat(`src/${file}`)).isFile(), true);
}

const sourceFiles = (await readdir('src', { recursive: true, withFileTypes: true }))
  .filter((entry) => entry.isFile() && entry.name.endsWith('.ts')).length;

console.log(JSON.stringify({ status: 'passed', sourceFiles, requiredPublicRuntimeSubpaths: 6 }, null, 2));
