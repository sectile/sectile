import assert from 'node:assert/strict';
import { readdir, readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';

const manifest = JSON.parse(await readFile('package.json', 'utf8'));
assert.deepEqual(manifest.files, ['dist']);
assert.equal(manifest.sideEffects, false);
assert.equal(manifest.dependencies?.['@sectile/core'], 'workspace:^');
assert.deepEqual(Object.keys(manifest.dependencies), ['@sectile/core']);

for (const [subpath, target] of Object.entries(manifest.exports)) {
  if (subpath === './package.json') continue;
  assert.equal(target.import, target.default);
  assert.equal((await stat(target.import.slice(2))).isFile(), true);
  assert.equal((await stat(target.types.slice(2))).isFile(), true);
}

let javascriptBytes = 0;
let declarationBytes = 0;
let sourceMapBytes = 0;
for (const path of await files('dist')) {
  const size = (await stat(path)).size;
  if (path.endsWith('.map')) sourceMapBytes += size;
  else if (path.endsWith('.d.ts')) declarationBytes += size;
  else if (path.endsWith('.js')) javascriptBytes += size;
}
assert.ok(javascriptBytes < 250_000, `JavaScript footprint ${javascriptBytes} exceeds ceiling`);
assert.ok(declarationBytes < 120_000, `declaration footprint ${declarationBytes} exceeds ceiling`);
assert.ok(sourceMapBytes < 350_000, `source map footprint ${sourceMapBytes} exceeds ceiling`);

async function files(directory) {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) result.push(...await files(path));
    else if (entry.isFile()) result.push(path);
  }
  return result;
}
