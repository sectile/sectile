import { copyFile, mkdir, readdir, rm } from 'node:fs/promises';
import { resolve } from 'node:path';

const source = resolve('src');
const output = resolve('dist');
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });

for (const entry of await readdir(source, { withFileTypes: true })) {
  if (!entry.isFile() || !entry.name.endsWith('.mjs')) continue;
  await copyFile(resolve(source, entry.name), resolve(output, entry.name));
}
