/**
 * Pure hostname normalization and slug extraction helpers.
 * No DB calls — fully testable without any side effects.
 */

/**
 * Normalize a raw hostname string:
 * 1. Lowercase
 * 2. Strip port
 * 3. Remove leading "www."
 * 4. Map "127.0.0.1" → "localhost"
 */
export function normalizeHostname(raw: string): string {
  // Strip port
  let hostname = raw.split(':')[0].toLowerCase();

  // Map 127.0.0.1 → localhost
  if (hostname === '127.0.0.1') {
    hostname = 'localhost';
  }

  // Strip leading www.
  if (hostname.startsWith('www.')) {
    hostname = hostname.slice(4);
  }

  return hostname;
}

/**
 * Extract the slug prefix from a normalized hostname.
 * Rules:
 *  - "demo.localhost"     → "demo"
 *  - "foo.bar.localhost"  → "foo.bar"
 *  - "localhost"          → "" (no subdomain → empty string for bare host)
 *  - "example.com"        → "" (treat root domain as no slug prefix)
 *  - "demo.example.com"   → "demo"
 *
 * For Phase 0, the base domain is the last label of the hostname (e.g., "localhost",
 * or "com" for multi-part domains). We consider the "base" to be the last label only
 * when it is a well-known TLD or "localhost". For simplicity, we return everything
 * before the last two segments for multi-part public domains, and everything before
 * the single "localhost" segment for .localhost hosts.
 */
export function extractSlug(normalizedHostname: string): string {
  const parts = normalizedHostname.split('.');

  // bare hostname: "localhost" or a bare word → no subdomain
  if (parts.length === 1) {
    return '';
  }

  // *.localhost pattern: everything before "localhost" is the slug
  if (parts[parts.length - 1] === 'localhost') {
    return parts.slice(0, -1).join('.');
  }

  // For a multi-part public domain like "demo.example.com":
  // base is "example.com" (last 2 parts), slug is everything before that
  if (parts.length === 2) {
    // e.g., "example.com" → no subdomain
    return '';
  }

  // 3+ parts, non-localhost: return everything except last 2 parts as slug
  return parts.slice(0, -2).join('.');
}
