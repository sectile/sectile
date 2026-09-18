import { createServer } from 'node:net';
import { artifactSessionPort, withArtifactSession } from '../lib/artifact-session.mjs';

const label = process.argv[2] ?? 'artifact session worker';
const mode = process.argv[3] ?? 'run';
let release;
const released = new Promise((resolve) => { release = resolve; });
const onMessage = (message) => { if (message?.type === 'release') release(); };
process.on('message', onMessage);

try {
  if (mode === 'occupy') {
    // An unrelated listener deliberately has no artifact-session metadata.
    const server = createServer();
    try {
      await new Promise((resolve, reject) => {
        server.once('error', reject);
        server.listen({ host: '127.0.0.1', port: artifactSessionPort, exclusive: true }, resolve);
      });
      await send({ type: 'occupied' });
      await released;
    } finally {
      if (server.listening) await new Promise((resolve) => server.close(resolve));
    }
  } else {
    if (mode !== 'hold' && mode !== 'run') throw new Error(`invalid worker mode: ${mode}`);
    await withArtifactSession(label, async () => {
      await send({ type: 'acquired' });
      if (mode === 'hold') await released;
    });
  }
  await send({ type: 'done' });
} catch (error) {
  console.error(error);
  await send({ type: 'failed', phase: mode, code: error?.code, message: error.message });
  process.exitCode = 1;
} finally {
  process.off('message', onMessage);
  if (process.connected) process.disconnect();
}

function send(message) {
  return new Promise((resolve, reject) => {
    if (process.send === undefined) { resolve(); return; }
    process.send(message, (error) => { if (error) reject(error); else resolve(); });
  });
}
