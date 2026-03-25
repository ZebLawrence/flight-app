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
      // Pass through DATABASE_URL and S3 credentials only when explicitly set.
      // DB/S3 integration tests use describe.skipIf to skip when these are absent.
      ...(process.env.DATABASE_URL ? { DATABASE_URL: process.env.DATABASE_URL } : {}),
      ...(process.env.S3_BUCKET ? { S3_BUCKET: process.env.S3_BUCKET } : {}),
      ...(process.env.S3_ACCESS_KEY ? { S3_ACCESS_KEY: process.env.S3_ACCESS_KEY } : {}),
      ...(process.env.S3_SECRET_KEY ? { S3_SECRET_KEY: process.env.S3_SECRET_KEY } : {}),
      ...(process.env.S3_ENDPOINT ? { S3_ENDPOINT: process.env.S3_ENDPOINT } : {}),
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
