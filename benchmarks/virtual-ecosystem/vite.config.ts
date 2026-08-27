import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  resolve: {
    dedupe: ['vue'],
    alias: [
      { find: '@sectile/vue/virtual', replacement: resolve(import.meta.dirname, '../../packages/vue/src/virtual.ts') },
      { find: '@sectile/dom/virtual', replacement: resolve(import.meta.dirname, '../../packages/dom/src/virtual.ts') },
      { find: /^@sectile\/virtual\/(.+)$/, replacement: `${resolve(import.meta.dirname, '../../packages/virtual/src')}/$1.ts` },
      { find: '@sectile/virtual', replacement: resolve(import.meta.dirname, '../../packages/virtual/src/index.ts') },
    ],
  },
});
