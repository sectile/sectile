import { writeFile } from 'node:fs/promises';
import { collectPublicSignatures } from './lib/public-signatures.mjs';
const signatures = await collectPublicSignatures();
await writeFile('testing/public-signatures.json', `${JSON.stringify({ schemaVersion: 1, ...signatures }, null, 2)}\n`);
console.log(JSON.stringify(signatures, null, 2));
