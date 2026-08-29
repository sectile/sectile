import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, relative, resolve, sep } from 'node:path';
import { validateSourceMapFiles } from './source-map-policy.mjs';

const dependencyFields = Object.freeze([
  'dependencies',
  'devDependencies',
  'optionalDependencies',
  'peerDependencies',
]);
const sourceManifestFields = Object.freeze([
  'name',
  'version',
  'type',
  'sideEffects',
  'files',
  'types',
  'exports',
  'publishConfig',
]);

export async function inspectPackedPackage(tarball, options = {}) {
  const entries = execFileSync('tar', ['-tzf', tarball], { encoding: 'utf8' })
    .split('\n')
    .filter(Boolean);
  validateTarballEntries(entries);
  const extractionRoot = await mkdtemp(join(tmpdir(), 'sectile-packed-package-'));
  try {
    execFileSync('tar', ['-xzf', resolve(tarball), '-C', extractionRoot], { stdio: 'pipe' });
    return await inspectPackedPackageDirectory(join(extractionRoot, 'package'), options);
  } finally {
    await rm(extractionRoot, { recursive: true, force: true });
  }
}

export async function inspectPackedPackageDirectory(packageRoot, options = {}) {
  const absolutePaths = await files(packageRoot);
  const paths = absolutePaths.map((path) => normalize(relative(packageRoot, path))).sort();
  assert.ok(paths.includes('package.json'), `${packageRoot}: packed package.json missing`);
  const manifest = JSON.parse(await readFile(join(packageRoot, 'package.json'), 'utf8'));
  const contents = new Map();
  for (const path of paths) {
    if (!path.startsWith('dist/')) continue;
    if (!path.endsWith('.js') && !path.endsWith('.d.ts') && !path.endsWith('.map')) continue;
    contents.set(path, await readFile(join(packageRoot, path), 'utf8'));
  }
  const contract = validatePackedPackageContents({ contents, manifest, paths, ...options });
  return Object.freeze({ contract, manifest, paths: Object.freeze(paths) });
}

export function validatePackedPackageContents({ contents, manifest, paths, sourceManifest }) {
  const pathSet = new Set(paths);
  assert.match(manifest.name ?? '', /^@sectile\/[a-z0-9-]+$/u, 'packed package name is invalid');
  assert.match(manifest.version ?? '', /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/u,
    `${manifest.name}: packed package version is invalid`);
  assert.equal(manifest.type, 'module', `${manifest.name}: packed package must remain ESM`);
  assert.equal(manifest.sideEffects, false, `${manifest.name}: packed package must remain side-effect free`);
  assert.deepEqual(manifest.files, ['dist'], `${manifest.name}: packed files allowlist drifted`);
  assert.equal(manifest.publishConfig?.access, 'public', `${manifest.name}: public access metadata missing`);
  assert.ok(pathSet.has('LICENSE'), `${manifest.name}: packed license missing`);
  assert.ok(pathSet.has('README.md'), `${manifest.name}: packed README missing`);
  assert.equal(
    paths.some((path) => /^(?:src|tests|type-tests|benchmarks|scripts|node_modules)(?:\/|$)/u.test(path)),
    false,
    `${manifest.name}: packed development files detected`,
  );

  const sourceMapPolicy = validateSourceMapFiles(contents);
  assert.ok(sourceMapPolicy.javascriptFiles > 0, `${manifest.name}: packed JavaScript missing`);
  assert.ok(sourceMapPolicy.declarationFiles > 0, `${manifest.name}: packed declarations missing`);
  assert.equal(sourceMapPolicy.sourceMapFiles, sourceMapPolicy.javascriptFiles,
    `${manifest.name}: every packed JavaScript file requires one source map`);

  assert.equal(typeof manifest.types, 'string', `${manifest.name}: packed types target missing`);
  assertTargetExists(pathSet, manifest.name, 'types', manifest.types);
  assert.ok(manifest.exports !== undefined, `${manifest.name}: packed exports missing`);
  for (const [label, target] of collectExportTargets(manifest.exports)) {
    assertTargetExists(pathSet, manifest.name, label, target);
  }
  for (const field of dependencyFields) {
    for (const [dependency, version] of Object.entries(manifest[field] ?? {})) {
      assert.equal(String(version).startsWith('workspace:'), false,
        `${manifest.name}: unresolved workspace protocol for ${field}.${dependency}`);
    }
  }
  if (sourceManifest !== undefined) assertPackedManifestMatchesSource(manifest, sourceManifest);
  return Object.freeze({ ...sourceMapPolicy, files: paths.length });
}

export function assertPackedManifestMatchesSource(manifest, sourceManifest) {
  for (const field of sourceManifestFields) {
    assert.deepEqual(manifest[field], sourceManifest[field],
      `${sourceManifest.name}: packed ${field} differs from source manifest`);
  }
}

export function validateTarballEntries(entries) {
  assert.ok(entries.length > 0, 'package tarball is empty');
  for (const entry of entries) {
    assert.equal(entry.startsWith('/'), false, `absolute tarball entry is forbidden: ${entry}`);
    const segments = entry.replace(/\/$/u, '').split('/');
    assert.equal(segments[0], 'package', `tarball entry must stay under package/: ${entry}`);
    assert.equal(segments.some((segment) => segment === '..'), false,
      `parent traversal in tarball entry is forbidden: ${entry}`);
  }
}

function collectExportTargets(exports, label = 'exports') {
  if (typeof exports === 'string') return [[label, exports]];
  assert.ok(exports !== null && typeof exports === 'object', `${label}: invalid export target`);
  return Object.entries(exports).flatMap(([key, value]) => collectExportTargets(value, `${label}.${key}`));
}

function assertTargetExists(paths, packageName, label, target) {
  assert.match(target, /^\.\//u, `${packageName}: ${label} target must be package-relative`);
  assert.equal(target.includes('*'), false, `${packageName}: ${label} wildcard targets require explicit validation`);
  const normalized = normalize(target.slice(2));
  assert.equal(normalized.startsWith('../'), false, `${packageName}: ${label} escapes the package`);
  assert.ok(paths.has(normalized), `${packageName}: ${label} target missing from tarball: ${target}`);
}

async function files(directory) {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    assert.equal(entry.isSymbolicLink(), false, `${resolve(directory, entry.name)}: packed symlinks are forbidden`);
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) result.push(...await files(path));
    else if (entry.isFile()) result.push(path);
  }
  return result;
}

function normalize(path) {
  return path.split(sep).join('/');
}
