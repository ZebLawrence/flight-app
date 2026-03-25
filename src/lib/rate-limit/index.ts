export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

const store = new Map<string, number[]>();

export function checkRateLimit(
  ip: string,
  config: RateLimitConfig,
): RateLimitResult {
  const now = Date.now();
  const windowStart = now - config.windowMs;

  const timestamps = (store.get(ip) ?? []).filter((t) => t > windowStart);

  if (timestamps.length >= config.maxRequests) {
    const oldest = timestamps[0];
    const retryAfterMs = oldest + config.windowMs - now;
    store.set(ip, timestamps);
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil(retryAfterMs / 1000),
    };
  }

  timestamps.push(now);
  store.set(ip, timestamps);

  return { allowed: true, retryAfterSeconds: 0 };
}

export const LOGIN_RATE_LIMIT: RateLimitConfig = {
  windowMs: 60_000,
  maxRequests: 5,
};

export const ADMIN_API_RATE_LIMIT: RateLimitConfig = {
  windowMs: 60_000,
  maxRequests: 60,
};

export const FORM_SUBMISSION_RATE_LIMIT: RateLimitConfig = {
  windowMs: 60_000,
  maxRequests: 5,
};
