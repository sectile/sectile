import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { dirname, relative, resolve, sep } from 'node:path';
import { root } from './lib/repository.mjs';

const workspaceRoots = ['packages', 'playgrounds'];
const packageDirectories = (
  await Promise.all(workspaceRoots.map(async (directory) => {
    const workspaceRoot = resolve(root, directory);
    return (await readdir(workspaceRoot, { withFileTypes: true }))
      .filter((entry) => entry.isDirectory())
      .map((entry) => resolve(workspaceRoot, entry.name));
  }))
).flat().concat(resolve(root, 'docs'));
const manifests = new Map();

for (const directory of packageDirectories) {
  const manifest = JSON.parse(await readFile(resolve(directory, 'package.json'), 'utf8'));
  manifests.set(manifest.name, { directory, manifest });
}

let sourceFiles = 0;
let workspaceImports = 0;
for (const { directory, manifest } of manifests.values()) {
  const declared = new Set([
    ...Object.keys(manifest.dependencies ?? {}),
    ...Object.keys(manifest.devDependencies ?? {}),
    ...Object.keys(manifest.peerDependencies ?? {}),
  ]);
  for (const command of Object.values(manifest.scripts ?? {})) {
    assert.equal(command.includes('../'), false, `${manifest.name} script escapes its package: ${command}`);
    assert.equal(command.includes('packages/'), false, `${manifest.name} script targets another package: ${command}`);
    assert.equal(command.includes('playgrounds/'), false, `${manifest.name} script targets another project: ${command}`);
  }
  for (const path of await sourcePaths(directory)) {
    sourceFiles += 1;
    const source = await readFile(path, 'utf8');
    for (const specifier of importSpecifiers(source)) {
      if (specifier.startsWith('.')) {
        const target = resolve(dirname(path), specifier);
        const escape = relative(directory, target);
        assert.equal(
          escape === '..' || escape.startsWith(`..${sep}`),
          false,
          `${relative(root, path)} imports outside ${manifest.name}: ${specifier}`,
        );
        continue;
      }
      if (!specifier.startsWith('@sectile/')) continue;
      const [scope, packageName, ...subpathParts] = specifier.split('/');
      const dependency = `${scope}/${packageName}`;
      if (dependency !== manifest.name) {
        assert.equal(
          declared.has(dependency),
          true,
          `${relative(root, path)} imports undeclared workspace dependency ${dependency}`,
        );
      }
      const targetPackage = manifests.get(dependency);
      assert.notEqual(targetPackage, undefined, `${dependency} is not a workspace package`);
      const subpath = subpathParts.length === 0 ? '.' : `./${subpathParts.join('/')}`;
      assert.equal(
        Object.hasOwn(targetPackage.manifest.exports ?? {}, subpath),
        true,
        `${relative(root, path)} bypasses ${dependency} exports with ${specifier}`,
      );
      assert.equal(
        /(^|\/)(src|dist|\.verification-dist)(\/|$)/u.test(specifier),
        false,
        `${relative(root, path)} imports a package implementation path: ${specifier}`,
      );
      workspaceImports += 1;
    }
  }
}

const rootManifest = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'));
const rootDependencies = new Set([
  ...Object.keys(rootManifest.dependencies ?? {}),
  ...Object.keys(rootManifest.devDependencies ?? {}),
]);
for (const path of await sourcePaths(resolve(root, 'verification'))) {
  sourceFiles += 1;
  const source = await readFile(path, 'utf8');
  for (const specifier of importSpecifiers(source)) {
    if (specifier.startsWith('.')) {
      const target = relative(root, resolve(dirname(path), specifier)).split(sep).join('/');
      assert.equal(
        target.startsWith('packages/'),
        false,
        `${relative(root, path)} directly imports a workspace package path: ${specifier}`,
      );
      continue;
    }
    if (!specifier.startsWith('@sectile/')) continue;
    const [scope, packageName, ...subpathParts] = specifier.split('/');
    const dependency = `${scope}/${packageName}`;
    assert.equal(rootDependencies.has(dependency), true, `root verification imports undeclared ${dependency}`);
    const targetPackage = manifests.get(dependency);
    assert.notEqual(targetPackage, undefined, `${dependency} is not a workspace package`);
    const subpath = subpathParts.length === 0 ? '.' : `./${subpathParts.join('/')}`;
    assert.equal(
      Object.hasOwn(targetPackage.manifest.exports ?? {}, subpath),
      true,
      `${relative(root, path)} bypasses ${dependency} exports with ${specifier}`,
    );
    workspaceImports += 1;
  }
}

console.log(JSON.stringify({
  status: 'passed',
  packages: manifests.size,
  sourceFiles,
  workspaceImports,
}, null, 2));

async function sourcePaths(directory) {
  const result = [];
  const pending = [directory];
  while (pending.length > 0) {
    const current = pending.pop();
    if (current === undefined) continue;
    for (const entry of await readdir(current, { withFileTypes: true })) {
      if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '.verification-dist') {
        continue;
      }
      const path = resolve(current, entry.name);
      if (entry.isDirectory()) pending.push(path);
      else if (entry.isFile() && /\.(?:js|mjs|ts)$/u.test(entry.name)) result.push(path);
    }
  }
  return result;
}

function importSpecifiers(source) {
  const matches = source.matchAll(/(?:from\s+|import\s*(?:\(|))(['"])([^'"]+)\1/gu);
  return [...matches].map((match) => match[2]);
}
