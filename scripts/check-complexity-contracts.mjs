#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  COMPLEXITY_SCHEMA_VERSION,
  PACKAGE_NAMES,
  compareRuntimeCoverage,
  deriveRuntimeContracts,
  expandOperation,
  validateAliasContracts,
  validateFragment,
  validateTemplates,
} from './lib/complexity-contracts.mjs';
import {
  COMPLEXITY_SCALES,
  runDeterministicWitness,
  runHostResourceWitness,
} from '../verification/complexity-contracts/witnesses.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const contractsRoot = resolve(repoRoot, 'verification/complexity-contracts');
const aggregatePath = resolve(contractsRoot, 'aggregate.json');
const documentationPath = resolve(repoRoot, 'docs/performance/complexity.md');
const write = process.argv.includes('--write');

const templateDocument = validateTemplates(await readJSON(resolve(contractsRoot, 'templates.json')));
const fragments = [];
for (const packageName of PACKAGE_NAMES) {
  const packageRoot = resolve(contractsRoot, packageName);
  for (const file of (await readdir(packageRoot)).filter((name) => name.endsWith('.json')).sort()) {
    const fragment = validateFragment(await readJSON(resolve(packageRoot, file)), templateDocument.templates);
    assert.equal(fragment.package, packageName, `${packageName}/${file}: package path mismatch.`);
    fragments.push(fragment);
  }
}

const publicContracts = [];
const internalOperations = [];
const runtimeInventory = [];
for (const packageName of PACKAGE_NAMES) {
  const publicFragments = fragments.filter((fragment) => fragment.package === packageName && fragment.kind === 'public-runtime');
  assert.equal(publicFragments.length, 1, `${packageName}: exactly one public-runtime fragment required.`);
  const inventory = await deriveRuntimeInventory(packageName);
  runtimeInventory.push(...inventory);
  publicContracts.push(...deriveRuntimeContracts(
    packageName,
    inventory,
    publicFragments[0],
    templateDocument.templates,
  ));
  for (const fragment of fragments.filter((entry) => entry.package === packageName && entry.kind === 'internal-operations')) {
    for (const operation of fragment.operations) {
      await stat(resolve(repoRoot, operation.source));
      internalOperations.push(Object.freeze({
        package: packageName,
        surface: fragment.surface,
        ...expandOperation(operation, templateDocument.templates),
      }));
    }
  }
}

const coverage = compareRuntimeCoverage(
  runtimeInventory.map(({ key }) => key),
  publicContracts.map(({ key }) => key),
);
assert.deepEqual(coverage, { missing: [], extra: [] }, 'Runtime complexity coverage mismatch.');
validateAliasContracts(publicContracts);
assert.deepEqual(
  internalOperations.map(({ package: packageName, id }) => `${packageName}:${id}`),
  [...new Set(internalOperations.map(({ package: packageName, id }) => `${packageName}:${id}`))],
  'Internal complexity operation keys must be globally unique.',
);

const aggregate = Object.freeze({
  schemaVersion: COMPLEXITY_SCHEMA_VERSION,
  generated: true,
  packages: PACKAGE_NAMES,
  templates: templateDocument.templates,
  runtimeExports: Object.freeze(publicContracts.map(({ contract: _contract, ...entry }) => Object.freeze(entry))),
  internalOperations: Object.freeze(internalOperations),
  witnesses: Object.freeze({
    scaling: Object.freeze(COMPLEXITY_SCALES.map((size) => {
      const { elapsedMilliseconds: _elapsedMilliseconds, ...evidence } = runDeterministicWitness(size);
      return evidence;
    })),
    hostResources: runHostResourceWitness(),
  }),
});
const aggregateSource = `${JSON.stringify(aggregate, null, 2)}\n`;
const documentationSource = renderDocumentation(aggregate);

if (write) {
  await writeFile(aggregatePath, aggregateSource, 'utf8');
  await writeFile(documentationPath, documentationSource, 'utf8');
} else {
  assert.equal(await readFile(aggregatePath, 'utf8'), aggregateSource, 'Complexity aggregate is stale; run pnpm update:complexity.');
  assert.equal(await readFile(documentationPath, 'utf8'), documentationSource, 'Complexity documentation is stale; run pnpm update:complexity.');
}

console.log(JSON.stringify({
  status: 'passed',
  packages: PACKAGE_NAMES.length,
  runtimeExports: publicContracts.length,
  internalOperations: internalOperations.length,
  mode: write ? 'write' : 'check',
}, null, 2));

