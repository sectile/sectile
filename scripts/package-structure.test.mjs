import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm, readFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import test from 'node:test';
import { collectModuleImports } from './lib/module-graph/imports.mjs';
import { cyclicComponents } from './lib/module-graph/cycles.mjs';
import { collectPackageGraph, resolveImport, exportTarget, inputFingerprint } from './lib/module-graph/package-graph.mjs';
import { validateStructureManifest, inspectStructure, assertStructure } from './lib/module-graph/policy.mjs';
import { loadPublishedPackageGraph } from './lib/workspace-graph.mjs';
import { root } from './lib/repository.mjs';
import { buildGraphPackages } from './check-package-structure.mjs';

const imports = (text, file) => collectModuleImports(text, file).map(({ kind, phase, specifier }) => ({ kind, phase, specifier }));
test('AST distinguishes multiline imports, inline types, type queries and re-exports', () => {
  assert.deepEqual(imports(`
    import type { A } from './types.js';
    import {
      type B,
      value,
    } from './mixed.js';
    export type * from './types.js';
    export { value as alias, type B } from './mixed.js';
    export * as family from './owner.js';
    type Result = import('./query.js').Result;
  `), [
    { kind: 'import', phase: 'type', specifier: './types.js' },
    { kind: 'import', phase: 'mixed', specifier: './mixed.js' },
    { kind: 'export', phase: 'type', specifier: './types.js' },
    { kind: 'export', phase: 'mixed', specifier: './mixed.js' },
    { kind: 'export', phase: 'value', specifier: './owner.js' },
    { kind: 'import-type', phase: 'type', specifier: './query.js' },
  ]);
});

test('compact imports are retained and prose cannot change an export into an import', () => {
  assert.deepEqual(imports("import type{Result}from'./shared.js';import{apply,type Event}from'./owner.js';export{next}from'./owner.js';"), [
    { kind: 'import', phase: 'type', specifier: './shared.js' },
    { kind: 'import', phase: 'mixed', specifier: './owner.js' },
    { kind: 'export', phase: 'value', specifier: './owner.js' },
  ]);
  assert.deepEqual(imports("/** Runtime consumers import one canonical structure. */\nexport type { Result } from './shared.js';"), [
    { kind: 'export', phase: 'type', specifier: './shared.js' },
  ]);
});

test('empty imports, side-effect imports and empty re-exports retain evaluation edges', () => {
  assert.deepEqual(imports(`import './a.js'; import {} from './b.js'; export {} from './c.js';`, 'output.js'), [
    { kind: 'import', phase: 'evaluation', specifier: './a.js' },
    { kind: 'import', phase: 'evaluation', specifier: './b.js' },
    { kind: 'export', phase: 'evaluation', specifier: './c.js' },
  ]);
  assert.equal(imports("import { type A } from './a.js';")[0].phase, 'evaluation');
});

test('comments, strings, regular expressions and inert templates are not imports', () => {
  const text = [
    '// import fake from "./fake.js";',
    'const text = "export * from \\\"./fake.js\\\"";',
    'const expression = /import\\s+from["\']/;',
    'const template = `import fake from "./fake.js"`;',
  ].join('\n');
  assert.deepEqual(imports(text), []);
});

test('literal dynamic imports in nested expressions and templates are collected', () => {
  const result = imports('const run = () => `loaded: ${import("./child.js")}`; const next = import(`./next.js`);');
  assert.deepEqual(result.map((edge) => [edge.kind, edge.specifier]), [['dynamic-import', './child.js'], ['dynamic-import', './next.js']]);
});

test('computed imports, require, import-equals and ambient augmentation fail closed', () => {
  for (const source of ['import(path)', 'import(`./${name}.js`)', 'require("./child.js")', 'import child = require("./child.js")', 'declare module "external" { export const value: string }']) {
    assert.throws(() => imports(source), /unsupported|explicit graph support/u);
  }
  assert.throws(() => imports('import { broken'), /Unexpected token/u);
});

function fixturePackages() {
  return ['a', 'b'].map((name) => ({ name: `@sectile/${name}`, directory: name, manifest: {
    name: `@sectile/${name}`, type: 'module',
    exports: { '.': { types: './dist/index.d.ts', import: './dist/index.js' }, './owner': { types: './dist/owner.d.ts', import: './dist/owner.js' }, './package.json': './package.json' },
    dependencies: name === 'a' ? { '@sectile/b': 'workspace:*' } : {},
    devDependencies: { 'test-only': '1.0.0' },
  } }));
}
const moduleID = (name) => `packages/a/src/${name}.ts`;
const sourceModule = { path: moduleID('index'), package: '@sectile/a' };

