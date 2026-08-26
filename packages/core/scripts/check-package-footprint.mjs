import assert from 'node:assert/strict';
import { readdir, readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';

const ceilings = Object.freeze({
  totalBytes: 1_350_000,
  javascriptBytes: 480_000,
  declarationBytes: 185_000,
  sourceMapBytes: 680_000,
});

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
let sourceMapBytes = 0;
let otherBytes = 0;
for (const path of paths) {
  const size = (await stat(path)).size;
  totalBytes += size;
  if (path.endsWith('.map')) sourceMapBytes += size;
  else if (path.endsWith('.js')) javascriptBytes += size;
  else if (path.endsWith('.d.ts')) declarationBytes += size;
  else otherBytes += size;
  assert.equal(path.includes('/reference/'), false);
}
for (const [category, ceiling] of Object.entries(ceilings)) {
  const actual = { totalBytes, javascriptBytes, declarationBytes, sourceMapBytes }[category];
  assert.ok(actual < ceiling, `${category} ${actual} exceeds ${ceiling} byte ceiling`);
}
const packageJSON = JSON.parse(await readFile('package.json', 'utf8'));
assert.deepEqual(packageJSON.files, ['dist']);
console.log(JSON.stringify({
  status: 'passed',
  files: paths.length,
  footprint: { totalBytes, javascriptBytes, declarationBytes, sourceMapBytes, otherBytes },
  ceilings,
}, null, 2));
