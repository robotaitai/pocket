import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    resolve: {
      alias: {
        '@pocket/core-model': new URL('../core-model/src/index.ts', import.meta.url).pathname,
      },
    },
  },
});
