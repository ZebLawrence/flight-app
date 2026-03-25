import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { getPostBySlug } from '@/lib/db/queries/blog-posts';
import { markdownToHtml } from '@/lib/markdown';
import { resolveTenant } from '@/lib/tenant/resolve';

export const dynamic = 'force-dynamic';

type BlogPostPageProps = {
  params: {
    slug: string;
  };
};

export default async function BlogPostPage({ params }: BlogPostPageProps) {
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

  const post = await getPostBySlug(tenant.id, params.slug);

  if (!post || !post.published) {
    notFound();
  }

  const contentHtml = await markdownToHtml(post.content);

  const publishedDate = post.publishedAt
    ? new Date(post.publishedAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null;

  return (
    <article className="mx-auto max-w-3xl px-4 py-10">
      {post.featuredImage && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={post.featuredImage}
          alt={post.title}
          className="mb-8 w-full rounded-lg object-cover"
        />
      )}
      <h1 className="mb-4 text-4xl font-bold">{post.title}</h1>
      <div className="mb-6 flex flex-wrap items-center gap-4 text-sm text-gray-600">
        <span>{post.author}</span>
        {publishedDate && <time dateTime={post.publishedAt?.toISOString()}>{publishedDate}</time>}
        {post.tags.length > 0 && (
          <ul className="flex flex-wrap gap-2">
            {post.tags.map((tag) => (
              <li
                key={tag}
                className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700"
              >
                {tag}
              </li>
            ))}
          </ul>
        )}
      </div>
      <div
        className="prose max-w-none"
        dangerouslySetInnerHTML={{ __html: contentHtml }}
      />
    </article>
  );
}
