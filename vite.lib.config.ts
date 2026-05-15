import { defineConfig } from 'vite';
import { resolve } from 'path';
import dts from 'unplugin-dts/vite';

export default defineConfig({
  plugins: [
    dts({
      include: ['src/lib'],
      outDirs: 'dist',
    }),
  ],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/lib/index.ts'),
      name: 'reverbgen',
      formats: ['es', 'cjs'],
      fileName: (format) => `reverbgen.${format === 'es' ? 'js' : 'cjs'}`,
    },
    outDir: 'dist',
    emptyOutDir: true,
  },
});
