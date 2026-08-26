import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, readdir, readFile, rm, rmdir } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { publishedPackageDirectories } from './lib/published-packages.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const packageDirectories = publishedPackageDirectories;
const registry = 'https://registry.npmjs.org';
const packOnly = process.argv.includes('--pack-only');
const bootstrapOnly = process.argv.includes('--bootstrap-only');
const validateOnly = process.argv.includes('--validate-only');
const packDestinationArgument = process.argv.find((argument) => argument.startsWith('--pack-destination='));
const tarballDirectoryArgument = process.argv.find((argument) => argument.startsWith('--tarball-directory='));
const packDestination = packDestinationArgument?.slice('--pack-destination='.length);
const tarballDirectory = tarballDirectoryArgument?.slice('--tarball-directory='.length);
const unexpectedArguments = process.argv.slice(2).filter((argument) => (
  argument !== '--pack-only'
  && argument !== '--bootstrap-only'
  && argument !== '--validate-only'
  && argument !== '--'
  && argument !== packDestinationArgument
  && argument !== tarballDirectoryArgument
));

assert.deepEqual(unexpectedArguments, [], `unexpected arguments: ${unexpectedArguments.join(', ')}`);
assert.equal(packOnly && bootstrapOnly, false, 'pack-only and bootstrap-only cannot be combined');
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
  return execFileSync(command, args, {
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

function assertPackedDistribution(name, tarball) {
  const entries = run('tar', ['-tzf', tarball], { capture: true }).split('\n');
  const contains = (extension) => entries.some((entry) => /^(?:package\/)?dist\//.test(entry) && entry.endsWith(extension));
  assert.equal(contains('.js'), true, `${name} tarball does not contain built JavaScript`);
  assert.equal(contains('.d.ts'), true, `${name} tarball does not contain declarations`);
  assert.equal(contains('.js.map'), true, `${name} tarball does not contain JavaScript source maps`);
  assert.equal(contains('.d.ts.map'), true, `${name} tarball does not contain declaration source maps`);
  assert.equal(entries.some((entry) => /^(?:package\/)?(?:src|tests|benchmarks)\//u.test(entry)), false,
    `${name} tarball contains development sources`);
}

function registryContains(specifier, environment) {
  const result = spawnSync('npm', ['view', specifier, 'name', '--json', '--registry', registry], {
    cwd: root,
    encoding: 'utf8',
    env: environment,
  });
  if (result.status === 0) return true;

  const output = `${result.stdout ?? ''}\n${result.stderr ?? ''}`;
  if (/\bE404\b|404 Not Found/i.test(output)) return false;
  throw new Error(`failed to query ${specifier}:\n${output.trim()}`);
}

assertSupportedNpm();

const packages = await Promise.all(packageDirectories.map(async (directory) => {
  const packageRoot = join(root, 'packages', directory);
  const manifest = JSON.parse(await readFile(join(packageRoot, 'package.json'), 'utf8'));
  return { directory, packageRoot, manifest };
}));

const versions = new Set(packages.map(({ manifest }) => manifest.version));
assert.equal(versions.size, 1, 'package versions must be synchronized');
const version = packages[0].manifest.version;
if (!packOnly) assert.notEqual(version, '0.0.0', 'prepare the initial package version before publishing');
run('node', ['scripts/check-release.mjs', `v${version}`]);
if (tarballDirectory === undefined) {
  run('pnpm', [
    '--recursive',
    '--workspace-concurrency=1',
    ...packages.flatMap(({ manifest }) => ['--filter', manifest.name]),
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
    ? await packPackages(packages, packRoot)
    : await loadPackedPackages(packages, packRoot);

  const npmEnvironment = {
    ...process.env,
    npm_config_cache: join(packRoot, 'npm-cache'),
  };
  const unregistered = packOnly || validateOnly
    ? []
    : packed.filter(({ manifest }) => !registryContains(manifest.name, npmEnvironment));

  if (packOnly) {
    console.log(`validated ${packed.length} package tarballs for ${version}`);
  } else if (validateOnly) {
    console.log(`validated ${packed.length} downloaded package tarballs for ${version}`);
  } else if (bootstrapOnly) {
    for (const { manifest, tarball } of unregistered) {
      run('npm', ['publish', tarball, '--access', 'public', '--registry', registry], { env: npmEnvironment });
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
      if (registryContains(`${manifest.name}@${manifest.version}`, npmEnvironment)) {
        console.log(`skipped ${manifest.name}@${manifest.version}; already published`);
        continue;
      }
      run('npm', ['publish', tarball, '--access', 'public', '--registry', registry], { env: npmEnvironment });
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

async function packPackages(packageEntries, destination) {
  const packed = [];
  for (const entry of packageEntries) {
    const before = new Set(await readdir(destination));
    run('pnpm', ['pack', '--pack-destination', destination], { cwd: entry.packageRoot, capture: true });
    const files = (await readdir(destination)).filter((file) => file.endsWith('.tgz') && !before.has(file));
    assert.equal(files.length, 1, `${entry.manifest.name} did not produce exactly one tarball`);
    const tarball = join(destination, files[0]);
    assertPackedDistribution(entry.manifest.name, tarball);
    packed.push({ ...entry, tarball });
  }
  return packed;
}

async function loadPackedPackages(packageEntries, directory) {
  const files = (await readdir(directory)).filter((file) => file.endsWith('.tgz')).sort();
  assert.equal(files.length, packageEntries.length,
    `expected ${packageEntries.length} verified tarballs, found ${files.length}`);
  const byName = new Map(packageEntries.map((entry) => [entry.manifest.name, entry]));
  const packed = [];
  for (const file of files) {
    const tarball = join(directory, file);
    const manifest = JSON.parse(run('tar', ['-xOzf', tarball, 'package/package.json'], { capture: true }));
    const entry = byName.get(manifest.name);
    assert.notEqual(entry, undefined, `unexpected package tarball: ${manifest.name}`);
    assert.equal(manifest.version, entry.manifest.version,
      `${manifest.name} tarball version ${manifest.version} does not match ${entry.manifest.version}`);
    assertPackedDistribution(manifest.name, tarball);
    packed.push({ ...entry, tarball });
    byName.delete(manifest.name);
  }
  assert.deepEqual([...byName.keys()], [], 'verified tarball set is incomplete');
  return packed;
}
