import assert from 'node:assert/strict';
import test from 'node:test';
import { assertRegistryArtifact, npmArtifactIntegrity } from './lib/npm-registry-artifact.mjs';

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
