import assert from 'node:assert/strict';

const stableVersionPattern = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
const breakingSubjectPattern = /^[A-Za-z]+(?:\([^)]*\))?!:/;
const featureSubjectPattern = /^feat(?:\([^)]*\))?:/;
const breakingBodyPattern = /(^|\s)BREAKING CHANGE:/;
export const releaseBumps = Object.freeze(['patch', 'minor', 'major']);

export function parseReleaseArguments(args) {
  let allowDirty = false;
  let dryRun = false;
  for (const argument of args.filter((candidate) => candidate !== '--')) {
    if (argument === '--allow-dirty') {
      allowDirty = true;
      continue;
    }
    if (argument === '--dry-run') {
      dryRun = true;
      continue;
    }
    throw new Error(`unexpected release argument: ${argument}; pnpm release does not accept bump or package overrides`);
  }
  return Object.freeze({ allowDirty, dryRun });
}

export function parseReleaseConfirmation(input) {
  const answer = input.trim().toLowerCase();
  if (answer === 'y' || answer === 'yes') return true;
  if (answer === '' || answer === 'n' || answer === 'no') return false;
  throw new Error('answer y or n');
}

export function selectReleaseTrack(dryRun, independentBaseline) {
  assert.equal(typeof dryRun, 'boolean', 'release dry-run marker must be boolean');
  assert.equal(typeof independentBaseline, 'boolean', 'independent release baseline marker must be boolean');
  return dryRun || independentBaseline ? 'independent' : 'synchronized';
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

export function formatIndependentReleaseNotes(releaseTag, entries) {
  assert.ok(entries.length > 0, 'independent release notes require at least one package');
  const commits = [];
  const seen = new Set();
  for (const entry of entries) {
    for (const commit of entry.commits ?? []) {
      if (seen.has(commit.hash)) continue;
      seen.add(commit.hash);
      commits.push(commit);
    }
  }
  const packages = entries
    .map(({ name, previousVersion, version }) => `- ${name}: ${previousVersion} -> ${version}`)
    .join('\n');
  const changes = commits.length === 0 ? '- No direct package commits.' : formatCommitList(commits);
  return `Sectile ${releaseTag}\n\n## Packages\n\n${packages}\n\n## Changes\n\n${changes}\n`;
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
