import assert from 'node:assert/strict';
import { bumpVersion, parseStableVersion, releaseBumps } from './release.mjs';

export const releaseManifestFile = 'release-manifest.json';
export const releaseManifestSchemaVersion = 1;
export const independentReleaseBaselineTag = 'v0.14.1';

const legacyReleaseTagPattern = /^v(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/u;
const releaseSetTagPattern = /^release-(\d{14})$/u;
const packageTagPattern = /^(@sectile\/[a-z0-9-]+)@((?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*))$/u;
const publishedDependencyFields = Object.freeze([
  'dependencies',
  'optionalDependencies',
  'peerDependencies',
]);

export function isLegacyReleaseTag(tag) {
  return legacyReleaseTagPattern.test(tag);
}

export function isReleaseSetTag(tag) {
  return releaseSetTagPattern.test(tag);
}

export function assertSynchronizedReleaseBase(tag) {
  assert.equal(isLegacyReleaseTag(tag), true, `latest GitHub release is not a legacy stable tag: ${tag}`);
  assert.notEqual(tag, independentReleaseBaselineTag,
    `synchronized releases ended at ${independentReleaseBaselineTag}; use independent release tracking`);
}

export function createReleaseSetTag(date = new Date()) {
  assert.equal(Number.isNaN(date.getTime()), false, 'release date is invalid');
  return `release-${date.toISOString().replace(/\D/gu, '').slice(0, 14)}`;
}

export function createPackageTag(packageName, version) {
  assert.match(packageName, /^@sectile\/[a-z0-9-]+$/u, `invalid package name: ${packageName}`);
  parseStableVersion(version);
  return `${packageName}@${version}`;
}

export function parsePackageTag(tag) {
  const match = packageTagPattern.exec(tag);
  assert.notEqual(match, null, `invalid package release tag: ${tag}`);
  return Object.freeze({ name: match[1], version: match[2] });
}

export function caretAccepts(baseVersion, candidateVersion) {
  const [baseMajor, baseMinor, basePatch] = parseStableVersion(baseVersion);
  const [major, minor, patch] = parseStableVersion(candidateVersion);
  if (major !== baseMajor) return false;
  if (major > 0) return compareVersions(candidateVersion, baseVersion) >= 0;
  if (minor !== baseMinor) return false;
  if (minor > 0) return patch >= basePatch;
  return patch === basePatch;
}

export function planIndependentVersions(packages, requestedReleases) {
  assert.ok(requestedReleases.length > 0, 'at least one package is required for an independent release');
  const byName = new Map(packages.map((entry) => [entry.name, entry]));
  assert.equal(byName.size, packages.length, 'published package names must be unique');
  const requested = new Map();
  for (const release of requestedReleases) {
    assert.equal(typeof release?.name, 'string', 'release package name is required');
    assert.equal(releaseBumps.includes(release.bump), true, `invalid release bump for ${release.name}: ${release.bump}`);
    assert.equal(requested.has(release.name), false, `duplicate release package: ${release.name}`);
    assert.ok(byName.has(release.name), `unknown release package: ${release.name}`);
    requested.set(release.name, release.bump);
  }

  const planned = new Map();
  for (const [name, bump] of requested) {
    const entry = byName.get(name);
    planned.set(name, releaseEntry(entry, bump, true, []));
  }

  let changed = true;
  while (changed) {
    changed = false;
    for (const entry of packages) {
      if (planned.has(entry.name)) continue;
      const incompatible = publishedDependencies(entry.manifest)
        .map((name) => planned.get(name))
        .filter(Boolean)
        .filter((dependency) => !caretAccepts(dependency.previousVersion, dependency.version));
      if (incompatible.length === 0) continue;
      planned.set(entry.name, releaseEntry(entry, 'patch', false, incompatible.map(({ name }) => name)));
      changed = true;
    }
  }

  return Object.freeze(packages
    .filter(({ name }) => planned.has(name))
    .map(({ name }) => planned.get(name)));
}

export function createReleaseManifest(releaseTag, entries, reason) {
  assert.equal(isReleaseSetTag(releaseTag), true, `invalid release-set tag: ${releaseTag}`);
  assert.ok(entries.length > 0, 'release manifest requires at least one package');
  assert.equal(reason === undefined || (typeof reason === 'string' && reason.trim() !== ''), true,
    'release reason must be non-empty text');
  return Object.freeze({
    schemaVersion: releaseManifestSchemaVersion,
    releaseTag,
    ...(reason === undefined ? {} : { reason: reason.trim() }),
    packages: Object.freeze(entries.map((entry) => Object.freeze({
      name: entry.name,
      directory: entry.directory,
      previousVersion: entry.previousVersion,
      version: entry.version,
      bump: entry.bump,
      tag: createPackageTag(entry.name, entry.version),
      direct: entry.direct,
      dependencies: Object.freeze([...entry.dependencies]),
    }))),
  });
}

export function validateReleaseManifest(manifest, packages, expectedTag) {
  assert.equal(manifest?.schemaVersion, releaseManifestSchemaVersion, 'unsupported release manifest schema');
  assert.equal(manifest.releaseTag, expectedTag, `release manifest tag does not match ${expectedTag}`);
  assert.equal(manifest.reason === undefined || (typeof manifest.reason === 'string' && manifest.reason.trim() !== ''), true,
    'release manifest reason must be non-empty text');
  assert.equal(isReleaseSetTag(expectedTag), true, `invalid release-set tag: ${expectedTag}`);
  assert.ok(Array.isArray(manifest.packages) && manifest.packages.length > 0,
    'release manifest requires at least one package');
  const byName = new Map(packages.map((entry) => [entry.manifest.name, entry]));
  const selected = [];
  const seen = new Set();
  for (const release of manifest.packages) {
    assert.equal(seen.has(release.name), false, `duplicate release package: ${release.name}`);
    seen.add(release.name);
    const entry = byName.get(release.name);
    assert.notEqual(entry, undefined, `unknown release package: ${release.name}`);
    assert.equal(release.directory, entry.directory, `${release.name} release directory drifted`);
    parseStableVersion(release.previousVersion);
    parseStableVersion(release.version);
    assert.equal(releaseBumps.includes(release.bump), true, `${release.name} release bump is invalid`);
    assert.equal(release.version, bumpVersion(release.previousVersion, release.bump),
      `${release.name} release version does not match its ${release.bump} bump`);
    assert.equal(release.tag, createPackageTag(release.name, release.version), `${release.name} release tag drifted`);
    assert.equal(typeof release.direct, 'boolean', `${release.name} direct release marker is invalid`);
    assert.ok(Array.isArray(release.dependencies), `${release.name} release dependencies are invalid`);
    for (const dependency of release.dependencies) {
      assert.ok(byName.has(dependency), `${release.name} has unknown release dependency ${dependency}`);
    }
    assert.equal(release.direct ? release.dependencies.length === 0 : release.dependencies.length > 0, true,
      `${release.name} release propagation metadata is inconsistent`);
    assert.equal(entry.manifest.version, release.version,
      `${release.name} manifest version ${entry.manifest.version} does not match ${release.version}`);
    selected.push(entry);
  }
  return Object.freeze(selected);
}

export function selectReleasePackages(packages, expectedTag, manifest) {
  if (expectedTag === undefined || isLegacyReleaseTag(expectedTag)) return Object.freeze([...packages]);
  const selected = validateReleaseManifest(manifest, packages, expectedTag);
  const names = new Set(selected.map(({ manifest: entryManifest }) => entryManifest.name));
  return Object.freeze(packages.filter(({ manifest: entryManifest }) => names.has(entryManifest.name)));
}

export function assertIndependentDependencyProtocols(packages) {
  const names = new Set(packages.map(({ manifest }) => manifest.name));
  for (const { manifest } of packages) {
    for (const field of publishedDependencyFields) {
      for (const [name, version] of Object.entries(manifest[field] ?? {})) {
        if (!names.has(name)) continue;
        assert.equal(version, 'workspace:^', `${manifest.name} ${field}.${name} must use workspace:^`);
      }
    }
  }
}

function releaseEntry(entry, bump, direct, dependencies) {
  parseStableVersion(entry.manifest.version);
  return Object.freeze({
    name: entry.name,
    directory: entry.directory,
    previousVersion: entry.manifest.version,
    version: bumpVersion(entry.manifest.version, bump),
    bump,
    direct,
    dependencies: Object.freeze(dependencies),
  });
}

function publishedDependencies(manifest) {
  return [...new Set(publishedDependencyFields.flatMap((field) => Object.keys(manifest[field] ?? {})))];
}

function compareVersions(left, right) {
  const leftParts = parseStableVersion(left);
  const rightParts = parseStableVersion(right);
  for (let index = 0; index < leftParts.length; index += 1) {
    if (leftParts[index] !== rightParts[index]) return leftParts[index] < rightParts[index] ? -1 : 1;
  }
  return 0;
}