test('workspace exports resolve source declarations and actual runtime targets separately', () => {
  const packages = new Map(fixturePackages().map((entry) => [entry.name, entry]));
  const paths = new Set(['packages/b/src/owner.ts', 'packages/b/dist/owner.js']);
  assert.equal(resolveImport('/workspace/example', sourceModule, '@sectile/b/owner', packages, paths).target, 'packages/b/src/owner.ts');
  assert.equal(resolveImport('/workspace/example', { ...sourceModule, path: 'packages/a/dist/index.js' }, '@sectile/b/owner', packages, paths, 'runtime').target, 'packages/b/dist/owner.js');
  assert.equal(resolveImport('/workspace/example', sourceModule, '@sectile/b/package.json', packages, paths).external, '@sectile/b/package.json');
  assert.equal(resolveImport('/workspace/example', sourceModule, 'node:fs', packages, paths).target, null);
  const defaultFirst = { name: 'fixture', exports: { '.': { types: './dist/index.d.ts', default: './dist/default.js', import: './dist/import.js' } } };
  assert.equal(exportTarget(defaultFirst, '.', 'runtime'), './dist/default.js');
  assert.equal(exportTarget(defaultFirst, '.', 'source'), './dist/index.d.ts');
  const importFirst = { name: 'fixture', exports: { '.': { import: './dist/import.js', default: './dist/default.js' } } };
  assert.equal(exportTarget(importFirst, '.', 'runtime'), './dist/import.js');
});

test('resolution rejects undeclared dependencies, private paths, unresolved exports and guessing', () => {
  const packages = new Map(fixturePackages().map((entry) => [entry.name, entry]));
  for (const specifier of ['@sectile/b/internal/private', '@sectile/missing', './missing.js', './directory', '#alias', '../../b/src/owner.js', './%2e%2e/owner.js']) {
    assert.throws(() => resolveImport('/workspace/example', sourceModule, specifier, packages, new Set()), /undeclared|subpath|unresolved|extension|aliases|outside|relative URL/u);
  }
  assert.equal(resolveImport('/workspace/example', sourceModule, 'test-only', packages, new Set()).external, 'test-only');
  assert.throws(() => resolveImport('/workspace/example', sourceModule, 'test-only', packages, new Set(), 'runtime'), /undeclared runtime/u);
  assert.throws(() => exportTarget({ name: 'x', exports: { '.': { import: { browser: './browser.js' } } } }, '.', 'runtime'), /conditional export/u);
});

function policyFixture({ roles = ['low', 'high'], kinds = ['owner', 'owner'] } = {}) {
  const paths = ['one', 'two'].map(moduleID);
  const entries = [{ name: '@sectile/a', directory: 'a' }];
  const graph = { mode: 'source', modules: paths.map((path) => ({ path, package: '@sectile/a' })), edges: [] };
  const policy = { schemaVersion: 1, packages: { a: {
    disposition: 'regroup', reason: 'A controlled fixture with explicit ownership.', dependencies: [],
    roles: { low: { reason: 'Lower independent data ownership.', allows: ['low'] }, high: { reason: 'Higher assembly consumes lower ownership.', allows: ['low', 'high'] } },
    modules: Object.fromEntries(paths.map((path, i) => [path.slice('packages/a/'.length), { role: roles[i], kind: kinds[i] }])),
  } }, exceptions: [] };
  return { policy, graph, entries, paths };
}
function graphEdge(from, to) { return { source: from, target: to, targetPackage: '@sectile/a', external: null, kind: 'import', phase: 'value' }; }
function waiver(violation, id = 'existing-debt') {
  return { id, ...violation, owner: 'a', workItem: 'WI-002', reason: 'Exact existing dependency, removed by the scoped remediation.' };
}

test('unknown/stale source classifications and unknown allowed roles fail', () => {
  const { policy, graph, entries } = policyFixture();
  assert.equal(validateStructureManifest(policy, entries, graph).size, 2);
  const absent = structuredClone(policy);
  delete absent.packages.a.modules['src/one.ts'];
  assert.throws(() => validateStructureManifest(absent, entries, graph), /Unclassified source/u);
  const stale = structuredClone(policy);
  stale.packages.a.modules['src/old.ts'] = { role: 'low', kind: 'owner' };
  assert.throws(() => validateStructureManifest(stale, entries, graph), /Stale module/u);
  const unknown = structuredClone(policy);
  unknown.packages.a.roles.low.allows.push('unknown');
  assert.throws(() => validateStructureManifest(unknown, entries, graph), /unknown allowed/u);
});

test('a public foundational owner remains a valid lower dependency', () => {
  const { policy, graph, entries, paths } = policyFixture();
  graph.edges = [graphEdge(paths[1], paths[0])];
  const report = inspectStructure(graph, policy, validateStructureManifest(policy, entries, graph));
  assertStructure(report);
  assert.equal(report.debt.length, 0);
});

