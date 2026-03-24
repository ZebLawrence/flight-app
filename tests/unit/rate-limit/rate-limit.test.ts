import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  checkRateLimit,
  type RateLimitConfig,
} from '@/lib/rate-limit';

const config: RateLimitConfig = { windowMs: 1_000, maxRequests: 3 };

// Each test uses a unique IP so the shared in-memory store doesn't bleed across tests.
let ipCounter = 0;
function nextIp(): string {
  return `192.168.0.${++ipCounter}`;
}

afterEach(() => {
  vi.useRealTimers();
});

describe('checkRateLimit', () => {
  it('allows requests under the limit', () => {
    const ip = nextIp();
    for (let i = 0; i < config.maxRequests; i++) {
      expect(checkRateLimit(ip, config).allowed).toBe(true);
    }
  });

  it('returns allowed: false when the limit is exceeded within the window', () => {
    const ip = nextIp();
    for (let i = 0; i < config.maxRequests; i++) {
      checkRateLimit(ip, config);
    }
    const result = checkRateLimit(ip, config);
    expect(result.allowed).toBe(false);
  });

  it('resets to allow requests after the window expires', () => {
    vi.useFakeTimers();
    const ip = nextIp();
    for (let i = 0; i < config.maxRequests; i++) {
      checkRateLimit(ip, config);
    }
    expect(checkRateLimit(ip, config).allowed).toBe(false);

    vi.advanceTimersByTime(config.windowMs + 1);

    expect(checkRateLimit(ip, config).allowed).toBe(true);
  });

  it('tracks limits per IP independently', () => {
    const ipA = nextIp();
    const ipB = nextIp();
    for (let i = 0; i < config.maxRequests; i++) {
      checkRateLimit(ipA, config);
    }
    // IP A is exhausted but IP B should still be allowed
    expect(checkRateLimit(ipA, config).allowed).toBe(false);
    expect(checkRateLimit(ipB, config).allowed).toBe(true);
  });

  it('returns retryAfterSeconds > 0 when rate limited', () => {
    const ip = nextIp();
    for (let i = 0; i < config.maxRequests; i++) {
      checkRateLimit(ip, config);
    }
    const result = checkRateLimit(ip, config);
    expect(result.allowed).toBe(false);
    expect(result.retryAfterSeconds).toBeGreaterThan(0);
  });
});
