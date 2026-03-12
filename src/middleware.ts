import { NextRequest, NextResponse } from 'next/server';
import { normalizeHostname } from '@/lib/tenant/hostname';

export function middleware(request: NextRequest) {
  const forwardedHost = request.headers.get('x-forwarded-host');
  const hostHeader = request.headers.get('host');
  const rawHost = forwardedHost ?? hostHeader ?? '';
  const normalized = normalizeHostname(rawHost);

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-original-host', rawHost);
  requestHeaders.set('x-request-hostname', normalized);

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}
