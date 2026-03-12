import { defineConfig } from 'tsup';
import { cpSync } from 'node:fs';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  onSuccess: async () => {
    // Copy built-in skill files into dist so they resolve at runtime
    cpSync('src/skills/builtins', 'dist/skills/builtins', { recursive: true });
  },
});
