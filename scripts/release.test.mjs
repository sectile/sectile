import assert from 'node:assert/strict';
import test from 'node:test';
import {
  bumpVersion,
  formatReleaseNotes,
  parseGitLog,
  prependChangelog,
  recommendBump,
} from './lib/release.mjs';

const commit = (subject, body = '') => ({ hash: 'abcdef123456', shortHash: 'abcdef1', subject, body });

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
