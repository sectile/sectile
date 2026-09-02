import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readdir, readFile, rm, rmdir } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  assertPackedDependencyRanges,
  assertPackedManifestMatchesSource,
  inspectPackedPackage,
} from './lib/packed-package-contract.mjs';
import { completeNpmWebAuth, parseNpmWebAuthChallenge } from './lib/npm-publish-auth.mjs';
import { assertRegistryArtifact, waitForRegistryArtifact } from './lib/npm-registry-artifact.mjs';
import { execFileSyncPortable, spawnSyncPortable } from './lib/portable-process.mjs';
import { resolveExpectedReleaseTag } from './lib/release.mjs';
import {
  isReleaseSetTag,
  releaseManifestFile,
  selectReleasePackages,
} from './lib/release-set.mjs';
import { loadPublishedPackageGraph } from './lib/workspace-graph.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const registry = 'https://registry.npmjs.org';
const expectedTag = resolveExpectedReleaseTag(undefined, process.env);
const packOnly = process.argv.includes('--pack-only');
const prepared = process.argv.includes('--prepared');
const bootstrapOnly = process.argv.includes('--bootstrap-only');
const validateOnly = process.argv.includes('--validate-only');
const packDestinationArgument = process.argv.find((argument) => argument.startsWith('--pack-destination='));
const tarballDirectoryArgument = process.argv.find((argument) => argument.startsWith('--tarball-directory='));
const packageArguments = process.argv.filter((argument) => argument.startsWith('--package='));
const packDestination = packDestinationArgument?.slice('--pack-destination='.length);
const tarballDirectory = tarballDirectoryArgument?.slice('--tarball-directory='.length);
const unexpectedArguments = process.argv.slice(2).filter((argument) => (
  argument !== '--pack-only'
  && argument !== '--prepared'
  && argument !== '--bootstrap-only'
  && argument !== '--validate-only'
  && argument !== '--'
  && argument !== packDestinationArgument
  && argument !== tarballDirectoryArgument
  && !packageArguments.includes(argument)
));

assert.deepEqual(unexpectedArguments, [], `unexpected arguments: ${unexpectedArguments.join(', ')}`);
assert.equal(packOnly && bootstrapOnly, false, 'pack-only and bootstrap-only cannot be combined');
assert.equal(prepared && !packOnly, false, '--prepared requires --pack-only');
assert.equal(validateOnly && (packOnly || bootstrapOnly), false,
  '--validate-only cannot be combined with --pack-only or --bootstrap-only');
assert.equal(packDestination !== undefined && !packOnly, false, '--pack-destination requires --pack-only');
assert.equal(tarballDirectory !== undefined && (packOnly || bootstrapOnly), false,
  '--tarball-directory cannot be combined with --pack-only or --bootstrap-only');
assert.equal(validateOnly && tarballDirectory === undefined, false, '--validate-only requires --tarball-directory');
assert.equal(packDestination === '', false, '--pack-destination requires a directory');
assert.equal(tarballDirectory === '', false, '--tarball-directory requires a directory');
if (bootstrapOnly) assert.notEqual(process.env.CI, 'true', 'first package publication requires local npm authentication');
assert.equal(
  process.env.CI && (process.env.NODE_AUTH_TOKEN || process.env.NPM_TOKEN) ? true : false,
  false,
  'CI publication must use OIDC without an npm write token',
);

function run(command, args, options = {}) {
  return execFileSyncPortable(command, args, {
    cwd: options.cwd ?? root,
    encoding: 'utf8',
    stdio: options.capture ? 'pipe' : 'inherit',
    env: options.env ?? process.env,
  })?.trim();
}

function assertSupportedNpm() {
  const version = run('npm', ['--version'], { capture: true });
  const [major, minor, patch] = version.split('.').map(Number);
  assert.equal([major, minor, patch].every(Number.isInteger), true, `invalid npm version: ${version}`);
  assert.equal(major > 11 || (major === 11 && (minor > 5 || (minor === 5 && patch >= 1))), true, `npm 11.5.1 or newer is required for trusted publishing; found ${version}`);
}

