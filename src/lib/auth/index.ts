import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error(
      'SESSION_SECRET environment variable is required but not set.',
    );
  }
  return secret;
}
const SESSION_EXPIRY_SECONDS = 60 * 60 * 8; // 8 hours

/**
 * Compares the supplied email and password against the operator credentials
 * stored in environment variables (`ADMIN_EMAIL`, `ADMIN_PASSWORD_HASH`).
 * The password comparison uses bcrypt so plain-text passwords are never stored.
 */
export async function verifyCredentials(
  email: string,
  password: string,
): Promise<boolean> {
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH;

  if (!adminEmail || !adminPasswordHash) {
    return false;
  }

  if (email !== adminEmail) {
    return false;
  }

  return bcrypt.compare(password, adminPasswordHash);
}

/**
 * Creates a signed session token (JWT) that expires after 8 hours.
 * The token is signed with `SESSION_SECRET` and should be stored in an
 * HTTP-only cookie by the caller.
 */
export function createSession(): string {
  return jwt.sign({ role: 'admin' }, getSessionSecret(), {
    expiresIn: SESSION_EXPIRY_SECONDS,
  });
}

/**
 * Validates a session token.  Returns `true` when the token has a valid
 * signature and has not yet expired; returns `false` in all other cases.
 */
export function validateSession(token: string): boolean {
  try {
    jwt.verify(token, getSessionSecret());
    return true;
  } catch {
    return false;
  }
}
