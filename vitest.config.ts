import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'miniflare',
    environmentOptions: {
      scriptPath: 'src/index.ts',
      modules: true,
    },
  },
});
