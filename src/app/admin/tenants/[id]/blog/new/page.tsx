import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getTenantById } from '@/lib/db/queries/tenants';
import BlogEditor from '@/components/admin/BlogEditor';

export const dynamic = 'force-dynamic';

export default async function NewBlogPostPage({ params }: { params: { id: string } }) {
  const tenant = await getTenantById(params.id);

  if (!tenant) {
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
          href={`/admin/tenants/${tenant.id}/blog`}
          className="text-sm text-blue-600 hover:underline"
        >
          Blog
        </Link>
        <span className="text-gray-400 text-sm">/</span>
        <span className="text-sm text-gray-500">New</span>
      </div>

      <h1 className="text-2xl font-bold text-gray-900 mb-6">Create post</h1>

      <BlogEditor tenantId={tenant.id} />
    </div>
  );
}
