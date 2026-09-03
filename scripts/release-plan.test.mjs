import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { publishedPackageDirectories } from './lib/published-packages.mjs';

const repositoryRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

test('independent release plans are read-only and isolate compatible package patches', (context) => {
  const root = releaseFixture(context);
  writeFileSync(join(root, 'packages', 'form', 'source.txt'), 'changed\n');
  git(root, ['add', '.']);
  git(root, ['commit', '-m', 'fix(form): repair validation']);
  const beforeStatus = git(root, ['status', '--short']);
  const beforeTags = git(root, ['tag', '--list']);

  const patchPlan = runRelease(root, ['--dry-run']);
  assert.match(patchPlan, /@sectile\/form: 0\.14\.1 -> 0\.14\.2/u);
  assert.doesNotMatch(patchPlan, /@sectile\/dom:/u);
  assert.equal(git(root, ['status', '--short']), beforeStatus);
  assert.equal(git(root, ['tag', '--list']), beforeTags);
  assert.equal(packageVersion(root, 'form'), '0.14.1');

  const unsupported = spawnSync(process.execPath, [
    join(root, 'scripts', 'release.mjs'), '--package', '@sectile/chart', '--dry-run',
  ], { cwd: root, encoding: 'utf8' });
  assert.equal(unsupported.status, 1);
  assert.match(unsupported.stderr, /does not accept bump or package overrides/u);
});

test('independent release plans propagate pre-1 minor dependency changes', (context) => {
  const root = releaseFixture(context);
  writeFileSync(join(root, 'packages', 'core', 'source.txt'), 'changed\n');
  git(root, ['add', '.']);
  git(root, ['commit', '-m', 'feat(core): revise package contract']);
  const plan = runRelease(root, ['--dry-run']);
  for (const directory of publishedPackageDirectories) {
    assert.match(plan, new RegExp(`@sectile/${directory}:`, 'u'), `${directory} was not propagated`);
  }
});

test('independent releases preserve commit-based bump recommendations', (context) => {
  const root = releaseFixture(context);
  writeFileSync(join(root, 'packages', 'form', 'source.txt'), 'changed\n');
  git(root, ['add', '.']);
  git(root, ['commit', '-m', 'feat(form): add validation mode']);
  const result = spawnSync(process.execPath, [join(root, 'scripts', 'release.mjs'), '--dry-run'], {
    cwd: root,
    encoding: 'utf8',
  });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /recommended bump: minor \(feat\(form\): add validation mode\)/u);
  assert.match(result.stdout, /@sectile\/form: 0\.14\.1 -> 0\.15\.0/u);
  assert.equal(result.stderr, '');
});

test('automatic release plans reject an empty package change set', (context) => {
  const root = releaseFixture(context);
  const result = spawnSync(process.execPath, [join(root, 'scripts', 'release.mjs'), '--dry-run'], {
    cwd: root,
    encoding: 'utf8',
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /no changed packages since their latest release tags/u);
});

function releaseFixture(context) {
  const root = mkdtempSync(join(tmpdir(), 'sectile-release-plan-'));
  context.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(join(root, 'scripts'), { recursive: true });
  cpSync(join(repositoryRoot, 'scripts', 'release.mjs'), join(root, 'scripts', 'release.mjs'));
  cpSync(join(repositoryRoot, 'scripts', 'lib'), join(root, 'scripts', 'lib'), { recursive: true });
  for (const directory of publishedPackageDirectories) {
    const packageRoot = join(root, 'packages', directory);
    mkdirSync(packageRoot, { recursive: true });
    const source = JSON.parse(readFileSync(join(repositoryRoot, 'packages', directory, 'package.json'), 'utf8'));
    const manifest = Object.fromEntries([
      'name', 'version', 'dependencies', 'optionalDependencies', 'peerDependencies', 'devDependencies',
    ].filter((field) => source[field] !== undefined).map((field) => [field, source[field]]));
    manifest.version = '0.14.1';
    writeFileSync(join(packageRoot, 'package.json'), `${JSON.stringify(manifest, null, 2)}\n`);
    writeFileSync(join(packageRoot, 'CHANGELOG.md'), `# ${manifest.name}\n`);
  }
  git(root, ['init', '--initial-branch=main']);
  git(root, ['config', 'user.email', 'release-test@example.com']);
  git(root, ['config', 'user.name', 'Release Test']);
  git(root, ['config', 'commit.gpgSign', 'false']);
  git(root, ['config', 'tag.gpgSign', 'false']);
  git(root, ['add', '.']);
  git(root, ['commit', '-m', 'chore(release): v0.14.1']);
  git(root, ['tag', 'v0.14.1']);
  return root;
}

function runRelease(root, args) {
  return execFileSync(process.execPath, [join(root, 'scripts', 'release.mjs'), ...args], {
    cwd: root,
    encoding: 'utf8',
  }).replaceAll('\r\n', '\n');
}

function packageVersion(root, directory) {
  return JSON.parse(readFileSync(join(root, 'packages', directory, 'package.json'), 'utf8')).version;
}

function git(root, args) {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}
