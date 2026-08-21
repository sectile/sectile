import { writeFile, readFile } from 'node:fs/promises';
import { semanticFingerprint } from './lib/repository.mjs';
const publicApi = JSON.parse(await readFile('testing/public-api.json', 'utf8'));
const value = { contractVersion: 5, publicApiSha256: semanticFingerprint(publicApi) };
await writeFile('testing/api-stability.json', `${JSON.stringify(value, null, 2)}\n`);
console.log(JSON.stringify(value, null, 2));