test('upward roles and back-references to composition facades are separate violations', () => {
  const { policy, graph, entries, paths } = policyFixture({ kinds: ['owner', 'facade'] });
  graph.edges = [graphEdge(paths[0], paths[1])];
  const report = inspectStructure(graph, policy, validateStructureManifest(policy, entries, graph));
  assert.deepEqual(report.unexpected.map((entry) => entry.rule), ['direction', 'facade']);
  assert.throws(() => assertStructure(report), /New source/u);
});

test('exact directional debt is visible, stale debt fails, and ownership metadata is mandatory', () => {
  const { policy, graph, entries, paths } = policyFixture();
  graph.edges = [graphEdge(paths[0], paths[1])];
  let classes = validateStructureManifest(policy, entries, graph);
  policy.exceptions = inspectStructure(graph, policy, classes).violations.map((entry) => waiver(entry));
  classes = validateStructureManifest(policy, entries, graph);
  assertStructure(inspectStructure(graph, policy, classes));
  assert.equal(inspectStructure(graph, policy, classes).debt.length, 1);
  assert.throws(() => assertStructure(inspectStructure({ ...graph, edges: [] }, policy, classes)), /Stale source/u);
  delete policy.exceptions[0].workItem;
  assert.throws(() => validateStructureManifest(policy, entries, graph), /remediation WI/u);
});

test('same-owner type cycles are reported, but runtime cycles require exact edge-set debt', () => {
  const { policy, graph, entries, paths } = policyFixture({ roles: ['low', 'low'] });
  graph.edges = [graphEdge(paths[0], paths[1]), graphEdge(paths[1], paths[0])];
  const classes = validateStructureManifest(policy, entries, graph);
  const typeReport = inspectStructure(graph, policy, classes);
  assertStructure(typeReport);
  assert.equal(typeReport.components.length, 1);
  const runtime = { ...graph, mode: 'runtime' };
  const report = inspectStructure(runtime, policy, classes);
  assert.throws(() => assertStructure(report), /New runtime/u);
  policy.exceptions = report.violations.map((entry) => waiver(entry));
  assertStructure(inspectStructure(runtime, policy, classes));
  const enlarged = { ...runtime, edges: [...runtime.edges, graphEdge(paths[0], paths[0])] };
  assert.throws(() => assertStructure(inspectStructure(enlarged, policy, classes)), /New runtime/u);
});

test('cyclic components include self cycles, all member edges, and stay stack safe', () => {
  assert.deepEqual(cyclicComponents(['a', 'b', 'c'], [{ source: 'a', target: 'b' }, { source: 'b', target: 'a' }, { source: 'a', target: 'a' }]), [{ modules: ['a', 'b'], edges: [['a', 'a'], ['a', 'b'], ['b', 'a']] }]);
  const paths = Array.from({ length: 12000 }, (_, i) => String(i));
  const edges = paths.slice(1).map((target, i) => ({ source: paths[i], target }));
  assert.deepEqual(cyclicComponents(paths, edges), []);
  assert.throws(() => cyclicComponents(['a'], [{ source: 'a', target: 'missing' }]), /Unknown graph endpoint/u);
});

