import assert from 'node:assert/strict';

const stableVersionPattern = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
const breakingSubjectPattern = /^[A-Za-z]+(?:\([^)]*\))?!:/;
const featureSubjectPattern = /^feat(?:\([^)]*\))?:/;
const breakingBodyPattern = /(^|\s)BREAKING CHANGE:/;
export const releaseBumps = Object.freeze(['patch', 'minor', 'major']);

export function parseReleaseArguments(args) {
  let allowDirty = false;
  let dryRun = false;
  let reason;
  let requestedBump;
  const packageNames = [];
  const filtered = args.filter((candidate) => candidate !== '--');
  for (let index = 0; index < filtered.length; index += 1) {
    const argument = filtered[index];
    if (argument === '--allow-dirty') {
      allowDirty = true;
      continue;
    }
    if (argument === '--dry-run') {
      dryRun = true;
      continue;
    }
    if (argument === '--package' || argument.startsWith('--package=')) {
      const name = argument === '--package' ? filtered[++index] : argument.slice('--package='.length);
      assert.ok(typeof name === 'string' && name !== '', '--package requires a package name');
      packageNames.push(name);
      continue;
    }
    if (argument === '--reason' || argument.startsWith('--reason=')) {
      assert.equal(reason, undefined, 'release reason may be specified once');
      reason = argument === '--reason' ? filtered[++index] : argument.slice('--reason='.length);
      assert.ok(typeof reason === 'string' && reason.trim() !== '', '--reason requires text');
      reason = reason.trim();
      continue;
    }
    assert.equal(releaseBumps.includes(argument), true, `unexpected release argument: ${argument}`);
    assert.equal(requestedBump, undefined, `multiple release bumps: ${requestedBump}, ${argument}`);
    requestedBump = argument;
  }
  assert.equal(new Set(packageNames).size, packageNames.length, 'release packages must be unique');
  assert.equal(reason !== undefined && packageNames.length === 0, false, '--reason requires --package');
  assert.equal(dryRun && packageNames.length === 0, false, '--dry-run requires --package');
  return Object.freeze({ allowDirty, dryRun, packageNames: Object.freeze(packageNames), reason, requestedBump });
}

export function parseStableVersion(version) {
  const match = stableVersionPattern.exec(version);
  assert.notEqual(match, null, `invalid stable version: ${version}`);
  return match.slice(1).map(Number);
}

export function resolveExpectedReleaseTag(explicitTag, environment) {
  if (typeof explicitTag === 'string' && explicitTag !== '') return explicitTag;
  if (typeof environment.RELEASE_TAG === 'string' && environment.RELEASE_TAG !== '') {
    return environment.RELEASE_TAG;
  }
  if (
    environment.GITHUB_REF_TYPE === 'tag'
    && typeof environment.GITHUB_REF_NAME === 'string'
    && environment.GITHUB_REF_NAME !== ''
  ) {
    return environment.GITHUB_REF_NAME;
  }
  return undefined;
}

export function bumpVersion(version, bump) {
  const [major, minor, patch] = parseStableVersion(version);
  if (bump === 'major') return `${major + 1}.0.0`;
  if (bump === 'minor') return `${major}.${minor + 1}.0`;
  assert.equal(bump, 'patch', `invalid release bump: ${bump}`);
  return `${major}.${minor}.${patch + 1}`;
}

export function releaseBumpChoices(version, recommendedBump) {
  assert.equal(releaseBumps.includes(recommendedBump), true, `invalid recommended release bump: ${recommendedBump}`);
  return releaseBumps.map((bump, index) => Object.freeze({
    bump,
    index: index + 1,
    version: bumpVersion(version, bump),
    recommended: bump === recommendedBump,
  }));
}

export function parseReleaseBumpChoice(input, recommendedBump) {
  assert.equal(releaseBumps.includes(recommendedBump), true, `invalid recommended release bump: ${recommendedBump}`);
  const choice = input.trim();
  if (choice === '') return recommendedBump;
  const numericIndex = Number(choice);
  if (Number.isInteger(numericIndex) && numericIndex >= 1 && numericIndex <= releaseBumps.length) {
    return releaseBumps[numericIndex - 1];
  }
  assert.equal(releaseBumps.includes(choice), true, 'select patch, minor, major, or 1, 2, 3');
  return choice;
}

export function classifyReleaseBranch(localHead, remoteHead, remoteIsAncestor) {
  if (localHead === remoteHead) return 'synchronized';
  return remoteIsAncestor ? 'ahead' : 'blocked';
}

export function recommendBump(commits) {
  const breaking = commits.find(({ subject, body }) => breakingSubjectPattern.test(subject) || breakingBodyPattern.test(body));
  if (breaking !== undefined) return { bump: 'major', reason: breaking.subject };

  const feature = commits.find(({ subject }) => featureSubjectPattern.test(subject));
  if (feature !== undefined) return { bump: 'minor', reason: feature.subject };

  return { bump: 'patch', reason: 'no feature or breaking-change commit found' };
}

export function parseGitLog(output) {
  return output
    .split('\x1e')
    .map((record) => record.trim())
    .filter(Boolean)
    .map((record) => {
      const [hash, shortHash, subject, body = ''] = record.split('\x1f');
      assert.equal([hash, shortHash, subject].every(Boolean), true, `invalid git log record: ${record}`);
      return { hash, shortHash, subject, body: body.trim() };
    });
}

export function formatCommitList(commits) {
  return commits.map(({ shortHash, subject }) => `- ${subject} (${shortHash})`).join('\n');
}

export function formatReleaseNotes(baseTag, commits) {
  return `## Changes since ${baseTag}\n\n${formatCommitList(commits)}\n`;
}

export function filterPackageCommits(commits, directory, changedPathsByHash) {
  const packagePrefix = `packages/${directory}/`;
  const changelogPath = `${packagePrefix}CHANGELOG.md`;
  return commits.filter(({ hash }) => {
    const changedPaths = changedPathsByHash.get(hash);
    assert.notEqual(changedPaths, undefined, `missing changed paths for commit ${hash}`);
    return changedPaths.some((path) => path.startsWith(packagePrefix) && path !== changelogPath);
  });
}

export function prependChangelog(document, packageName, version, commits) {
  return prependChangelogChanges(document, packageName, version,
    commits.length === 0 ? ['No package-specific changes.'] : commits.map(({ shortHash, subject }) => `${subject} (${shortHash})`));
}

export function prependChangelogChanges(document, packageName, version, changes) {
  const heading = `# ${packageName}`;
  assert.equal(document.startsWith(heading), true, `changelog must start with ${heading}`);
  const rest = document.slice(heading.length).trimStart();
  assert.ok(changes.length > 0, 'release changelog requires at least one change');
  const entry = `## ${version}\n\n### Changes\n\n${changes.map((change) => `- ${change}`).join('\n')}`;
  const history = rest.trimEnd();
  return history === '' ? `${heading}\n\n${entry}\n` : `${heading}\n\n${entry}\n\n${history}\n`;
}