async function deriveRuntimeInventory(packageName) {
  const packageRoot = resolve(repoRoot, 'packages', packageName);
  const packageJSON = await readJSON(resolve(packageRoot, 'package.json'));
  const entries = Object.entries(packageJSON.exports ?? {})
    .filter(([subpath]) => subpath !== './package.json')
    .sort(([left], [right]) => subpathOrder(left, right));
  const objectBindings = new WeakMap();
  let nextBinding = 0;
  const inventory = [];
  for (const [subpath, target] of entries) {
    const runtimeTarget = typeof target === 'string' ? target : target.import ?? target.default;
    assert.equal(typeof runtimeTarget, 'string', `${packageName}:${subpath}: runtime export target required.`);
    const module = await import(pathToFileURL(resolve(packageRoot, runtimeTarget)).href);
    for (const exportName of Object.keys(module).sort()) {
      const value = module[exportName];
      const kind = typeof value === 'function'
        ? 'function'
        : typeof value === 'object' && value !== null
          ? 'object'
          : 'primitive';
      let binding;
      if ((typeof value === 'object' && value !== null) || typeof value === 'function') {
        binding = objectBindings.get(value);
        if (binding === undefined) {
          binding = `${packageName}:binding:${nextBinding}`;
          nextBinding += 1;
          objectBindings.set(value, binding);
        }
      } else {
        binding = `${packageName}:${subpath}:${exportName}:primitive`;
      }
      inventory.push(Object.freeze({
        key: `${packageName}:${subpath}:${exportName}`,
        package: packageName,
        subpath,
        exportName,
        kind,
        binding,
      }));
    }
  }
  return Object.freeze(inventory);
}

function renderDocumentation(aggregate) {
  const lines = [
    '# Complexity contracts',
    '',
    '> Generated by `pnpm update:complexity`; edit package fragments under `verification/complexity-contracts/`.',
    '',
    'Every runtime ESM export inherits an explicit package public contract. Hot internal operations override the conservative public ceiling with source proof, adversarial witnesses, deterministic work assertions, and benchmark evidence.',
    '',
    '## Coverage',
    '',
    '| Package | Runtime export keys | Aliases | Internal hot operations |',
    '|---|---:|---:|---:|',
  ];
  for (const packageName of PACKAGE_NAMES) {
    const exports = aggregate.runtimeExports.filter((entry) => entry.package === packageName);
    const aliases = exports.filter((entry) => entry.aliasOf !== null);
    const internal = aggregate.internalOperations.filter((entry) => entry.package === packageName);
    lines.push(`| ${packageName} | ${exports.length} | ${aliases.length} | ${internal.length} |`);
  }
  lines.push(
    '',
    '## Variables',
    '',
    '- `nInput`, `nState`, `nOutput`: external input, retained canonical state, and produced output cardinality.',
    '- Surface-specific variables are declared beside each operation and include explicit resource ceilings.',
    '- Time distinguishes worst-case, expected, and amortized bounds plus external/trusted/mounted/connected state.',
    '- Space is split into auxiliary, output, and retained space; resources separately count allocations, cache entries, listeners, observers, timers, and subscriptions.',
    '',
    '## Registered hot operations',
    '',
    '| Operation | Runtime state | Time | Auxiliary | Output | Retained | Full scan | Evidence |',
    '|---|---|---:|---:|---:|---:|---|---|',
  );
  for (const operation of aggregate.internalOperations) {
    const contract = operation.contract;
    lines.push(`| ${operation.package}:${operation.id} | ${contract.time.runtimeState} | \`${contract.time.bound}\` ${contract.time.kind} | \`${contract.space.auxiliary}\` | \`${contract.space.output}\` | \`${contract.space.retained}\` | ${contract.fullScan.allowed ? 'allowed' : 'forbidden'} | ${contract.evidence.join(', ')} |`);
  }
  lines.push(
    '',
    '## Deterministic scaling evidence',
    '',
    '| Scale | Sequence predicate calls | Selection domain `at` calls | Grid scan/callbacks | Tree expansion reads | Text output code units |',
    '|---:|---:|---:|---:|---:|---:|',
  );
  for (const witness of aggregate.witnesses.scaling) {
    lines.push(`| ${witness.size} | ${witness.sequence.predicateCalls} | ${witness.selection.at} | ${witness.grid.scanned}/${witness.grid.eligibleCalls} | ${witness.tree.expansionReads} | ${witness.text.outputCodeUnits} |`);
  }
  lines.push(
    '',
    `Host resource witness: ${aggregate.witnesses.hostResources.reducerCalls} reducer call, ${aggregate.witnesses.hostResources.effectCalls} effect projection, ${aggregate.witnesses.hostResources.facadeNotifications} notifications, ${aggregate.witnesses.hostResources.subscriptions} retained subscriptions, ${aggregate.witnesses.hostResources.disconnects} disconnect.`,
    '',
    '## Why this is required',
    '',
    '- A latency sample cannot distinguish an algorithmic regression from runner noise; operation bounds and deterministic counters identify the changed work directly.',
    '- Time alone hides output lower bounds, temporary allocation, retained indexes, and leaked listeners/observers/timers/subscriptions; separate space/resource contracts make those costs reviewable.',
    '- Export-derived coverage prevents a new public or internal hot operation from escaping review, while explicit inheritance keeps aliases compatible without a second hand-maintained export list.',
    '- The dependency-ordered workstream can optimize structures before composites and hosts because each consumer has a checked ceiling and evidence key to preserve.',
    '',
    '## Verification',
    '',
    '`pnpm check:complexity` rebuilds the runtime inventory from fresh package export maps and ESM namespaces, expands explicit inheritance and aliases, rejects missing or extra keys, checks stronger specification ceilings, and verifies this document and the aggregate for drift. `pnpm test:complexity` runs adversarial schema fixtures and deterministic work/resource witnesses at 1k, 10k, and 100k.',
    '',
  );
  return lines.join('\n');
}

function subpathOrder(left, right) {
  if (left === '.') return 1;
  if (right === '.') return -1;
  return left.localeCompare(right);
}

async function readJSON(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}