function registryMetadata(specifier, environment) {
  const result = spawnSyncPortable('npm', [
    'view', specifier, 'name', 'version', 'dist.integrity', '--json', '--prefer-online', '--registry', registry,
  ], {
    cwd: root,
    encoding: 'utf8',
    env: environment,
  });
  if (result.status === 0) return JSON.parse(result.stdout);

  const output = `${result.stdout ?? ''}\n${result.stderr ?? ''}`;
  if (/\bE404\b|404 Not Found/i.test(output)) return undefined;
  throw new Error(`failed to query ${specifier}:\n${output.trim()}`);
}

assertSupportedNpm();

const graph = await loadPublishedPackageGraph();
const allPackages = graph.order.map(({ directory, manifest, name }) => ({
  directory,
  manifest,
  name,
  packageRoot: join(root, 'packages', directory),
}));
const workspaceVersions = new Map(allPackages.map(({ manifest }) => [manifest.name, manifest.version]));
const releaseManifest = isReleaseSetTag(expectedTag)
  ? JSON.parse(await readFile(join(root, releaseManifestFile), 'utf8'))
  : undefined;
const selectedReleasePackages = selectReleasePackages(allPackages, expectedTag, releaseManifest);
const requestedPackageNames = new Set(packageArguments.map((argument) => {
  const value = argument.slice('--package='.length);
  assert.notEqual(value, '', '--package requires a package name');
  return value.startsWith('@sectile/') ? value : `@sectile/${value}`;
}));
assert.equal(requestedPackageNames.size > 0 && !packOnly, false, '--package requires --pack-only');
const packages = requestedPackageNames.size === 0
  ? selectedReleasePackages
  : selectedReleasePackages.filter(({ manifest }) => requestedPackageNames.has(manifest.name));
assert.deepEqual(
  [...requestedPackageNames].filter((name) => !packages.some(({ manifest }) => manifest.name === name)),
  [],
  'requested pack package is not a published release package',
);
for (const { manifest } of packages) {
  if (!packOnly) assert.notEqual(manifest.version, '0.0.0', `prepare ${manifest.name} before publishing`);
}
run(process.execPath, expectedTag === undefined
  ? ['scripts/check-release.mjs']
  : ['scripts/check-release.mjs', expectedTag]);
if (tarballDirectory === undefined && !prepared) {
  const buildNames = dependencyClosure(graph, packages.map(({ manifest }) => manifest.name));
  run('pnpm', [
    '--recursive',
    '--workspace-concurrency=1',
    ...graph.order.filter(({ name }) => buildNames.has(name)).flatMap(({ name }) => ['--filter', name]),
    'build',
  ]);
}

const temporaryRoot = join(root, '.tmp');
let temporaryPackRoot;
const packRoot = await createPackRoot();
await mkdir(packRoot, { recursive: true });

async function createPackRoot() {
  if (tarballDirectory !== undefined) return resolve(root, tarballDirectory);
  if (packDestination !== undefined) return resolve(root, packDestination);
  await mkdir(temporaryRoot, { recursive: true });
  temporaryPackRoot = await mkdtemp(join(temporaryRoot, 'release-packs-'));
  return temporaryPackRoot;
}

try {
  const packed = tarballDirectory === undefined
    ? await packPackages(packages, packRoot, workspaceVersions)
    : await loadPackedPackages(packages, packRoot, workspaceVersions);

  const npmEnvironment = {
    ...process.env,
    npm_config_cache: join(packRoot, 'npm-cache'),
  };
  const unregistered = packOnly || validateOnly
    ? []
    : packed.filter(({ manifest }) => registryMetadata(manifest.name, npmEnvironment) === undefined);

  if (packOnly) {
    console.log(`validated ${packed.length} package tarballs`);
  } else if (validateOnly) {
    console.log(`validated ${packed.length} downloaded package tarballs`);
  } else if (bootstrapOnly) {
    for (const { manifest, tarball } of unregistered) {
      await publishTarball(tarball, npmEnvironment);
      console.log(`bootstrapped ${manifest.name}@${manifest.version}`);
    }
    if (unregistered.length === 0) console.log('all public package names are already registered');
  } else {
    assert.deepEqual(
      unregistered.map(({ manifest }) => manifest.name),
      [],
      'unregistered packages require local `pnpm publish:packages -- --bootstrap-only` before release publication',
    );
    for (const { manifest, tarball } of packed) {
      const published = registryMetadata(`${manifest.name}@${manifest.version}`, npmEnvironment);
      if (published !== undefined) {
        await assertPublishedArtifact(published, manifest, tarball);
        console.log(`skipped ${manifest.name}@${manifest.version}; already published`);
        continue;
      }
      await publishTarball(tarball, npmEnvironment);
      await waitForPublishedArtifact(manifest, tarball, npmEnvironment);
    }
  }
} finally {
  if (temporaryPackRoot !== undefined) {
    await rm(temporaryPackRoot, { recursive: true, force: true });
    await rmdir(temporaryRoot).catch((error) => {
      if (error.code !== 'ENOTEMPTY' && error.code !== 'EEXIST') throw error;
    });
  }
}

