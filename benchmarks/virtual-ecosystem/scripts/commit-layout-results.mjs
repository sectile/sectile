import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { assertCompatibleSource } from './source-metadata.mjs';

const packageRoot = resolve(import.meta.dirname, '..');
const expectedFamilies = Object.freeze(['flow-grid', 'masonry', 'track-grid', 'spatial']);
const inputPaths = process.argv.slice(2).map((path) => resolve(path));
const outputPath = resolve(packageRoot, 'results/chrome-151-macos-arm64-layouts.json');

if (inputPaths.length === 0) {
  throw new Error('Usage: pnpm commit-layout-results <flow-grid-session.json> <masonry-session.json> <track-grid-session.json> <spatial-session.json>');
}

const sessions = await Promise.all(inputPaths.map(async (path) => JSON.parse(await readFile(path, 'utf8'))));
const reportsByFamily = new Map();

for (const session of sessions) {
  if (session.status !== 'complete') throw new Error('Only complete benchmark sessions can be committed.');
  for (const report of session.reports ?? []) {
    const family = report.conditions?.family;
    if (!expectedFamilies.includes(family)) continue;
    if (reportsByFamily.has(family)) throw new Error(`Duplicate ${family} report.`);
    reportsByFamily.set(family, report);
  }
}

const reports = expectedFamilies.map((family) => {
  const report = reportsByFamily.get(family);
  if (report === undefined) throw new Error(`Missing ${family} report.`);
  return report;
});

for (const report of reports.slice(1)) assertCompatibleSource(reports[0], report);
for (const report of reports) {
  if (report.conditions?.itemCount !== 100_000) throw new Error(`${report.conditions?.family} must use 100,000 items.`);
  const sectileBaselineFailures = (report.layoutFailures ?? []).filter((failure) => failure.library === 'Sectile Virtual');
  const sectileMutationFailures = (report.layoutMutationResults ?? [])
    .filter((result) => result.library === 'Sectile Virtual' && result.failedSamples > 0);
  if (sectileBaselineFailures.length > 0 || sectileMutationFailures.length > 0) {
    throw new Error(`${report.conditions.family} contains Sectile correctness failures.`);
  }
  if (!(report.layoutResults ?? []).some((result) => result.library === 'Sectile Virtual')) {
    throw new Error(`${report.conditions.family} does not contain a Sectile baseline result.`);
  }
  if (!(report.layoutMutationResults ?? []).some((result) => result.library === 'Sectile Virtual')) {
    throw new Error(`${report.conditions.family} does not contain Sectile mutation results.`);
  }
  const sectileCapability = (report.capabilities ?? []).find((capability) => capability.library === 'Sectile Virtual');
  if (sectileCapability === undefined) throw new Error(`${report.conditions.family} does not declare Sectile capabilities.`);
  for (const mode of sectileCapability.modes ?? []) {
    if (!(report.layoutResults ?? []).some((result) => result.library === 'Sectile Virtual' && result.mode === mode)) {
      throw new Error(`${report.conditions.family} is missing the Sectile ${mode} baseline result.`);
    }
    if (sectileCapability.mutations
      && !(report.layoutMutationResults ?? []).some((result) => result.library === 'Sectile Virtual' && result.mode === mode)) {
      throw new Error(`${report.conditions.family} is missing the Sectile ${mode} mutation results.`);
    }
  }
}

const targets = expectedFamilies.map((family, index) => ({
  id: index + 1,
  family,
  preset: 'standard',
  profile: 'all',
  phase: 'both',
  library: 'all',
  baselineMode: 'all',
  mutationMode: 'all',
  operation: 'all',
  location: 'all',
  rows: 100_000,
  baselineRounds: 5,
  warmupScrolls: 5,
  scrollSamples: 20,
  mutationRounds: 5,
  mutationSamples: 10,
}));

const bundle = {
  benchmarkSession: 'sectile-virtual-ecosystem-layouts',
  schemaVersion: 3,
  status: 'complete',
  configuration: { targets },
  reportTargetIDs: targets.map(({ id }) => id),
  reports,
  source: reports[0].source,
};

await writeFile(outputPath, `${JSON.stringify(bundle, null, 2)}\n`, 'utf8');
console.log(`Wrote ${outputPath}`);
