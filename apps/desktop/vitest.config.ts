import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

const root = new URL('../../', import.meta.url);
const pkg = (name: string) => fileURLToPath(new URL(`packages/${name}/src/index.ts`, root));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@pocket/core-model': pkg('core-model'),
      '@pocket/insights': pkg('insights'),
      '@pocket/agent-client': pkg('agent-client'),
    },
  },
  test: {
    // Per-file environment annotations override this default
    environment: 'node',
    globals: true,
    include: [
      'tests/**/*.test.ts',
      'src/renderer/__tests__/**/*.test.tsx',
    ],
    setupFiles: ['src/renderer/__tests__/setup.ts'],
  },
});
