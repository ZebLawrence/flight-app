import Link from 'next/link';
import { listTenants } from '@/lib/db/queries/tenants';
import type { Tenant } from '@/lib/db/queries/tenants';

export const dynamic = 'force-dynamic';

export default async function AdminTenantsPage() {
  const { data: tenants } = await listTenants();

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Tenants</h1>
        <Link
          href="/admin/tenants/new"
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Create tenant
        </Link>
      </div>

      {tenants.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <p className="text-lg font-medium">No tenants yet</p>
          <p className="mt-1 text-sm">
            Get started by{' '}
            <Link href="/admin/tenants/new" className="text-blue-600 hover:underline">
              creating your first tenant
            </Link>
            .
          </p>
        </div>
      ) : (
        <div className="bg-white rounded border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Slug
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Custom Domain
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {tenants.map((tenant: Tenant) => (
                <tr key={tenant.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    {tenant.name}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {tenant.slug}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {tenant.customDomain ?? <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {new Date(tenant.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-right text-sm">
                    <Link
                      href={`/admin/tenants/${tenant.id}`}
                      className="text-blue-600 hover:underline font-medium"
                    >
                      View / Edit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
