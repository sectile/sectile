import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

function git(root, args, capture = false) {
  return execFileSync('git', args, {
    cwd: root,
    encoding: 'utf8',
    stdio: capture ? ['ignore', 'pipe', 'pipe'] : 'inherit',
  })?.trim();
}

export function releaseWorktreeStatus(root) {
  return git(root, ['status', '--porcelain=v1', '--untracked-files=all'], true);
}

export function createReleaseWorktree(root, head) {
  const temporaryRoot = mkdtempSync(join(tmpdir(), 'sectile-release-'));
  const worktreeRoot = join(temporaryRoot, 'worktree');
  try {
    git(root, ['worktree', 'add', '--detach', worktreeRoot, head]);
    return Object.freeze({ temporaryRoot, worktreeRoot });
  } catch (error) {
    rmSync(temporaryRoot, { force: true, recursive: true });
    throw error;
  }
}

export function removeReleaseWorktree(root, worktree) {
  const result = spawnSync('git', ['worktree', 'remove', '--force', worktree.worktreeRoot], {
    cwd: root,
    encoding: 'utf8',
    stdio: 'inherit',
  });
  rmSync(worktree.temporaryRoot, { force: true, recursive: true });
  assert.equal(result.status, 0, `could not remove temporary release worktree: ${worktree.worktreeRoot}`);
}

export function stashReleaseWorktree(root) {
  const head = git(root, ['rev-parse', 'HEAD'], true);
  assert.notEqual(releaseWorktreeStatus(root), '', 'cannot stash a clean release worktree');
  git(root, ['stash', 'push', '--include-untracked', '--message', 'sectile release synchronization']);
  const stash = git(root, ['rev-parse', 'refs/stash'], true);
  assert.equal(releaseWorktreeStatus(root), '', 'temporary release stash did not clean the worktree');
  return Object.freeze({ head, stash });
}

function findStashReference(root, stash) {
  const entries = git(root, ['stash', 'list', '--format=%gd%x00%H'], true);
  for (const entry of entries.split('\n')) {
    const [reference, hash] = entry.split('\0');
    if (hash === stash) return reference;
  }
  return undefined;
}

function applyStash(root, stash) {
  return spawnSync('git', ['stash', 'apply', '--index', stash], {
    cwd: root,
    encoding: 'utf8',
    stdio: 'inherit',
  }).status === 0;
}

export function probeReleaseWorktreeRestore(worktreeRoot, releaseCommit, stash) {
  const restored = applyStash(worktreeRoot, stash);
  git(worktreeRoot, ['reset', '--hard', releaseCommit]);
  git(worktreeRoot, ['clean', '-fd']);
  return restored;
}

export function restoreReleaseWorktree(root, stash) {
  if (!applyStash(root, stash)) return false;
  const reference = findStashReference(root, stash);
  if (reference !== undefined) git(root, ['stash', 'drop', reference]);
  return true;
}

export function fastForwardReleaseWorktree(root, releaseCommit) {
  git(root, ['merge', '--ff-only', releaseCommit]);
}
