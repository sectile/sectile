import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir, readFile, readdir, realpath } from 'node:fs/promises';
import { basename, dirname, join, parse } from 'node:path';
import { spawnSyncPortable } from '../../scripts/lib/portable-process.mjs';

export async function packInstalledDependencyClosure(entryManifestPath, destination) {
  const entry = await loadManifest(await realpath(entryManifestPath));
  const packages = await collectDependencyClosure(entry);
  await mkdir(destination, { recursive: true });

  const overrides = {};
  for (const dependency of [...packages.values()].sort((left, right) => left.name.localeCompare(right.name))) {
    const before = new Set(await readdir(destination));
    run('pnpm', ['pack', '--pack-destination', destination], dirname(dependency.path), {
      ...process.env,
      npm_config_ignore_scripts: 'true',
    }, `${dependency.name}@${dependency.version}`);
    const created = (await readdir(destination))
      .filter((file) => file.endsWith('.tgz') && !before.has(file));
    assert.equal(created.length, 1, `${dependency.name}@${dependency.version} did not produce one tarball`);
    overrides[dependency.name] = join(destination, created[0]);
  }

  return Object.freeze({
    entryTarball: overrides[entry.name],
    overrides: Object.freeze(overrides),
  });
}

async function collectDependencyClosure(entry) {
  const packages = new Map();
  const pending = [entry];

  while (pending.length > 0) {
    const current = pending.pop();
    const existing = packages.get(current.name);
    if (existing !== undefined) {
      assert.equal(
        existing.version,
        current.version,
        `local dependency closure contains multiple ${current.name} versions`,
      );
      continue;
    }
    packages.set(current.name, current);

    const dependencyNames = Object.keys({
      ...current.manifest.dependencies,
      ...current.manifest.optionalDependencies,
    });
    for (const name of dependencyNames) {
      pending.push(await loadManifest(await resolveDependencyManifest(current.path, name)));
    }
  }

  return packages;
}

async function resolveDependencyManifest(parentManifestPath, name) {
  const require = createRequire(parentManifestPath);
  try {
    return require.resolve(`${name}/package.json`);
  } catch (error) {
    if (error?.code !== 'ERR_PACKAGE_PATH_NOT_EXPORTED') throw error;
  }

  let directory = dirname(require.resolve(name));
  while (directory !== parse(directory).root) {
    const candidate = join(directory, 'package.json');
    try {
      const manifest = JSON.parse(await readFile(candidate, 'utf8'));
      if (manifest.name === name) return candidate;
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error;
    }
    directory = dirname(directory);
  }
  throw new Error(`could not locate installed manifest for ${name}`);
}

async function loadManifest(path) {
  const manifest = JSON.parse(await readFile(path, 'utf8'));
  assert.equal(typeof manifest.name, 'string', `${path} has no package name`);
  assert.equal(typeof manifest.version, 'string', `${path} has no package version`);
  return Object.freeze({ name: manifest.name, version: manifest.version, manifest, path });
}

function run(command, args, cwd, env, detail) {
  const result = spawnSyncPortable(command, args, {
    cwd,
    encoding: 'utf8',
    env,
    maxBuffer: 32 * 1024 * 1024,
  });
  if (result.error !== undefined) throw result.error;
  assert.equal(
    result.status,
    0,
    `${detail}: ${command} ${args.map((value) => basename(value)).join(' ')}\n${result.stdout}\n${result.stderr}`,
  );
}
