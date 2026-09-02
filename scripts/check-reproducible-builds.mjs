#!/usr/bin/env node
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { verifyReproducibleBuild } from './lib/reproducible-build.mjs';
import { root } from './lib/repository.mjs';
import { loadPublishedPackageGraph } from './lib/workspace-graph.mjs';

const arguments_ = process.argv.slice(2).filter((argument) => argument !== '--');
const prepared = arguments_.includes('--prepared');
const packageArguments = arguments_.filter((argument) => !argument.startsWith('--'));
const unexpected = arguments_.filter((argument) => argument.startsWith('--') && argument !== '--prepared');
assert.deepEqual(unexpected, [], `unexpected reproducible-build options: ${unexpected.join(', ')}`);
assert.ok(packageArguments.length > 0, 'reproducible-build verification requires at least one package');

const graph = await loadPublishedPackageGraph();
const requested = new Set(packageArguments.map((value) => {
  const normalized = value.startsWith('@sectile/') ? value : `@sectile/${value}`;
  assert.ok(graph.byName.has(normalized), `unknown reproducible-build package: ${value}`);
  return normalized;
}));
const results = [];
for (const entry of graph.order) {
  if (!requested.has(entry.name)) continue;
  results.push(Object.freeze({
    package: entry.name,
    ...await verifyReproducibleBuild(join(root, 'packages', entry.directory), {
      prepared,
      label: entry.name,
    }),
  }));
}
assert.equal(results.length, requested.size, 'reproducible-build package selection is incomplete');
console.log(JSON.stringify({ status: 'passed', prepared, packages: results }, null, 2));
