import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      // Redirect workspace packages to their TypeScript source so tests
      // run without a build step.
      '@pocket/core-model': path.resolve(__dirname, '../core-model/src/index.ts'),
    },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
