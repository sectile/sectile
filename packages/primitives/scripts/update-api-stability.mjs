import { writeFile, readFile } from 'node:fs/promises';
import { semanticFingerprint } from './lib/repository.mjs';
const publicAPI = JSON.parse(await readFile('testing/public-api.json', 'utf8'));
const value = { contractVersion: 11, publicAPISHA256: semanticFingerprint(publicAPI) };
await writeFile('testing/api-stability.json', `${JSON.stringify(value, null, 2)}\n`);
console.log(JSON.stringify(value, null, 2));
