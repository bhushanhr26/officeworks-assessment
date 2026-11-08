import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  platform: 'node',
  target: 'node22',
  clean: true,
  // contracts ships as TS source; bundle it in so dist/ runs on plain Node.
  noExternal: ['@catalogue/contracts'],
});
