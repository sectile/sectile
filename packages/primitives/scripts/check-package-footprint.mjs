import assert from 'node:assert/strict';
import { readdir, readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
async function files(directory) {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) result.push(...await files(path));
    else if (entry.isFile()) result.push(path);
  }
  return result;
}
const paths = ['package.json', ...await files('dist')];
let totalBytes = 0;
let javascriptBytes = 0;
let declarationBytes = 0;
for (const path of paths) {
  const size = (await stat(path)).size;
  totalBytes += size;
  if (path.endsWith('.js')) javascriptBytes += size;
  if (path.endsWith('.d.ts')) declarationBytes += size;
  assert.equal(path.includes('/reference/'), false);
}
assert.ok(totalBytes < 250_000, `package footprint ${totalBytes} exceeds 250KB ceiling`);
const packageJSON = JSON.parse(await readFile('package.json', 'utf8'));
assert.deepEqual(packageJSON.files, ['dist']);
console.log(JSON.stringify({ status: 'passed', files: paths.length, totalBytes, javascriptBytes, declarationBytes }, null, 2));
