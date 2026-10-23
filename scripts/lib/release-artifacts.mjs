import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { lstat, writeFile } from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';

// The pack/validation owner calls this only after every final tarball passes.
// This is Releaseway's handoff contract, not another publication implementation.
export async function sealReleaseArtifacts(directory, artifacts, source) {
  assert.match(source.repository, /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/u, 'release repository is required');
  assert.match(source.commit, /^[0-9a-f]{40}$/u, 'release source must be a full commit SHA');
  assert.ok(artifacts.length > 0, 'release artifacts cannot be empty');
  const names = new Set();
  const paths = new Set();
  const packages = [];
  for (const { manifest, tarball } of artifacts) {
    assert.equal(names.has(manifest.name), false, `duplicate release artifact: ${manifest.name}`);
    const path = resolve(tarball);
    const filename = basename(path);
    assert.equal(dirname(path), resolve(directory), 'release tarballs must share the manifest directory');
    assert.match(filename, /^[A-Za-z0-9_.-]+\.tgz$/u, 'release tarball requires a portable filename');
    assert.equal(paths.has(filename), false, `duplicate release tarball: ${filename}`);
    assert.equal((await lstat(path)).isFile(), true, 'release tarball must be a regular file');
    const hash = createHash('sha512');
    for await (const chunk of createReadStream(path)) hash.update(chunk);
    packages.push({ name: manifest.name, version: manifest.version, tarball: filename,
      integrity: `sha512-${hash.digest('base64')}` });
    names.add(manifest.name);
    paths.add(filename);
  }
  const manifest = { schema: 1, source, packages };
  // A retry must retain the original handoff rather than silently resealing it.
  await writeFile(join(directory, 'artifacts.json'), `${JSON.stringify(manifest, null, 2)}\n`, { flag: 'wx' });
  return manifest;
}
