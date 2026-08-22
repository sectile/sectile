import assert from 'node:assert/strict';
import { readdir, readFile, stat } from 'node:fs/promises';

const publicAPI = JSON.parse(await readFile('testing/public-api.json', 'utf8'));
for (const target of Object.values(publicAPI.runtimeTargets)) {
  assert.equal((await stat(`src/${target}.ts`)).isFile(), true);
}

const root = await readFile('src/index.ts', 'utf8');
assert.equal(/export\s+(?!type)/u.test(root), false, 'root must remain type-only');
const sourceFiles = (await readdir('src', { recursive: true, withFileTypes: true }))
  .filter((entry) => entry.isFile() && entry.name.endsWith('.ts')).length;

console.log(JSON.stringify({
  status: 'passed',
  sourceFiles,
  requiredPublicRuntimeSubpaths: publicAPI.requiredRuntimeSubpaths.length,
}, null, 2));
