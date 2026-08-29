import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  bumpVersion,
  classifyReleaseBranch,
  filterPackageCommits,
  formatReleaseNotes,
  parseGitLog,
  parseReleaseArguments,
  parseReleaseBumpChoice,
  prependChangelog,
  recommendBump,
  releaseBumpChoices,
  resolveExpectedReleaseTag,
} from './lib/release.mjs';
import { publishedPackageDirectories } from './lib/published-packages.mjs';

const commit = (subject, body = '') => ({ hash: 'abcdef123456', shortHash: 'abcdef1', subject, body });
const root = join(dirname(fileURLToPath(import.meta.url)), '..');

test('includes every public workspace package in releases', () => {
  const publicDirectories = readdirSync(join(root, 'packages'), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((directory) => {
      const manifest = JSON.parse(readFileSync(join(root, 'packages', directory, 'package.json'), 'utf8'));
      return manifest.private !== true;
    })
    .sort();
  assert.deepEqual([...publishedPackageDirectories].sort(), publicDirectories);
});

test('release retries prepare tagged artifacts and load the complete current publication tool closure', () => {
  const workflow = readFileSync(join(root, '.github/workflows/release.yml'), 'utf8');
  const localRelease = readFileSync(join(root, 'scripts/release.mjs'), 'utf8');
  const publication = readFileSync(join(root, 'scripts/publish-packages.mjs'), 'utf8');
  const manifest = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
  for (const path of [
    'scripts/publish-packages.mjs',
    'scripts/lib/npm-publish-auth.mjs',
    'scripts/lib/packed-package-contract.mjs',
    'scripts/lib/published-packages.mjs',
    'scripts/lib/source-map-policy.mjs',
  ]) assert.ok(workflow.includes(path), `${path} is absent from publication tooling restore`);
  assert.match(publication, /parseNpmWebAuthChallenge/u);
  assert.match(publication, /completeNpmWebAuth/u);
  assert.match(publication, /npm_config_otp/u);
  assert.equal(workflow.includes('.release-artifacts'), false);
  assert.match(workflow, /--pack-destination=release-artifacts/u);
  assert.match(workflow, /path: release-artifacts\/\*\.tgz/u);
  assert.match(workflow, /--tarball-directory=release-artifacts/u);
  assert.match(workflow, /jobs:\n  prepare:/u);
  assert.match(workflow, /run: pnpm release:check/u);
  assert.match(workflow, /run: pnpm --filter @sectile\/docs build/u);
  assert.equal(workflow.includes('verify:release'), false);
  assert.equal(workflow.includes('verify:compat'), false);
  assert.equal(localRelease.includes("['verify:release']"), false);
  assert.match(localRelease, /\['add', '--', 'packages', 'pnpm-lock\.yaml'\]/u);
  assert.match(manifest.scripts['publish:packages'], /--verbose package-publication/u);
});

test('allows synchronized and fast-forwardable local release branches', () => {
  assert.equal(classifyReleaseBranch('same', 'same', true), 'synchronized');
  assert.equal(classifyReleaseBranch('local-ahead', 'remote', true), 'ahead');
  assert.equal(classifyReleaseBranch('local-diverged', 'remote', false), 'blocked');
});

test('does not mistake a workflow dispatch branch for a release tag', () => {
  assert.equal(resolveExpectedReleaseTag(undefined, {
    GITHUB_REF_NAME: 'main',
    GITHUB_REF_TYPE: 'branch',
    RELEASE_TAG: 'v0.6.0',
  }), 'v0.6.0');
  assert.equal(resolveExpectedReleaseTag(undefined, {
    GITHUB_REF_NAME: 'main',
    GITHUB_REF_TYPE: 'branch',
  }), undefined);
  assert.equal(resolveExpectedReleaseTag(undefined, {
    GITHUB_REF_NAME: 'v0.6.0',
    GITHUB_REF_TYPE: 'tag',
  }), 'v0.6.0');
  assert.equal(resolveExpectedReleaseTag('v0.7.0', {
    GITHUB_REF_NAME: 'main',
    GITHUB_REF_TYPE: 'branch',
    RELEASE_TAG: 'v0.6.0',
  }), 'v0.7.0');
});

test('recommends major for a breaking subject or body', () => {
  assert.deepEqual(recommendBump([commit('feat(core)!: replace state shape')]), {
    bump: 'major',
    reason: 'feat(core)!: replace state shape',
  });
  assert.equal(recommendBump([commit('fix: retain state', 'BREAKING CHANGE: old snapshots are invalid')]).bump, 'major');
});

test('recommends minor for a feature and patch otherwise', () => {
  assert.equal(recommendBump([commit('fix: restore focus'), commit('feat(dom): add projection')]).bump, 'minor');
  assert.equal(recommendBump([commit('fix: restore focus'), commit('docs: clarify release')]).bump, 'patch');
});

test('bumps stable synchronized versions', () => {
  assert.equal(bumpVersion('1.2.3', 'patch'), '1.2.4');
  assert.equal(bumpVersion('1.2.3', 'minor'), '1.3.0');
  assert.equal(bumpVersion('1.2.3', 'major'), '2.0.0');
  assert.throws(() => bumpVersion('1.2.3-beta.1', 'patch'));
});

test('offers every bump while keeping the recommendation optional', () => {
  assert.deepEqual(releaseBumpChoices('0.3.0', 'minor'), [
    { bump: 'patch', index: 1, version: '0.3.1', recommended: false },
    { bump: 'minor', index: 2, version: '0.4.0', recommended: true },
    { bump: 'major', index: 3, version: '1.0.0', recommended: false },
  ]);
  assert.equal(parseReleaseBumpChoice('', 'minor'), 'minor');
  assert.equal(parseReleaseBumpChoice('1', 'minor'), 'patch');
  assert.equal(parseReleaseBumpChoice('major', 'minor'), 'major');
  assert.throws(() => parseReleaseBumpChoice('automatic', 'minor'), /select patch, minor, major/u);
});

test('parses an optional dirty-worktree release guard override', () => {
  assert.deepEqual(parseReleaseArguments(['patch']), { allowDirty: false, requestedBump: 'patch' });
  assert.deepEqual(parseReleaseArguments(['--allow-dirty', 'minor']), { allowDirty: true, requestedBump: 'minor' });
  assert.deepEqual(parseReleaseArguments(['major', '--', '--allow-dirty']), { allowDirty: true, requestedBump: 'major' });
  assert.throws(() => parseReleaseArguments(['--force']), /unexpected release argument/u);
  assert.throws(() => parseReleaseArguments(['patch', 'minor']), /multiple release bumps/u);
});

test('parses git records and renders commit-based notes', () => {
  const commits = parseGitLog('abcdef123456\x1fabcdef1\x1ffeat: add field\x1fbody\x1e');
  assert.deepEqual(commits, [commit('feat: add field', 'body')]);
  assert.equal(formatReleaseNotes('v1.2.3', commits), '## Changes since v1.2.3\n\n- feat: add field (abcdef1)\n');
});

test('prepends the same commit list to a package changelog', () => {
  const changelog = '# @sectile/core\n\n## 0.1.0\n\n- Initial release.\n';
  assert.equal(
    prependChangelog(changelog, '@sectile/core', '0.2.0', [commit('feat: add field')]),
    '# @sectile/core\n\n## 0.2.0\n\n### Changes\n\n- feat: add field (abcdef1)\n\n## 0.1.0\n\n- Initial release.\n',
  );
});

test('filters package changelogs by changed package paths', () => {
  const coreCommit = commit('feat(core): add field');
  const vueCommit = { ...commit('fix(vue): project field'), hash: 'bbbbbb123456', shortHash: 'bbbbbb1' };
  const metadataCommit = { ...commit('docs: repair changelog'), hash: 'cccccc123456', shortHash: 'cccccc1' };
  const paths = new Map([
    [coreCommit.hash, ['packages/core/src/field.ts', 'packages/core/CHANGELOG.md']],
    [vueCommit.hash, ['packages/vue/src/field.ts']],
    [metadataCommit.hash, ['packages/core/CHANGELOG.md']],
  ]);
  assert.deepEqual(filterPackageCommits([coreCommit, vueCommit, metadataCommit], 'core', paths), [coreCommit]);
  assert.deepEqual(filterPackageCommits([coreCommit, vueCommit, metadataCommit], 'vue', paths), [vueCommit]);
});

test('writes an explicit empty package release entry', () => {
  const changelog = '# @sectile/core\n\n## 0.1.0\n\n- Initial release.\n';
  assert.equal(
    prependChangelog(changelog, '@sectile/core', '0.2.0', []),
    '# @sectile/core\n\n## 0.2.0\n\n### Changes\n\n- No package-specific changes.\n\n## 0.1.0\n\n- Initial release.\n',
  );
});
