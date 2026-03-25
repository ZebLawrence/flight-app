import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getTenantById } from '@/lib/db/queries/tenants';
import { getPostById } from '@/lib/db/queries/blog-posts';
import BlogEditor from '@/components/admin/BlogEditor';

export const dynamic = 'force-dynamic';

export default async function EditBlogPostPage({
  params,
}: {
  params: { id: string; postId: string };
}) {
  const [tenant, post] = await Promise.all([
    getTenantById(params.id),
    getPostById(params.postId),
  ]);

  if (!tenant || !post || post.tenantId !== tenant.id) {
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
        <span className="text-sm text-gray-500">{post.title}</span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Edit post</h1>
      </div>

      <BlogEditor tenantId={tenant.id} post={post} />
    </div>
  );
}
