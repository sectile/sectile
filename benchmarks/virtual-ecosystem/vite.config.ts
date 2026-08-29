import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import virtualPackage from '@sectile/virtual/package.json' with { type: 'json' };
import { benchmarkSourceMetadata } from './scripts/source-metadata.mjs';

export default defineConfig({
  define: {
    __BENCHMARK_SOURCE__: JSON.stringify(benchmarkSourceMetadata()),
    __SECTILE_VIRTUAL_VERSION__: JSON.stringify(virtualPackage.version),
    __VUE_OPTIONS_API__: true,
    __VUE_PROD_DEVTOOLS__: false,
    __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: false,
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
