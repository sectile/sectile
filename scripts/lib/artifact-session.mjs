import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { root } from './repository.mjs';

export const artifactSessionEnvironment = 'SECTILE_ARTIFACT_SESSION';

const lockScope = process.env.SECTILE_ARTIFACT_LOCK_SCOPE ?? 'workspace';
const lockIdentity = createHash('sha256').update(`${root}\0${lockScope}`).digest();
const metadataPath = join(root, '.tmp', `artifact-session-${lockIdentity.toString('hex').slice(0, 12)}.json`);
const lockPort = 33_000 + lockIdentity.readUInt16BE(0) % 10_000;
const pollIntervalMilliseconds = 250;

export async function withArtifactSession(label, action) {
  if (process.env[artifactSessionEnvironment]) return action();

  const timeoutMilliseconds = readTimeout();
  const startedAt = Date.now();
  let waitingAnnounced = false;
  let missingMetadataSince = null;

  while (true) {
    const attempt = await tryListen();
    if (attempt.server !== null) {
      return ownSession(attempt.server, label, action);
    }
    if (attempt.error?.code !== 'EADDRINUSE') throw attempt.error;

    const owner = await readOwner();
    if (owner?.root === root) {
      missingMetadataSince = null;
      if (!waitingAnnounced) {
        console.log(`… waiting for ${owner.label} (pid ${owner.pid})`);
        waitingAnnounced = true;
      }
    } else if (owner === null) {
      missingMetadataSince ??= Date.now();
      if (Date.now() - missingMetadataSince > 1_000) {
        throw new Error(`artifact session port ${lockPort} is occupied by another process`);
      }
    } else {
      throw new Error(`artifact session port ${lockPort} belongs to another workspace`);
    }

    if (Date.now() - startedAt >= timeoutMilliseconds) {
      const detail = owner === null ? '' : `: ${owner.label} (pid ${owner.pid})`;
      throw new Error(`timed out waiting for workspace artifacts${detail}`);
    }
    await delay(pollIntervalMilliseconds);
  }
}

async function ownSession(server, label, action) {
  const token = randomUUID();
  const previousToken = process.env[artifactSessionEnvironment];
  process.env[artifactSessionEnvironment] = token;
  await mkdir(join(root, '.tmp'), { recursive: true });
  await writeFile(metadataPath, `${JSON.stringify({
    label,
    pid: process.pid,
    root,
    startedAt: new Date().toISOString(),
    token,
  }, null, 2)}\n`);

  try {
    return await action();
  } finally {
    if (previousToken === undefined) delete process.env[artifactSessionEnvironment];
    else process.env[artifactSessionEnvironment] = previousToken;
    await removeOwnedMetadata(token);
    await new Promise((resolve) => server.close(resolve));
  }
}

async function tryListen() {
  const server = createServer();
  return new Promise((resolve) => {
    const onError = (error) => resolve({ error, server: null });
    server.once('error', onError);
    server.listen({ exclusive: true, host: '127.0.0.1', port: lockPort }, () => {
      server.off('error', onError);
      resolve({ error: null, server });
    });
  });
}

async function readOwner() {
  try {
    return JSON.parse(await readFile(metadataPath, 'utf8'));
  } catch (error) {
    if (error?.code === 'ENOENT' || error instanceof SyntaxError) return null;
    throw error;
  }
}

async function removeOwnedMetadata(token) {
  const owner = await readOwner();
  if (owner?.token === token) await rm(metadataPath, { force: true });
}

function readTimeout() {
  const raw = process.env.SECTILE_ARTIFACT_WAIT_TIMEOUT_MS ?? '1200000';
  const timeout = Number(raw);
  if (!Number.isSafeInteger(timeout) || timeout <= 0) {
    throw new Error(`invalid SECTILE_ARTIFACT_WAIT_TIMEOUT_MS: ${raw}`);
  }
  return timeout;
}
