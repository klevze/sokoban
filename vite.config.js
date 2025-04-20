import { defineConfig } from 'vite';
import { resolve } from 'path';
import * as sass from 'sass';
import sassOptions from './sassOptions.js';

export default defineConfig({
  root: 'src',
  base: './', // Use relative paths instead of absolute paths
  build: {
    outDir: '../dist',
    emptyOutDir: true,
  },
  server: {
    open: true,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        implementation: sass,
        ...sassOptions
      },
    },
  },
});