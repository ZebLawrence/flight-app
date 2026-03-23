import type { ReactNode } from 'react';
import { headers } from 'next/headers';
import { ThemeProvider } from '@/components/theme/ThemeProvider';
import { resolveTenant } from '@/lib/tenant/resolve';

export const dynamic = 'force-dynamic';

export default async function TenantLayout({ children }: { children: ReactNode }) {
  const requestHeaders = headers();
  const hostname =
    requestHeaders.get('x-request-hostname') ??
    requestHeaders.get('x-forwarded-host') ??
    requestHeaders.get('host') ??
    '';

  const tenant = await resolveTenant(hostname);

  return (
    <ThemeProvider theme={tenant?.theme ?? null}>
      <main>{children}</main>
    </ThemeProvider>
  );
}
