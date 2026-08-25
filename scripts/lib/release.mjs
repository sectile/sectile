import assert from 'node:assert/strict';

const stableVersionPattern = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
const breakingSubjectPattern = /^[A-Za-z]+(?:\([^)]*\))?!:/;
const featureSubjectPattern = /^feat(?:\([^)]*\))?:/;
const breakingBodyPattern = /(^|\s)BREAKING CHANGE:/;

export function parseStableVersion(version) {
  const match = stableVersionPattern.exec(version);
  assert.notEqual(match, null, `invalid stable version: ${version}`);
  return match.slice(1).map(Number);
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

export function prependChangelog(document, packageName, version, commits) {
  const heading = `# ${packageName}`;
  assert.equal(document.startsWith(heading), true, `changelog must start with ${heading}`);
  const rest = document.slice(heading.length).trimStart();
  const entry = `## ${version}\n\n### Changes\n\n${formatCommitList(commits)}`;
  return `${heading}\n\n${entry}\n\n${rest.trimEnd()}\n`;
}
