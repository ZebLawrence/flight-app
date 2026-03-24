import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getTenantById } from '@/lib/db/queries/tenants';
import { getPageById } from '@/lib/db/queries/pages';
import PageEditor from '@/components/admin/PageEditor';

export const dynamic = 'force-dynamic';

export default async function PageEditorPage({
  params,
}: {
  params: { id: string; pageId: string };
}) {
  const [tenant, page] = await Promise.all([
    getTenantById(params.id),
    getPageById(params.pageId),
  ]);

  if (!tenant || !page || page.tenantId !== tenant.id) {
    notFound();
  }

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-1">
        <Link href="/admin/tenants" className="text-sm text-blue-600 hover:underline">
          Tenants
        </Link>
        <span className="text-gray-400 text-sm">/</span>
        <Link
          href={`/admin/tenants/${tenant.id}`}
          className="text-sm text-blue-600 hover:underline"
        >
          {tenant.name}
        </Link>
        <span className="text-gray-400 text-sm">/</span>
        <Link
          href={`/admin/tenants/${tenant.id}/pages`}
          className="text-sm text-blue-600 hover:underline"
        >
          Pages
        </Link>
        <span className="text-gray-400 text-sm">/</span>
        <span className="text-sm text-gray-500">{page.title}</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Edit Page</h1>
      </div>

      <PageEditor page={page} tenantId={tenant.id} />
    </div>
  );
}
