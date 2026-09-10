import { createHash } from 'node:crypto';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';

const seed = 'sectile-tabular-v1';

const expectedFailures = Object.freeze({
  model: [
    'codec collision and round-trip',
    'malformed identity',
    'resource ceiling',
    'stale controlled proposal',
  ],
  source: [
    'duplicate descriptor identity',
    'non-JSON cyclic and over-limit query value',
    'stale mismatched and out-of-order response',
    'wrong generation and revision envelope',
    'unknown page response',
    'unknown-total window success',
  ],
  columns: [
    'duplicate dynamic identity',
    'removed descriptor reconciliation',
    'hidden logical pin',
    'all-pinned and center-only partitions',
  ],
  selection: [
    'source reset',
    'query reset',
    'access preservation',
    'authoritative deletion delta',
    'unloaded group-leaf intent',
    'selection and exclusion ceilings',
  ],
  advanced: [
    'group identity collision',
    'context-only ancestor projection',
    'empty group policy',
    'read-only aggregate cell',
    'stable pivot order',
  ],
  profiles: [
    'hierarchical DataGrid rejection',
    'profile authority isolation',
    'exact semantic command payload',
    'absence of reveal commands',
    'cursor edit and expansion recovery',
  ],
  virtual: [
    'missing optional peer',
    'stale Virtual generation',
    'measured extent preservation',
    'partition mutation mismatch',
  ],
  'virtual-witnesses': [
    'projection generation propagation',
    'off-window reveal register focus',
    'no application-authored mapper',
  ],
});

export const evidenceGroups = Object.freeze([
  'model',
  'source',
  'columns',
  'selection',
  'advanced',
  'profiles',
  'virtual',
]);

export async function groupTestPaths(group) {
  evidenceContract(group);
  const directory = `tests/${group}`;
  const paths = (await readdir(directory))
    .filter((name) => name.endsWith('.test.mjs'))
    .sort()
    .map((name) => `${directory}/${name}`);
  if (paths.length === 0) throw new Error(`${group} has no test files`);
  return Object.freeze(paths);
}

export async function checkAllGroupEvidence() {
  const results = [];
  for (const group of evidenceGroups) results.push(await checkGroupEvidence(group));
  return Object.freeze(results);
}

export async function checkGroupEvidence(group, paths = undefined) {
  const collected = await collectGroupEvidence(group, paths);
  const committed = await readFile(`verification/${group}.json`, 'utf8');
  if (committed !== collected.bytes) {
    throw new Error(`Generated Tabular evidence is stale for ${group}; run node scripts/run-test-group.mjs ${group}.`);
  }
  return collected.summary;
}

export async function writeGroupEvidence(group, paths = undefined) {
  const collected = await collectGroupEvidence(group, paths);
  await mkdir('verification', { recursive: true });
  await writeFile(`verification/${group}.json`, collected.bytes);
  return collected.summary;
}

async function collectGroupEvidence(group, paths) {
  const failures = evidenceContract(group);
  const selectedPaths = paths ?? await groupTestPaths(group);
  const tests = [];
  const ownerByID = new Map();
  for (const path of selectedPaths) {
    const source = await readFile(path, 'utf8');
    const sourceHash = hash(source);
    const pattern = /test\((['"`])([^'"`\n]+)\1/gu;
    for (const match of source.matchAll(pattern)) {
      const title = match[2];
      const id = /^([A-Z]+-[A-Z]+-\d+)/u.exec(title)?.[1];
      if (id === undefined) continue;
      const previous = ownerByID.get(id);
      if (previous !== undefined) throw new Error(`Duplicate Tabular law ID ${id}: ${previous} and ${path}`);
      ownerByID.set(id, path);
      tests.push(Object.freeze({ id, title, file: path, sha256: sourceHash }));
    }
  }
  tests.sort((left, right) => left.id.localeCompare(right.id) || left.title.localeCompare(right.title));
  if (tests.length === 0) throw new Error(`No named law evidence found for test group: ${group}`);
  const evidence = Object.freeze({
    schemaVersion: 1,
    package: '@sectile/tabular',
    group,
    seed,
    tests: Object.freeze(tests),
    expectedFailures: failures,
  });
  const bytes = `${JSON.stringify(evidence, null, 2)}\n`;
  return Object.freeze({
    bytes,
    summary: Object.freeze({ sha256: hash(bytes), tests: tests.length, expectedFailures: failures.length }),
  });
}

function evidenceContract(group) {
  const failures = expectedFailures[group];
  if (failures === undefined) throw new Error(`No evidence contract for test group: ${group}`);
  return failures;
}

function hash(value) {
  return createHash('sha256').update(value.toString().replaceAll('\r\n', '\n')).digest('hex');
}
