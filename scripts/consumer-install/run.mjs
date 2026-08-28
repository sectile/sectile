#!/usr/bin/env node
import assert from 'node:assert/strict';
import { execFile as execFileCallback } from 'node:child_process';
import { mkdtemp, mkdir, readFile, readdir, realpath, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';
import { validateInstallBaseline } from './check.mjs';

const execFile = promisify(execFileCallback);
const repoRoot = resolve('.');
const mode = process.argv[2] ?? 'check';
assert.ok(mode === 'record' || mode === 'check', 'Usage: run.mjs <record|check>');
const temporaryRoot = await mkdtemp(join(tmpdir(), 'sectile-consumer-install-'));
if (process.env['SECTILE_KEEP_INSTALL'] === '1') process.stderr.write(`consumer install temp: ${temporaryRoot}\n`);
try {
  const coreManifest = JSON.parse(await readFile(resolve(repoRoot, 'packages/core/package.json'), 'utf8'));
  const domManifest = JSON.parse(await readFile(resolve(repoRoot, 'packages/dom/package.json'), 'utf8'));
  assert.equal(typeof coreManifest.dependencies?.colord, 'string', 'colord incumbent must be recorded as a hard Core dependency');
  assert.equal(coreManifest.peerDependencies?.colord, undefined, 'colord must not be misclassified as a peer');
  assert.equal(typeof domManifest.dependencies?.['@floating-ui/dom'], 'string', 'Floating UI incumbent must be recorded as a hard DOM dependency');
  assert.equal(domManifest.peerDependencies?.['@floating-ui/dom'], undefined, 'Floating UI must not be misclassified as a peer');
  const packDirectory = join(temporaryRoot, 'packs');
  await mkdir(packDirectory);
  const packageNames = ['core', 'dom', 'form', 'tabular', 'temporal', 'terminal', 'virtual', 'vue'];
  const tarballs = {};
  for (const packageName of packageNames) {
    await run('pnpm', ['--filter', `@sectile/${packageName}`, 'pack', '--pack-destination', packDirectory], repoRoot);
    const candidates = (await readdir(packDirectory)).filter((name) => name.startsWith(`sectile-${packageName}-`) && name.endsWith('.tgz'));
    assert.equal(candidates.length, 1, `${packageName}: expected one packed tarball`);
    tarballs[packageName] = join(packDirectory, candidates[0]);
  }
  const packages = {};
  for (const packageName of packageNames) packages[packageName] = await inspectTarball(temporaryRoot, packageName, tarballs[packageName]);
  const installs = [];
  for (const packageManager of ['npm', 'pnpm']) installs.push(await inspectVueInstall(temporaryRoot, packageManager, tarballs));
  const incumbentProcess = await run(process.execPath, ['--expose-gc', resolve(repoRoot, 'scripts/consumer-install/incumbent-worker.mjs')], repoRoot);
  const incumbentPerformanceEvidence = JSON.parse(incumbentProcess.stdout).reports;
  const report = Object.freeze({
    schemaVersion: 1,
    packages,
    installs,
    incumbentPerformanceEvidence,
  });
  const baselinePath = resolve(repoRoot, 'verification/consumer-install/baseline.json');
  if (mode === 'record') await writeFile(baselinePath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  else validateInstallBaseline(JSON.parse(await readFile(baselinePath, 'utf8')), report);
  console.log(JSON.stringify({ status: 'passed', mode, packages: packageNames.length, installs: installs.length }));
} finally {
  if (process.env['SECTILE_KEEP_INSTALL'] !== '1') await rm(temporaryRoot, { recursive: true, force: true });
}

async function inspectVueInstall(root, packageManager, tarballs) {
  const directory = join(root, `install-${packageManager}`);
  await mkdir(directory);
  const vueManifest = JSON.parse(await readFile(resolve(repoRoot, 'packages/vue/node_modules/vue/package.json'), 'utf8'));
  const dependencies = {
    '@sectile/core': `file:${tarballs.core}`,
    '@sectile/dom': `file:${tarballs.dom}`,
    '@sectile/vue': `file:${tarballs.vue}`,
    vue: vueManifest.version,
  };
  await writeFile(join(directory, 'package.json'), `${JSON.stringify({
    private: true,
    type: 'module',
    dependencies,
    pnpm: {
      overrides: {
        '@sectile/core': `file:${tarballs.core}`,
        '@sectile/dom': `file:${tarballs.dom}`,
      },
    },
  }, null, 2)}\n`);
  if (packageManager === 'npm') {
    await run('npm', ['install', '--ignore-scripts', '--no-audit', '--no-fund', '--package-lock=false', '--omit=optional', '--cache', join(root, 'npm-cache')], directory);
  } else {
    await writeFile(join(directory, 'pnpm-workspace.yaml'), [
      "packages: ['.']",
      'autoInstallPeers: false',
      'overrides:',
      `  '@sectile/core': ${JSON.stringify(`file:${tarballs.core}`)}`,
      `  '@sectile/dom': ${JSON.stringify(`file:${tarballs.dom}`)}`,
      '',
    ].join('\n'));
    await run('pnpm', ['--store-dir', resolve(repoRoot, '.pnpm-store'), 'install', '--ignore-scripts', '--no-frozen-lockfile', '--config.optional=false', '--config.auto-install-peers=false'], directory);
  }
  await run(process.execPath, ['--input-type=module', '-e', "await import('@sectile/vue');"], directory);
  const optionalPackages = ['form', 'tabular', 'temporal', 'virtual'];
  const optionalPeersPresent = [];
  for (const packageName of optionalPackages) {
    if (await exists(join(directory, 'node_modules/@sectile', packageName))) optionalPeersPresent.push(`@sectile/${packageName}`);
    const result = await runResult(process.execPath, ['--input-type=module', '-e', `await import('@sectile/vue/${packageName}');`], directory);
    assert.notEqual(result.status, 0, `${packageManager}: optional ${packageName} import unexpectedly resolved without its peer`);
  }
  const installation = await directoryMetrics(join(directory, 'node_modules'));
  const incumbents = {
    colord: await installedPackageMetrics(directory, packageManager, 'colord'),
    '@floating-ui/dom': await installedPackageMetrics(directory, packageManager, '@floating-ui/dom'),
  };
  const dependencyTree = await installedDependencyTree(directory, packageManager);
  const dependencyNames = new Set();
  collectNormalizedNames(dependencyTree, dependencyNames);
  for (const packageName of optionalPackages) {
    const specifier = `file:${tarballs[packageName]}`;
    if (packageManager === 'npm') await run('npm', ['install', specifier, '--no-save', '--ignore-scripts', '--no-audit', '--no-fund', '--omit=optional', '--cache', join(root, 'npm-cache')], directory);
    else await run('pnpm', ['--store-dir', resolve(repoRoot, '.pnpm-store'), 'add', specifier, '--ignore-scripts', '--config.optional=false', '--config.auto-install-peers=false'], directory);
    await run(process.execPath, ['--input-type=module', '-e', `await import('@sectile/vue/${packageName}');`], directory);
  }
  return Object.freeze({
    packageManager,
    installedBytes: installation.bytes,
    installedFiles: installation.files,
    dependencyNames: Object.freeze([...dependencyNames].sort()),
    dependencyTree,
    optionalPeersPresent: Object.freeze(optionalPeersPresent),
    incumbents: Object.freeze(incumbents),
  });
}

async function inspectTarball(root, packageName, tarball) {
  const directory = join(root, `unpack-${packageName}`);
  await mkdir(directory);
  await run('tar', ['-xzf', tarball, '-C', directory], repoRoot);
  const packageRoot = join(directory, 'package');
  const files = await filesUnder(packageRoot);
  const categories = {
    runtimeJS: { files: 0, bytes: 0 },
    declarations: { files: 0, bytes: 0 },
    sourceMaps: { files: 0, bytes: 0 },
    other: { files: 0, bytes: 0 },
  };
  for (const file of files) {
    const relative = file.slice(packageRoot.length + 1);
    const category = relative.endsWith('.js') ? 'runtimeJS'
      : relative.endsWith('.d.ts') ? 'declarations'
        : relative.endsWith('.map') ? 'sourceMaps'
          : 'other';
    categories[category].files += 1;
    categories[category].bytes += (await stat(file)).size;
  }
  return Object.freeze({
    tarballBytes: (await stat(tarball)).size,
    unpackedBytes: Object.values(categories).reduce((total, entry) => total + entry.bytes, 0),
    unpackedFiles: files.length,
    categories,
  });
}

async function installedDependencyTree(directory, packageManager) {
  const command = packageManager === 'npm'
    ? ['npm', ['ls', '--all', '--json']]
    : ['pnpm', ['list', '--depth', 'Infinity', '--json']];
  const result = await run(command[0], command[1], directory);
  const document = JSON.parse(result.stdout);
  const roots = Array.isArray(document) ? document : [document];
  return Object.freeze(roots.flatMap((root) => normalizeDependencies(root.dependencies ?? {})));
}

function normalizeDependencies(dependencies) {
  return Object.freeze(Object.entries(dependencies).sort(([left], [right]) => left.localeCompare(right)).map(([name, dependency]) => Object.freeze({
    name,
    version: dependency.version ?? null,
    dependencies: normalizeDependencies(dependency.dependencies ?? {}),
  })));
}

function collectNormalizedNames(entries, names) {
  for (const entry of entries) {
    names.add(entry.name);
    collectNormalizedNames(entry.dependencies, names);
  }
}

async function installedPackageMetrics(directory, packageManager, packageName) {
  if (packageManager === 'npm') return directoryMetrics(join(directory, 'node_modules', ...packageName.split('/')));
  const store = join(directory, 'node_modules/.pnpm');
  const prefix = packageName.replace('/', '+').replace('@', '@');
  const candidate = (await readdir(store)).find((name) => name.startsWith(`${prefix}@`));
  assert.ok(candidate !== undefined, `${packageManager}: ${packageName} incumbent missing`);
  return directoryMetrics(join(store, candidate, 'node_modules', ...packageName.split('/')));
}

async function directoryMetrics(path) {
  const files = await filesUnder(path);
  let bytes = 0;
  for (const file of files) bytes += (await stat(file)).size;
  return Object.freeze({ files: files.length, bytes });
}

async function filesUnder(path) {
  const metadata = await stat(path);
  if (metadata.isFile()) return [path];
  const entries = await readdir(path, { withFileTypes: true });
  const files = [];
  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    if (entry.isSymbolicLink()) continue;
    const child = join(path, entry.name);
    if (entry.isDirectory()) files.push(...await filesUnder(child));
    else if (entry.isFile()) files.push(child);
  }
  return files;
}

async function exists(path) {
  try { await realpath(path); return true; } catch { return false; }
}

async function run(command, arguments_, cwd) {
  const result = await execFile(command, arguments_, { cwd, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  return result;
}

async function runResult(command, arguments_, cwd) {
  try {
    const result = await run(command, arguments_, cwd);
    return { ...result, status: 0 };
  } catch (error) {
    return { stdout: error.stdout ?? '', stderr: error.stderr ?? '', status: error.code ?? 1 };
  }
}
