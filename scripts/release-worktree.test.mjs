import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import {
  createReleaseWorktree,
  fastForwardReleaseWorktree,
  probeReleaseWorktreeRestore,
  releaseWorktreeStatus,
  removeReleaseWorktree,
  restoreReleaseWorktree,
  stashReleaseWorktree,
} from './lib/release-worktree.mjs';

function git(root, args) {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

function createRepository() {
  const root = mkdtempSync(join(tmpdir(), 'sectile-release-repository-'));
  git(root, ['init']);
  git(root, ['config', 'user.email', 'release-test@sectile.dev']);
  git(root, ['config', 'user.name', 'Sectile Release Test']);
  writeFileSync(join(root, 'tracked.txt'), 'base\n');
  writeFileSync(join(root, 'staged.txt'), 'base\n');
  writeFileSync(join(root, 'release.txt'), 'base\n');
  writeFileSync(join(root, '.gitignore'), '');
  git(root, ['add', '.']);
  git(root, ['commit', '-m', 'test: create fixture']);
  return root;
}

test('verifies a release in a detached worktree and only stashes during final synchronization', () => {
  const root = createRepository();
  let worktree;
  try {
    writeFileSync(join(root, 'tracked.txt'), 'unstaged\n');
    writeFileSync(join(root, 'staged.txt'), 'staged\n');
    git(root, ['add', 'staged.txt']);
    writeFileSync(join(root, 'untracked.txt'), 'untracked\n');
    const originalHead = git(root, ['rev-parse', 'HEAD']);
    const originalStatus = releaseWorktreeStatus(root);

    worktree = createReleaseWorktree(root, originalHead);
    assert.equal(releaseWorktreeStatus(root), originalStatus);
    assert.equal(releaseWorktreeStatus(worktree.worktreeRoot), '');
    writeFileSync(join(worktree.worktreeRoot, 'release.txt'), 'released\n');
    git(worktree.worktreeRoot, ['add', 'release.txt']);
    git(worktree.worktreeRoot, ['commit', '-m', 'chore(release): fixture']);
    const releaseCommit = git(worktree.worktreeRoot, ['rev-parse', 'HEAD']);
    assert.equal(releaseWorktreeStatus(root), originalStatus);

    const temporary = stashReleaseWorktree(root);
    assert.equal(probeReleaseWorktreeRestore(worktree.worktreeRoot, releaseCommit, temporary.stash), true);
    fastForwardReleaseWorktree(root, releaseCommit);
    assert.equal(restoreReleaseWorktree(root, temporary.stash), true);

    assert.equal(git(root, ['rev-parse', 'HEAD']), releaseCommit);
    assert.equal(releaseWorktreeStatus(root), originalStatus);
    assert.equal(readText(join(root, 'tracked.txt')), 'unstaged\n');
    assert.equal(readText(join(root, 'staged.txt')), 'staged\n');
    assert.equal(readText(join(root, 'untracked.txt')), 'untracked\n');
    assert.equal(readText(join(root, 'release.txt')), 'released\n');
    assert.equal(git(root, ['stash', 'list']), '');
  } finally {
    if (worktree !== undefined) removeReleaseWorktree(root, worktree);
    rmSync(root, { force: true, recursive: true });
  }
});

test('detects a restore conflict before advancing main', () => {
  const root = createRepository();
  let worktree;
  try {
    const originalHead = git(root, ['rev-parse', 'HEAD']);
    writeFileSync(join(root, 'release.txt'), 'local work\n');
    const originalStatus = releaseWorktreeStatus(root);
    worktree = createReleaseWorktree(root, originalHead);
    writeFileSync(join(worktree.worktreeRoot, 'release.txt'), 'released\n');
    git(worktree.worktreeRoot, ['add', 'release.txt']);
    git(worktree.worktreeRoot, ['commit', '-m', 'chore(release): fixture']);
    const releaseCommit = git(worktree.worktreeRoot, ['rev-parse', 'HEAD']);

    const temporary = stashReleaseWorktree(root);
    assert.equal(probeReleaseWorktreeRestore(worktree.worktreeRoot, releaseCommit, temporary.stash), false);
    assert.equal(git(root, ['rev-parse', 'HEAD']), originalHead);
    assert.equal(restoreReleaseWorktree(root, temporary.stash), true);
    assert.equal(releaseWorktreeStatus(root), originalStatus);
    assert.equal(readText(join(root, 'release.txt')), 'local work\n');
  } finally {
    if (worktree !== undefined) removeReleaseWorktree(root, worktree);
    rmSync(root, { force: true, recursive: true });
  }
});

test('preserves generated files revealed when dirty ignore rules are stashed', () => {
  const root = createRepository();
  try {
    writeFileSync(join(root, '.gitignore'), 'generated/\n');
    writeFileSync(join(root, 'tracked.txt'), 'local work\n');
    mkdirSync(join(root, 'generated'));
    writeFileSync(join(root, 'generated', 'asset.js'), 'generated output\n');
    const originalStatus = releaseWorktreeStatus(root);

    const temporary = stashReleaseWorktree(root);
    assert.equal(temporary.residualStatus, '?? generated/asset.js');
    assert.equal(releaseWorktreeStatus(root), temporary.residualStatus);
    assert.equal(restoreReleaseWorktree(root, temporary.stash), true);

    assert.equal(releaseWorktreeStatus(root), originalStatus);
    assert.equal(readText(join(root, 'tracked.txt')), 'local work\n');
    assert.equal(readText(join(root, 'generated', 'asset.js')), 'generated output\n');
    assert.equal(git(root, ['stash', 'list']), '');
  } finally {
    rmSync(root, { force: true, recursive: true });
  }
});

function readText(path) {
  return readFileSync(path, 'utf8').replaceAll('\r\n', '\n');
}
