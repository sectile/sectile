#!/usr/bin/env node
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { collectPublicSignatureSurfaces, collectPublicSignatures } from './lib/public-signatures.mjs';

const packages = ['core', 'dom', 'form', 'tabular', 'temporal', 'terminal', 'virtual', 'vue'];
const root = resolve('verification/breaking-changes');
await mkdir(resolve(root, 'baseline'), { recursive: true });
await mkdir(resolve(root, 'fragments'), { recursive: true });
for (const packageName of packages) {
  const packageRoot = resolve('packages', packageName);
  const signatures = await collectPublicSignatures(packageRoot);
  const surfaces = await collectPublicSignatureSurfaces(packageRoot);
  await writeFile(resolve(root, 'baseline', `${packageName}.json`), `${JSON.stringify({
    schemaVersion: 1,
    ...signatures,
    surfaces: surfaces.surfaces,
  }, null, 2)}\n`, 'utf8');
  await writeFile(resolve(root, 'fragments', `${packageName}.json`), `${JSON.stringify({
    schemaVersion: 1,
    package: signatures.package,
    entries: [],
  }, null, 2)}\n`, 'utf8');
}
console.log(`breaking baseline updated: ${packages.length} packages`);
