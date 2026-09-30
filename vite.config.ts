import { defineConfig } from 'vite';

export default defineConfig({
  optimizeDeps: {
    exclude: ['@dimforge/rapier3d-compat']
  },
  server: {
    host: true,
    https: false
  },
  build: {
    target: 'es2020'
  },
  assetsInclude: ['**/*.task']
});
