import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join, relative, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..', '..');
const evidencePath = resolve(import.meta.dirname, 'tabular.json');
const store = resolve(root, '.pnpm-store');
const packageNames = ['core', 'tabular', 'temporal', 'virtual', 'dom', 'vue'];
const temporary = await mkdtemp(join(tmpdir(), 'sectile-tabular-consumer-'));
const tarballs = {};

try {
  run('pnpm', ['--filter', '@sectile/core', 'build'], root);
  run('pnpm', ['--filter', '@sectile/tabular', 'build'], root);
  run('pnpm', ['--filter', '@sectile/temporal', 'build'], root);
  run('pnpm', ['--filter', '@sectile/virtual', 'build'], root);
  run('pnpm', ['--filter', '@sectile/dom', 'build'], root);
  run('pnpm', ['--filter', '@sectile/vue', 'build'], root);

  for (const name of packageNames) {
    const destination = join(temporary, 'packs');
    await mkdir(destination, { recursive: true });
    run('pnpm', ['--filter', `@sectile/${name}`, 'pack', '--pack-destination', destination], root);
    const prefix = `sectile-${name}-`;
    const file = (await readdir(destination)).find((entry) => entry.startsWith(prefix) && entry.endsWith('.tgz'));
    assert.notEqual(file, undefined, `packed tarball missing for @sectile/${name}`);
    tarballs[name] = join(destination, file);
  }

  const declarationClosure = await checkDeclarationClosure(packageNames);
  const scenarios = [];

  const tabular = await fixture('tabular-base', [tarballs.core, tarballs.tabular]);
  await runtime(tabular, `
    const root = await import('@sectile/tabular');
    const grid = await import('@sectile/tabular/data-grid');
    if (Object.keys(root).length !== 0 || typeof grid.createDataGrid !== 'function') process.exit(2);
  `);
  await missingPeer(tabular, '@sectile/tabular/virtual');
  scenarios.push({ id: 'tabular-base-without-virtual', status: 'passed' });

  const dom = await fixture('dom-base', [tarballs.core, tarballs.tabular, tarballs.temporal, tarballs.dom]);
  await runtime(dom, `
    const table = await import('@sectile/dom/data-table');
    if (typeof table.connectDataTable !== 'function') process.exit(2);
  `);
  await missingPeer(dom, '@sectile/dom/virtual');
  scenarios.push({ id: 'dom-base-without-virtual', status: 'passed' });

  const vue = await fixture('vue-base', [tarballs.core, tarballs.tabular, tarballs.temporal, tarballs.dom, tarballs.vue, 'vue@^3.5.0']);
  await runtime(vue, `
    const table = await import('@sectile/vue/data-table');
    if (typeof table.useDataTableComponents !== 'function' || typeof table.useDataTable !== 'function' || 'DataTableProvider' in table) process.exit(2);
  `);
  await missingPeer(vue, '@sectile/vue/virtual');
  await typeConsumer(vue);
  scenarios.push({ id: 'vue-base-types-without-direct-tabular', status: 'passed' });

  const tabularVirtual = await fixture('tabular-virtual', [tarballs.core, tarballs.tabular, tarballs.virtual]);
  await runtime(tabularVirtual, `
    const adapter = await import('@sectile/tabular/virtual');
    if (typeof adapter.createDataGridVirtualAdapter !== 'function') process.exit(2);
  `);
  scenarios.push({ id: 'tabular-virtual-explicit-opt-in', status: 'passed' });

  const domVirtual = await fixture('dom-virtual', [tarballs.core, tarballs.tabular, tarballs.temporal, tarballs.dom, tarballs.virtual]);
  await runtime(domVirtual, `
    const virtual = await import('@sectile/dom/virtual');
    if (typeof virtual.createVirtualizer !== 'function') process.exit(2);
  `);
  scenarios.push({ id: 'dom-virtual-explicit-opt-in', status: 'passed' });

  const vueVirtual = await fixture('vue-virtual', [tarballs.core, tarballs.tabular, tarballs.temporal, tarballs.dom, tarballs.vue, tarballs.virtual, 'vue@^3.5.0']);
  await runtime(vueVirtual, `
    const virtual = await import('@sectile/vue/virtual');
    if (typeof virtual.useVirtualizer !== 'function') process.exit(2);
  `);
  scenarios.push({ id: 'vue-virtual-explicit-opt-in', status: 'passed' });

  const evidence = {
    schemaVersion: 1,
    status: 'passed',
    packages: packageNames.map((name) => `@sectile/${name}`),
    packedFootprint: Object.fromEntries(await Promise.all(packageNames.map(async (name) => [
      `@sectile/${name}`,
      { bytes: (await stat(tarballs[name])).size },
    ]))),
    declarationClosure,
    scenarios,
  };
  await writeFile(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`);
  console.log(`Tabular packed consumers passed: ${scenarios.length} scenarios, ${declarationClosure.files} declarations`);
} finally {
  await rm(temporary, { recursive: true, force: true });
}

async function fixture(name, dependencies) {
  const directory = join(temporary, name);
  await mkdir(directory, { recursive: true });
  await writeFile(join(directory, 'package.json'), `${JSON.stringify({
    private: true,
    type: 'module',
  }, null, 2)}\n`);
  await writeFile(join(directory, 'pnpm-workspace.yaml'), [
    'packages:',
    "  - '.'",
    'overrides:',
    ...Object.entries(tarballs).map(([packageName, path]) => `  '@sectile/${packageName}': 'file:${path}'`),
    '',
  ].join('\n'));
  install(directory, dependencies);
  return directory;
}

function install(directory, dependencies) {
  run('pnpm', ['add', '--offline', '--store-dir', store, ...dependencies], directory);
}

async function runtime(directory, source) {
  const path = join(directory, 'consumer.mjs');
  await writeFile(path, source);
  run(process.execPath, [path], directory);
}

async function missingPeer(directory, specifier) {
  const result = spawnSync(process.execPath, ['--input-type=module', '--eval', `await import('${specifier}')`], {
    cwd: directory,
    encoding: 'utf8',
  });
  assert.notEqual(result.status, 0, `${specifier} unexpectedly loaded without @sectile/virtual`);
  assert.match(`${result.stdout}\n${result.stderr}`, /@sectile\/virtual/u,
    `${specifier} failure did not identify @sectile/virtual`);
}

async function typeConsumer(directory) {
  await writeFile(join(directory, 'consumer.ts'), `
    import {
      defineDataTableColumns,
      useDataTable,
      useDataTableComponents,
      type DataTableContextValue,
    } from '@sectile/vue/data-table';
    type Row = { id: string; name: string };
    const columns = defineDataTableColumns([{ id: 'name', getValue: (row: Row) => row.name }]);
    const table = useDataTable({ columns });
    const DataTable = useDataTableComponents(table);
    const context = {} as DataTableContextValue;
    void [DataTable.Provider, table, context];
  `);
  await writeFile(join(directory, 'tsconfig.json'), `${JSON.stringify({
    compilerOptions: {
      strict: true,
      noEmit: true,
      module: 'NodeNext',
      moduleResolution: 'NodeNext',
      target: 'ES2022',
      skipLibCheck: false,
    },
    files: ['consumer.ts'],
  }, null, 2)}\n`);
  run(process.execPath, [resolve(root, 'packages/vue/node_modules/typescript/bin/tsc'), '--project', 'tsconfig.json', '--pretty', 'false'], directory);
}

async function checkDeclarationClosure(names) {
  let files = 0;
  let imports = 0;
  const packages = Object.fromEntries(await Promise.all(names.map(async (name) => [
    `@sectile/${name}`,
    JSON.parse(await readFile(resolve(root, 'packages', name, 'package.json'), 'utf8')),
  ])));
  for (const [packageName, manifest] of Object.entries(packages)) {
    const declared = new Set([
      ...Object.keys(manifest.dependencies ?? {}),
      ...Object.keys(manifest.peerDependencies ?? {}),
    ]);
    for (const path of await declarationFiles(resolve(root, 'packages', packageName.slice('@sectile/'.length), 'dist'))) {
      files += 1;
      const source = await readFile(path, 'utf8');
      for (const match of source.matchAll(/(?:from\s+|import\s*\()\s*['"](@sectile\/[^/'"]+)(?:\/[^'"]*)?['"]/gu)) {
        imports += 1;
        const dependency = match[1];
        assert.ok(dependency === packageName || declared.has(dependency),
          `${relative(root, path)} imports undeclared ${dependency}`);
      }
    }
  }
  return { status: 'passed', files, imports };
}

async function declarationFiles(directory) {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) result.push(...await declarationFiles(path));
    else if (entry.isFile() && entry.name.endsWith('.d.ts')) result.push(path);
  }
  return result.sort();
}

function run(command, args, cwd) {
  const result = spawnSync(command, args, { cwd, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
  if (result.error !== undefined) throw result.error;
  assert.equal(result.status, 0, `${command} ${args.map((value) => basename(value)).join(' ')}\n${result.stdout}\n${result.stderr}`);
  return result.stdout;
}
