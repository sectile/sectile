import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..', '..');
const manifest = JSON.parse(await readFile(resolve(import.meta.dirname, 'traceability-manifest.json'), 'utf8'));
assert.equal(manifest.schemaVersion, 1);
assert.deepEqual(Object.keys(manifest.requirements), ids('REQ', 24), 'REQ-001..024 must have one owner each.');
assert.deepEqual(Object.keys(manifest.acceptance), ids('AC', 19), 'AC-001..019 must have one closing validation each.');
assert.deepEqual(Object.keys(manifest.workItems), ids('WI', 17), 'WI-001..017 must have evidence.');
assert.deepEqual(manifest.validations, ids('VAL', 18), 'VAL-001..018 must be exact.');

for (const owner of Object.values(manifest.requirements)) assert.ok(Object.hasOwn(manifest.workItems, owner), `unknown requirement owner ${owner}`);
for (const closer of Object.values(manifest.acceptance)) assert.ok(manifest.validations.includes(closer), `unknown acceptance closer ${closer}`);

const evidenceFiles = [...new Set(Object.values(manifest.workItems).flat())].sort();
const evidence = [];
for (const path of evidenceFiles) {
  assert.equal((await stat(resolve(root, path))).isFile(), true, `missing evidence ${path}`);
  evidence.push({ path, sha256: hash(await readFile(resolve(root, path))) });
}

const npmrc = await readFile(resolve(root, '.npmrc'), 'utf8');
assert.match(npmrc, /^store-dir=\.pnpm-store$/mu);
assert.match(npmrc, /^verify-deps-before-run=error$/mu);

const packageNames = ['tabular', 'dom', 'vue'];
const publicExports = [];
for (const name of packageNames) {
  const packagePath = resolve(root, 'packages', name, 'package.json');
  const pkg = JSON.parse(await readFile(packagePath, 'utf8'));
  const selected = name === 'tabular'
    ? Object.keys(pkg.exports).filter((subpath) => subpath !== './package.json')
    : ['./data-table', './data-grid', './data-tree-grid'];
  for (const subpath of selected) {
    const target = pkg.exports[subpath];
    assert.deepEqual(Object.keys(target).sort(), ['default', 'import', 'types'], `invalid export conditions: @sectile/${name}${subpath.slice(1)}`);
    assert.equal((await stat(resolve(root, 'packages', name, target.import))).isFile(), true);
    assert.equal((await stat(resolve(root, 'packages', name, target.types))).isFile(), true);
    publicExports.push(`@sectile/${name}${subpath === '.' ? '' : subpath.slice(1)}`);
  }
}
const tabular = JSON.parse(await readFile(resolve(root, 'packages/tabular/package.json'), 'utf8'));
assert.equal(tabular.dependencies['@sectile/core'], 'workspace:*');
assert.equal(tabular.peerDependencies['@sectile/virtual'], 'workspace:*');
assert.equal(tabular.peerDependenciesMeta['@sectile/virtual'].optional, true);
const dom = JSON.parse(await readFile(resolve(root, 'packages/dom/package.json'), 'utf8'));
const vue = JSON.parse(await readFile(resolve(root, 'packages/vue/package.json'), 'utf8'));
assert.equal(dom.dependencies['@sectile/tabular'], 'workspace:*');
for (const dependency of ['@sectile/core', '@sectile/dom', '@sectile/tabular', '@sectile/temporal']) {
  assert.equal(vue.dependencies[dependency], 'workspace:*', `Vue declaration dependency missing ${dependency}`);
}

const consumer = JSON.parse(await readFile(resolve(root, 'verification/consumer-install/tabular.json'), 'utf8'));
assert.equal(consumer.status, 'passed');
assert.equal(consumer.declarationClosure.status, 'passed');
assert.equal(consumer.scenarios.length, 6);
assert.ok(consumer.scenarios.every((scenario) => scenario.status === 'passed'));

const implementation = JSON.parse(await readFile(resolve(root, 'packages/tabular/verification/implementation-verification.json'), 'utf8'));
assert.equal(implementation.status, 'passed');
assert.equal(implementation.deterministicEvidence.length, 8);
for (const entry of implementation.deterministicEvidence) {
  const path = resolve(root, 'packages/tabular/verification', `${entry.group}.json`);
  assert.equal(hash(await readFile(path)), entry.sha256, `stale deterministic evidence ${entry.group}`);
}
assert.deepEqual(implementation.benchmark.scales.map((entry) => entry.recordCount), [1_000, 10_000, 100_000]);
assert.ok(implementation.benchmark.scales.every((entry) => entry.completed && entry.operationCount > 0));

const output = {
  schemaVersion: 1,
  package: '@sectile/tabular',
  status: 'passed',
  coverage: {
    requirements: Object.keys(manifest.requirements).length,
    acceptanceCriteria: Object.keys(manifest.acceptance).length,
    workItems: Object.keys(manifest.workItems).length,
    validations: manifest.validations.length,
    publicExports: publicExports.length,
    evidenceFiles: evidence.length,
  },
  requirementOwners: manifest.requirements,
  acceptanceClosers: manifest.acceptance,
  publicExports: publicExports.sort(),
  packedDependencyClosure: consumer.declarationClosure,
  deterministicEvidenceFingerprint: hash(await readFile(resolve(root, 'packages/tabular/verification/implementation-verification.json'))),
  evidence,
};

const writeIndex = process.argv.indexOf('--write');
if (writeIndex >= 0) {
  const target = process.argv[writeIndex + 1];
  assert.equal(typeof target, 'string', '--write requires an evidence path');
  const path = resolve(root, target);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(output, null, 2)}\n`);
}
console.log(`Tabular traceability passed: ${output.coverage.requirements} requirements, ${output.coverage.acceptanceCriteria} acceptance criteria, ${output.coverage.publicExports} exports`);

function ids(prefix, count) {
  return Array.from({ length: count }, (_, index) => `${prefix}-${String(index + 1).padStart(3, '0')}`);
}

function hash(value) {
  return createHash('sha256').update(value).digest('hex');
}
