'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { BlogPost } from '@/lib/db/queries/blog-posts';

interface BlogPostsListClientProps {
  tenantId: string;
  initialPosts: BlogPost[];
}

export default function BlogPostsListClient({ tenantId, initialPosts }: BlogPostsListClientProps) {
  const [posts, setPosts] = useState<BlogPost[]>(initialPosts);
  const [error, setError] = useState('');
  const router = useRouter();

  async function handleDelete(postId: string, postTitle: string) {
    if (!window.confirm(`Are you sure you want to delete "${postTitle}"? This action cannot be undone.`)) return;

    setError('');

    try {
      const res = await fetch(`/api/admin/blog/${postId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setPosts((prev) => prev.filter((p) => p.id !== postId));
      } else {
        setError('Failed to delete post. Please try again.');
      }
    } catch {
      setError('Unable to connect to the server. Please try again.');
    }
  }

  function formatDate(date: Date | string | null): string {
    if (!date) return '—';
    return new Date(date).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  if (posts.length === 0) {
    return (
      <div className="text-center py-16 text-gray-500">
        <p className="text-lg font-medium">No blog posts yet</p>
        <p className="mt-1 text-sm">
          Get started by{' '}
          <Link
            href={`/admin/tenants/${tenantId}/blog/new`}
            className="text-blue-600 hover:underline"
          >
            creating your first post
          </Link>
          .
        </p>
      </div>
    );
  }

  return (
    <div>
      {error && (
        <div
          role="alert"
          className="rounded bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 mb-4"
        >
          {error}
        </div>
      )}

      <div className="bg-white rounded border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Title
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Published Date
              </th>
              <th className="px-6 py-3" />
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {posts.map((post) => (
              <tr
                key={post.id}
                className="hover:bg-gray-50 cursor-pointer"
                onClick={() => router.push(`/admin/tenants/${tenantId}/blog/${post.id}`)}
              >
                <td className="px-6 py-4 text-sm font-medium text-gray-900">
                  {post.title}
                </td>
                <td className="px-6 py-4 text-sm">
                  {post.published ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                      Published
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                      Draft
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {formatDate(post.publishedAt)}
                </td>
                <td className="px-6 py-4 text-right text-sm">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(post.id, post.title);
                    }}
                    className="text-red-600 hover:text-red-800 font-medium"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
