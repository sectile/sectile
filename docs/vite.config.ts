import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vite';

export default defineConfig({
  base: '/sectile/',
  publicDir: false,
  plugins: [vue()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
