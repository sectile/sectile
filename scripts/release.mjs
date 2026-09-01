import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { fileURLToPath } from 'node:url';
import {
  bumpVersion,
  classifyReleaseBranch,
  filterPackageCommits,
  formatCommitList,
  formatReleaseNotes,
  parseGitLog,
  parseReleaseArguments,
  parseReleaseBumpChoice,
  parseStableVersion,
  prependChangelog,
  prependChangelogChanges,
  recommendBump,
  releaseBumpChoices,
  selectReleaseTrack,
} from './lib/release.mjs';
import {
  assertIndependentDependencyProtocols,
  assertSynchronizedReleaseBase,
  createPackageTag,
  createReleaseManifest,
  createReleaseSetTag,
  independentReleaseBaselineTag,
  planIndependentVersions,
  releaseManifestFile,
} from './lib/release-set.mjs';
import { publishedPackageDirectories } from './lib/published-packages.mjs';
import { execFileSyncPortable } from './lib/portable-process.mjs';
import { loadPublishedPackageGraph } from './lib/workspace-graph.mjs';
import {
  createReleaseWorktree,
  fastForwardReleaseWorktree,
  probeReleaseWorktreeRestore,
  releaseWorktreeStatus,
  removeReleaseWorktree,
  restoreReleaseWorktree,
  stashReleaseWorktree,
} from './lib/release-worktree.mjs';

const workspaceRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const isolatedResultEnvironment = 'SECTILE_RELEASE_PREPARE_RESULT';

function releasePackages(root) {
  return publishedPackageDirectories.map((directory) => ({
    directory,
    manifestPath: join(root, 'packages', directory, 'package.json'),
    changelogPath: join(root, 'packages', directory, 'CHANGELOG.md'),
  }));
}

function run(root, command, args, options = {}) {
  return execFileSyncPortable(command, args, {
    cwd: root,
    encoding: 'utf8',
    input: options.input,
    stdio: options.capture || options.input !== undefined ? ['pipe', 'pipe', 'pipe'] : 'inherit',
  })?.replaceAll('\r\n', '\n').trim();
}

