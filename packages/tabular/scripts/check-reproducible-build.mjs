import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { join, relative } from 'node:path';

async function files(directory) {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) result.push(...await files(path));
    else if (entry.isFile()) result.push(path);
  }
  return result.sort();
}

async function fingerprint() {
  const hash = createHash('sha256');
  for (const path of await files('dist')) {
    hash.update(relative('dist', path));
    hash.update('\0');
    hash.update(await readFile(path));
    hash.update('\0');
  }
  return hash.digest('hex');
}

function build() {
  const result = spawnSync(process.execPath, ['scripts/build.mjs', 'production'], { encoding: 'utf8' });
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
}

build();
const first = await fingerprint();
build();
const second = await fingerprint();
assert.equal(second, first);
console.log(JSON.stringify({ status: 'passed', fingerprint: first }, null, 2));
