import jwt from 'jsonwebtoken';

function getPreviewSecret(): string {
  const secret = process.env.PREVIEW_SECRET;
  if (!secret) {
    throw new Error(
      'PREVIEW_SECRET environment variable is required but not set.',
    );
  }
  return secret;
}

const PREVIEW_TTL_SECONDS = process.env.PREVIEW_TTL_SECONDS
  ? parseInt(process.env.PREVIEW_TTL_SECONDS, 10)
  : 60 * 60; // 1 hour default

/**
 * Generates a cryptographically signed preview token (JWT) containing the
 * given `pageId` and `tenantId`.  The token expires after 1 hour by default
 * (configurable via the `PREVIEW_TTL_SECONDS` environment variable).
 */
export function generatePreviewToken(pageId: string, tenantId: string): string {
  return jwt.sign({ pageId, tenantId }, getPreviewSecret(), {
    expiresIn: PREVIEW_TTL_SECONDS,
  });
}

/**
 * Validates a preview token.  Returns `{ pageId, tenantId }` when the token
 * has a valid signature and has not yet expired.  Returns `null` for invalid,
 * tampered, or expired tokens.
 */
export function validatePreviewToken(
  token: string,
): { pageId: string; tenantId: string } | null {
  try {
    const payload = jwt.verify(token, getPreviewSecret()) as jwt.JwtPayload;
    if (typeof payload.pageId !== 'string' || typeof payload.tenantId !== 'string') {
      return null;
    }
    return { pageId: payload.pageId, tenantId: payload.tenantId };
  } catch {
    return null;
  }
}
