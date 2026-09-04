import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  bumpVersion,
  classifyReleaseBranch,
  filterPackageCommits,
  formatIndependentReleaseNotes,
  formatReleaseNotes,
  parseGitLog,
  parseReleaseArguments,
  parseReleaseConfirmation,
  prependChangelog,
  recommendBump,
  resolveExpectedReleaseTag,
  selectReleaseTrack,
  shouldPromptForRelease,
} from './lib/release.mjs';
import {
  assertIndependentDependencyProtocols,
  assertSynchronizedReleaseBase,
  caretAccepts,
  createPackageTag,
  createReleaseManifest,
  createReleaseSetTag,
  formatReleaseTitle,
  isReleaseSetTag,
  planIndependentVersions,
  releaseSetDate,
  releaseSetSequence,
  selectReleasePackages,
  validateReleaseManifest,
} from './lib/release-set.mjs';
import { publishedPackageDirectories } from './lib/published-packages.mjs';

const commit = (subject, body = '') => ({ hash: 'abcdef123456', shortHash: 'abcdef1', subject, body });
const root = join(dirname(fileURLToPath(import.meta.url)), '..');

test('includes release metadata for every public workspace package', () => {
  const publicDirectories = readdirSync(join(root, 'packages'), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((directory) => {
      const manifest = JSON.parse(readFileSync(join(root, 'packages', directory, 'package.json'), 'utf8'));
      return manifest.private !== true;
    })
    .sort();
  assert.deepEqual([...publishedPackageDirectories].sort(), publicDirectories);
  for (const directory of publicDirectories) {
    const manifest = JSON.parse(readFileSync(join(root, 'packages', directory, 'package.json'), 'utf8'));
    const changelog = readText(join(root, 'packages', directory, 'CHANGELOG.md'));
    assert.equal(changelog.startsWith(`# ${manifest.name}\n`), true, `${manifest.name} requires a package changelog`);
  }
});

test('release retries prepare tagged artifacts and load the complete current publication tool closure', () => {
  const workflow = readText(join(root, '.github/workflows/release.yml'));
  const localRelease = readText(join(root, 'scripts/release.mjs'));
  const publication = readText(join(root, 'scripts/publish-packages.mjs'));
  const manifest = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
  for (const path of [
    'scripts/publish-packages.mjs',
    'scripts/release-metadata.mjs',
    'scripts/lib/npm-registry-artifact.mjs',
    'scripts/lib/npm-publish-auth.mjs',
    'scripts/lib/packed-package-contract.mjs',
    'scripts/lib/portable-process.mjs',
    'scripts/lib/published-packages.mjs',
    'scripts/lib/release.mjs',
    'scripts/lib/release-set.mjs',
    'scripts/lib/repository.mjs',
    'scripts/lib/source-map-policy.mjs',
    'scripts/lib/workspace-graph.mjs',
  ]) assert.ok(workflow.includes(path), `${path} is absent from publication tooling restore`);
  assert.match(publication, /parseNpmWebAuthChallenge/u);
  assert.match(publication, /completeNpmWebAuth/u);
  assert.match(publication, /npm_config_otp/u);
  assert.equal(workflow.includes('.release-artifacts'), false);
  assert.match(workflow, /--pack-destination=release-artifacts/u);
  assert.match(workflow, /path: release-artifacts\/\*\.tgz/u);
  assert.match(workflow, /--tarball-directory=release-artifacts/u);
  assert.ok(workflow.includes('node scripts/release-metadata.mjs title "$RELEASE_TAG"'));
  assert.ok(workflow.includes('--notes-from-tag --title "$RELEASE_TITLE"'));
  assert.match(workflow, /jobs:\n  prepare:/u);
  assert.match(workflow, /run: pnpm release:check/u);
  assert.ok(workflow.includes('run: pnpm --recursive --workspace-concurrency=1 --filter @sectile/docs^... build'));
  assert.match(workflow, /run: pnpm --filter @sectile\/docs build/u);
  assert.equal(workflow.includes('verify:release'), false);
  assert.equal(workflow.includes('verify:compat'), false);
  assert.equal(localRelease.includes("['verify:release']"), false);
  assert.match(localRelease, /\['add', '--', 'packages', 'pnpm-lock\.yaml'\]/u);
  assert.match(manifest.scripts['publish:packages'], /--verbose package-publication/u);
});

function readText(path) {
  return readFileSync(path, 'utf8').replaceAll('\r\n', '\n');
}

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

test('keeps breaking changes on 0.x within the minor line and uses major after 1.0', () => {
  const breaking = [commit('feat(core)!: replace state shape')];
  assert.deepEqual(recommendBump(breaking, '0.14.2'), {
    bump: 'minor',
    reason: 'feat(core)!: replace state shape',
  });
  assert.deepEqual(recommendBump(breaking, '1.4.2'), {
    bump: 'major',
    reason: 'feat(core)!: replace state shape',
  });
  assert.equal(recommendBump([
    commit('fix: retain state', 'BREAKING CHANGE: old snapshots are invalid'),
  ], '0.14.2').bump, 'minor');
});

test('recommends minor for a feature and patch otherwise', () => {
  assert.equal(recommendBump([commit('fix: restore focus'), commit('feat(dom): add projection')], '0.14.2').bump, 'minor');
  assert.equal(recommendBump([commit('fix: restore focus'), commit('docs: clarify release')], '0.14.2').bump, 'patch');
});

test('bumps stable synchronized versions', () => {
  assert.equal(bumpVersion('1.2.3', 'patch'), '1.2.4');
  assert.equal(bumpVersion('1.2.3', 'minor'), '1.3.0');
  assert.equal(bumpVersion('1.2.3', 'major'), '2.0.0');
  assert.throws(() => bumpVersion('1.2.3-beta.1', 'patch'));
});

test('release confirmation accepts yes and defaults to cancellation', () => {
  assert.equal(parseReleaseConfirmation('y'), true);
  assert.equal(parseReleaseConfirmation('YES'), true);
  assert.equal(parseReleaseConfirmation(''), false);
  assert.equal(parseReleaseConfirmation('n'), false);
  assert.equal(parseReleaseConfirmation('no'), false);
  assert.throws(() => parseReleaseConfirmation('maybe'), /answer y or n/u);
});

test('release accepts only workflow control flags', () => {
  assert.deepEqual(parseReleaseArguments([]), { allowDirty: false, dryRun: false, yes: false });
  assert.deepEqual(parseReleaseArguments(['--allow-dirty']), { allowDirty: true, dryRun: false, yes: false });
  assert.deepEqual(parseReleaseArguments(['--dry-run']), { allowDirty: false, dryRun: true, yes: false });
  assert.deepEqual(parseReleaseArguments(['--yes']), { allowDirty: false, dryRun: false, yes: true });
  assert.deepEqual(parseReleaseArguments(['--allow-dirty', '--yes']), { allowDirty: true, dryRun: false, yes: true });
  assert.deepEqual(parseReleaseArguments(['--', '--yes']), { allowDirty: false, dryRun: false, yes: true });
  for (const args of [
    ['patch'],
    ['minor'],
    ['--package', '@sectile/form'],
    ['--bump', 'minor'],
    ['--reason', 'repair package metadata'],
    ['--force'],
  ]) {
    assert.throws(() => parseReleaseArguments(args), /does not accept bump or package overrides|unexpected release argument/u);
  }
});

test('release --yes bypasses only the interactive confirmation requirement', () => {
  assert.equal(shouldPromptForRelease(true, false, false), false);
  assert.equal(shouldPromptForRelease(false, true, true), true);
  assert.throws(
    () => shouldPromptForRelease(false, false, false),
    /interactive terminal.*--yes/u,
  );
});

test('switches the default release command to independent tracking after the bridge', () => {
  assert.equal(selectReleaseTrack(false, false), 'synchronized');
  assert.equal(selectReleaseTrack(false, true), 'independent');
  assert.equal(selectReleaseTrack(true, false), 'independent');
});

test('parses git records and renders commit-based notes', () => {
  const commits = parseGitLog('abcdef123456\x1fabcdef1\x1ffeat: add field\x1fbody\x1e');
  assert.deepEqual(commits, [commit('feat: add field', 'body')]);
  assert.equal(formatReleaseNotes('v1.2.3', commits), '## Changes since v1.2.3\n\n- feat: add field (abcdef1)\n');
});

test('independent release notes retain package transitions and unique commit subjects', () => {
  const shared = commit('feat(dom): add presence');
  const vue = { ...commit('fix(vue): retain exit node'), hash: 'bbbbbb123456', shortHash: 'bbbbbb1' };
  assert.equal(formatIndependentReleaseNotes('release-2026-09-04.1', [
    {
      name: '@sectile/dom', previousVersion: '0.14.1', version: '0.14.2', commits: [shared],
    },
    {
      name: '@sectile/vue', previousVersion: '0.14.1', version: '0.14.2', commits: [shared, vue],
    },
  ]), [
    'Sectile release-2026-09-04.1',
    '',
    '## Packages',
    '',
    '- @sectile/dom: 0.14.1 -> 0.14.2',
    '- @sectile/vue: 0.14.1 -> 0.14.2',
    '',
    '## Changes',
    '',
    '- feat(dom): add presence (abcdef1)',
    '- fix(vue): retain exit node (bbbbbb1)',
    '',
  ].join('\n'));
});

test('prepends the same commit list to a package changelog', () => {
  const changelog = '# @sectile/core\n\n## 0.1.0\n\n- Initial release.\n';
  assert.equal(
    prependChangelog(changelog, '@sectile/core', '0.2.0', [commit('feat: add field')]),
    '# @sectile/core\n\n## 0.2.0\n\n### Changes\n\n- feat: add field (abcdef1)\n\n## 0.1.0\n\n- Initial release.\n',
  );
});

test('creates the first release entry from a seeded package changelog', () => {
  assert.equal(
    prependChangelog('# @sectile/chart\n', '@sectile/chart', '0.12.0', [commit('feat(chart): add plots')]),
    '# @sectile/chart\n\n## 0.12.0\n\n### Changes\n\n- feat(chart): add plots (abcdef1)\n',
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

test('creates readable release-set tags while accepting legacy release-set tags', () => {
  const date = new Date('2026-09-01T01:02:03.000Z');
  assert.equal(createReleaseSetTag(date), 'release-2026-09-01.1');
  assert.equal(createReleaseSetTag(date, 3), 'release-2026-09-01.3');
  assert.equal(isReleaseSetTag('release-2026-09-01.3'), true);
  assert.equal(isReleaseSetTag('release-20260901010203'), true);
  assert.equal(releaseSetDate('release-2026-09-01.3'), '2026-09-01');
  assert.equal(releaseSetDate('release-20260901010203'), '2026-09-01');
  assert.equal(releaseSetSequence('release-2026-09-01.3'), 3);
  assert.equal(releaseSetSequence('release-20260901010203'), null);
  assert.throws(() => createReleaseSetTag(date, 0), /positive integer/u);
  assert.equal(createPackageTag('@sectile/form', '0.14.2'), '@sectile/form@0.14.2');
  assert.throws(() => createPackageTag('@other/form', '0.14.2'), /invalid package name/u);
  assert.doesNotThrow(() => assertSynchronizedReleaseBase('v0.14.0'));
  assert.throws(() => assertSynchronizedReleaseBase('v0.14.1'), /synchronized releases ended/u);
  assert.throws(() => assertSynchronizedReleaseBase('release-20260901010203'), /not a legacy stable tag/u);
});

test('formats compact GitHub release titles by package count', () => {
  assert.equal(formatReleaseTitle({
    releaseTag: 'release-2026-09-04.1',
    packages: [{ name: '@sectile/dom', version: '0.14.2' }],
  }), 'dom v0.14.2');
  assert.equal(formatReleaseTitle({
    releaseTag: 'release-2026-09-04.2',
    packages: [
      { name: '@sectile/dom', version: '0.14.2' },
      { name: '@sectile/vue', version: '0.15.0' },
    ],
  }), 'dom v0.14.2 + vue v0.15.0');
  assert.equal(formatReleaseTitle({
    releaseTag: 'release-2026-09-04.3',
    packages: [
      { name: '@sectile/core', version: '0.15.0' },
      { name: '@sectile/dom', version: '0.14.2' },
      { name: '@sectile/vue', version: '0.15.0' },
    ],
  }), '3 packages · 2026-09-04');
  assert.equal(formatReleaseTitle({
    releaseTag: 'release-20260904070050',
    packages: [
      { name: '@sectile/core', version: '0.15.0' },
      { name: '@sectile/dom', version: '0.14.2' },
      { name: '@sectile/vue', version: '0.15.0' },
    ],
  }), '3 packages · 2026-09-04');
});

test('uses pre-1 caret compatibility to isolate patches and propagate minors', () => {
  assert.equal(caretAccepts('0.14.1', '0.14.2'), true);
  assert.equal(caretAccepts('0.14.1', '0.15.0'), false);
  assert.equal(caretAccepts('1.4.0', '1.9.0'), true);
  assert.equal(caretAccepts('1.4.0', '2.0.0'), false);

  const packages = releaseGraphFixture();
  assert.deepEqual(planIndependentVersions(packages, [{ name: '@sectile/form', bump: 'patch' }]), [{
    name: '@sectile/form',
    directory: 'form',
    previousVersion: '0.14.1',
    version: '0.14.2',
    bump: 'patch',
    direct: true,
    dependencies: [],
  }]);
  assert.deepEqual(planIndependentVersions(packages, [
    { name: '@sectile/core', bump: 'minor' },
    { name: '@sectile/form', bump: 'patch' },
  ]), [
    {
      name: '@sectile/core',
      directory: 'core',
      previousVersion: '0.14.1',
      version: '0.15.0',
      bump: 'minor',
      direct: true,
      dependencies: [],
    },
    {
      name: '@sectile/form',
      directory: 'form',
      previousVersion: '0.14.1',
      version: '0.14.2',
      bump: 'patch',
      direct: true,
      dependencies: [],
    },
    {
      name: '@sectile/dom',
      directory: 'dom',
      previousVersion: '0.14.1',
      version: '0.14.2',
      bump: 'patch',
      direct: false,
      dependencies: ['@sectile/core'],
    },
  ]);
});

test('validates release manifests against package source versions', () => {
  const packages = releaseGraphFixture();
  const entries = planIndependentVersions(packages, [{ name: '@sectile/form', bump: 'patch' }]);
  const manifest = createReleaseManifest('release-20260901010203', entries);
  const sourcePackages = packages.map((entry) => ({
    ...entry,
    manifest: { ...entry.manifest, version: entry.name === '@sectile/form' ? '0.14.2' : entry.manifest.version },
  }));
  assert.deepEqual(selectReleasePackages(sourcePackages, 'v0.14.1'), sourcePackages);
  assert.deepEqual(
    validateReleaseManifest(manifest, sourcePackages, 'release-20260901010203').map(({ name }) => name),
    ['@sectile/form'],
  );
  assert.throws(
    () => validateReleaseManifest(manifest, packages, 'release-20260901010203'),
    /manifest version 0\.14\.1 does not match 0\.14\.2/u,
  );
  assert.throws(
    () => validateReleaseManifest({
      ...manifest,
      packages: [{ ...manifest.packages[0], bump: 'minor' }],
    }, sourcePackages, 'release-20260901010203'),
    /does not match its minor bump/u,
  );
});

test('requires caret workspace protocols for independently published edges', () => {
  const packages = releaseGraphFixture().map((entry) => ({ directory: entry.directory, manifest: entry.manifest }));
  assert.doesNotThrow(() => assertIndependentDependencyProtocols(packages));
  packages[1].manifest = { ...packages[1].manifest, dependencies: { '@sectile/core': 'workspace:*' } };
  assert.throws(() => assertIndependentDependencyProtocols(packages), /must use workspace:\^/u);
});

function releaseGraphFixture() {
  return [
    {
      name: '@sectile/core',
      directory: 'core',
      manifest: { name: '@sectile/core', version: '0.14.1' },
    },
    {
      name: '@sectile/form',
      directory: 'form',
      manifest: {
        name: '@sectile/form',
        version: '0.14.1',
        dependencies: { '@sectile/core': 'workspace:^' },
      },
    },
    {
      name: '@sectile/dom',
      directory: 'dom',
      manifest: {
        name: '@sectile/dom',
        version: '0.14.1',
        dependencies: { '@sectile/core': 'workspace:^' },
        peerDependencies: { '@sectile/form': 'workspace:^' },
      },
    },
  ];
}
