import { and, eq } from 'drizzle-orm';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { registry } from '@/components/cms/registry';
import { renderComponentTree } from '@/lib/renderer';
import { resolveTenant } from '@/lib/tenant/resolve';

export const dynamic = 'force-dynamic';

type TenantPageProps = {
  params: {
    slug?: string[];
  };
};

export default async function TenantPage({ params }: TenantPageProps) {
  const [{ db }, schema] = await Promise.all([
    import('@/lib/db'),
    import('@/lib/db/schema'),
  ]);
  const { pages } = schema;

  const requestHeaders = headers();
  const hostname =
    requestHeaders.get('x-request-hostname') ??
    requestHeaders.get('x-forwarded-host') ??
    requestHeaders.get('host') ??
    '';

  const tenant = await resolveTenant(hostname);
  if (!tenant) {
    notFound();
  }

  const pageSlug = params.slug?.join('/') ?? '';

  const pageRows = await db
    .select()
    .from(pages)
    .where(
      and(
        eq(pages.tenantId, tenant.id),
        eq(pages.slug, pageSlug),
        eq(pages.published, true),
      ),
    )
    .limit(1);

  const page = pageRows[0];
  if (!page) {
    notFound();
  }

  const renderedTree = renderComponentTree(page.content, registry);

  return <article>{renderedTree}</article>;
}
