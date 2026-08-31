import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { dirname, relative, resolve, sep } from 'node:path';

export async function analyzeCoreModuleDAG(root) {
  const manifest = JSON.parse(await readFile(resolve(root, '../../verification/core-layers/manifest.json'), 'utf8'));
  const packageJSON = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'));
  assert.equal(manifest.schemaVersion, 1, 'unsupported Core layer manifest schema');
  const paths = (await files(resolve(root, 'src')))
    .map((path) => normalize(relative(root, path)))
    .sort();
  const modules = paths.map((path) => Object.freeze({ path, layer: classifyModule(path, manifest) }));
  const byPath = new Map(modules.map((module) => [module.path, module]));
  const edges = [];
  for (const module of modules) {
    const source = await readFile(resolve(root, module.path), 'utf8');
    for (const declaration of declarations(source)) {
      const target = resolveModule(root, module.path, declaration.specifier);
      if (target === null) continue;
      assert.ok(byPath.has(target), `${module.path}: unresolved Core source import ${declaration.specifier}`);
      edges.push(Object.freeze({ source: module.path, target, kind: declaration.kind }));
    }
  }
  edges.sort(compareEdge);
  validateEdges(modules, edges, manifest);
  const cycles = validateNoCycles(modules.map(({ path }) => path), edges);
  const publicSubpaths = validatePublicSubpaths(packageJSON.exports, manifest.publicSubpaths, byPath, edges);
  const reverse = reverseDependencies(modules, edges);
  const blastRadius = modules.map((module) => {
    const dependents = transitiveDependents(module.path, reverse);
    const surfaces = publicSubpaths
      .filter(({ source }) => source !== null && (source === module.path || dependents.has(source)))
      .map(({ subpath }) => subpath);
    return Object.freeze({
      module: module.path,
      directDependents: Object.freeze([...(reverse.get(module.path) ?? [])].sort()),
      transitiveDependentCount: dependents.size,
      publicSubpaths: Object.freeze(surfaces),
    });
  });
  return Object.freeze({
    schemaVersion: 1,
    modules: Object.freeze(modules),
    edges: Object.freeze(edges),
    cycles: Object.freeze(cycles),
    upwardEdges: Object.freeze([]),
    publicSubpaths: Object.freeze(publicSubpaths),
    blastRadius: Object.freeze(blastRadius),
  });
}

export function classifyModule(path, manifest) {
  const exact = manifest.classification.exact[path];
  if (exact !== undefined) return exact;
  const prefix = manifest.classification.prefixes.find((entry) => path.startsWith(entry.prefix));
  if (prefix !== undefined) return prefix.layer;
  const publicEntry = Object.values(manifest.publicSubpaths).find((entry) => entry.source === path);
  assert.ok(publicEntry !== undefined, `Unclassified Core source: ${path}`);
  return 'public';
}

export function validateEdges(modules, edges, manifest) {
  const layers = new Map(modules.map((module) => [module.path, module.layer]));
  const violations = [];
  for (const edge of edges) {
    const sourceLayer = layers.get(edge.source);
    const targetLayer = layers.get(edge.target);
    assert.notEqual(sourceLayer, undefined, `unknown edge source ${edge.source}`);
    assert.notEqual(targetLayer, undefined, `unknown edge target ${edge.target}`);
    if (!manifest.layers[sourceLayer].includes(targetLayer)) {
      violations.push(`${edge.source} -> ${edge.target} (${sourceLayer} cannot depend on ${targetLayer})`);
    }
  }
  assert.deepEqual(violations, [], `Core upward edges:\n${violations.join('\n')}`);
}

export function detectCycles(modulePaths, edges) {
  const adjacency = new Map(modulePaths.map((path) => [path, []]));
  for (const edge of edges) adjacency.get(edge.source)?.push(edge.target);
  const visiting = new Set();
  const visited = new Set();
  const stack = [];
  const cycles = [];
  const recorded = new Set();
  const visit = (path) => {
    if (visited.has(path)) return;
    if (visiting.has(path)) {
      const start = stack.indexOf(path);
      const cycle = [...stack.slice(start), path];
      const key = canonicalCycle(cycle);
      if (!recorded.has(key)) {
        recorded.add(key);
        cycles.push(cycle);
      }
      return;
    }
    visiting.add(path);
    stack.push(path);
    for (const target of adjacency.get(path) ?? []) visit(target);
    stack.pop();
    visiting.delete(path);
    visited.add(path);
  };
  for (const path of modulePaths) visit(path);
  return cycles.sort((left, right) => left.join('\0').localeCompare(right.join('\0')));
}

export function validateNoCycles(modulePaths, edges) {
  const cycles = detectCycles(modulePaths, edges);
  assert.deepEqual(cycles, [], `Core source cycles:\n${cycles.map((cycle) => cycle.join(' -> ')).join('\n')}`);
  return cycles;
}

