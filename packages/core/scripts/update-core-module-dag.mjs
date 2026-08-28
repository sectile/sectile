#!/usr/bin/env node
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { analyzeCoreModuleDAG, renderCoreModuleDAG } from './lib/core-module-dag.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const graph = await analyzeCoreModuleDAG(root);
const verification = resolve(root, '../../verification/core-layers');
await mkdir(verification, { recursive: true });
await writeFile(resolve(verification, 'graph.json'), `${JSON.stringify(graph, null, 2)}\n`, 'utf8');
await writeFile(resolve(root, '../../docs/engineering/core-module-dag.md'), renderCoreModuleDAG(graph), 'utf8');
console.log(JSON.stringify({ status: 'updated', modules: graph.modules.length, edges: graph.edges.length, publicSubpaths: graph.publicSubpaths.length }));
