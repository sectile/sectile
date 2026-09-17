import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { isBuiltin } from 'node:module';
import { dirname, relative, resolve, sep } from 'node:path';
import { assertPackageReference } from '../../check-workspace-boundaries.mjs';
import { collectModuleImports } from './imports.mjs';

export const normalized = (path) => path.split(sep).join('/');
export const digest = (value) => createHash('sha256').update(value).digest('hex');
const sourcePattern = /\.(?:[cm]?[jt]sx?)$/u;

export async function sourceFiles(directory) {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    assert.equal(entry.isSymbolicLink(), false, `Unsupported source symlink: ${path}`);
    if (entry.isDirectory()) result.push(...await sourceFiles(path));
    else if (entry.isFile() && sourcePattern.test(entry.name)) result.push(path);
  }
  return result.sort();
}

export function exportTarget(manifest, subpath, mode) {
  const entry = manifest.exports?.[subpath];
  assert.notEqual(entry, undefined, `${manifest.name}: unsupported public subpath ${subpath}`);
  if (typeof entry === 'string') return entry;
  assert.ok(entry && typeof entry === 'object' && !Array.isArray(entry), `${manifest.name}: invalid export ${subpath}`);
  for (const condition of Object.keys(entry)) {
    assert.ok(['types', 'import', 'default'].includes(condition), `${manifest.name}: unsupported conditional export ${subpath}/${condition}`);
  }
  // Conditional exports are ordered: an earlier default precedes import.
  const active = mode === 'source' ? ['types', 'import', 'default'] : ['import', 'default'];
  const target = Object.entries(entry).find(([condition]) => active.includes(condition))?.[1];
  assert.equal(typeof target, 'string', `${manifest.name}: unsupported conditional export ${subpath}`);
  return target;
}

