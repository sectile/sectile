import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { extname, relative, resolve, sep } from 'node:path';
import { listFiles, root } from './lib/repository.mjs';

const roots = [
  'benchmarks',
  'src',
  'tests',
  'scripts',
  'testing',
  'verification',
];
const extensions = new Set(['.json', '.md', '.mjs', '.ts']);
const legacySpellings = [
  'StableId',
  'branchIds',
  'canonicalIds',
  'childIds',
  'eligibleIds',
  'implementationSha256',
  'isWellFormedUtf16',
  'maxIdCodeUnits',
  'packageJson',
  'parentId',
  'publicApi',
  'publicApiSha256',
  'readJson',
  'renamedIds',
  'theorySha256',
  'validateStableId',
  'validateUniqueIds',
];
const self = 'scripts/check-acronym-casing.mjs';
let files = 0;

for (const directory of roots) {
  for (const path of await listFiles(resolve(root, directory))) {
    if (!extensions.has(extname(path))) continue;
    const relativePath = relative(root, path).split(sep).join('/');
    if (relativePath === self) continue;
    const source = await readFile(path, 'utf8');
    for (const spelling of legacySpellings) {
      assert.equal(source.includes(spelling), false, `${relativePath} uses legacy ${spelling}`);
    }
    assert.equal(/\bId\b/u.test(source), false, `${relativePath} uses legacy Id`);
    files += 1;
  }
}

console.log(JSON.stringify({ status: 'passed', files, initialisms: 5 }, null, 2));
