import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
  checkComponentPackageModel,
  validateComponentPublicApiManifest,
} from './lib/component-public-api.mjs';

const manifest = validateComponentPublicApiManifest(
  JSON.parse(await readFile('verification/component-public-api.json', 'utf8')),
);

test('component API manifest is a hand-authored exact allowlist', () => {
  assert.equal(manifest.families.meter.core.root, false);
  assert.equal(manifest.families.meter.dom.root, true);
});

test('component API checker accepts an exact package model', () => {
  const contract = manifest.families.meter.core;
  assert.deepEqual(checkComponentPackageModel(contract, {
    subpath: './meter',
    runtime: [...contract.runtime],
    types: [...contract.types],
    rootExports: [],
    imports: ['./result.js'],
    forbiddenImports: manifest.forbiddenImports.core,
    hasDefault: false,
    hasWildcard: false,
  }), []);
});

test('component API checker reports missing extra default deep and cross-layer exposure', () => {
  const contract = manifest.families.meter.vue;
  const issues = checkComponentPackageModel(contract, {
    subpath: './meter-internal',
    runtime: contract.runtime.slice(1),
    types: [...contract.types, 'MeterController'],
    rootExports: [],
    imports: ['@sectile/terminal/meter', '@sectile/dom/src/internal/meter.js'],
    forbiddenImports: manifest.forbiddenImports.vue,
    hasDefault: true,
    hasWildcard: true,
  });
  assert.ok(issues.some((issue) => issue.startsWith('subpath:')));
  assert.ok(issues.includes('runtime export missing: MeterIndicator'));
  assert.ok(issues.includes('types export unexpected: MeterController'));
  assert.ok(issues.includes('default export is forbidden'));
  assert.ok(issues.includes('wildcard export is forbidden'));
  assert.ok(issues.includes('forbidden import: @sectile/terminal/meter'));
  assert.ok(issues.includes('deep import forbidden: @sectile/dom/src/internal/meter.js'));
  assert.ok(issues.includes('root export missing: MeterRoot'));
});