function isAncestor(root, ancestor, descendant) {
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

function synchronizedVersion(packages) {
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

function latestPublishedTag(root, repository, packages) {
  const result = spawnSync('gh', ['release', 'view', '--repo', repository, '--json', 'tagName', '--jq', '.tagName'], {
    cwd: root,
    encoding: 'utf8',
  });
  assert.equal(
    result.status,
    0,
    `no published GitHub release found; publish and tag v${synchronizedVersion(packages)} manually before using pnpm release`,
  );
  const tag = result.stdout.trim();
  return tag;
}

function updatePackages(root, packages, version, commits) {
  const changedPathsByHash = new Map(commits.map(({ hash }) => [
    hash,
    run(root, 'git', ['diff-tree', '--root', '--no-commit-id', '--name-only', '-r', '-M', hash], { capture: true })
      .split('\n')
      .filter(Boolean),
  ]));
  const updates = packages.map(({ manifestPath, changelogPath }) => {
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    manifest.version = version;
    const changelog = readFileSync(changelogPath, 'utf8');
    const directory = basename(dirname(manifestPath));
    return {
      changelog: prependChangelog(
        changelog,
        manifest.name,
        version,
        filterPackageCommits(commits, directory, changedPathsByHash),
      ),
      changelogPath,
      manifest: `${JSON.stringify(manifest, null, 2)}\n`,
      manifestPath,
    };
  });
  for (const update of updates) {
    writeFileSync(update.manifestPath, update.manifest);
    writeFileSync(update.changelogPath, update.changelog);
  }
}

async function independentReleaseEntries(root) {
  const graph = await loadPublishedPackageGraph();
  const entries = graph.order.map(({ directory, manifest, name }) => ({
    directory,
    manifest,
    name,
    manifestPath: join(root, 'packages', directory, 'package.json'),
    changelogPath: join(root, 'packages', directory, 'CHANGELOG.md'),
  }));
  assertIndependentDependencyProtocols(entries);
  return entries;
}

function assertIndependentBaseline(root) {
  run(root, 'git', ['rev-parse', '--verify', `refs/tags/${independentReleaseBaselineTag}^{commit}`], { capture: true });
  run(root, 'git', ['merge-base', '--is-ancestor', independentReleaseBaselineTag, 'HEAD'], { capture: true });
}

function independentReleaseActive(root) {
  const tag = run(root, 'git', ['tag', '--list', independentReleaseBaselineTag], { capture: true });
  return tag === independentReleaseBaselineTag && isAncestor(root, independentReleaseBaselineTag, 'HEAD');
}

function packageBaseTag(root, entry) {
  const expected = createPackageTag(entry.name, entry.manifest.version);
  const tags = run(root, 'git', ['tag', '--list', '--sort=-version:refname', `${entry.name}@*`], { capture: true })
    .split('\n')
    .filter(Boolean);
  if (tags.length === 0) {
    assert.equal(entry.manifest.version, independentReleaseBaselineTag.slice(1),
      `${entry.name} has no package tag and must still match ${independentReleaseBaselineTag}`);
    return independentReleaseBaselineTag;
  }
  assert.equal(tags[0], expected,
    `${entry.name} manifest version ${entry.manifest.version} does not match latest package tag ${tags[0]}`);
  return expected;
}

function packageCommits(root, entry, baseTag) {
  const output = run(root, 'git', [
    'log', '--format=%H%x1f%h%x1f%s%x1f%b%x1e', `${baseTag}..HEAD`, '--', `packages/${entry.directory}`,
  ], { capture: true });
  return output === '' ? [] : parseGitLog(output);
}

async function planIndependentRelease(root, options, releaseTag = createReleaseSetTag()) {
  assert.notEqual(options.requestedBump, undefined,
    'independent releases require an explicit bump: pnpm release patch');
  assertIndependentBaseline(root);
  const packages = await independentReleaseEntries(root);
  const byName = new Map(packages.map((entry) => [entry.name, entry]));
  const detected = new Map();
  let requestedNames = options.packageNames;
  if (requestedNames.length === 0) {
    for (const entry of packages) {
      const baseTag = packageBaseTag(root, entry);
      const commits = packageCommits(root, entry, baseTag);
      detected.set(entry.name, Object.freeze({ baseTag, commits }));
    }
    requestedNames = packages
      .filter(({ name }) => detected.get(name).commits.length > 0)
      .map(({ name }) => name);
    assert.ok(requestedNames.length > 0, 'no changed packages since their latest release tags');
  }
  const planned = planIndependentVersions(packages, requestedNames, options.requestedBump);
  const detailed = planned.map((entry) => {
    const source = byName.get(entry.name);
    const details = detected.get(entry.name);
    const baseTag = details?.baseTag ?? packageBaseTag(root, source);
    const commits = details?.commits ?? packageCommits(root, source, baseTag);
    if (entry.direct && commits.length === 0) {
      assert.notEqual(options.reason, undefined,
        `${entry.name} has no package commits since ${baseTag}; supply --reason for a version-only repair`);
    }
    return Object.freeze({ ...entry, baseTag, commits, source });
  });
  return Object.freeze({
    entries: Object.freeze(detailed),
    manifest: createReleaseManifest(releaseTag, detailed, options.reason),
    releaseTag,
  });
}

function renderIndependentPlan(plan) {
  return [
    `release tag: ${plan.releaseTag}`,
    ...plan.entries.map((entry) => (
      `${entry.name}: ${entry.previousVersion} -> ${entry.version}${entry.direct ? '' : ` (compatibility: ${entry.dependencies.join(', ')})`}`
    )),
  ].join('\n');
}

function updateIndependentPackages(root, plan, reason) {
  for (const entry of plan.entries) {
    const manifest = JSON.parse(readFileSync(entry.source.manifestPath, 'utf8'));
    manifest.version = entry.version;
    writeFileSync(entry.source.manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
    const commitChanges = entry.commits.map(({ shortHash, subject }) => `${subject} (${shortHash})`);
    const changes = entry.direct
      ? [...(reason === undefined ? [] : [reason]), ...commitChanges]
      : [`Update compatibility for ${entry.dependencies.join(', ')}.`];
    writeFileSync(entry.source.changelogPath, prependChangelogChanges(
      readFileSync(entry.source.changelogPath, 'utf8'),
      entry.name,
      entry.version,
      changes,
    ));
  }
  writeFileSync(join(root, releaseManifestFile), `${JSON.stringify(plan.manifest, null, 2)}\n`);
}

async function prepareIndependentRelease(root, options, installDependencies) {
  const repository = githubRepository(run(root, 'git', ['remote', 'get-url', 'origin'], { capture: true }));
  run(root, 'git', ['fetch', 'origin', 'main', '--tags']);
  const sourceHead = run(root, 'git', ['rev-parse', 'HEAD'], { capture: true });
  const remoteHead = run(root, 'git', ['rev-parse', 'origin/main'], { capture: true });
  const branchState = classifyReleaseBranch(sourceHead, remoteHead, isAncestor(root, 'origin/main', 'HEAD'));
  assert.notEqual(branchState, 'blocked', 'local main must contain origin/main; fetch and reconcile remote changes before release');

  const plan = await planIndependentRelease(root, options);
  console.log(renderIndependentPlan(plan));
  const tags = [plan.releaseTag, ...plan.manifest.packages.map(({ tag }) => tag)];
  for (const tag of tags) {
    assert.equal(run(root, 'git', ['tag', '--list', tag], { capture: true }), '', `${tag} already exists locally`);
    assert.equal(run(root, 'git', ['ls-remote', '--tags', 'origin', `refs/tags/${tag}`], { capture: true }), '',
      `${tag} already exists on origin`);
  }

  updateIndependentPackages(root, plan, options.reason);
  run(root, 'pnpm', ['install', '--lockfile-only']);
  if (installDependencies) run(root, 'pnpm', ['install', '--frozen-lockfile']);
  run(root, 'pnpm', ['release:check', plan.releaseTag]);
  run(root, 'git', ['add', '--',
    ...plan.entries.map(({ directory }) => `packages/${directory}`),
    'pnpm-lock.yaml',
    releaseManifestFile,
  ]);
  run(root, 'git', ['commit', '-m', `chore(release): ${plan.releaseTag}`]);
  const releaseCommit = run(root, 'git', ['rev-parse', 'HEAD'], { capture: true });
  const notes = `Sectile ${plan.releaseTag}\n\n## Packages\n\n${plan.entries
    .map(({ name, previousVersion, version }) => `- ${name}: ${previousVersion} -> ${version}`)
    .join('\n')}\n`;
  return Object.freeze({
    repository,
    remoteHead,
    releaseCommit,
    sourceHead,
    tag: plan.releaseTag,
    packageTags: plan.manifest.packages.map(({ tag }) => tag),
    notes,
  });
}

async function selectReleaseBump(version, recommendation, requestedBump) {
  if (requestedBump !== undefined) return requestedBump;
  assert.equal(
    process.stdin.isTTY && process.stdout.isTTY,
    true,
    'release bump is required without an interactive terminal: pnpm release patch|minor|major',
  );

  console.log('\nversion bump:');
  for (const choice of releaseBumpChoices(version, recommendation.bump)) {
    console.log(`  ${choice.index}) ${choice.bump.padEnd(5)} v${choice.version}${choice.recommended ? '  recommended' : ''}`);
  }

  const prompt = createInterface({ input: process.stdin, output: process.stdout });
  try {
    while (true) {
      const answer = await prompt.question(`select bump [${recommendation.bump}]: `);
      try {
        return parseReleaseBumpChoice(answer, recommendation.bump);
      } catch (error) {
        console.error(error.message);
      }
    }
  } finally {
    prompt.close();
  }
}

async function prepareRelease(root, requestedBump, installDependencies) {
  const packages = releasePackages(root);
  const repository = githubRepository(run(root, 'git', ['remote', 'get-url', 'origin'], { capture: true }));
  for (const { manifestPath } of packages) {
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    assert.equal(githubRepository(manifest.repository?.url).toLowerCase(), repository.toLowerCase(), `${manifest.name} repository must match origin`);
  }

  run(root, 'git', ['fetch', 'origin', 'main', '--tags']);
  const sourceHead = run(root, 'git', ['rev-parse', 'HEAD'], { capture: true });
  const remoteHead = run(root, 'git', ['rev-parse', 'origin/main'], { capture: true });
  const branchState = classifyReleaseBranch(sourceHead, remoteHead, isAncestor(root, 'origin/main', 'HEAD'));
  assert.notEqual(branchState, 'blocked', 'local main must contain origin/main; fetch and reconcile remote changes before release');

  const baseTag = latestPublishedTag(root, repository, packages);
  assertSynchronizedReleaseBase(baseTag);
  const previousVersion = baseTag.slice(1);
  assert.equal(synchronizedVersion(packages), previousVersion, `package version must match the last published release ${baseTag}`);
  run(root, 'git', ['rev-parse', '--verify', `refs/tags/${baseTag}^{commit}`], { capture: true });
  run(root, 'git', ['merge-base', '--is-ancestor', baseTag, 'HEAD'], { capture: true });

  const log = run(root, 'git', ['log', '--format=%H%x1f%h%x1f%s%x1f%b%x1e', `${baseTag}..HEAD`], { capture: true });
  const commits = parseGitLog(log);
  if (commits.length === 0) {
    console.log(`no commits since ${baseTag}; nothing to release`);
    return undefined;
  }

  const recommendation = recommendBump(commits);
  console.log(`release base: ${baseTag}`);
  console.log(`release branch: ${branchState}`);
  console.log(`commits:\n${formatCommitList(commits)}`);
  console.log(`recommended bump: ${recommendation.bump} (${recommendation.reason})`);
  const releaseBump = await selectReleaseBump(previousVersion, recommendation, requestedBump);
  const version = bumpVersion(previousVersion, releaseBump);
  const tag = `v${version}`;
  console.log(`${requestedBump === undefined ? 'selected' : 'requested'} bump: ${releaseBump}`);
  console.log(`release tag: ${tag}`);

  assert.equal(run(root, 'git', ['tag', '--list', tag], { capture: true }), '', `${tag} already exists locally`);
  assert.equal(run(root, 'git', ['ls-remote', '--tags', 'origin', `refs/tags/${tag}`], { capture: true }), '', `${tag} already exists on origin`);
  updatePackages(root, packages, version, commits);
  run(root, 'pnpm', ['install', '--lockfile-only']);
  if (installDependencies) run(root, 'pnpm', ['install', '--frozen-lockfile']);
  run(root, 'pnpm', ['release:check', tag]);
  run(root, 'git', ['add', '--', 'packages', 'pnpm-lock.yaml']);
  run(root, 'git', ['commit', '-m', `chore(release): ${tag}`]);
  const releaseCommit = run(root, 'git', ['rev-parse', 'HEAD'], { capture: true });
  const notes = `Sectile ${tag}\n\n${formatReleaseNotes(baseTag, commits)}`;
  return Object.freeze({ repository, remoteHead, releaseCommit, sourceHead, tag, notes });
}

function publishRelease(root, release) {
  run(root, 'git', ['tag', '-a', release.tag, release.releaseCommit, '-F', '-'], { input: release.notes });
  for (const packageTag of release.packageTags ?? []) {
    run(root, 'git', ['tag', '-a', packageTag, release.releaseCommit, '-m', packageTag]);
  }
  run(root, 'git', [
    'push', '--atomic', 'origin', 'main', `refs/tags/${release.tag}`,
    ...(release.packageTags ?? []).map((tag) => `refs/tags/${tag}`),
  ]);
  run(root, 'gh', ['workflow', 'run', 'release.yml', '--repo', release.repository, '--ref', 'main', '--field', `tag=${release.tag}`]);
  console.log(`released ${release.tag} from ${release.repository}; dispatched npm publication through GitHub Actions OIDC`);
}

function independentArguments(options) {
  return [
    ...(options.requestedBump === undefined ? [] : [options.requestedBump]),
    ...options.packageNames.flatMap((name) => ['--package', name]),
    ...(options.reason === undefined ? [] : ['--reason', options.reason]),
  ];
}

function prepareIsolatedRelease(worktree, options) {
  const workerScript = join(worktree.worktreeRoot, 'scripts', 'release.mjs');
  assert.equal(
    readFileSync(workerScript, 'utf8').includes(isolatedResultEnvironment),
    true,
    'commit the isolated release tooling before using --allow-dirty',
  );
  const resultPath = join(worktree.temporaryRoot, 'result.json');
  const result = spawnSync(
    process.execPath,
    [workerScript, ...independentArguments(options)],
    {
      cwd: worktree.worktreeRoot,
      env: { ...process.env, [isolatedResultEnvironment]: resultPath },
      stdio: 'inherit',
    },
  );
  if (result.error !== undefined) throw result.error;
  assert.equal(result.status, 0, 'isolated release preparation failed');
  return JSON.parse(readFileSync(resultPath, 'utf8'));
}

async function releaseFromDirtyWorkspace(options) {
  const sourceHead = run(workspaceRoot, 'git', ['rev-parse', 'HEAD'], { capture: true });
  const worktree = createReleaseWorktree(workspaceRoot, sourceHead);
  try {
    console.log(`verifying committed ${sourceHead.slice(0, 12)} in isolated worktree ${worktree.worktreeRoot}`);
    const release = prepareIsolatedRelease(worktree, options);
    if (release === null) return;

    assert.equal(
      run(workspaceRoot, 'git', ['rev-parse', 'HEAD'], { capture: true }),
      sourceHead,
      'main changed during isolated verification; retry the release from the new HEAD',
    );
    run(workspaceRoot, 'git', ['fetch', 'origin', 'main', '--tags']);
    assert.equal(
      run(workspaceRoot, 'git', ['rev-parse', 'origin/main'], { capture: true }),
      release.remoteHead,
      'origin/main changed during isolated verification; retry the release from the updated branch',
    );
    for (const tag of [release.tag, ...(release.packageTags ?? [])]) {
      assert.equal(run(workspaceRoot, 'git', ['tag', '--list', tag], { capture: true }), '',
        `${tag} was created during isolated verification`);
    }

    const synchronizationStartedAt = performance.now();
    const status = releaseWorktreeStatus(workspaceRoot);
    let temporary = status === '' ? undefined : stashReleaseWorktree(workspaceRoot);
    try {
      if (temporary !== undefined) {
        assert.equal(temporary.head, sourceHead, 'main changed while local work was being isolated; retry the release');
        assert.equal(
          probeReleaseWorktreeRestore(worktree.worktreeRoot, release.releaseCommit, temporary.stash),
          true,
          `uncommitted changes conflict with ${release.tag}; commit or adjust them before retrying`,
        );
      }

      fastForwardReleaseWorktree(workspaceRoot, release.releaseCommit);
      if (temporary !== undefined) {
        assert.equal(
          restoreReleaseWorktree(workspaceRoot, temporary.stash),
          true,
          `could not restore uncommitted changes; they remain in stash ${temporary.stash} and the release was not pushed`,
        );
        temporary = undefined;
      }
    } catch (error) {
      if (
        temporary !== undefined
        && run(workspaceRoot, 'git', ['rev-parse', 'HEAD'], { capture: true }) === temporary.head
        && releaseWorktreeStatus(workspaceRoot) === temporary.residualStatus
        && restoreReleaseWorktree(workspaceRoot, temporary.stash)
      ) {
        temporary = undefined;
      }
      if (temporary !== undefined) console.error(`local work remains recoverable in stash ${temporary.stash}`);
      throw error;
    }
    console.log(`synchronized main and restored local work in ${((performance.now() - synchronizationStartedAt) / 1_000).toFixed(1)}s`);
    publishRelease(workspaceRoot, release);
  } finally {
    removeReleaseWorktree(workspaceRoot, worktree);
  }
}

async function main() {
  const options = parseReleaseArguments(process.argv.slice(2));
  const { allowDirty, dryRun, packageNames, requestedBump } = options;
  const isolatedResultPath = process.env[isolatedResultEnvironment];
  if (isolatedResultPath !== undefined) {
    delete process.env[isolatedResultEnvironment];
    assert.equal(releaseWorktreeStatus(workspaceRoot), '', 'isolated release worktree must start clean');
    const track = selectReleaseTrack(packageNames, dryRun, independentReleaseActive(workspaceRoot));
    const release = track === 'independent'
      ? await prepareIndependentRelease(workspaceRoot, options, true)
      : await prepareRelease(workspaceRoot, requestedBump, true);
    writeFileSync(isolatedResultPath, `${JSON.stringify(release ?? null)}\n`);
    return;
  }

  assert.equal(run(workspaceRoot, 'git', ['branch', '--show-current'], { capture: true }), 'main', 'release must run from main');
  if (dryRun) {
    const plan = await planIndependentRelease(workspaceRoot, options);
    console.log(renderIndependentPlan(plan));
    return;
  }
  const dirtyStatus = releaseWorktreeStatus(workspaceRoot);
  if (dirtyStatus !== '' && !allowDirty) {
    const retry = `pnpm release ${[...independentArguments(options), '--allow-dirty'].join(' ')}`;
    throw new Error(`worktree has uncommitted changes:\n${dirtyStatus}\n\nVerify committed HEAD in isolation with:\n  ${retry}`);
  }

  if (dirtyStatus !== '') {
    await releaseFromDirtyWorkspace(options);
    return;
  }

  const track = selectReleaseTrack(packageNames, dryRun, independentReleaseActive(workspaceRoot));
  const release = track === 'independent'
    ? await prepareIndependentRelease(workspaceRoot, options, false)
    : await prepareRelease(workspaceRoot, requestedBump, false);
  if (release !== undefined) publishRelease(workspaceRoot, release);
}

try {
  await main();
} catch (error) {
  console.error(`release failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
