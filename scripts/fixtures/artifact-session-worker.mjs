import { setTimeout as delay } from 'node:timers/promises';
import { withArtifactSession } from '../lib/artifact-session.mjs';

const label = process.argv[2] ?? 'artifact session worker';
const holdMilliseconds = Number(process.argv[3] ?? '0');
if (!Number.isSafeInteger(holdMilliseconds) || holdMilliseconds < 0) {
  throw new Error(`invalid hold duration: ${process.argv[3]}`);
}

await withArtifactSession(label, async () => {
  process.send?.({ type: 'acquired' });
  await delay(holdMilliseconds);
});
process.send?.({ type: 'done' });
