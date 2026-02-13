/**
 * @file vite.config.js
 * @description Vite bundler configuration for Straty2.
 * @version 0.1.0
 */

import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        manualChunks: {
          phaser: ['phaser']
        }
      }
    }
  },
  server: {
    port: 8080,
    open: true
  }
});
