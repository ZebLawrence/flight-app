import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getTenantById } from '@/lib/db/queries/tenants';
import TenantEditForm from '@/components/admin/TenantEditForm';
import ThemeEditorSection from '@/components/admin/ThemeEditorSection';
import CloneTenantDialog from '@/components/admin/CloneTenantDialog';
import DeleteTenantButton from '@/components/admin/DeleteTenantButton';

export const dynamic = 'force-dynamic';

export default async function TenantDetailPage({ params }: { params: { id: string } }) {
  const tenant = await getTenantById(params.id);

  if (!tenant) {
    notFound();
  }

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-1">
        <Link
          href="/admin/tenants"
          className="text-sm text-blue-600 hover:underline"
        >
          Tenants
        </Link>
        <span className="text-gray-400 text-sm">/</span>
        <span className="text-sm text-gray-500">{tenant.name}</span>
      </div>

      {/* Header row */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{tenant.name}</h1>

        {/* Quick Actions */}
        <div className="flex items-center gap-3">
          <CloneTenantDialog tenantId={tenant.id} tenantName={tenant.name} />
          <Link
            href={`/admin/tenants/${tenant.id}/pages`}
            className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Pages
          </Link>
          <Link
            href={`/admin/tenants/${tenant.id}/blog`}
            className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Blog
          </Link>
          <Link
            href={`/admin/tenants/${tenant.id}/media`}
            className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Media Library
          </Link>
          <Link
            href={`/admin/tenants/${tenant.id}/addons`}
            className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Addons
          </Link>
          <DeleteTenantButton tenantId={tenant.id} tenantName={tenant.name} />
        </div>
      </div>

      <TenantEditForm tenant={tenant} />

      <ThemeEditorSection tenantId={tenant.id} initialTheme={tenant.theme} />
    </div>
  );
}
