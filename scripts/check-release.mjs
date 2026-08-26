import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { publishedPackageDirectories } from './lib/published-packages.mjs';
import { resolveExpectedReleaseTag } from './lib/release.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const packageDirectories = publishedPackageDirectories;
const expectedNames = packageDirectories.map((directory) => `@sectile/${directory}`);
const expectedTag = resolveExpectedReleaseTag(process.argv[2], process.env);
const expectedRepository = process.env.GITHUB_REPOSITORY;
const semverPattern = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
const rootLicense = await readFile(join(root, 'LICENSE'), 'utf8');

function githubRepository(url) {
  if (typeof url !== 'string') return undefined;
  const match = url.match(/github\.com[/:]([^/]+)\/([^/#]+?)(?:\.git)?$/i);
  return match === null ? undefined : `${match[1]}/${match[2]}`;
}

const packages = await Promise.all(packageDirectories.map(async (directory) => {
  const packageRoot = join(root, 'packages', directory);
  const manifest = JSON.parse(await readFile(join(packageRoot, 'package.json'), 'utf8'));
  const license = await readFile(join(packageRoot, 'LICENSE'), 'utf8');
  return { directory, manifest, license };
}));

assert.deepEqual(packages.map(({ manifest }) => manifest.name), expectedNames);
assert.equal(new Set(packages.map(({ manifest }) => manifest.version)).size, 1, 'published packages must use one synchronized version');

const version = packages[0].manifest.version;
assert.match(version, semverPattern, `invalid stable version: ${version}`);

for (const { directory, manifest, license } of packages) {
  assert.notEqual(manifest.private, true, `${manifest.name} is private`);
  assert.equal(manifest.license, 'MIT', `${manifest.name} must use the MIT license`);
  assert.equal(manifest.publishConfig?.access, 'public', `${manifest.name} must publish with public access`);
  assert.equal(manifest.sideEffects, false, `${manifest.name} must remain side-effect free`);
  assert.deepEqual(manifest.files, ['dist'], `${manifest.name} has an unexpected package footprint`);
  assert.equal(license, rootLicense, `packages/${directory}/LICENSE differs from the root license`);

  if (expectedTag !== undefined) {
    assert.equal(manifest.repository?.type, 'git', `${manifest.name} requires git repository metadata`);
    assert.equal(manifest.repository?.directory, `packages/${directory}`, `${manifest.name} has the wrong repository directory`);
    const actualRepository = githubRepository(manifest.repository?.url);
    assert.notEqual(actualRepository, undefined, `${manifest.name} requires a GitHub repository URL`);
    if (expectedRepository !== undefined) {
      assert.equal(actualRepository.toLowerCase(), expectedRepository.toLowerCase(), `${manifest.name} repository does not match ${expectedRepository}`);
    }
  }
}

if (expectedTag !== undefined) {
  assert.equal(expectedTag, `v${version}`, `release tag ${expectedTag} does not match package version ${version}`);
}

console.log(`release metadata valid for @sectile/* ${version}`);
