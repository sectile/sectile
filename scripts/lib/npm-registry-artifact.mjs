import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';

export const registryPublicationTimeoutMs = 5 * 60_000;
const registryPublicationInitialDelayMs = 2_000;
const registryPublicationMaximumDelayMs = 30_000;

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

export function registryPublicationRetryDelay(attempt) {
  assert.equal(Number.isInteger(attempt) && attempt >= 0, true, 'registry publication attempt must be a non-negative integer');
  return Math.min(registryPublicationInitialDelayMs * (2 ** Math.min(attempt, 4)), registryPublicationMaximumDelayMs);
}

export async function publishRegistryArtifacts(artifacts, operations) {
  const pending = [];
  const failures = [];
  // Keep uploads ordered, but do not serialize registry processing delays.
  for (const artifact of artifacts) {
    try {
      const metadata = await operations.read(artifact);
      if (metadata !== undefined) {
        await operations.verify(artifact, metadata);
        operations.onVerified?.(artifact, true);
      } else {
        await operations.publish(artifact);
        pending.push(artifact);
      }
    } catch (error) {
      failures.push(error);
      break;
    }
  }
  // Drain every submitted artifact before cleanup, including after an upload failure.
  const results = await Promise.allSettled(pending.map(async (artifact) => {
    const { name, version } = artifact.manifest;
    const metadata = await waitForRegistryArtifact(
      () => operations.read(artifact), `${name}@${version}`, operations.polling,
    );
    await operations.verify(artifact, metadata);
    operations.onVerified?.(artifact, false);
  }));
  for (const result of results) {
    if (result.status === 'rejected') failures.push(result.reason);
  }
  if (failures.length > 0) throw new AggregateError(failures, 'package publication or registry verification failed');
}

export async function waitForRegistryArtifact(read, specifier, options = {}) {
  assert.equal(typeof read, 'function', 'registry artifact reader must be a function');
  assert.equal(typeof specifier === 'string' && specifier !== '', true, 'registry artifact specifier must be non-empty');
  const now = options.now ?? Date.now;
  const sleep = options.sleep ?? delay;
  const timeoutMs = options.timeoutMs ?? registryPublicationTimeoutMs;
  assert.equal(Number.isFinite(timeoutMs) && timeoutMs > 0, true, 'registry publication timeout must be positive');
  const deadline = now() + timeoutMs;
  let attempt = 0;
  while (true) {
    const metadata = await read();
    if (metadata !== undefined) return metadata;
    const remainingMs = deadline - now();
    if (remainingMs <= 0) throw new Error(`${specifier} was not readable after publication`);
    await sleep(Math.min(registryPublicationRetryDelay(attempt), remainingMs));
    attempt += 1;
  }
}
