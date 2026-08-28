import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export const PACKAGE_NAMES = Object.freeze([
  'core', 'dom', 'form', 'tabular', 'temporal', 'terminal', 'virtual', 'vue',
]);

export async function deriveSurfaceFragment(repoRoot, packageName) {
  const packageRoot = resolve(repoRoot, 'packages', packageName);
  const manifest = JSON.parse(await readFile(resolve(packageRoot, 'package.json'), 'utf8'));
  const rootRuntime = await runtimeExports(packageRoot, manifest.exports['.']);
  const surfaces = [];
  for (const [subpath, target] of Object.entries(manifest.exports).sort(([left], [right]) => left.localeCompare(right))) {
    if (subpath === './package.json') {
      surfaces.push(Object.freeze({
        subpath,
        classification: 'metadata',
        platform: 'universal',
        runtimeExports: Object.freeze([]),
        typeBearing: false,
        fixtureModes: Object.freeze([]),
      }));
      continue;
    }
    assert.ok(target !== null && typeof target === 'object', `${packageName}:${subpath}: conditional export required`);
    const exports = await runtimeExports(packageRoot, target);
    const typeBearing = typeof target.types === 'string';
    const classification = classify(packageName, subpath, exports.length);
    const platform = packageName === 'terminal' && subpath === './node' ? 'node' : 'browser';
    const fixtureModes = exports.length === 0 ? [] : ['side-effect'];
    const peer = optionalPeer(packageName, subpath);
    if (shouldMeasureNamed(packageName, subpath, classification)) fixtureModes.push('named');
    if (subpath === '.') fixtureModes.push('namespace');
    const rootEquivalentExport = subpath === '.' ? null : exports.find((name) => rootRuntime.includes(name)) ?? null;
    if (rootEquivalentExport !== null && shouldMeasureRootEquivalent(packageName, subpath, classification)) {
      fixtureModes.push('root-named');
    }
    surfaces.push(Object.freeze({
      subpath,
      classification,
      platform,
      runtimeExports: Object.freeze(exports),
      typeBearing,
      optionalPeer: peer,
      rootEquivalentExport,
      fixtureModes: Object.freeze(fixtureModes),
    }));
  }
  return Object.freeze({ schemaVersion: 1, package: packageName, surfaces: Object.freeze(surfaces) });
}

export async function loadSurfaceFragments(repoRoot) {
  const fragments = [];
  for (const packageName of PACKAGE_NAMES) {
    const path = resolve(repoRoot, 'verification/consumer-bundles', packageName, 'surfaces.json');
    fragments.push(JSON.parse(await readFile(path, 'utf8')));
  }
  return Object.freeze(fragments);
}

export function validateSurfaceFragment(fragment, expected) {
  assert.equal(fragment.schemaVersion, 1, `${fragment.package}: unsupported surface schema`);
  assert.equal(fragment.package, expected.package);
  assert.deepEqual(fragment, expected, `${fragment.package}: public surface classification drifted; review and run pnpm update:consumer-surfaces`);
  return fragment;
}

export async function surfaceFragmentFiles(repoRoot) {
  const root = resolve(repoRoot, 'verification/consumer-bundles');
  return (await readdir(root, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory() && PACKAGE_NAMES.includes(entry.name))
    .map((entry) => resolve(root, entry.name, 'surfaces.json'));
}

async function runtimeExports(packageRoot, target) {
  if (target === undefined || typeof target === 'string') return [];
  const runtimeTarget = target.import ?? target.default;
  if (typeof runtimeTarget !== 'string') return [];
  const module = await import(pathToFileURL(resolve(packageRoot, runtimeTarget)).href);
  return Object.freeze(Object.keys(module).sort());
}

function classify(packageName, subpath, runtimeCount) {
  if (runtimeCount === 0) return 'type-only';
  if (subpath === '.') return 'root';
  if (packageName === 'terminal' && subpath === './node') return 'platform';
  if (optionalPeer(packageName, subpath) !== null) return 'optional-domain';
  return 'named-subpath';
}

function optionalPeer(packageName, subpath) {
  const optional = new Map([
    ['dom:./form', '@sectile/form'],
    ['dom:./tabular', '@sectile/tabular'],
    ['dom:./temporal', '@sectile/temporal'],
    ['dom:./virtual', '@sectile/virtual'],
    ['tabular:./virtual', '@sectile/virtual'],
    ['vue:./form', '@sectile/form'],
    ['vue:./tabular', '@sectile/tabular'],
    ['vue:./temporal', '@sectile/temporal'],
    ['vue:./virtual', '@sectile/virtual'],
  ]);
  return optional.get(`${packageName}:${subpath}`) ?? null;
}

function shouldMeasureNamed(packageName, subpath, classification) {
  if (classification === 'optional-domain' || classification === 'platform') return true;
  const representatives = new Set([
    'core:./sequence',
    'core:./color-picker',
    'dom:./listbox',
    'dom:./popover',
    'form:./form',
    'tabular:./data-table',
    'temporal:./calendar',
    'terminal:./listbox',
    'virtual:./linear-layout',
    'vue:./listbox',
  ]);
  return representatives.has(`${packageName}:${subpath}`);
}

function shouldMeasureRootEquivalent(packageName, subpath, classification) {
  return classification === 'named-subpath' && shouldMeasureNamed(packageName, subpath, classification);
}
