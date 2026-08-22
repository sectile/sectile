import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const readPackage = async (relativePath) => JSON.parse(await readFile(new URL(relativePath, import.meta.url), 'utf8'));

test('Vue exposes every public DOM component subpath', async () => {
  const [domPackage, vuePackage] = await Promise.all([
    readPackage('../../dom/package.json'),
    readPackage('../package.json'),
  ]);
  const ignored = new Set(['.', './package.json']);
  const domSubpaths = Object.keys(domPackage.exports).filter((subpath) => !ignored.has(subpath));
  const missing = domSubpaths.filter((subpath) => vuePackage.exports[subpath] === undefined);

  assert.deepEqual(missing, []);
});
