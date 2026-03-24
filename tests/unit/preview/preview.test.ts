import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { generatePreviewToken, validatePreviewToken } from '@/lib/preview';

beforeAll(() => {
  process.env.PREVIEW_SECRET = 'test-preview-secret-for-unit-tests';
});

afterAll(() => {
  delete process.env.PREVIEW_SECRET;
});

describe('generatePreviewToken', () => {
  it('returns a non-empty string', () => {
    const token = generatePreviewToken('page-1', 'tenant-1');
    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThan(0);
  });
});

describe('validatePreviewToken', () => {
  it('returns { pageId, tenantId } for a valid token', () => {
    const token = generatePreviewToken('page-42', 'tenant-99');
    const result = validatePreviewToken(token);
    expect(result).toEqual({ pageId: 'page-42', tenantId: 'tenant-99' });
  });

  it('returns null for an expired token', () => {
    const token = generatePreviewToken('page-1', 'tenant-1');
    // Advance time past the 1-hour TTL without actually waiting
    vi.useFakeTimers();
    vi.advanceTimersByTime(60 * 60 * 1000 + 1);
    const result = validatePreviewToken(token);
    vi.useRealTimers();
    expect(result).toBeNull();
  });

  it('returns null for a tampered token', () => {
    const token = generatePreviewToken('page-1', 'tenant-1');
    const tampered = token.slice(0, -5) + 'XXXXX';
    const result = validatePreviewToken(tampered);
    expect(result).toBeNull();
  });
});
