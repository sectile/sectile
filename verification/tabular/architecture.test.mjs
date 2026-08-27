import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const architecture = JSON.parse(await readFile(
  new URL('./architecture.json', import.meta.url),
  'utf8',
));
const npmrc = await readFile(new URL('../../.npmrc', import.meta.url), 'utf8');

assert.equal(architecture.schemaVersion, 1);
assert.equal(architecture.package, '@sectile/tabular');
assert.equal(architecture.rootKind, 'type-only');
assert.deepEqual(architecture.runtimeDependencies, ['@sectile/core']);
assert.deepEqual(architecture.optionalPeers, {
  '@sectile/virtual': ['./virtual'],
});

assert.deepEqual(Object.keys(architecture.profiles).sort(), [
  'data-grid',
  'data-table',
  'data-tree-grid',
]);
assert.equal(architecture.profiles['data-table'].cellCursor, false);
assert.equal(architecture.profiles['data-grid'].hierarchy, 'rejected');
assert.equal(architecture.profiles['data-tree-grid'].hierarchy, 'core-tree-grid');
assert.equal(architecture.virtualBoundary.baseState, false);
assert.equal(architecture.virtualBoundary.baseCommand, false);
assert.equal(architecture.virtualBoundary.adapterSubpath, './virtual');
assert.equal(architecture.virtualBoundary.gridStrategy, 'partitioned-track-grid');
assert.equal(
  architecture.virtualBoundary.projectionGenerationDistinctFromVirtualGeneration,
  true,
);
assert.equal(architecture.virtualBoundary.adapterOwnsMeasurement, false);
assert.equal(architecture.virtualBoundary.adapterOwnsScrolling, false);
assert.equal(architecture.virtualBoundary.adapterOwnsRendering, false);

assert.deepEqual(architecture.extensionPolicy, {
  mechanism: 'named-state-slices-and-source-contracts',
  runtimeRegistry: false,
  untypedReducerInjection: false,
  genericLifecycle: false,
});
assert.equal(architecture.countermodels.length, 5);
assert.equal(new Set(architecture.countermodels.map(({ id }) => id)).size, 5);
assert.equal(architecture.promotionEvidence.length, 5);

for (const [name, value] of Object.entries(architecture.defaultLimits)) {
  assert.equal(Number.isSafeInteger(value) && value > 0, true, `${name} must be positive`);
}

const npmrcEntries = Object.fromEntries(npmrc
  .split(/\r?\n/u)
  .map((line) => line.trim())
  .filter((line) => line.length > 0 && !line.startsWith('#'))
  .map((line) => {
    const separator = line.indexOf('=');
    assert.notEqual(separator, -1, `invalid .npmrc entry: ${line}`);
    return [line.slice(0, separator), line.slice(separator + 1)];
  }));
assert.equal(npmrcEntries['store-dir'], '.pnpm-store');
assert.equal(npmrcEntries['verify-deps-before-run'], 'error');

console.log(JSON.stringify({
  status: 'passed',
  profiles: Object.keys(architecture.profiles).length,
  countermodels: architecture.countermodels.length,
  defaultLimits: Object.keys(architecture.defaultLimits).length,
}, null, 2));
