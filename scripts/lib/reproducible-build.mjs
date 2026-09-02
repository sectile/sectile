import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { join, relative, resolve, sep } from 'node:path';

export async function verifyReproducibleBuild(packageRoot, options = {}) {
  const root = resolve(packageRoot);
  const output = join(root, 'dist');
  const first = options.prepared === true
    ? await fingerprint(output)
    : await buildAndFingerprint(root, output);
  const second = await buildAndFingerprint(root, output);

  assert.equal(second, first, `${options.label ?? root}: production build output is not reproducible`);
  return Object.freeze({
    status: 'passed',
    fingerprint: first,
    prepared: options.prepared === true,
  });
}

async function buildAndFingerprint(root, output) {
  const result = spawnSync(process.execPath, [join(root, 'scripts', 'build.mjs'), 'production'], {
    cwd: root,
    encoding: 'utf8',
  });
  if (result.error !== undefined) throw result.error;
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  return fingerprint(output);
}

async function fingerprint(directory) {
  const hash = createHash('sha256');
  for (const path of await files(directory)) {
    hash.update(relative(directory, path).split(sep).join('/'));
    hash.update('\0');
    hash.update(await readFile(path));
    hash.update('\0');
  }
  return hash.digest('hex');
}

async function files(directory) {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) result.push(...await files(path));
    else if (entry.isFile()) result.push(path);
  }
  return result.sort();
}
