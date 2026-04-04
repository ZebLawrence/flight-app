import { test, expect } from '@playwright/test';

const HEALTH_URL = '/api/health';

test.describe('Phase 6 — health and production readiness', () => {
  // ── Test 1 ──────────────────────────────────────────────────────────────────
  test('1. Health check endpoint returns 200 with status ok', async ({ request }) => {
    const response = await request.get(HEALTH_URL);

    // Assert: response status is 200
    expect(response.status()).toBe(200);

    // Assert: response body contains { status: 'ok' }
    const body = await response.json() as { status: string };
    expect(body).toMatchObject({ status: 'ok' });
  });

  // ── Test 2 ──────────────────────────────────────────────────────────────────
  // This test requires manually stopping the DB container before running and
  // restarting it afterwards.  It is skipped in automated CI runs.
  //
  // Manual steps:
  //   1. docker compose stop db
  //   2. npx playwright test phase6-production --grep "503"
  //   3. docker compose start db
  test.skip('2. Health check returns 503 when the database is unreachable', async ({ request }) => {
    const response = await request.get(HEALTH_URL);

    // Assert: response status is 503
    expect(response.status()).toBe(503);

    // Assert: response body contains { status: 'error' }
    const body = await response.json() as { status: string; details: string };
    expect(body).toMatchObject({ status: 'error' });
    expect(typeof body.details).toBe('string');
    expect(body.details.length).toBeGreaterThan(0);
  });
});