async function temporaryRepository(t) {
  await mkdir(resolve(root, '.tmp'), { recursive: true });
  const directory = await mkdtemp(resolve(root, '.tmp/structure-tests-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const put = async (path, content) => { await mkdir(dirnameOf(path), { recursive: true }); await writeFile(join(directory, path), content); };
  function dirnameOf(path) { return resolve(directory, path, '..'); }
  return { directory, put };
}

test('runtime collection uses actual emitted imports and enforces exact production output coverage', async (t) => {
  const { directory, put } = await temporaryRepository(t);
  const entry = fixturePackages()[0];
  entry.manifest.dependencies = {};
  await put('packages/a/src/index.ts', "import type { Value } from './owner.js'; export const value = 1;\n");
  await put('packages/a/src/owner.ts', 'export interface Value { readonly value: number }\n');
  await put('packages/a/src/reference.ts', 'export const reference = 2;\n');
  await put('packages/a/dist/index.js', 'export const value = 1;\n');
  await put('packages/a/dist/owner.js', 'export {};\n');
  const source = await collectPackageGraph(directory, [entry]);
  assert.equal(source.modules.length, 3);
  assert.equal(source.edges[0].phase, 'type');
  const productionFiles = new Map([[entry.name, ['index', 'owner'].map((name) => resolve(directory, `packages/a/src/${name}.ts`))]]);
  const runtime = await collectPackageGraph(directory, [entry], { mode: 'runtime', productionFiles });
  assert.equal(runtime.modules.length, 2);
  assert.deepEqual(runtime.edges, []);
  await put('packages/a/dist/index.js', "import {} from './owner.js'; export const value = 1;\n");
  const evaluation = await collectPackageGraph(directory, [entry], { mode: 'runtime', productionFiles });
  assert.equal(evaluation.edges[0].phase, 'evaluation');
  await put('packages/a/dist/unexpected.js', 'export {};\n');
  await assert.rejects(collectPackageGraph(directory, [entry], { mode: 'runtime', productionFiles }), /output coverage mismatch/u);
});

test('fingerprints include source, package configuration, lockfile and build-owner inputs', async (t) => {
  const { directory, put } = await temporaryRepository(t);
  const entry = fixturePackages()[0];
  for (const path of ['package.json', 'pnpm-lock.yaml', 'packages/a/package.json', 'packages/a/tsconfig.json', 'tools/tooling/package.json']) await put(path, '{}');
  const graph = { modules: [{ path: 'packages/a/src/index.ts', digest: 'one' }] };
  const before = await inputFingerprint(directory, [entry], graph, []);
  await put('packages/a/tsconfig.json', '{"compilerOptions":{"verbatimModuleSyntax":true}}');
  assert.notEqual(await inputFingerprint(directory, [entry], graph, []), before);
  await put('packages/a/tsconfig.json', '{}');
  assert.equal(await inputFingerprint(directory, [entry], graph, []), before);
  assert.notEqual(await inputFingerprint(directory, [entry], { modules: [{ path: 'packages/a/src/index.ts', digest: 'two' }] }, []), before);
});

test('production graph builds use declared tooling in dependency order and stop on failure', async () => {
  const { order } = await loadPublishedPackageGraph();
  const seen = [];
  buildGraphPackages(order, (command, args, options) => {
    seen.push(options.cwd);
    assert.equal(command, process.execPath);
    assert.equal(args[1], 'production');
    assert.equal(args[0], resolve(root, 'tools/tooling/build.mjs'));
    return { status: 0 };
  });
  assert.deepEqual(seen, order.map(({ directory }) => resolve(root, 'packages', directory)));
  let calls = 0;
  assert.throws(() => buildGraphPackages(order, () => { calls++; return { status: 1 }; }), /production build failed/u);
  assert.equal(calls, 1);
  const invalid = structuredClone(order);
  invalid[invalid.length - 1].manifest.scripts.prebuild = 'unexpected-hook';
  assert.throws(() => buildGraphPackages(invalid, () => { throw new Error('must not build any prefix'); }), /prebuild requires explicit/u);
  assert.throws(() => exportTarget({ name: 'fixture', exports: { '.': { import: './dist/index.js', browser: './dist/browser.js' } } }, '.', 'runtime'), /unsupported conditional/u);
});

test('all product sources have a reviewed role and only the recorded initial source debt', async () => {
  const { packages } = await loadPublishedPackageGraph();
  const graph = await collectPackageGraph(root, packages);
  const manifest = JSON.parse(await readFile(resolve(root, 'verification/package-structure/manifest.json'), 'utf8'));
  const classes = validateStructureManifest(manifest, packages, graph);
  assert.equal(classes.size, graph.modules.length);
  assertStructure(inspectStructure(graph, manifest, classes));
});

test('Chart contracts and storage stay below model, definition and projection assembly', async () => {
  const { packages } = await loadPublishedPackageGraph();
  const graph = await collectPackageGraph(root, packages);
  const policy = JSON.parse(await readFile(resolve(root, 'verification/package-structure/manifest.json'), 'utf8'));
  const classes = validateStructureManifest(policy, packages, graph);
  const imports = new Map(graph.modules.map(({ path }) => [path, []]));
  for (const edge of graph.edges) if (edge.target !== null) imports.get(edge.source).push(edge.target);
  for (const [entry, roles] of [
    ['model/contracts', ['model-contracts']],
    ['model/store', ['model-contracts', 'layer-storage', 'model-storage']],
    ['layout/contracts', ['foundation', 'model-contracts', 'input', 'scale', 'layout-contracts']],
    ['definition/contracts', ['foundation', 'model-contracts', 'input', 'scale', 'layout-contracts', 'definition-contracts']],
  ]) {
    const visited = new Set();
    const pending = [`packages/chart/src/internal/${entry}.ts`];
    while (pending.length) {
      const path = pending.pop();
      if (visited.has(path)) continue;
      visited.add(path);
      const owner = classes.get(path);
      if (owner.package === 'chart') assert.ok(roles.includes(owner.role), path);
      pending.push(...imports.get(path));
    }
  }
  assertStructure(inspectStructure(graph, policy, classes));
  const source = 'packages/chart/src/internal/model/contracts.ts';
  const witness = graph.edges.find((edge) => edge.source === source);
  assert.ok(witness);
  const reverse = { ...witness, source, target: 'packages/chart/src/internal/model/state.ts' };
  assert.throws(() => assertStructure(inspectStructure({ ...graph, edges: [...graph.edges, reverse] }, policy, classes)), /direction|cycle/u);
});

test('Tabular canonical owners stay below source and profile assembly', async () => {
  const { packages } = await loadPublishedPackageGraph();
  const graph = await collectPackageGraph(root, packages);
  const policy = JSON.parse(await readFile(resolve(root, 'verification/package-structure/manifest.json'), 'utf8'));
  const classes = validateStructureManifest(policy, packages, graph);
  assertStructure(inspectStructure(graph, policy, classes));
  for (const [lower, upper] of [
    ['model/columns', 'model/state'],
    ['model/selection', 'source/client'],
    ['source/query', 'model/state'],
    ['source/view', 'source/client'],
    ['profiles/table-state', 'profiles/table'],
    ['profiles/table', 'profiles/grid'],
    ['profiles/grid', 'profiles/data-grid'],
  ]) {
    const source = `packages/tabular/src/${lower}.ts`;
    const witness = graph.edges.find((edge) => edge.source === source);
    assert.ok(witness, source);
    const reverse = { ...witness, source, target: `packages/tabular/src/${upper}.ts` };
    assert.throws(() => assertStructure(inspectStructure({ ...graph, edges: [...graph.edges, reverse] }, policy, classes)), /direction|cycle/u);
  }
});

test('Temporal values and calendar stay below input fields and picker composition', async () => {
  const { packages } = await loadPublishedPackageGraph();
  const graph = await collectPackageGraph(root, packages);
  const policy = JSON.parse(await readFile(resolve(root, 'verification/package-structure/manifest.json'), 'utf8'));
  const classes = validateStructureManifest(policy, packages, graph);
  assertStructure(inspectStructure(graph, policy, classes));
  const dependencies = new Map(graph.modules.map(({ path }) => [path, []]));
  for (const edge of graph.edges) if (edge.target !== null) dependencies.get(edge.source).push(edge.target);
  for (const [entry, allowed] of [
    ['values/date', ['foundation', 'date-values']],
    ['values/time', ['foundation', 'time-values']],
    ['values/date-time', ['foundation', 'date-values', 'time-values', 'date-time-values']],
    ['calendar', ['foundation', 'machine', 'date-values', 'calendar']],
  ]) {
    const visited = new Set();
    const pending = [`packages/temporal/src/${entry}.ts`];
    while (pending.length) {
      const path = pending.pop();
      if (visited.has(path)) continue;
      visited.add(path);
      const owner = classes.get(path);
      if (owner.package === 'temporal') assert.ok(allowed.includes(owner.role), path);
      pending.push(...dependencies.get(path));
    }
    const source = `packages/temporal/src/${entry}.ts`;
    const witness = graph.edges.find((edge) => edge.source === source);
    assert.ok(witness, source);
    for (const target of ['fields/date.ts', 'fields/time.ts', 'pickers/date.ts']) {
      const reverse = { ...witness, source, target: `packages/temporal/src/${target}` };
      assert.throws(() => assertStructure(inspectStructure({ ...graph, edges: [...graph.edges, reverse] }, policy, classes)), /direction|cycle/u);
    }
  }
});

test('DOM Temporal support stays below field, calendar and picker composition', async () => {
  const { packages } = await loadPublishedPackageGraph();
  const graph = await collectPackageGraph(root, packages);
  const policy = JSON.parse(await readFile(resolve(root, 'verification/package-structure/manifest.json'), 'utf8'));
  const classes = validateStructureManifest(policy, packages, graph);
  assertStructure(inspectStructure(graph, policy, classes));
  const dependencies = new Map(graph.modules.map(({ path }) => [path, []]));
  for (const edge of graph.edges) if (edge.target !== null) dependencies.get(edge.source).push(edge.target);
  for (const entry of ['internal/result', 'internal/date-picker-cell', 'internal/reference-date', 'internal/period-picker']) {
    const source = `packages/dom/src/temporal/${entry}.ts`;
    const visited = new Set();
    const pending = [source];
    while (pending.length > 0) {
      const path = pending.pop();
      if (visited.has(path)) continue;
      visited.add(path);
      const owner = classes.get(path);
      if (owner.package === 'dom') assert.equal(owner.role, 'temporal-support', path);
      pending.push(...dependencies.get(path));
    }
    const witness = graph.edges.find((edge) => edge.source === source);
    if (witness !== undefined) {
      for (const target of ['temporal/date-field.ts', 'temporal/calendar.ts', 'temporal/date-picker.ts', 'temporal/month-picker.ts']) {
        const reverse = { ...witness, source, target: `packages/dom/src/${target}` };
        assert.throws(() => assertStructure(inspectStructure({ ...graph, edges: [...graph.edges, reverse] }, policy, classes)), /direction|cycle/u);
      }
    }
  }
});

test('DOM Form lower owners stay below connection orchestration', async () => {
  const { packages } = await loadPublishedPackageGraph();
  const graph = await collectPackageGraph(root, packages);
  const policy = JSON.parse(await readFile(resolve(root, 'verification/package-structure/manifest.json'), 'utf8'));
  const classes = validateStructureManifest(policy, packages, graph);
  assertStructure(inspectStructure(graph, policy, classes));
  const dependencies = new Map(graph.modules.map(({ path }) => [path, []]));
  for (const edge of graph.edges) if (edge.target !== null) dependencies.get(edge.source).push(edge.target);
  for (const [entry, allowed] of [
    ['form/contracts', ['form-contracts']],
    ['form/participants', ['form-contracts', 'form-participants']],
    ['form/validation', ['form-contracts', 'form-participants', 'form-validation']],
    ['form/submission', ['form-contracts', 'form-submission']],
  ]) {
    const source = `packages/dom/src/${entry}.ts`;
    const visited = new Set();
    const pending = [source];
    while (pending.length > 0) {
      const path = pending.pop();
      if (visited.has(path)) continue;
      visited.add(path);
      const owner = classes.get(path);
      if (owner.package === 'dom') assert.ok(allowed.includes(owner.role), path);
      pending.push(...dependencies.get(path));
    }
    const witness = graph.edges.find((edge) => edge.source === source);
    assert.ok(witness, source);
    const reverse = { ...witness, source, target: 'packages/dom/src/form/connection.ts' };
    assert.throws(() => assertStructure(inspectStructure({ ...graph, edges: [...graph.edges, reverse] }, policy, classes)), /direction|cycle/u);
  }
});

test('DOM text helpers stay below the public Text host and field adapters', async () => {
  const { packages } = await loadPublishedPackageGraph();
  const graph = await collectPackageGraph(root, packages);
  const policy = JSON.parse(await readFile(resolve(root, 'verification/package-structure/manifest.json'), 'utf8'));
  const classes = validateStructureManifest(policy, packages, graph);
  assertStructure(inspectStructure(graph, policy, classes));
  const dependencies = new Map(graph.modules.map(({ path }) => [path, []]));
  for (const edge of graph.edges) if (edge.target !== null) dependencies.get(edge.source).push(edge.target);

  for (const [entry, allowed] of [
    ['text/contracts', ['text-contracts']],
    ['text/element-binding', ['text-contracts', 'text-binding']],
    ['text/controlled-input', ['text-controlled']],
  ]) {
    const source = `packages/dom/src/${entry}.ts`;
    const visited = new Set();
    const pending = [source];
    while (pending.length > 0) {
      const path = pending.pop();
      if (visited.has(path)) continue;
      visited.add(path);
      const owner = classes.get(path);
      if (owner.package === 'dom') assert.ok(allowed.includes(owner.role), path);
      pending.push(...dependencies.get(path));
    }
    for (const target of ['text.ts', 'combobox.ts', 'number-field.ts', 'quantity-field.ts', 'temporal/date-field.ts']) {
      for (const phase of ['type', 'value']) {
        const reverse = { source, target: `packages/dom/src/${target}`, targetPackage: '@sectile/dom', phase, kind: 'import' };
        assert.throws(() => assertStructure(inspectStructure({ ...graph, edges: [...graph.edges, reverse] }, policy, classes)), /direction|cycle/u);
      }
    }
  }
});

test('DOM overlay infrastructure keeps lower resource owners below public profiles', async () => {
  const { packages } = await loadPublishedPackageGraph();
  const graph = await collectPackageGraph(root, packages);
  const policy = JSON.parse(await readFile(resolve(root, 'verification/package-structure/manifest.json'), 'utf8'));
  const classes = validateStructureManifest(policy, packages, graph);
  assertStructure(inspectStructure(graph, policy, classes));
  const dependencies = new Map(graph.modules.map(({ path }) => [path, []]));
  for (const edge of graph.edges) if (edge.target !== null) dependencies.get(edge.source).push(edge.target);

  const owners = [
    ['overlay/layer/manager', ['overlay-layer-manager']],
    ['overlay/layer/binding', ['overlay-layer-manager', 'overlay-layer-binding']],
    ['overlay/modal/effects', ['overlay-modal']],
    ['overlay/position/engine', ['overlay-position-engine']],
    ['overlay/position/connection', ['positioning', 'overlay-position-engine', 'overlay-position-connection']],
    ['overlay/position/picker', ['positioning', 'overlay-position-engine', 'overlay-position-connection', 'overlay-position-picker']],
    ['overlay/presence/motion', ['overlay-presence-motion']],
    ['interact-outside', ['overlay-interact']],
  ];
  for (const [entry, allowed] of owners) {
    const source = `packages/dom/src/${entry}.ts`;
    const pending = [source];
    const visited = new Set();
    while (pending.length > 0) {
      const path = pending.pop();
      if (visited.has(path)) continue;
      visited.add(path);
      const owner = classes.get(path);
      if (owner.package === 'dom') assert.ok(allowed.includes(owner.role), path);
      pending.push(...dependencies.get(path));
    }
    for (const target of ['overlay/popup/connection.ts', 'overlay/menu/control.ts', 'dialog.ts', 'popover.ts', 'menu.ts']) {
      for (const phase of ['type', 'value']) {
        const reverse = { source, target: `packages/dom/src/${target}`, targetPackage: '@sectile/dom', phase, kind: 'import' };
        assert.throws(() => assertStructure(inspectStructure({ ...graph, edges: [...graph.edges, reverse] }, policy, classes)), /direction|cycle/u);
      }
    }
  }

  for (const [source, targets] of [
    ['packages/dom/src/overlay/popup/connection.ts', ['dialog.ts', 'alert-dialog.ts', 'drawer.ts', 'popover.ts', 'tooltip.ts']],
    ['packages/dom/src/overlay/menu/control.ts', ['menu.ts', 'menubar.ts', 'navigation-menu.ts', 'menu-button.ts']],
  ]) {
    for (const target of targets) {
      for (const phase of ['type', 'value']) {
        const reverse = { source, target: `packages/dom/src/${target}`, targetPackage: '@sectile/dom', phase, kind: 'import' };
        assert.throws(() => assertStructure(inspectStructure({ ...graph, edges: [...graph.edges, reverse] }, policy, classes)), /direction|cycle/u);
      }
    }
  }
});

test('DOM Virtual helpers stay below the connection and public facade', async () => {
  const { packages } = await loadPublishedPackageGraph();
  const graph = await collectPackageGraph(root, packages);
  const policy = JSON.parse(await readFile(resolve(root, 'verification/package-structure/manifest.json'), 'utf8'));
  const classes = validateStructureManifest(policy, packages, graph);
  assertStructure(inspectStructure(graph, policy, classes));
  const dependencies = new Map(graph.modules.map(({ path }) => [path, []]));
  for (const edge of graph.edges) if (edge.target !== null) dependencies.get(edge.source).push(edge.target);
  for (const [entry, allowed] of [
    ['contracts', ['virtual-contracts']],
    ['scroll-host', ['virtual-contracts', 'virtual-scroll-host']],
    ['viewport', ['virtual-viewport']],
    ['measurement', ['virtual-contracts', 'virtual-measurement']],
    ['style', ['virtual-contracts', 'virtual-style']],
  ]) {
    const source = `packages/dom/src/virtual/${entry}.ts`;
    const pending = [source];
    const visited = new Set();
    while (pending.length > 0) {
      const path = pending.pop();
      if (visited.has(path)) continue;
      visited.add(path);
      const owner = classes.get(path);
      if (owner.package === 'dom') assert.ok(allowed.includes(owner.role), path);
      pending.push(...dependencies.get(path));
    }
    for (const target of ['virtual/connection.ts', 'virtual.ts']) {
      for (const phase of ['type', 'value']) {
        const reverse = { source, target: `packages/dom/src/${target}`, targetPackage: '@sectile/dom', phase, kind: 'import' };
        assert.throws(() => assertStructure(inspectStructure({ ...graph, edges: [...graph.edges, reverse] }, policy, classes)), /direction|facade|cycle/u);
      }
    }
  }
});

test('DOM Tabular contracts and bindings stay below profile connections', async () => {
  const { packages } = await loadPublishedPackageGraph();
  const graph = await collectPackageGraph(root, packages);
  const policy = JSON.parse(await readFile(resolve(root, 'verification/package-structure/manifest.json'), 'utf8'));
  const classes = validateStructureManifest(policy, packages, graph);
  assertStructure(inspectStructure(graph, policy, classes));
  const dependencies = new Map(graph.modules.map(({ path }) => [path, []]));
  for (const edge of graph.edges) if (edge.target !== null) dependencies.get(edge.source).push(edge.target);
  const owners = [
    ['contracts', ['tabular-contracts']],
    ['grid/contracts', ['tabular-contracts', 'tabular-grid-contracts']],
    ['result', ['tabular-contracts', 'tabular-result']],
    ['projection', ['foundation', 'tabular-contracts', 'tabular-projection']],
    ['query', ['tabular-query']],
    ['bindings/scope', ['tabular-scope']],
    ['bindings/columns', ['tabular-contracts', 'tabular-result', 'tabular-scope', 'tabular-columns']],
    ['bindings/editor', ['tabular-contracts', 'tabular-result', 'tabular-editor']],
    ['bindings/selection', ['foundation', 'tabular-contracts', 'tabular-projection', 'tabular-scope', 'tabular-selection']],
  ];
  for (const [entry, allowed] of owners) {
    const source = `packages/dom/src/tabular/${entry}.ts`;
    const visited = new Set();
    const pending = [source];
    while (pending.length > 0) {
      const path = pending.pop();
      if (visited.has(path)) continue;
      visited.add(path);
      const owner = classes.get(path);
      if (owner.package === 'dom') assert.ok(allowed.includes(owner.role), path);
      pending.push(...dependencies.get(path));
    }
    for (const target of ['table', 'grid', 'tree-grid', 'grid/connection']) {
      for (const phase of ['type', 'value']) {
        const reverse = { source, target: `packages/dom/src/tabular/${target}.ts`, targetPackage: '@sectile/dom', phase, kind: 'import' };
        assert.throws(() => assertStructure(inspectStructure({ ...graph, edges: [...graph.edges, reverse] }, policy, classes)), /direction|cycle/u);
      }
    }
  }
  const source = 'packages/dom/src/tabular/grid/connection.ts';
  for (const target of ['tabular/table.ts', 'tabular/grid.ts', 'tabular/tree-grid.ts', 'tabular.ts']) {
    const reverse = { source, target: `packages/dom/src/${target}`, targetPackage: '@sectile/dom', phase: 'type', kind: 'import' };
    assert.throws(() => assertStructure(inspectStructure({ ...graph, edges: [...graph.edges, reverse] }, policy, classes)), /direction|facade|cycle/u);
  }
});

test('Virtual shared track contracts stay below concrete layout families', async () => {
  const { packages } = await loadPublishedPackageGraph();
  const graph = await collectPackageGraph(root, packages);
  const policy = JSON.parse(await readFile(resolve(root, 'verification/package-structure/manifest.json'), 'utf8'));
  const classes = validateStructureManifest(policy, packages, graph);
  assertStructure(inspectStructure(graph, policy, classes));
  const source = 'packages/virtual/src/layout/track.ts';
  const witness = graph.edges.find((edge) => edge.source === source);
  assert.ok(witness);
  for (const target of ['linear.ts', 'masonry/layout.ts', 'grid/layout.ts', 'grid/partitioned.ts', 'spatial.ts']) {
    const reverse = { ...witness, source, target: `packages/virtual/src/layout/${target}` };
    assert.throws(() => assertStructure(inspectStructure({ ...graph, edges: [...graph.edges, reverse] }, policy, classes)), /direction|cycle/u);
  }
});

test('Form construction and state contracts keep their dependencies within lower owners', async () => {
  const { packages } = await loadPublishedPackageGraph();
  const graph = await collectPackageGraph(root, packages);
  const policy = JSON.parse(await readFile(resolve(root, 'verification/package-structure/manifest.json'), 'utf8'));
  const classes = validateStructureManifest(policy, packages, graph);
  const imports = new Map(graph.modules.map(({ path }) => [path, []]));
  for (const edge of graph.edges) if (edge.target !== null) imports.get(edge.source).push(edge.target);
  for (const [entry, roles] of [
    ['path', ['foundation', 'path', 'values']],
    ['values', ['foundation', 'path', 'values']],
    ['internal/state/contracts', ['foundation', 'state-contracts']],
    ['internal/state/storage/fields', ['state-contracts', 'state-delta', 'state-fields']],
    ['internal/state/storage/snapshot', ['foundation', 'state-contracts', 'state-records', 'state-delta', 'state-fields', 'state-issues', 'state-snapshot']],
    ['internal/state/query', ['foundation', 'path', 'state-contracts', 'state-records', 'state-delta', 'state-fields', 'state-issues', 'state-snapshot', 'state-query']],
  ]) {
    const visited = new Set();
    const pending = [`packages/form/src/${entry}.ts`];
    while (pending.length) {
      const path = pending.pop();
      if (visited.has(path)) continue;
      visited.add(path);
      const owner = classes.get(path);
      if (owner.package === 'form') assert.ok(roles.includes(owner.role), path);
      pending.push(...imports.get(path));
    }
    assert.ok(visited.size > 1);
  }
});
