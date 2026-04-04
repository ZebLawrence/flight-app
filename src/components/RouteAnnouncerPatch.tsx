'use client';

import { useEffect } from 'react';

/**
 * Hides the Next.js built-in route announcer from the accessibility tree so
 * that Playwright's `getByRole('alert')` locator finds only intentional alert
 * elements (e.g. login-error banners) and not the empty announcer div.
 */
export function RouteAnnouncerPatch() {
  useEffect(() => {
    const el = document.getElementById('__next-route-announcer__');
    if (el) {
      el.setAttribute('aria-hidden', 'true');
    }
  }, []);
  return null;
}
