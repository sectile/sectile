import assert from 'node:assert/strict';
import test from 'node:test';
import {
  assertRegistryArtifact,
  npmArtifactIntegrity,
  publishRegistryArtifacts,
  registryPublicationRetryDelay,
  waitForRegistryArtifact,
} from './lib/npm-registry-artifact.mjs';

function artifact(name) {
  return { manifest: { name: `@sectile/${name}`, version: '1.0.0' }, bytes: Buffer.from(name) };
}

function metadataFor(entry) {
  return { ...entry.manifest, 'dist.integrity': npmArtifactIntegrity(entry.bytes) };
}

test('ordered uploads finish before concurrent registry verification waits', async () => {
  const artifacts = ['core', 'form', 'vue'].map(artifact);
  const uploaded = [];
  const waiting = [];
  const verified = [];
  await publishRegistryArtifacts(artifacts, {
    read: (entry) => {
      if (!uploaded.includes(entry)) return undefined;
      assert.deepEqual(uploaded, artifacts);
      return new Promise((resolve) => {
        waiting.push(() => resolve(metadataFor(entry)));
        // All probes must be in flight before any can finish.
        if (waiting.length === artifacts.length) waiting.forEach((release) => release());
      });
    },
    publish: async (entry) => { uploaded.push(entry); },
    verify: async (entry, metadata) => {
      assertRegistryArtifact(metadata, entry.manifest, entry.bytes);
      verified.push(entry);
    },
  });
  assert.deepEqual(uploaded, artifacts);
  assert.deepEqual(verified, artifacts);
});

test('release retry validates existing artifacts and uploads only missing versions', async () => {
  const artifacts = ['core', 'vue'].map(artifact);
  const uploaded = [];
  const events = [];
  await publishRegistryArtifacts(artifacts, {
    read: async (entry) => entry === artifacts[0] || uploaded.includes(entry) ? metadataFor(entry) : undefined,
    publish: async (entry) => { uploaded.push(entry); },
    verify: async (entry, metadata) => assertRegistryArtifact(metadata, entry.manifest, entry.bytes),
    onVerified: (entry, existing) => events.push([entry.manifest.name, existing]),
  });
  assert.deepEqual(uploaded, [artifacts[1]]);
  assert.deepEqual(events, [['@sectile/core', true], ['@sectile/vue', false]]);
});

test('upload failure stops new uploads and drains already submitted artifacts', async () => {
  const artifacts = ['core', 'form', 'vue'].map(artifact);
  const attempted = [];
  const verified = [];
  await assert.rejects(publishRegistryArtifacts(artifacts, {
    read: async (entry) => entry === artifacts[0] && attempted.includes(entry) ? metadataFor(entry) : undefined,
    publish: async (entry) => {
      attempted.push(entry);
      if (entry === artifacts[1]) throw new Error('upload failed');
    },
    verify: async (entry) => { verified.push(entry); },
  }), (error) => error instanceof AggregateError && error.errors[0].message === 'upload failed');
  assert.deepEqual(attempted, artifacts.slice(0, 2));
  assert.deepEqual(verified, [artifacts[0]]);
});

test('integrity failures drain all verification tasks and are not reported as success', async () => {
  const artifacts = ['core', 'vue'].map(artifact);
  const uploaded = [];
  let releaseLast;
  const lastProbe = new Promise((resolve) => { releaseLast = resolve; });
  let firstFailed;
  const failureObserved = new Promise((resolve) => { firstFailed = resolve; });
  let settled = false;
  const result = publishRegistryArtifacts(artifacts, {
    read: async (entry) => {
      if (!uploaded.includes(entry)) return undefined;
      if (entry === artifacts[1]) await lastProbe;
      return metadataFor(entry);
    },
    publish: async (entry) => { uploaded.push(entry); },
    verify: async (entry, metadata) => {
      if (entry === artifacts[0]) {
        firstFailed();
        assertRegistryArtifact({ ...metadata, 'dist.integrity': 'wrong' }, entry.manifest, entry.bytes);
      }
      assertRegistryArtifact(metadata, entry.manifest, entry.bytes);
    },
  });
  result.then(() => { settled = true; }, () => { settled = true; });
  await failureObserved;
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(settled, false);
  releaseLast();
  await assert.rejects(result, (error) => error instanceof AggregateError
    && /differs from the verified tarball/u.test(error.errors[0].message));
});

test('existing artifact mismatch halts publication before new uploads', async () => {
  let uploaded = false;
  await assert.rejects(publishRegistryArtifacts(['core', 'vue'].map(artifact), {
    read: async (entry) => ({ ...metadataFor(entry), 'dist.integrity': 'wrong' }),
    publish: async () => { uploaded = true; },
    verify: async (entry, metadata) => assertRegistryArtifact(metadata, entry.manifest, entry.bytes),
  }), AggregateError);
  assert.equal(uploaded, false);
});

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
