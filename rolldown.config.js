import { defineConfig } from 'rolldown';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig([
  // Main bundle
  {
    input: 'src/index.ts',
    output: [
      {
        dir: 'dist/cjs',
        format: 'cjs',
        entryFileNames: '[name].cjs',
        sourcemap: true,
        exports: 'named',
      },
      {
        dir: 'dist/esm',
        format: 'esm',
        entryFileNames: '[name].mjs',
        sourcemap: true,
      },
    ],
    external: [
      // Mark all node built-ins as external
      /^node:/,
      // Mark npm packages as external (but not our @/ alias or @ scoped packages starting with @/)
      // This regex matches strings that start with a letter or @[letter]
      /^(?!@\/)(@[^/]+\/)?[a-zA-Z]/,
    ],
    resolve: {
      extensions: ['.ts', '.js'],
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },
  },
  // LocalFileSystem standalone bundle
  {
    input: 'src/filesystem/local-filesystem.ts',
    output: [
      {
        file: 'dist/filesystem/local-filesystem.cjs',
        format: 'cjs',
        sourcemap: true,
        exports: 'named',
      },
      {
        file: 'dist/filesystem/local-filesystem.mjs',
        format: 'esm',
        sourcemap: true,
      },
    ],
    external: [
      // Mark all node built-ins as external
      /^node:/,
      'fs',
      'fs/promises',
      'path',
    ],
    resolve: {
      extensions: ['.ts', '.js'],
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },
  },
]);
