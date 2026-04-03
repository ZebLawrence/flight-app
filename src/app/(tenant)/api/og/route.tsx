import { ImageResponse } from 'next/og';
import { headers } from 'next/headers';
import { resolveTenant } from '@/lib/tenant/resolve';
import type { TenantTheme } from '@/lib/types/theme';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const title = searchParams.get('title') ?? 'Welcome';

  const requestHeaders = headers();
  const hostname =
    requestHeaders.get('x-request-hostname') ??
    requestHeaders.get('x-forwarded-host') ??
    requestHeaders.get('host') ??
    '';

  const tenant = await resolveTenant(hostname);
  const tenantName = tenant?.name ?? 'My Site';
  const theme = tenant?.theme as Partial<TenantTheme> | null | undefined;
  const logo = theme?.logo ?? null;

  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          height: '100%',
          background: '#1e293b',
          color: '#f8fafc',
          fontFamily: 'sans-serif',
          padding: '60px',
        }}
      >
        {logo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logo}
            alt={tenantName}
            style={{ width: '80px', height: '80px', objectFit: 'contain', marginBottom: '24px' }}
          />
        )}
        <div
          style={{
            fontSize: '28px',
            fontWeight: 600,
            color: '#94a3b8',
            marginBottom: '16px',
            textAlign: 'center',
          }}
        >
          {tenantName}
        </div>
        <div
          style={{
            fontSize: '56px',
            fontWeight: 700,
            textAlign: 'center',
            lineHeight: 1.2,
          }}
        >
          {title}
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    },
  );
}
