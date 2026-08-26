import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
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
    assert.equal(readFileSync(join(root, 'tracked.txt'), 'utf8'), 'unstaged\n');
    assert.equal(readFileSync(join(root, 'staged.txt'), 'utf8'), 'staged\n');
    assert.equal(readFileSync(join(root, 'untracked.txt'), 'utf8'), 'untracked\n');
    assert.equal(readFileSync(join(root, 'release.txt'), 'utf8'), 'released\n');
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
    assert.equal(readFileSync(join(root, 'release.txt'), 'utf8'), 'local work\n');
  } finally {
    if (worktree !== undefined) removeReleaseWorktree(root, worktree);
    rmSync(root, { force: true, recursive: true });
  }
});
