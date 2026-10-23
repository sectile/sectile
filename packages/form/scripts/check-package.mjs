import assert from 'node:assert/strict';
import { readdir, readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';

const manifest = JSON.parse(await readFile('package.json', 'utf8'));
assert.deepEqual(manifest.files, ['dist']);
assert.equal(manifest.sideEffects, false);
assert.equal(manifest.dependencies?.['@sectile/core'], 'workspace:^');
assert.deepEqual(Object.keys(manifest.dependencies ?? {}), ['@sectile/core']);
assert.equal(manifest.peerDependencies, undefined);

const runtimeSubpaths = new Set(['./error', './path', './values', './state', './schema', './files', './uploads']);
for (const [subpath, target] of Object.entries(manifest.exports)) {
  if (subpath === './package.json') continue;
  assert.equal(target.import, target.default);
  assert.equal((await stat(target.import.slice(2))).isFile(), true);
  assert.equal((await stat(target.types.slice(2))).isFile(), true);
  if (subpath !== '.') runtimeSubpaths.delete(subpath);
}
assert.deepEqual([...runtimeSubpaths], []);

const rootRuntime = await readFile('dist/index.js', 'utf8');
assert.equal(
  rootRuntime.replace(/^\/\/# sourceMappingURL=.*$/gmu, '').trim(),
  'export {};',
  'renderer-neutral root runtime must remain an empty module',
);

let javascriptBytes = 0;
let declarationBytes = 0;
let sourceMapBytes = 0;
let filePolicyBytes = 0;
let uploadStateBytes = 0;
for (const path of await files('dist')) {
  const size = (await stat(path)).size;
  if (path.endsWith('.map')) sourceMapBytes += size;
  else if (path.endsWith('.d.ts')) declarationBytes += size;
  else if (path.endsWith('.js')) {
    javascriptBytes += size;
    if (path === join('dist', 'files.js')) filePolicyBytes += size;
    if (path === join('dist', 'uploads.js')) uploadStateBytes += size;
  }
}
// Approved state-owner split adds 3,236 bytes while preserving the prior headroom.
assert.ok(javascriptBytes - filePolicyBytes - uploadStateBytes < 73_236, `Incumbent JavaScript footprint ${javascriptBytes - filePolicyBytes - uploadStateBytes} exceeds ceiling`);
// E5 adds an isolated file-field policy leaf; unchanged consumers keep their incumbent bound.
assert.ok(filePolicyBytes > 0 && filePolicyBytes <= 8192, `File policy footprint ${filePolicyBytes} exceeds its 8KiB ceiling`);
// The separately imported upload owner uses the same isolated file-leaf bound.
// Consumer bundles and total installed payload remain independently checked.
assert.ok(uploadStateBytes > 0 && uploadStateBytes <= 8192, `Upload state footprint ${uploadStateBytes} exceeds its 8KiB ceiling`);

async function files(directory) {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) result.push(...await files(path));
    else if (entry.isFile()) result.push(path);
  }
  return result;
}
