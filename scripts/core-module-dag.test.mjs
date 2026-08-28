import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
  analyzeCoreModuleDAG,
  classifyModule,
  renderCoreModuleDAG,
  validateEdges,
  validateGeneratedArtifacts,
  validateNoCycles,
  validatePublicSubpaths,
} from '../packages/core/scripts/lib/core-module-dag.mjs';

const manifest = JSON.parse(await readFile('verification/core-layers/manifest.json', 'utf8'));

test('Core source and public DAG is complete and exception-free', async () => {
  const graph = await analyzeCoreModuleDAG('packages/core');
  assert.equal(graph.cycles.length, 0);
  assert.equal(graph.upwardEdges.length, 0);
  assert.ok(graph.modules.length > 0);
  const grid = graph.publicSubpaths.find(({ subpath }) => subpath === './grid');
  const control = graph.publicSubpaths.find(({ subpath }) => subpath === './grid-control');
  assert.deepEqual(grid.facadeTargets.filter((target) => target.includes('composites')), []);
  assert.deepEqual(control.facadeTargets, [
    'src/internal/composites/grid-control.ts',
    'src/shared.ts',
    'src/structures/grid.ts',
  ]);
});

test('intentional unclassified module, upward edge, and cycle fixtures fail', () => {
  assert.throws(() => classifyModule('src/internal/unknown/new-structure.ts', manifest), /Unclassified Core source/u);
  const modules = [
    { path: 'src/structures/grid.ts', layer: 'structures' },
    { path: 'src/internal/composites/grid-control.ts', layer: 'composites' },
  ];
  assert.throws(
    () => validateEdges(modules, [{ source: modules[0].path, target: modules[1].path, kind: 'export' }], manifest),
    /Core upward edges/u,
  );
  assert.throws(
    () => validateNoCycles(['a.ts', 'b.ts'], [
      { source: 'a.ts', target: 'b.ts', kind: 'import' },
      { source: 'b.ts', target: 'a.ts', kind: 'import' },
    ]),
    /Core source cycles/u,
  );
});

test('intentional old facade, public target, and generated-doc drift fixtures fail', async () => {
  const graph = await analyzeCoreModuleDAG('packages/core');
  const packageJSON = JSON.parse(await readFile('packages/core/package.json', 'utf8'));
  const modules = new Map(graph.modules.map((module) => [module.path, module]));
  const changed = structuredClone(packageJSON.exports);
  changed['./grid'].import = './dist/grid-control.js';
  assert.throws(
    () => validatePublicSubpaths(changed, manifest.publicSubpaths, modules, graph.edges),
    /runtime target drifted/u,
  );
  const generated = renderCoreModuleDAG(graph);
  assert.throws(
    () => validateGeneratedArtifacts(graph, graph, `${generated}stale\n`),
    /documentation drifted/u,
  );
});
