// @vitest-environment node
import { describe, it, expect, beforeAll } from 'vitest';

/**
 * Unit tests for the S3 client library.
 * These tests run against a real MinIO instance (or AWS S3).
 * Set S3_BUCKET, S3_ACCESS_KEY, S3_SECRET_KEY (and optionally S3_ENDPOINT)
 * to run them; otherwise the suite is skipped.
 */

const S3_BUCKET = process.env.S3_BUCKET;
const S3_ACCESS_KEY = process.env.S3_ACCESS_KEY;
const S3_SECRET_KEY = process.env.S3_SECRET_KEY;

const hasS3Config = Boolean(S3_BUCKET && S3_ACCESS_KEY && S3_SECRET_KEY);

describe.skipIf(!hasS3Config)('S3 client', () => {
  let uploadFile: (typeof import('@/lib/s3/client'))['uploadFile'];
  let deleteFile: (typeof import('@/lib/s3/client'))['deleteFile'];
  let getPresignedUrl: (typeof import('@/lib/s3/client'))['getPresignedUrl'];

  beforeAll(async () => {
    const mod = await import('@/lib/s3/client');
    uploadFile = mod.uploadFile;
    deleteFile = mod.deleteFile;
    getPresignedUrl = mod.getPresignedUrl;
  });

  function uniqueFilename(prefix = 'test') {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}.txt`;
  }

  it('uploadFile uploads a buffer and returns a non-empty S3 key', async () => {
    const tenantId = `tenant-${Date.now()}`;
    const filename = uniqueFilename();
    const content = Buffer.from('hello world');

    const result = await uploadFile(tenantId, content, filename, 'text/plain');

    expect(typeof result.key).toBe('string');
    expect(result.key.length).toBeGreaterThan(0);
    expect(typeof result.url).toBe('string');
    expect(result.url.length).toBeGreaterThan(0);

    // Cleanup
    await deleteFile(result.key);
  });

  it('uploadFile namespaces the key under tenantId/ prefix', async () => {
    const tenantId = `tenant-${Date.now()}`;
    const filename = uniqueFilename();
    const content = Buffer.from('namespaced content');

    const result = await uploadFile(tenantId, content, filename, 'text/plain');

    expect(result.key.startsWith(`${tenantId}/`)).toBe(true);

    // Cleanup
    await deleteFile(result.key);
  });

  it('deleteFile removes the object (subsequent presigned URL fetch returns error)', async () => {
    const tenantId = `tenant-${Date.now()}`;
    const filename = uniqueFilename('delete-me');
    const content = Buffer.from('to be deleted');

    const { key } = await uploadFile(tenantId, content, filename, 'text/plain');

    await deleteFile(key);

    // After deletion, fetching via presigned URL should return a non-2xx status.
    const presignedUrl = await getPresignedUrl(key, 60);
    const response = await fetch(presignedUrl);
    expect(response.ok).toBe(false);
  });

  it('getPresignedUrl returns a URL string that can be fetched to retrieve the file content', async () => {
    const tenantId = `tenant-${Date.now()}`;
    const filename = uniqueFilename('presigned');
    const content = Buffer.from('presigned content');

    const { key } = await uploadFile(tenantId, content, filename, 'text/plain');

    const presignedUrl = await getPresignedUrl(key, 60);
    expect(typeof presignedUrl).toBe('string');
    expect(presignedUrl.length).toBeGreaterThan(0);

    const response = await fetch(presignedUrl);
    expect(response.ok).toBe(true);
    const text = await response.text();
    expect(text).toBe('presigned content');

    // Cleanup
    await deleteFile(key);
  });
});
