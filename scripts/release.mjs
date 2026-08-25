import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  bumpVersion,
  classifyReleaseBranch,
  formatCommitList,
  formatReleaseNotes,
  parseGitLog,
  parseStableVersion,
  prependChangelog,
  recommendBump,
} from './lib/release.mjs';
import { publishedPackageDirectories } from './lib/published-packages.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const packageDirectories = publishedPackageDirectories;
const packages = packageDirectories.map((directory) => ({
  directory,
  manifestPath: join(root, 'packages', directory, 'package.json'),
  changelogPath: join(root, 'packages', directory, 'CHANGELOG.md'),
}));
const argumentsWithoutSeparator = process.argv.slice(2).filter((argument) => argument !== '--');
assert.ok(argumentsWithoutSeparator.length <= 1, `unexpected arguments: ${argumentsWithoutSeparator.join(', ')}`);
const requestedBump = argumentsWithoutSeparator[0];
if (requestedBump !== undefined) assert.match(requestedBump, /^(patch|minor|major)$/, `invalid release bump: ${requestedBump}`);

function run(command, args, options = {}) {
  return execFileSync(command, args, {
    cwd: root,
    encoding: 'utf8',
    input: options.input,
    stdio: options.capture || options.input !== undefined ? ['pipe', 'pipe', 'pipe'] : 'inherit',
  })?.trim();
}

function isAncestor(ancestor, descendant) {
  const result = spawnSync('git', ['merge-base', '--is-ancestor', ancestor, descendant], {
    cwd: root,
    encoding: 'utf8',
  });
  assert.ok(
    result.status === 0 || result.status === 1,
    `failed to compare ${ancestor} and ${descendant}: ${(result.stderr ?? '').trim()}`,
  );
  return result.status === 0;
}

function synchronizedVersion() {
  const versions = packages.map(({ manifestPath }) => JSON.parse(readFileSync(manifestPath, 'utf8')).version);
  assert.equal(new Set(versions).size, 1, `package versions differ: ${versions.join(', ')}`);
  parseStableVersion(versions[0]);
  return versions[0];
}

function githubRepository(remote) {
  const match = remote.match(/github\.com[/:]([^/]+)\/([^/#]+?)(?:\.git)?$/i);
  assert.notEqual(match, null, `origin must be a GitHub repository: ${remote}`);
  return `${match[1]}/${match[2]}`;
}

function latestPublishedTag(repository) {
  const result = spawnSync('gh', ['release', 'view', '--repo', repository, '--json', 'tagName', '--jq', '.tagName'], {
    cwd: root,
    encoding: 'utf8',
  });
  assert.equal(
    result.status,
    0,
    `no published GitHub release found; publish and tag v${synchronizedVersion()} manually before using pnpm release`,
  );
  const tag = result.stdout.trim();
  assert.match(tag, /^v(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/, `latest GitHub release is not a stable tag: ${tag}`);
  return tag;
}

function updatePackages(version, commits) {
  for (const { manifestPath, changelogPath } of packages) {
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    manifest.version = version;
    writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
    const changelog = readFileSync(changelogPath, 'utf8');
    writeFileSync(changelogPath, prependChangelog(changelog, manifest.name, version, commits));
  }
}

assert.equal(run('git', ['branch', '--show-current'], { capture: true }), 'main', 'release must run from main');
assert.equal(run('git', ['status', '--porcelain=v1', '--untracked-files=all'], { capture: true }), '', 'release requires a clean worktree');
const repository = githubRepository(run('git', ['remote', 'get-url', 'origin'], { capture: true }));
for (const { manifestPath } of packages) {
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  assert.equal(githubRepository(manifest.repository?.url).toLowerCase(), repository.toLowerCase(), `${manifest.name} repository must match origin`);
}

run('git', ['fetch', 'origin', 'main', '--tags']);
const localHead = run('git', ['rev-parse', 'HEAD'], { capture: true });
const remoteHead = run('git', ['rev-parse', 'origin/main'], { capture: true });
const branchState = classifyReleaseBranch(localHead, remoteHead, isAncestor('origin/main', 'HEAD'));
assert.notEqual(branchState, 'blocked', 'local main must contain origin/main; fetch and reconcile remote changes before release');

const baseTag = latestPublishedTag(repository);
const previousVersion = baseTag.slice(1);
assert.equal(synchronizedVersion(), previousVersion, `package version must match the last published release ${baseTag}`);
run('git', ['rev-parse', '--verify', `refs/tags/${baseTag}^{commit}`], { capture: true });
run('git', ['merge-base', '--is-ancestor', baseTag, 'HEAD'], { capture: true });

const log = run('git', ['log', '--format=%H%x1f%h%x1f%s%x1f%b%x1e', `${baseTag}..HEAD`], { capture: true });
const commits = parseGitLog(log);
if (commits.length === 0) {
  console.log(`no commits since ${baseTag}; nothing to release`);
  process.exit(0);
}

const recommendation = recommendBump(commits);
const releaseBump = requestedBump ?? recommendation.bump;
const version = bumpVersion(previousVersion, releaseBump);
const tag = `v${version}`;

console.log(`release base: ${baseTag}`);
console.log(`release branch: ${branchState}`);
console.log(`commits:\n${formatCommitList(commits)}`);
console.log(`recommended bump: ${recommendation.bump} (${recommendation.reason})`);
if (requestedBump !== undefined) console.log(`override bump: ${requestedBump}`);
console.log(`release tag: ${tag}`);

assert.equal(run('git', ['tag', '--list', tag], { capture: true }), '', `${tag} already exists locally`);
assert.equal(run('git', ['ls-remote', '--tags', 'origin', `refs/tags/${tag}`], { capture: true }), '', `${tag} already exists on origin`);
run('pnpm', ['verify']);
updatePackages(version, commits);
run('pnpm', ['install', '--lockfile-only']);
run('pnpm', ['update:tree']);
run('pnpm', ['release:check', tag]);
run('pnpm', ['verify']);
run('git', ['add', '--', 'packages', 'pnpm-lock.yaml', 'TREE.txt']);
run('git', ['commit', '-m', `chore(release): ${tag}`]);
const notes = `Sectile ${tag}\n\n${formatReleaseNotes(baseTag, commits)}`;
run('git', ['tag', '-a', tag, '-F', '-'], { input: notes });
run('git', ['push', '--atomic', 'origin', 'main', `refs/tags/${tag}`]);
console.log(`released ${tag} from ${repository}; npm publication continues in GitHub Actions through OIDC`);
