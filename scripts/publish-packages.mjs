import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, readdir, readFile, rm, rmdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const packageDirectories = ['core', 'dom', 'terminal'];
const registry = 'https://registry.npmjs.org';
const packOnly = process.argv.includes('--pack-only');
const unexpectedArguments = process.argv.slice(2).filter((argument) => argument !== '--pack-only' && argument !== '--');

assert.deepEqual(unexpectedArguments, [], `unexpected arguments: ${unexpectedArguments.join(', ')}`);
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
}

function isPublished(name, version) {
  const result = spawnSync('npm', ['view', `${name}@${version}`, 'version', '--json', '--registry', registry], {
    cwd: root,
    encoding: 'utf8',
  });
  if (result.status === 0) return true;

  const output = `${result.stdout ?? ''}\n${result.stderr ?? ''}`;
  if (/\bE404\b|404 Not Found/i.test(output)) return false;
  throw new Error(`failed to query ${name}@${version}:\n${output.trim()}`);
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
run('node', packOnly ? ['scripts/check-release.mjs'] : ['scripts/check-release.mjs', `v${version}`]);
run('pnpm', [
  '--recursive',
  '--filter', '@sectile/core',
  '--filter', '@sectile/dom',
  '--filter', '@sectile/terminal',
  'build',
]);

const temporaryRoot = join(root, '.tmp');
await mkdir(temporaryRoot, { recursive: true });
const packRoot = await mkdtemp(join(temporaryRoot, 'release-packs-'));

try {
  const packed = [];
  for (const entry of packages) {
    const before = new Set(await readdir(packRoot));
    run('pnpm', ['pack', '--pack-destination', packRoot], { cwd: entry.packageRoot });
    const files = (await readdir(packRoot)).filter((file) => file.endsWith('.tgz') && !before.has(file));
    assert.equal(files.length, 1, `${entry.manifest.name} did not produce exactly one tarball`);
    const tarball = join(packRoot, files[0]);
    assertPackedDistribution(entry.manifest.name, tarball);
    packed.push({ ...entry, tarball });
  }

  if (packOnly) {
    console.log(`validated ${packed.length} package tarballs for ${version}`);
  } else {
    for (const { manifest, tarball } of packed) {
      if (isPublished(manifest.name, manifest.version)) {
        console.log(`skipped ${manifest.name}@${manifest.version}; already published`);
        continue;
      }
      run('npm', ['publish', tarball, '--access', 'public', '--registry', registry]);
    }
  }
} finally {
  await rm(packRoot, { recursive: true, force: true });
  await rmdir(temporaryRoot).catch((error) => {
    if (error.code !== 'ENOTEMPTY' && error.code !== 'EEXIST') throw error;
  });
}
