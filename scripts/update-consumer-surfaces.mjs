#!/usr/bin/env node
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { PACKAGE_NAMES, deriveSurfaceFragment } from './consumer-bundles/surfaces.mjs';

const repoRoot = resolve('.');
for (const packageName of PACKAGE_NAMES) {
  const fragment = await deriveSurfaceFragment(repoRoot, packageName);
  const directory = resolve(repoRoot, 'verification/consumer-bundles', packageName);
  await mkdir(directory, { recursive: true });
  await writeFile(resolve(directory, 'surfaces.json'), `${JSON.stringify(fragment, null, 2)}\n`, 'utf8');
}
console.log(`consumer surfaces updated: ${PACKAGE_NAMES.length} packages`);
