import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

export function npmArtifactIntegrity(bytes) {
  return `sha512-${createHash('sha512').update(bytes).digest('base64')}`;
}

export function assertRegistryArtifact(metadata, manifest, bytes) {
  assert.notEqual(metadata, undefined, `${manifest.name}@${manifest.version} was not readable after publication`);
  assert.equal(metadata.name, manifest.name, `${manifest.name}@${manifest.version} registry name drifted`);
  assert.equal(metadata.version, manifest.version, `${manifest.name}@${manifest.version} registry version drifted`);
  assert.equal(metadata['dist.integrity'] ?? metadata.dist?.integrity, npmArtifactIntegrity(bytes),
    `${manifest.name}@${manifest.version} registry artifact differs from the verified tarball`);
}
