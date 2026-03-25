'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { BlogPost } from '@/lib/db/queries/blog-posts';

interface BlogEditorProps {
  tenantId: string;
  post?: BlogPost;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export default function BlogEditor({ tenantId, post }: BlogEditorProps) {
  const router = useRouter();
  const isEditing = !!post;

  const [title, setTitle] = useState(post?.title ?? '');
  const [slug, setSlug] = useState(post?.slug ?? '');
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(isEditing);
  const [excerpt, setExcerpt] = useState(post?.excerpt ?? '');
  const [author, setAuthor] = useState(post?.author ?? '');
  const [tags, setTags] = useState((post?.tags ?? []).join(', '));
  const [featuredImage, setFeaturedImage] = useState(post?.featuredImage ?? '');
  const [content, setContent] = useState(post?.content ?? '');
  const [published, setPublished] = useState(post?.published ?? false);
  const [previewHtml, setPreviewHtml] = useState('');

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Update live preview whenever content changes
  useEffect(() => {
    let cancelled = false;

    async function renderPreview() {
      const { markdownToHtml } = await import('@/lib/markdown');
      const html = await markdownToHtml(content);
      if (!cancelled) {
        setPreviewHtml(html);
      }
    }

    void renderPreview();
    return () => {
      cancelled = true;
    };
  }, [content]);

  function handleTitleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    setTitle(value);
    if (!slugManuallyEdited) {
      setSlug(slugify(value));
    }
  }

