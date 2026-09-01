import assert from 'node:assert/strict';
import test from 'node:test';
import {
  assertRegistryArtifact,
  npmArtifactIntegrity,
  registryPublicationRetryDelay,
  waitForRegistryArtifact,
} from './lib/npm-registry-artifact.mjs';

test('registry retries accept only the exact immutable package artifact', () => {
  const bytes = Buffer.from('verified tarball');
  const manifest = { name: '@sectile/form', version: '0.14.2' };
  const metadata = {
    name: manifest.name,
    version: manifest.version,
    'dist.integrity': npmArtifactIntegrity(bytes),
  };
  assert.doesNotThrow(() => assertRegistryArtifact(metadata, manifest, bytes));
  assert.throws(() => assertRegistryArtifact({ ...metadata, 'dist.integrity': npmArtifactIntegrity(Buffer.from('other')) }, manifest, bytes),
    /differs from the verified tarball/u);
  assert.throws(() => assertRegistryArtifact({ ...metadata, version: '0.14.1' }, manifest, bytes), /registry version drifted/u);
});

test('registry publication polling tolerates delayed package processing with bounded backoff', async () => {
  const metadata = { name: '@sectile/tabular', version: '0.14.1' };
  const responses = [undefined, undefined, metadata];
  const sleeps = [];
  let now = 0;
  const result = await waitForRegistryArtifact(
    () => responses.shift(),
    '@sectile/tabular@0.14.1',
    {
      now: () => now,
      sleep: async (milliseconds) => { sleeps.push(milliseconds); now += milliseconds; },
      timeoutMs: 60_000,
    },
  );
  assert.equal(result, metadata);
  assert.deepEqual(sleeps, [2_000, 4_000]);
  assert.equal(registryPublicationRetryDelay(4), 30_000);
  assert.equal(registryPublicationRetryDelay(20), 30_000);
});

test('registry publication polling stops at its timeout budget', async () => {
  const sleeps = [];
  let now = 0;
  await assert.rejects(
    waitForRegistryArtifact(
      () => undefined,
      '@sectile/temporal@0.14.1',
      {
        now: () => now,
        sleep: async (milliseconds) => { sleeps.push(milliseconds); now += milliseconds; },
        timeoutMs: 5_000,
      },
    ),
    /was not readable after publication/u,
  );
  assert.deepEqual(sleeps, [2_000, 3_000]);
});