export function validatePublicSubpaths(exportsMap, declared, modules, edges) {
  assert.deepEqual(Object.keys(declared).sort(), Object.keys(exportsMap).sort(), 'Core public subpath classification drifted');
  const directEdges = new Map();
  for (const edge of edges) {
    if (!directEdges.has(edge.source)) directEdges.set(edge.source, []);
    directEdges.get(edge.source).push(edge.target);
  }
  return Object.entries(declared).sort(([left], [right]) => left.localeCompare(right)).map(([subpath, entry]) => {
    const target = exportsMap[subpath];
    if (entry.source === null) {
      assert.equal(target, './package.json', `${subpath}: metadata target drifted`);
      return Object.freeze({ subpath, source: null, layer: 'metadata', facadeTargets: Object.freeze([]) });
    }
    assert.ok(modules.has(entry.source), `${subpath}: classified source does not exist`);
    const runtimeTarget = typeof target === 'string' ? target : target.import ?? target.default;
    assert.equal(runtimeTarget, `./${entry.source.replace(/^src\//u, 'dist/').replace(/\.ts$/u, '.js')}`, `${subpath}: runtime target drifted`);
    const module = modules.get(entry.source);
    return Object.freeze({
      subpath,
      source: entry.source,
      layer: module.layer,
      facadeTargets: Object.freeze([...(directEdges.get(entry.source) ?? [])].sort()),
    });
  });
}

export function renderCoreModuleDAG(graph) {
  const layerCounts = new Map();
  for (const module of graph.modules) layerCounts.set(module.layer, (layerCounts.get(module.layer) ?? 0) + 1);
  const hottest = [...graph.blastRadius]
    .sort((left, right) => right.publicSubpaths.length - left.publicSubpaths.length || left.module.localeCompare(right.module))
    .slice(0, 20);
  const lines = [
    '# Core module DAG',
    '',
    '> Generated from `verification/core-layers/manifest.json` and Core source imports.',
    '',
    `Modules: ${graph.modules.length}; edges: ${graph.edges.length}; public subpaths: ${graph.publicSubpaths.length}; cycles: ${graph.cycles.length}; upward edges: ${graph.upwardEdges.length}.`,
    '',
    '## Layers',
    '',
    '| Layer | Modules |',
    '|---|---:|',
    ...[...layerCounts].sort(([left], [right]) => left.localeCompare(right)).map(([layer, count]) => `| ${layer} | ${count} |`),
    '',
    '## Highest public blast radius',
    '',
    '| Module | Transitive dependents | Public subpaths |',
    '|---|---:|---:|',
    ...hottest.map((entry) => `| \`${entry.module}\` | ${entry.transitiveDependentCount} | ${entry.publicSubpaths.length} |`),
    '',
    '## Public subpaths',
    '',
    '| Subpath | Source | Layer | Direct facade targets |',
    '|---|---|---|---|',
    ...graph.publicSubpaths.map((entry) => `| \`${entry.subpath}\` | ${entry.source === null ? 'package metadata' : `\`${entry.source}\``} | ${entry.layer} | ${entry.facadeTargets.map((target) => `\`${target}\``).join(', ') || 'none'} |`),
  ];
  return `${lines.join('\n')}\n`;
}

export function validateGeneratedArtifacts(graph, storedGraph, storedDocumentation) {
  assert.deepEqual(storedGraph, graph, 'Core module DAG drifted; run pnpm --filter @sectile/core update:module-dag');
  assert.equal(
    normalizeText(storedDocumentation),
    renderCoreModuleDAG(graph),
    'Core module DAG documentation drifted; run pnpm --filter @sectile/core update:module-dag',
  );
}

async function files(directory) {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) result.push(...await files(path));
    else if (entry.isFile() && entry.name.endsWith('.ts')) result.push(path);
  }
  return result;
}

function declarations(source) {
  const result = [];
  const pattern = /\b(import|export)\s+(?:type\s+)?(?:[^'";]*?\s+from\s+)?(['"])(\.[^'"]+)\2/gsu;
  for (const match of source.matchAll(pattern)) result.push({ kind: match[1], specifier: match[3] });
  return result;
}

function resolveModule(root, source, specifier) {
  if (!specifier.startsWith('.')) return null;
  const absolute = resolve(root, dirname(source), specifier.replace(/\.js$/u, '.ts'));
  const path = normalize(relative(root, absolute));
  return path.startsWith('../') ? null : path;
}

function reverseDependencies(modules, edges) {
  const reverse = new Map(modules.map(({ path }) => [path, new Set()]));
  for (const edge of edges) reverse.get(edge.target)?.add(edge.source);
  return reverse;
}

function transitiveDependents(path, reverse) {
  const result = new Set();
  const pending = [...(reverse.get(path) ?? [])];
  while (pending.length > 0) {
    const current = pending.pop();
    if (current === undefined || result.has(current)) continue;
    result.add(current);
    pending.push(...(reverse.get(current) ?? []));
  }
  return result;
}

function canonicalCycle(cycle) {
  const open = cycle.slice(0, -1);
  const rotations = open.map((_, index) => [...open.slice(index), ...open.slice(0, index)].join('\0'));
  return rotations.sort()[0] ?? '';
}

function compareEdge(left, right) {
  return left.source.localeCompare(right.source) || left.target.localeCompare(right.target) || left.kind.localeCompare(right.kind);
}

function normalize(path) {
  return path.split(sep).join('/');
}

function normalizeText(value) {
  return value.replaceAll('\r\n', '\n');
}