  function handleSlugChange(e: React.ChangeEvent<HTMLInputElement>) {
    setSlug(e.target.value);
    setSlugManuallyEdited(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setFieldErrors({});

    const errors: Record<string, string> = {};
    if (!title.trim()) errors.title = 'Title is required';
    if (!slug.trim()) errors.slug = 'Slug is required';
    if (!author.trim()) errors.author = 'Author is required';
    if (!content.trim()) errors.content = 'Content is required';
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setLoading(true);

    const tagArray = tags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const body = {
      tenantId,
      title: title.trim(),
      slug: slug.trim(),
      excerpt: excerpt.trim() || null,
      content: content.trim(),
      author: author.trim(),
      tags: tagArray,
      featured_image: featuredImage.trim() || null,
      published,
    };

    try {
      const res = isEditing
        ? await fetch(`/api/admin/blog/${post.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          })
        : await fetch('/api/admin/blog', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          });

      if (res.ok) {
        router.push(`/admin/tenants/${tenantId}/blog`);
      } else if (res.status === 409) {
        setFieldErrors({ slug: 'This slug is already taken. Please choose a different one.' });
      } else {
        const data = await res.json().catch(() => ({})) as { error?: string };
        setError(data.error ?? `Failed to ${isEditing ? 'save' : 'create'} post.`);
      }
    } catch {
      setError('Unable to connect to the server. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {error && (
        <div
          role="alert"
          className="rounded bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      {/* Title + Slug */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <label htmlFor="post-title" className="block text-sm font-medium text-gray-700">
            Title <span className="text-red-500">*</span>
          </label>
          <input
            id="post-title"
            type="text"
            required
            value={title}
            onChange={handleTitleChange}
            className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="My First Post"
          />
          {fieldErrors.title && (
            <p className="mt-1 text-sm text-red-600" role="alert">
              {fieldErrors.title}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="post-slug" className="block text-sm font-medium text-gray-700">
            Slug <span className="text-red-500">*</span>
          </label>
          <input
            id="post-slug"
            type="text"
            required
            value={slug}
            onChange={handleSlugChange}
            className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="my-first-post"
          />
          <p className="mt-1 text-xs text-gray-500">
            URL-safe identifier — auto-generated from the title, but editable.
          </p>
          {fieldErrors.slug && (
            <p className="mt-1 text-sm text-red-600" role="alert">
              {fieldErrors.slug}
            </p>
          )}
        </div>
      </div>

      {/* Author + Featured Image */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="post-author" className="block text-sm font-medium text-gray-700">
            Author <span className="text-red-500">*</span>
          </label>
          <input
            id="post-author"
            type="text"
            required
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="Jane Doe"
          />
          {fieldErrors.author && (
            <p className="mt-1 text-sm text-red-600" role="alert">
              {fieldErrors.author}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="post-featured-image" className="block text-sm font-medium text-gray-700">
            Featured Image URL
          </label>
          <input
            id="post-featured-image"
            type="url"
            value={featuredImage}
            onChange={(e) => setFeaturedImage(e.target.value)}
            className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="https://example.com/image.jpg"
          />
        </div>
      </div>

      {/* Excerpt + Tags */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="post-excerpt" className="block text-sm font-medium text-gray-700">
            Excerpt
          </label>
          <textarea
            id="post-excerpt"
            rows={2}
            value={excerpt}
            onChange={(e) => setExcerpt(e.target.value)}
            className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="A short summary of the post…"
          />
        </div>

        <div>
          <label htmlFor="post-tags" className="block text-sm font-medium text-gray-700">
            Tags
          </label>
          <input
            id="post-tags"
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="travel, tech, news"
          />
          <p className="mt-1 text-xs text-gray-500">Comma-separated list of tags.</p>
        </div>
      </div>

      {/* Published toggle */}
      <div className="flex items-center gap-3">
        <input
          id="post-published"
          type="checkbox"
          checked={published}
          onChange={(e) => setPublished(e.target.checked)}
          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
        <label htmlFor="post-published" className="text-sm font-medium text-gray-700">
          Published
        </label>
        <span className="text-xs text-gray-400">
          {published ? 'Visible on the tenant site' : 'Hidden from the tenant site'}
        </span>
      </div>

      {/* Markdown editor + live preview */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="block text-sm font-medium text-gray-700">
            Content <span className="text-red-500">*</span>
          </span>
        </div>
        {fieldErrors.content && (
          <p className="mb-1 text-sm text-red-600" role="alert">
            {fieldErrors.content}
          </p>
        )}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="flex flex-col">
            <span className="block text-xs text-gray-500 mb-1">Markdown</span>
            <textarea
              id="post-content"
              rows={20}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="block w-full flex-1 rounded border border-gray-300 px-3 py-2 font-mono text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Write your post in Markdown…"
            />
          </div>
          <div className="flex flex-col">
            <span className="block text-xs text-gray-500 mb-1">Preview</span>
            <div
              data-testid="preview-panel"
              className="min-h-[480px] rounded border border-gray-200 bg-white px-4 py-3 overflow-y-auto text-sm text-gray-800 leading-relaxed [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mb-3 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:mb-2 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:mb-2 [&_p]:mb-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-3 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-3 [&_li]:mb-1 [&_code]:bg-gray-100 [&_code]:px-1 [&_code]:rounded [&_code]:font-mono [&_pre]:bg-gray-100 [&_pre]:p-3 [&_pre]:rounded [&_pre]:overflow-x-auto [&_pre]:mb-3 [&_blockquote]:border-l-4 [&_blockquote]:border-gray-300 [&_blockquote]:pl-4 [&_blockquote]:text-gray-600 [&_blockquote]:mb-3 [&_a]:text-blue-600 [&_a]:underline [&_hr]:border-gray-200 [&_hr]:my-4 [&_table]:w-full [&_table]:border-collapse [&_table]:mb-3 [&_th]:border [&_th]:border-gray-300 [&_th]:px-3 [&_th]:py-1 [&_th]:bg-gray-50 [&_td]:border [&_td]:border-gray-300 [&_td]:px-3 [&_td]:py-1"
              dangerouslySetInnerHTML={{ __html: previewHtml }}
            />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          {loading
            ? isEditing
              ? 'Saving…'
              : 'Creating…'
            : isEditing
              ? 'Save'
              : 'Create post'}
        </button>
        <Link
          href={`/admin/tenants/${tenantId}/blog`}
          className="text-sm text-gray-600 hover:text-gray-900"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
