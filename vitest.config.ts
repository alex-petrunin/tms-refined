import { defineConfig } from 'vitest/config';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import tsconfigPaths from 'vite-tsconfig-paths';

const currentDir = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [
    tsconfigPaths(),
  ],
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    exclude: ['node_modules', 'dist', '.idea', '.git', '.cache'],
    setupFiles: ['./tests/utils/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/dist/',
      ],
    },
  },
  resolve: {
    alias: {
      '@': resolve(currentDir, 'src'),
      '@backend': resolve(currentDir, 'src/backend'),
      '@domain': resolve(currentDir, 'src/backend/domain'),
      '@app': resolve(currentDir, 'src/backend/application'),
      '@infra': resolve(currentDir, 'src/backend/infrastructure'),
    },
  },
});

