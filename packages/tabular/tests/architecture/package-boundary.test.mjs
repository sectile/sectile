import assert from 'node:assert/strict';
import test from 'node:test';
import { readdir, readFile } from 'node:fs/promises';
import { join, sep } from 'node:path';

const manifest = JSON.parse(await readFile('package.json', 'utf8'));

test('base Tabular remains renderer-neutral and Virtual stays an optional peer', async () => {
  assert.equal(manifest.dependencies['@sectile/core'], 'workspace:*');
  assert.equal(manifest.peerDependencies['@sectile/virtual'], 'workspace:*');
  assert.equal(manifest.peerDependenciesMeta['@sectile/virtual'].optional, true);

  const forbiddenImports = [
    '@sectile/dom', '@sectile/terminal', '@sectile/vue', 'node:',
    'vue', 'react', 'solid-js', 'svelte',
  ];
  for (const path of await sourceFiles('src')) {
    const portablePath = path.split(sep).join('/');
    if (portablePath === 'src/virtual.ts') continue;
    const source = await readFile(path, 'utf8');
    assert.equal(source.includes('@sectile/virtual'), false, `${portablePath} imports Virtual from the base graph`);
    for (const specifier of forbiddenImports) {
      assert.equal(source.includes(`'${specifier}`) || source.includes(`"${specifier}`), false,
        `${portablePath} imports forbidden platform dependency ${specifier}`);
    }
  }
});

test('the package root is type-only and runtime APIs require explicit subpaths', async () => {
  const source = await readFile('src/index.ts', 'utf8');
  const runtimeExport = source
    .split('\n')
    .map((line) => line.trim())
    .find((line) => line.startsWith('export ') && !line.startsWith('export type ') && line !== 'export {};');
  assert.equal(runtimeExport, undefined);
  assert.deepEqual(Object.keys(manifest.exports).sort(), ['.', './data-grid', './data-table', './data-tree-grid', './model', './package.json', './query', './source', './virtual']);
});

async function sourceFiles(directory) {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) result.push(...await sourceFiles(path));
    else if (entry.isFile() && entry.name.endsWith('.ts')) result.push(path);
  }
  return result;
}
