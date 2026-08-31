import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

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

export async function writeGroupEvidence(group, paths) {
  const tests = [];
  for (const path of paths) {
    const source = await readFile(path, 'utf8');
    const pattern = /test\((['"`])([^'"`\n]+)\1/gu;
    for (const match of source.matchAll(pattern)) {
      const title = match[2];
      const id = /^([A-Z]+-[A-Z]+-\d+)/u.exec(title)?.[1];
      if (id !== undefined) tests.push(Object.freeze({ id, title, file: path, sha256: hash(source) }));
    }
  }
  tests.sort((left, right) => left.id.localeCompare(right.id) || left.title.localeCompare(right.title));
  const failures = expectedFailures[group];
  if (failures === undefined) throw new Error(`No evidence contract for test group: ${group}`);
  if (tests.length === 0) throw new Error(`No named law evidence found for test group: ${group}`);
  const evidence = Object.freeze({
    schemaVersion: 1,
    package: '@sectile/tabular',
    group,
    seed,
    tests: Object.freeze(tests),
    expectedFailures: failures,
  });
  await mkdir('verification', { recursive: true });
  const bytes = `${JSON.stringify(evidence, null, 2)}\n`;
  await writeFile(`verification/${group}.json`, bytes);
  return Object.freeze({ sha256: hash(bytes), tests: tests.length, expectedFailures: failures.length });
}

function hash(value) {
  return createHash('sha256').update(value.toString().replaceAll('\r\n', '\n')).digest('hex');
}
