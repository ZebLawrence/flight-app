import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getTenantById } from '@/lib/db/queries/tenants';
import { getPostsByTenant } from '@/lib/db/queries/blog-posts';
import BlogPostsListClient from '@/components/admin/BlogPostsListClient';

export const dynamic = 'force-dynamic';

export default async function TenantBlogPage({ params }: { params: { id: string } }) {
  const tenant = await getTenantById(params.id);

  if (!tenant) {
    notFound();
  }

  const { data: posts } = await getPostsByTenant(params.id);

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
        <span className="text-sm text-gray-500">Blog</span>
      </div>

      {/* Header row */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Blog Posts</h1>
        <Link
          href={`/admin/tenants/${tenant.id}/blog/new`}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          New post
        </Link>
      </div>

      <BlogPostsListClient tenantId={tenant.id} initialPosts={posts} />
    </div>
  );
}
