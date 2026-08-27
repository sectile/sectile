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

test('virtualization is exposed only through its optional subpath', async () => {
  const vuePackage = await readPackage('../package.json');
  assert.equal(vuePackage.dependencies?.['@sectile/virtual'], undefined);
  assert.equal(vuePackage.peerDependencies?.['@sectile/virtual'], 'workspace:*');
  assert.equal(vuePackage.peerDependenciesMeta?.['@sectile/virtual']?.optional, true);

  const rootModule = await import('../dist/index.js');
  assert.equal(rootModule.VirtualList, undefined);
  assert.equal(rootModule.useVirtualizer, undefined);

  const virtualModule = await import('../dist/virtual.js');
  assert.equal(typeof virtualModule.VirtualList, 'object');
  assert.equal(typeof virtualModule.useVirtualizer, 'function');

  const virtualSource = await readFile(new URL('../dist/virtual.js', import.meta.url), 'utf8');
  assert.match(virtualSource, /@sectile\/virtual/);
});
