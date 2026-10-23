import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { sealReleaseArtifacts } from './lib/release-artifacts.mjs';

const source = { repository: 'sectile/sectile', commit: 'a'.repeat(40) };

async function fixture(t) {
  const directory = await mkdtemp(join(tmpdir(), 'sectile-release-artifacts-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const artifacts = [];
  for (const [name, version] of [['core', '0.15.0'], ['vue', '0.19.0']]) {
    const tarball = join(directory, `${name}.tgz`);
    await writeFile(tarball, `final verified ${name} bytes`);
    artifacts.push({ manifest: { name: `@sectile/${name}`, version }, tarball });
  }
  return { directory, artifacts };
}

test('handoff records independent identities, original source and exact compressed bytes', async (t) => {
  const { directory, artifacts } = await fixture(t);
  const result = await sealReleaseArtifacts(directory, artifacts, source);
  const stored = JSON.parse(await readFile(join(directory, 'artifacts.json'), 'utf8'));
  assert.deepEqual(stored, result);
  assert.equal(stored.schema, 1);
  assert.deepEqual(stored.source, source);
  assert.deepEqual(stored.packages.map(({ name, version, tarball }) => ({ name, version, tarball })), [
    { name: '@sectile/core', version: '0.15.0', tarball: 'core.tgz' },
    { name: '@sectile/vue', version: '0.19.0', tarball: 'vue.tgz' },
  ]);
  for (const entry of stored.packages) {
    const bytes = await readFile(join(directory, entry.tarball));
    assert.equal(entry.integrity, `sha512-${createHash('sha512').update(bytes).digest('base64')}`);
  }
  await writeFile(artifacts[0].tarball, 'changed');
  await assert.rejects(sealReleaseArtifacts(directory, artifacts, source), { code: 'EEXIST' });
  assert.equal(await readFile(join(directory, 'artifacts.json'), 'utf8'), `${JSON.stringify(stored, null, 2)}\n`);
});

test('handoff rejects incomplete source, duplicate packages and unsafe or missing files before sealing', async (t) => {
  const { directory, artifacts } = await fixture(t);
  for (const operation of [
    () => sealReleaseArtifacts(directory, artifacts, { ...source, commit: 'main' }),
    () => sealReleaseArtifacts(directory, [], source),
    () => sealReleaseArtifacts(directory, [artifacts[0], artifacts[0]], source),
    () => sealReleaseArtifacts(directory, [{ ...artifacts[0], tarball: join(directory, 'missing.tgz') }], source),
    () => sealReleaseArtifacts(directory, [{ ...artifacts[0], tarball: join(directory, '..', 'outside.tgz') }], source),
  ]) await assert.rejects(operation());
  const link = join(directory, 'link.tgz');
  await symlink(artifacts[0].tarball, link);
  await assert.rejects(sealReleaseArtifacts(directory, [{ ...artifacts[0], tarball: link }], source), /regular file/u);
  await assert.rejects(readFile(join(directory, 'artifacts.json')), { code: 'ENOENT' });
});
