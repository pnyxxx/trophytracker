import { defineConfig } from 'vitest/config';
import path from 'node:path';

// Tests unitaires de la logique pure (src/**/*.test.ts) ; sans les plugins de build de vite.config.ts.
export default defineConfig({
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  test: { include: ['src/**/*.test.ts'] },
});
