import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import { benchmarkSourceMetadata } from './scripts/source-metadata.mjs';

export default defineConfig({
  define: {
    __BENCHMARK_SOURCE__: JSON.stringify(benchmarkSourceMetadata()),
  },
  resolve: {
    dedupe: ['vue'],
    alias: [
      { find: '@sectile/vue/virtual/list', replacement: resolve(import.meta.dirname, '../../packages/vue/src/virtual-list.ts') },
      { find: '@sectile/dom/virtual', replacement: resolve(import.meta.dirname, '../../packages/dom/src/virtual.ts') },
      { find: /^@sectile\/virtual\/(.+)$/, replacement: `${resolve(import.meta.dirname, '../../packages/virtual/src')}/$1.ts` },
      { find: '@sectile/virtual', replacement: resolve(import.meta.dirname, '../../packages/virtual/src/index.ts') },
    ],
  },
});
