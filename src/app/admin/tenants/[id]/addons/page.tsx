import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getTenantById } from '@/lib/db/queries/tenants';
import { listAddons, getTenantAddons } from '@/lib/db/queries/addons';
import AddonManager from '@/components/admin/AddonManager';
import type { JSONSchema } from '@/lib/addons/types';

export const dynamic = 'force-dynamic';

export default async function TenantAddonsPage({ params }: { params: { id: string } }) {
  const tenant = await getTenantById(params.id);

  if (!tenant) {
    notFound();
  }

  const [addons, tenantConfigs] = await Promise.all([
    listAddons(),
    getTenantAddons(params.id),
  ]);

  const configMap = Object.fromEntries(tenantConfigs.map((c) => [c.addonKey, c]));

  const addonData = addons.map((addon) => ({
    key: addon.key,
    name: addon.name,
    description: addon.description ?? null,
    configSchema: (addon.configSchema as JSONSchema | null) ?? null,
    enabled: configMap[addon.key]?.enabled ?? false,
    config: (configMap[addon.key]?.config ?? {}) as Record<string, unknown>,
  }));

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
        <span className="text-sm text-gray-500">Addons</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Addon Manager</h1>
      </div>

      <AddonManager tenantId={params.id} addons={addonData} />
    </div>
  );
}
