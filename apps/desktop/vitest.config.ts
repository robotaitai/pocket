import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
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
