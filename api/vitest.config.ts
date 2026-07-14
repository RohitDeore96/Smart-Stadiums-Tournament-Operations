import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

export default defineConfig({
  test: {
    globals: false,
    environment: 'node',
    include: ['api/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      reportsDirectory: './api/coverage',
      include: ['api/_lib/**/*.ts'],
      exclude: ['api/**/*.test.ts'],
      thresholds: {
        lines: 60,
        functions: 60,
        branches: 50,
        statements: 60,
      },
    },
  },
  resolve: {
    alias: {
      '@stadiumops/shared': resolve(__dirname, './packages/shared/src/index.ts'),
    },
  },
});
