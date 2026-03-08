import { defineConfig } from 'vite';
import { resolve } from 'path';

// Demo app config (default)
export default defineConfig({
  root: 'src/demo',
  // public/ contains a symlink to drysounds/ so they're served at /drysounds/
  publicDir: resolve(__dirname, 'public'),
  build: {
    outDir: resolve(__dirname, 'dist-demo'),
    emptyOutDir: true,
  },
});
