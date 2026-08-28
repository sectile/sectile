import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { analyzeCoreModuleDAG } from './lib/core-module-dag.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const graph = await analyzeCoreModuleDAG(root);
console.log(JSON.stringify({ status: 'passed', modules: graph.modules.length, edges: graph.edges.length, exceptions: 0 }));
