import { resolve } from 'node:path';
import { build, type Plugin } from 'vite';

const runnerRoot = resolve(import.meta.dirname, '../../benchmarks/virtual-ecosystem');
const runnerOutput = resolve(import.meta.dirname, '../public/benchmark-runner');
let runnerBuild: Promise<void> | undefined;

export function virtualBenchmarkRunner(): Plugin {
  return {
    name: 'sectile-virtual-benchmark-runner',
    async configResolved() {
      runnerBuild ??= build({
        root: runnerRoot,
        base: './',
        mode: 'production',
        define: {
          'process.env.NODE_ENV': JSON.stringify('production'),
        },
        build: {
          emptyOutDir: true,
          outDir: runnerOutput,
        },
        logLevel: 'warn',
      }).then(() => undefined);
      await runnerBuild;
    },
  };
}
