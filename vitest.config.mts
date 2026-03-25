import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/unit/setup.ts'],
    include: ['tests/unit/**/*.test.ts', 'tests/unit/**/*.test.tsx'],
    env: {
      // Fall back to the standard local-dev credentials from .env.example so
      // DB integration tests are not skipped when DATABASE_URL is unset.
      // Override with DATABASE_URL env var in CI or non-default environments.
      DATABASE_URL:
        process.env.DATABASE_URL ??
        'postgresql://postgres:postgres@localhost:5432/flightapp',
      // Fall back to local MinIO credentials so S3 integration tests are not
      // skipped when S3_BUCKET/S3_ACCESS_KEY/S3_SECRET_KEY are unset.
      // Override with env vars in CI or non-default environments.
      S3_BUCKET: process.env.S3_BUCKET ?? 'flight-app-media',
      S3_ACCESS_KEY: process.env.S3_ACCESS_KEY ?? 'minioadmin',
      S3_SECRET_KEY: process.env.S3_SECRET_KEY ?? 'minioadmin',
      S3_ENDPOINT: process.env.S3_ENDPOINT ?? 'http://localhost:9000',
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
