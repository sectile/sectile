import assert from 'node:assert/strict';
import test from 'node:test';
import packageManifest from '../package.json' with { type: 'json' };

const excludedSubpaths = new Set([
  './keyboard',
  './layout',
  './node',
  './package.json',
]);

test('every public terminal component exposes direct and fallible factories', async () => {
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
