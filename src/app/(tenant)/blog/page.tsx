import Link from 'next/link';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { getPostsByTenant } from '@/lib/db/queries/blog-posts';
import { resolveTenant } from '@/lib/tenant/resolve';

export const dynamic = 'force-dynamic';

export default async function BlogListPage() {
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

  const { data: posts } = await getPostsByTenant(tenant.id, { published: true });

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="mb-8 text-4xl font-bold">Blog</h1>
      {posts.length === 0 ? (
        <p className="text-gray-500">No posts yet.</p>
      ) : (
        <ul className="space-y-10">
          {posts.map((post) => {
            const publishedDate = post.publishedAt
              ? new Date(post.publishedAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })
              : null;

            return (
              <li key={post.id}>
                <Link href={`/blog/${post.slug}`} className="group block">
                  {post.featuredImage && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={post.featuredImage}
                      alt={post.title}
                      className="mb-4 w-full rounded-lg object-cover"
                    />
                  )}
                  <h2 className="mb-2 text-2xl font-semibold group-hover:underline">
                    {post.title}
                  </h2>
                  {publishedDate && (
                    <time
                      dateTime={post.publishedAt?.toISOString()}
                      className="mb-2 block text-sm text-gray-500"
                    >
                      {publishedDate}
                    </time>
                  )}
                  {post.excerpt && (
                    <p className="text-gray-700">{post.excerpt}</p>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
