import { join } from 'node:path';
import { publishedPackageDirectories } from './published-packages.mjs';
import { readJSON, root } from './repository.mjs';

const dependencyFields = ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies'];

export async function loadPublishedPackageGraph() {
  const packages = await Promise.all(publishedPackageDirectories.map(async (directory) => {
    const manifest = await readJSON(join(root, 'packages', directory, 'package.json'));
    return { directory, manifest, name: manifest.name };
  }));
  const names = new Set(packages.map((entry) => entry.name));
  const byName = new Map(packages.map((entry) => [entry.name, entry]));

  for (const entry of packages) {
    entry.dependencies = dependencyFields
      .flatMap((field) => Object.entries(entry.manifest[field] ?? {}))
      .filter(([name, version]) => names.has(name) && String(version).startsWith('workspace:'))
      .map(([name]) => name)
      .filter((name, index, values) => values.indexOf(name) === index);
  }

  return Object.freeze({
    byName,
    packages: Object.freeze(packages),
    order: Object.freeze(topologicalOrder(packages, byName)),
  });
}

function topologicalOrder(packages, byName) {
  const complete = new Set();
  const ordered = [];
  while (ordered.length < packages.length) {
    let progressed = false;
    for (const entry of packages) {
      if (complete.has(entry.name)) continue;
      if (!entry.dependencies.every((name) => complete.has(byName.get(name).name))) continue;
      complete.add(entry.name);
      ordered.push(entry);
      progressed = true;
    }
    if (!progressed) {
      const blocked = packages.filter(({ name }) => !complete.has(name)).map(({ name }) => name);
      throw new Error(`workspace dependency cycle: ${blocked.join(', ')}`);
    }
  }
  return ordered;
}