function dependencyClosure(packageGraph, targets) {
  const closure = new Set();
  const visit = (name) => {
    if (closure.has(name)) return;
    closure.add(name);
    for (const dependency of packageGraph.byName.get(name).dependencies) visit(dependency);
  };
  for (const target of targets) visit(target);
  return closure;
}

async function assertPublishedArtifact(published, manifest, tarball) {
  assertRegistryArtifact(published, manifest, await readFile(tarball));
}

async function waitForPublishedArtifact(manifest, tarball, environment) {
  const specifier = `${manifest.name}@${manifest.version}`;
  const published = await waitForRegistryArtifact(() => registryMetadata(specifier, environment), specifier);
  await assertPublishedArtifact(published, manifest, tarball);
}

async function publishTarball(tarball, environment) {
  const arguments_ = ['publish', tarball, '--access', 'public', '--registry', registry];
  if (process.env.CI !== undefined || (process.stdin.isTTY && process.stdout.isTTY)) {
    run('npm', arguments_, { env: environment });
    return;
  }

  const result = spawnSyncPortable('npm', [...arguments_, '--json'], {
    cwd: root,
    encoding: 'utf8',
    env: environment,
    maxBuffer: 16 * 1_024 * 1_024,
  });
  if (result.error !== undefined) throw result.error;
  if (result.status === 0) {
    writeProcessOutput(result);
    return;
  }
  const challenge = parseNpmWebAuthChallenge(result.stdout, result.stderr);
  if (challenge === null) {
    writeProcessOutput(result);
    throw new Error(`npm publish failed with exit code ${result.status ?? 'unknown'}`);
  }
  const otp = await completeNpmWebAuth(challenge);
  run('npm', arguments_, { env: { ...environment, npm_config_otp: otp } });
}

function writeProcessOutput(result) {
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
}

async function packPackages(packageEntries, destination, versions) {
  const packed = [];
  for (const entry of packageEntries) {
    const before = new Set(await readdir(destination));
    run('pnpm', ['pack', '--pack-destination', destination], { cwd: entry.packageRoot, capture: true });
    const files = (await readdir(destination)).filter((file) => file.endsWith('.tgz') && !before.has(file));
    assert.equal(files.length, 1, `${entry.manifest.name} did not produce exactly one tarball`);
    const tarball = join(destination, files[0]);
    await inspectPackedPackage(tarball, { sourceManifest: entry.manifest, workspaceVersions: versions });
    packed.push({ ...entry, tarball });
  }
  return packed;
}

async function loadPackedPackages(packageEntries, directory, versions) {
  const files = (await readdir(directory)).filter((file) => file.endsWith('.tgz')).sort();
  assert.equal(files.length, packageEntries.length,
    `expected ${packageEntries.length} verified tarballs, found ${files.length}`);
  const byName = new Map(packageEntries.map((entry) => [entry.manifest.name, entry]));
  const packed = [];
  for (const file of files) {
    const tarball = join(directory, file);
    const { manifest } = await inspectPackedPackage(tarball);
    const entry = byName.get(manifest.name);
    assert.notEqual(entry, undefined, `unexpected package tarball: ${manifest.name}`);
    assert.equal(manifest.version, entry.manifest.version,
      `${manifest.name} tarball version ${manifest.version} does not match ${entry.manifest.version}`);
    assertPackedManifestMatchesSource(manifest, entry.manifest);
    assertPackedDependencyRanges(manifest, entry.manifest, versions);
    packed.push({ ...entry, tarball });
    byName.delete(manifest.name);
  }
  assert.deepEqual([...byName.keys()], [], 'verified tarball set is incomplete');
  return packed;
}
