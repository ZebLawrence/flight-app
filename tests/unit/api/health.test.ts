// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockExecute = vi.hoisted(() => vi.fn());

vi.mock('@/lib/db', () => ({
  db: { execute: mockExecute },
}));

beforeEach(() => {
  vi.resetModules();
});

describe('GET /api/health', () => {
  it('returns 200 with { status: "ok" } when DB is reachable', async () => {
    mockExecute.mockResolvedValueOnce([{ '?column?': 1 }]);

    const { GET } = await import('@/app/api/health/route');
    const response = await GET();

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({ status: 'ok' });
  });

  it('returns 503 with { status: "error" } when DB connection fails', async () => {
    mockExecute.mockRejectedValueOnce(new Error('Connection refused'));

    const { GET } = await import('@/app/api/health/route');
    const response = await GET();

    expect(response.status).toBe(503);
    const body = await response.json();
    expect(body.status).toBe('error');
    expect(body.details).toBe('Connection refused');
    expect(body.details).not.toMatch(/at\s+\w/); // no stack trace
  });
});