/** Resolve exactly the repository's declared ESM export targets; no filesystem guessing. */
export function resolveImport(repositoryRoot, source, specifier, packages, modulePaths, mode = 'source') {
  const owner = packages.get(source.package);
  const ownerRoot = resolve(repositoryRoot, 'packages', owner.directory);
  let target;
  let targetPackage = source.package;
  if (specifier.startsWith('.')) {
    assertPackageReference(ownerRoot, resolve(repositoryRoot, source.path), specifier);
    assert.equal(/[?#%\\]/u.test(specifier), false, `${source.path}: unsupported relative URL ${specifier}`);
    assert.ok(specifier.endsWith('.js') || (mode === 'source' && specifier.endsWith('.ts')), `${source.path}: explicit ESM extension required: ${specifier}`);
    const path = normalized(relative(repositoryRoot, resolve(repositoryRoot, dirname(source.path), specifier)));
    target = mode === 'source' ? path.replace(/\.js$/u, '.ts') : path;
  } else {
    assert.equal(specifier.startsWith('#'), false, `${source.path}: package import aliases need explicit resolver support: ${specifier}`);
    const parts = specifier.split('/');
    const name = specifier.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0];
    const fields = mode === 'runtime' ? ['dependencies', 'peerDependencies', 'optionalDependencies']
      : ['dependencies', 'peerDependencies', 'optionalDependencies', 'devDependencies'];
    const declared = fields.some((field) => Object.hasOwn(owner.manifest[field] ?? {}, name));
    assert.ok(isBuiltin(specifier) || name === source.package || declared, `${source.path}: undeclared ${mode} dependency ${name}`);
    if (!name.startsWith('@sectile/')) {
      return { target: null, external: specifier, targetPackage: null };
    }
    assert.ok(packages.has(name), `${source.path}: not a product package dependency: ${name}`);
    targetPackage = name;
    const subpath = parts.length === 2 ? '.' : `./${parts.slice(2).join('/')}`;
    const targetOwner = packages.get(name);
    const exported = exportTarget(targetOwner.manifest, subpath, mode);
    if (exported === './package.json') return { target: null, external: `${name}/package.json`, targetPackage };
    assert.match(exported, /^\.\/dist\/.+\.(?:d\.ts|js)$/u, `${name}: unsupported delivery target ${exported}`);
    assert.equal(exported.split('/').includes('..'), false, `${name}: escaping delivery target`);
    target = `packages/${targetOwner.directory}/${exported.slice(2)}`;
    if (mode === 'source') target = target.replace('/dist/', '/src/').replace(/(?:\.d\.ts|\.js)$/u, '.ts');
  }
  assert.ok(modulePaths.has(target), `${source.path}: unresolved ${mode} module ${specifier} -> ${target}`);
  return { target, external: null, targetPackage };
}

/** Source graph includes references; runtime graph is the exact production input/output set. */
export async function collectPackageGraph(repositoryRoot, entries, { mode = 'source', productionFiles = null } = {}) {
  assert.ok(mode === 'source' || mode === 'runtime', 'Unknown graph mode');
  const packages = new Map(entries.map((entry) => [entry.name, entry]));
  const modules = [];
  for (const entry of entries) {
    const directory = resolve(repositoryRoot, 'packages', entry.directory);
    let paths;
    if (mode === 'source') {
      paths = await sourceFiles(resolve(directory, 'src'));
      for (const path of paths) assert.ok(path.endsWith('.ts'), `Unsupported product source extension: ${path}`);
    } else {
      assert.ok(productionFiles instanceof Map && productionFiles.has(entry.name), `Missing production inputs: ${entry.name}`);
      paths = productionFiles.get(entry.name).filter((path) => !path.endsWith('.d.ts')).map((path) => {
        const local = normalized(relative(directory, path));
        assert.match(local, /^src\/.+\.ts$/u, `${entry.name}: unsupported production input ${local}`);
        return resolve(directory, local.replace(/^src\//u, 'dist/').replace(/\.ts$/u, '.js'));
      });
      const actual = (await sourceFiles(resolve(directory, 'dist'))).filter((path) => path.endsWith('.js'));
      assert.deepEqual(actual.sort(), [...paths].sort(), `${entry.name}: production output coverage mismatch`);
    }
    for (const path of paths) {
      const id = normalized(relative(repositoryRoot, path));
      const source = await readFile(path, 'utf8');
      modules.push({ path: id, package: entry.name, digest: digest(source), imports: collectModuleImports(source, id) });
    }
  }
  modules.sort((a, b) => a.path.localeCompare(b.path));
  const modulePaths = new Set(modules.map((entry) => entry.path));
  const edges = [];
  for (const module of modules) {
    for (const declaration of module.imports) {
      const resolved = resolveImport(repositoryRoot, module, declaration.specifier, packages, modulePaths, mode);
      edges.push({ source: module.path, ...declaration, ...resolved });
    }
  }
  return { mode, modules: modules.map(({ imports, ...entry }) => entry), edges };
}

/** Include production inputs/configuration and build-owner code in concurrent-write detection. */
export async function inputFingerprint(repositoryRoot, entries, graph, configurations) {
  const files = ['pnpm-lock.yaml', 'package.json'];
  for (const entry of entries) {
    const directory = `packages/${entry.directory}`;
    files.push(`${directory}/package.json`);
    for (const name of await readdir(resolve(repositoryRoot, directory))) {
      if (/^tsconfig.*\.json$/u.test(name)) files.push(`${directory}/${name}`);
    }
  }
  for (const name of await readdir(resolve(repositoryRoot, 'tools/tooling'))) {
    if (/\.(?:mjs|json)$/u.test(name)) files.push(`tools/tooling/${name}`);
  }
  const inputs = [];
  for (const path of files.sort()) inputs.push([path, digest(await readFile(resolve(repositoryRoot, path)))]);
  return digest(JSON.stringify({ sources: graph.modules.map(({ path, digest: hash }) => [path, hash]), inputs, configurations }));
}
