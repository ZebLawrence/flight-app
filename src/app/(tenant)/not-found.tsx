import { headers } from 'next/headers';
import { ThemeProvider } from '@/components/theme/ThemeProvider';
import { resolveTenant } from '@/lib/tenant/resolve';
import { Button } from '@/components/cms/content/Button';

export default async function TenantNotFoundPage() {
  const requestHeaders = headers();
  const hostname =
    requestHeaders.get('x-request-hostname') ??
    requestHeaders.get('x-forwarded-host') ??
    requestHeaders.get('host') ??
    '';

  const tenant = await resolveTenant(hostname);

  return (
    <ThemeProvider theme={tenant?.theme ?? null}>
      <section
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          {tenant?.theme?.logo && (
            <img
              src={tenant.theme.logo}
              alt={tenant.name}
              style={{ marginBottom: '1.5rem' }}
            />
          )}
          <h1 style={{ color: 'var(--color-text)' }}>Page not found</h1>
          <p>{"The page you're looking for doesn't exist."}</p>
          <Button label="Go to homepage" href="/" variant="primary" />
        </div>
      </section>
    </ThemeProvider>
  );
}
