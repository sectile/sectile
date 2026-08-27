import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { collectPublicSignatures } from './lib/public-signatures.mjs';

const packageDirectories = ['core', 'tabular', 'temporal', 'virtual', 'dom', 'terminal', 'vue']
  .map((name) => resolve('packages', name));

for (const packageDirectory of packageDirectories) {
  const signatures = await collectPublicSignatures(packageDirectory);
  await mkdir(resolve(packageDirectory, 'testing'), { recursive: true });
  await writeFile(
    resolve(packageDirectory, 'testing/public-signatures.json'),
    `${JSON.stringify({ schemaVersion: 3, ...signatures }, null, 2)}\n`,
  );
}

console.log(`public signatures updated: ${packageDirectories.length} packages`);
