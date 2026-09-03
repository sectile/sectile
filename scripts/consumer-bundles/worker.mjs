import { parentPort } from 'node:worker_threads';
import { bundleFixture } from './bundle.mjs';

if (parentPort === null) throw new Error('consumer bundle worker requires a parent port');

parentPort.on('message', async ({ fixture, index, repoRoot }) => {
  try {
    const results = [];
    for (const bundler of ['esbuild', 'vite']) {
      results.push(await bundleFixture(repoRoot, fixture, bundler));
    }
    parentPort.postMessage({ index, results });
  } catch (error) {
    parentPort.postMessage({
      index,
      error: {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack ?? null : null,
      },
    });
  }
});
