import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { collectPublicSignatures } from './lib/public-signatures.mjs';

const signatures = await collectPublicSignatures();
await mkdir(resolve('testing'), { recursive: true });
await writeFile(
  resolve('testing/public-signatures.json'),
  `${JSON.stringify({ schemaVersion: 3, ...signatures }, null, 2)}\n`,
);
console.log(`public signatures updated: ${signatures.package} (${signatures.files.length} declarations)`);
