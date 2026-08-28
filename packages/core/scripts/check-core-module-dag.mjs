#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { analyzeCoreModuleDAG, validateGeneratedArtifacts } from './lib/core-module-dag.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const graph = await analyzeCoreModuleDAG(root);
const storedGraph = JSON.parse(await readFile(resolve(root, '../../verification/core-layers/graph.json'), 'utf8'));
validateGeneratedArtifacts(
  graph,
  storedGraph,
  await readFile(resolve(root, '../../docs/engineering/core-module-dag.md'), 'utf8'),
);
console.log(JSON.stringify({ status: 'passed', modules: graph.modules.length, edges: graph.edges.length, publicSubpaths: graph.publicSubpaths.length }));
