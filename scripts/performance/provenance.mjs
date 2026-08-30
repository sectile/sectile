import { createHash } from 'node:crypto';
import { cpus, platform, arch, release } from 'node:os';
import { readFile, readdir, stat } from 'node:fs/promises';
import { relative, resolve } from 'node:path';
import { publishedPackageDirectories } from '../lib/published-packages.mjs';

const FINGERPRINT_INPUTS = Object.freeze([
  'package.json',
  'pnpm-lock.yaml',
  'scripts/performance',
  ...publishedPackageDirectories.flatMap((packageName) => [
    `packages/${packageName}/package.json`,
    `packages/${packageName}/dist`,
  ]),
]);

export async function collectProvenance(repoRoot, workloadFingerprint) {
  const cpu = cpus()[0];
  return Object.freeze({
    node: process.version,
    v8: process.versions.v8,
    platform: platform(),
    architecture: arch(),
    osRelease: release(),
    cpuModel: cpu?.model ?? 'unknown',
    cpuCount: cpus().length,
    execArgv: Object.freeze([...process.execArgv].sort()),
    workloadFingerprint,
    buildFingerprint: await fingerprintPaths(repoRoot, FINGERPRINT_INPUTS),
    packageFootprint: await packageFootprint(repoRoot),
  });
}

async function packageFootprint(repoRoot) {
  const result = {};
  for (const packageName of publishedPackageDirectories) {
    result[packageName] = await directoryBytes(resolve(repoRoot, `packages/${packageName}/dist`));
  }
  return Object.freeze(result);
}

async function directoryBytes(path) {
  let total = 0;
  for (const file of await filesUnder(path)) total += (await stat(file)).size;
  return total;
}

export function compatibilityMetadata(provenance) {
  return Object.freeze({
    node: provenance.node,
    v8: provenance.v8,
    platform: provenance.platform,
    architecture: provenance.architecture,
    osRelease: provenance.osRelease,
    cpuModel: provenance.cpuModel,
    cpuCount: provenance.cpuCount,
    execArgv: provenance.execArgv,
    workloadFingerprint: provenance.workloadFingerprint,
  });
}

async function fingerprintPaths(repoRoot, paths) {
  const hash = createHash('sha256');
  for (const input of paths) {
    const absolute = resolve(repoRoot, input);
    for (const file of await filesUnder(absolute)) {
      hash.update(relative(repoRoot, file));
      hash.update('\0');
      hash.update(await readFile(file));
      hash.update('\0');
    }
  }
  return hash.digest('hex');
}

async function filesUnder(path) {
  const metadata = await stat(path);
  if (metadata.isFile()) return [path];
  const entries = await readdir(path, { withFileTypes: true });
  const files = [];
  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    const child = resolve(path, entry.name);
    if (entry.isDirectory()) files.push(...await filesUnder(child));
    else if (entry.isFile()) files.push(child);
  }
  return files;
}
