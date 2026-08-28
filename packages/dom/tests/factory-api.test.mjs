import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import packageManifest from '../package.json' with { type: 'json' };

const excludedSubpaths = new Set(['./package.json', './temporal', './virtual']);

test('every public DOM component exposes direct and fallible factories', async () => {
  const rootModule = await import('../dist/index.js');
  for (const subpath of Object.keys(packageManifest.exports)) {
    if (!subpath.startsWith('./') || excludedSubpaths.has(subpath)) continue;
    const component = subpath.slice(2);
    const name = component === 'grid' ? 'GridControl' : component
      .split('-')
      .map((part) => `${part[0].toUpperCase()}${part.slice(1)}`)
      .join('');
    const module = await import(`../dist/${component}.js`);
    assert.equal(typeof module[`create${name}`], 'function', `${subpath} create factory`);
    assert.equal(typeof module[`tryCreate${name}`], 'function', `${subpath} tryCreate factory`);
    assert.equal(typeof rootModule[`create${name}`], 'function', `root create${name} export`);
    assert.equal(typeof rootModule[`tryCreate${name}`], 'function', `root tryCreate${name} export`);
  }
});

test('virtualization is exposed only through its optional subpath', async () => {
  assert.equal(packageManifest.dependencies?.['@sectile/virtual'], undefined);
  assert.equal(packageManifest.peerDependencies?.['@sectile/virtual'], 'workspace:*');
  assert.equal(packageManifest.peerDependenciesMeta?.['@sectile/virtual']?.optional, true);

  const rootModule = await import('../dist/index.js');
  assert.equal(rootModule.createVirtualizer, undefined);
  assert.equal(rootModule.virtualContentStyle, undefined);

  const virtualModule = await import('../dist/virtual.js');
  assert.equal(typeof virtualModule.createVirtualizer, 'function');

  const virtualSource = await readFile(new URL('../dist/virtual.js', import.meta.url), 'utf8');
  assert.match(virtualSource, /@sectile\/virtual/);
});

test('temporal controls are exposed only through their optional subpath', async () => {
  assert.equal(packageManifest.dependencies?.['@sectile/temporal'], undefined);
  assert.equal(packageManifest.peerDependencies?.['@sectile/temporal'], 'workspace:*');
  assert.equal(packageManifest.peerDependenciesMeta?.['@sectile/temporal']?.optional, true);

  const rootModule = await import('../dist/index.js');
  assert.equal(rootModule.createDateField, undefined);
  assert.equal(rootModule.createCalendar, undefined);

  const temporalModule = await import('../dist/temporal.js');
  assert.equal(typeof temporalModule.createDateField, 'function');
  assert.equal(typeof temporalModule.createCalendar, 'function');

  const temporalSource = await readFile(new URL('../dist/temporal.js', import.meta.url), 'utf8');
  assert.match(temporalSource, /@sectile\/temporal/);
});
