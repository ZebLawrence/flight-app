import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import bcrypt from 'bcryptjs';
import { verifyCredentials, createSession, validateSession } from '@/lib/auth';

const VALID_EMAIL = 'admin@example.com';
const VALID_PASSWORD = 'correct-horse-battery-staple';

beforeAll(async () => {
  const hash = await bcrypt.hash(VALID_PASSWORD, 10);
  process.env.ADMIN_EMAIL = VALID_EMAIL;
  process.env.ADMIN_PASSWORD_HASH = hash;
  process.env.SESSION_SECRET = 'test-secret-for-unit-tests';
});

afterAll(() => {
  delete process.env.ADMIN_EMAIL;
  delete process.env.ADMIN_PASSWORD_HASH;
  delete process.env.SESSION_SECRET;
});

describe('verifyCredentials', () => {
  it('returns true for a valid email and password', async () => {
    const result = await verifyCredentials(VALID_EMAIL, VALID_PASSWORD);
    expect(result).toBe(true);
  });

  it('returns false for a wrong password', async () => {
    const result = await verifyCredentials(VALID_EMAIL, 'wrong-password');
    expect(result).toBe(false);
  });

  it('returns false for a wrong email', async () => {
    const result = await verifyCredentials('notadmin@example.com', VALID_PASSWORD);
    expect(result).toBe(false);
  });
});

describe('createSession', () => {
  it('returns a non-empty session token string', () => {
    const token = createSession();
    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThan(0);
  });
});

describe('validateSession', () => {
  it('returns true for a valid, unexpired token', () => {
    const token = createSession();
    expect(validateSession(token)).toBe(true);
  });

  it('returns false for an invalid or tampered token', () => {
    const token = createSession();
    const tampered = token.slice(0, -5) + 'XXXXX';
    expect(validateSession(tampered)).toBe(false);
  });
});
