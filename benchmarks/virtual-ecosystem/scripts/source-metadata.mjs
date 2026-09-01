import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { relative, resolve, sep } from 'node:path';

const benchmarkRoot = resolve(import.meta.dirname, '..');
const repoRoot = resolve(benchmarkRoot, '../..');
const sourcePaths = Object.freeze([
  'benchmarks/virtual-ecosystem/package.json',
  'benchmarks/virtual-ecosystem/vite.config.ts',
  'benchmarks/virtual-ecosystem/scripts/source-metadata.mjs',
  'benchmarks/virtual-ecosystem/src',
  'packages/dom/src/virtual.ts',
  'packages/virtual/package.json',
  'packages/virtual/src',
  'packages/vue/src/virtual-list.ts',
  'packages/vue/src/virtual-grid.ts',
  'packages/vue/src/virtual-masonry.ts',
  'packages/vue/src/virtual-spatial.ts',
  'packages/vue/src/virtual-core.ts',
  'packages/vue/src/internal/virtual-core.ts',
  'packages/vue/src/internal/virtual-collection.ts',
  'packages/vue/src/internal/virtual-collection-model.ts',
  'packages/vue/src/internal/virtual-list.ts',
  'pnpm-lock.yaml',
]);

export function benchmarkSourceMetadata() {
  const files = sourcePaths
    .flatMap((path) => collectFiles(resolve(repoRoot, path)))
    .sort((left, right) => left.localeCompare(right));
  const hash = createHash('sha256');
  for (const file of files) {
    hash.update(relative(repoRoot, file).split(sep).join('/'));
    hash.update('\0');
    hash.update(readFileSync(file, 'utf8').replaceAll('\r\n', '\n'));
    hash.update('\0');
  }
  const gitCommit = git(['rev-parse', 'HEAD']);
  const gitStatus = git(['status', '--porcelain', '--', ...sourcePaths]);
  return Object.freeze({
    gitCommit,
    gitDirty: gitStatus.length > 0,
    buildFingerprint: hash.digest('hex'),
  });
}

export function assertCompatibleSource(left, right) {
  const leftFingerprint = left?.source?.buildFingerprint;
  const rightFingerprint = right?.source?.buildFingerprint;
  if (typeof leftFingerprint !== 'string' || typeof rightFingerprint !== 'string') {
    throw new Error('Cannot merge benchmark reports without source provenance. Run and commit the complete suite.');
  }
  if (leftFingerprint !== rightFingerprint) {
    throw new Error('Cannot merge benchmark reports produced from different source builds. Run and commit the complete suite.');
  }
}

export function mergeRuns(...reports) {
  const runs = {};
  for (const report of reports) {
    for (const [runId, run] of Object.entries(report?.runs ?? {})) {
      const existing = runs[runId];
      if (existing !== undefined && JSON.stringify(existing) !== JSON.stringify(run)) {
        throw new Error(`Benchmark run ${runId} has conflicting provenance.`);
      }
      runs[runId] = run;
    }
  }
  return runs;
}

function collectFiles(path) {
  const stats = statSync(path);
  if (stats.isFile()) return [path];
  return readdirSync(path, { withFileTypes: true }).flatMap((entry) => (
    collectFiles(resolve(path, entry.name))
  ));
}

function git(args) {
  return execFileSync('git', args, { cwd: repoRoot, encoding: 'utf8' }).trim();
}
