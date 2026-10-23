import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  bumpVersion,
  classifyReleaseBranch,
  parseGitLog,
  parseReleaseArguments,
  parseReleaseConfirmation,
  prependChangelogChanges,
  recommendBump,
  resolveExpectedReleaseTag,
  shouldPromptForRelease,
} from './lib/release.mjs';
import {
  assertIndependentDependencyProtocols,
  caretAccepts,
  createPackageTag,
  createReleaseManifest,
  createReleaseSetTag,
  formatReleaseTitle,
  formatReleasePackageSummary,
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

test('release hands verified artifacts to source-bound Releaseway publishers with separate authority', () => {
  const workflow = readText(join(root, '.github/workflows/release.yml'));
  const localRelease = readText(join(root, 'scripts/release.mjs'));
  const publication = readText(join(root, 'scripts/publish-packages.mjs'));
  const manifest = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
  assert.match(publication, /parseNpmWebAuthChallenge/u);
  assert.match(publication, /completeNpmWebAuth/u);
  assert.match(publication, /npm_config_otp/u);
  assert.match(workflow, /--pack-destination=release-artifacts/u);
  assert.match(workflow, /--releaseway-manifest/u);
  assert.ok(workflow.includes('node scripts/release-metadata.mjs prepare "$RELEASE_TAG" release-artifacts "$GENERATED_NOTES"'));
  assert.match(workflow, /jobs:\n  prepare:/u);
  const preparation = workflow.slice(workflow.indexOf('  prepare:'), workflow.indexOf('\n  publish:'));
  assert.ok(preparation.includes('test "$GITHUB_REF_NAME" = "$RELEASE_TAG"'));
  assert.ok(preparation.includes('git merge-base --is-ancestor "$GITHUB_SHA" origin/main'));
  assert.ok(localRelease.includes("'--ref', release.tag"));
  const publicationJob = workflow.slice(workflow.indexOf('\n  publish:'), workflow.indexOf('\n  github-release:'));
  assert.match(publicationJob, /permissions:\n      contents: read\n      id-token: write/u);
  assert.match(publicationJob, /artifacts-manifest: release-artifacts\/artifacts.json/u);
  assert.ok(publicationJob.includes('artifact-ids: ${{ needs.prepare.outputs.artifact-id }}'));
  assert.match(publicationJob, /artifact-report-path/u);
  assert.match(publicationJob, /if: always\(\)/u);
  assert.match(workflow, /group: release-main/u);
  assert.match(preparation, /notes: changelog/u);
  assert.match(preparation, /notes-config: \.github\/release-notes\.yml/u);
  assert.match(preparation, /notes-preview: "true"/u);
  assert.ok(preparation.indexOf('notes-preview: "true"') < preparation.indexOf('--releaseway-manifest'));
  const githubJob = workflow.slice(workflow.indexOf('\n  github-release:'));
  assert.match(githubJob, /needs: \[prepare, publish\]/u);
  assert.match(githubJob, /contents: write/u);
  assert.match(githubJob, /notes: file/u);
  assert.match(githubJob, /notes-existing: verify/u);
  assert.match(githubJob, /release-artifacts\/artifacts.json/u);
  assert.match(githubJob, /release-evidence\/\*\.json/u);
  for (const action of ['releaseway/npm-actions', 'releaseway/actions']) {
    assert.match(workflow, new RegExp(`uses: ${action}@[0-9a-f]{40} # v0\\.8\\.0`, 'u'));
  }
  assert.match(readText(join(root, '.github/npm/packages.yml')), /publish:\n  mode: direct/u);
  assert.equal(workflow.includes('@sectile/docs'), false, 'docs remain local-only');
  assert.equal(workflow.includes('docs/dist'), false);
  assert.equal(workflow.includes('pages: write'), false);
  assert.equal(workflow.includes('actions/configure-pages@'), false);
  assert.equal(workflow.includes('actions/upload-pages-artifact@'), false);
  assert.equal(workflow.includes('actions/deploy-pages@'), false);
  assert.equal(workflow.includes('deploy-docs:'), false);
  assert.equal(preparation.includes('@sectile/docs^... build'), false);
  assert.equal(preparation.includes('scripts/virtual-benchmark/run.mjs docs'), false);
  assert.equal(workflow.includes('docs/.vitepress/dist'), false);
  assert.equal(workflow.includes('verify:release'), false);
  assert.equal(workflow.includes('verify:compat'), false);
  assert.equal(localRelease.includes("['verify:release']"), false);
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

test('bumps stable package versions', () => {
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

test('parses git records for independent version recommendations', () => {
  const commits = parseGitLog('abcdef123456\x1fabcdef1\x1ffeat: add field\x1fbody\x1e');
  assert.deepEqual(commits, [commit('feat: add field', 'body')]);
});

test('package summary preserves independent transitions and links to source-bound changelogs', () => {
  const manifest = {
    releaseTag: 'release-2026-09-04.1',
    packages: [
      { name: '@sectile/dom', directory: 'dom', previousVersion: '0.14.1', version: '0.14.2' },
      { name: '@sectile/vue', directory: 'vue', previousVersion: '0.14.1', version: '0.15.0' },
    ],
  };
  const summary = formatReleasePackageSummary(manifest, 'sectile/sectile', 'a'.repeat(40));
  assert.ok(summary.includes('| [@sectile/dom](https://www.npmjs.com/package/@sectile/dom/v/0.14.2) | 0.14.1 → **0.14.2** |'));
  assert.ok(summary.includes('| [@sectile/vue](https://www.npmjs.com/package/@sectile/vue/v/0.15.0) | 0.14.1 → **0.15.0** |'));
  assert.ok(summary.includes(`/blob/${'a'.repeat(40)}/packages/vue/CHANGELOG.md`));
  assert.ok(formatReleasePackageSummary({ ...manifest, reason: 'Maintenance publication.' }, 'sectile/sectile', 'a'.repeat(40)).startsWith('Maintenance publication.\n\n'));
  assert.throws(() => formatReleasePackageSummary(manifest, 'sectile/sectile', 'main'), /full commit SHA/u);
});

test('prepends the same commit list to a package changelog', () => {
  const changelog = '# @sectile/core\n\n## 0.1.0\n\n- Initial release.\n';
  assert.equal(
    prependChangelogChanges(changelog, '@sectile/core', '0.2.0', ['Add field.']),
    '# @sectile/core\n\n## 0.2.0\n\n### Changes\n\n- Add field.\n\n## 0.1.0\n\n- Initial release.\n',
  );
});

test('creates the first release entry from a seeded package changelog', () => {
  assert.equal(
    prependChangelogChanges('# @sectile/chart\n', '@sectile/chart', '0.12.0', ['Add plots.']),
    '# @sectile/chart\n\n## 0.12.0\n\n### Changes\n\n- Add plots.\n',
  );
});

test('rejects an empty package release entry', () => {
  const changelog = '# @sectile/core\n\n## 0.1.0\n\n- Initial release.\n';
  assert.throws(() => prependChangelogChanges(changelog, '@sectile/core', '0.2.0', []), /at least one change/u);
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
});

test('formats GitHub release titles with package count and release date', () => {
  assert.equal(formatReleaseTitle({
    releaseTag: 'release-2026-09-04.1',
    packages: [{ name: '@sectile/dom', version: '0.14.2' }],
  }), '1 packages · 2026-09-04');
  assert.equal(formatReleaseTitle({
    releaseTag: 'release-2026-09-04.2',
    packages: [
      { name: '@sectile/dom', version: '0.14.2' },
      { name: '@sectile/vue', version: '0.15.0' },
    ],
  }), '2 packages · 2026-09-04');
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
