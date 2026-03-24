'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronUp, ChevronDown } from 'lucide-react';
import type { Page } from '@/lib/db/schema';

interface PagesListClientProps {
  tenantId: string;
  initialPages: Page[];
}

export default function PagesListClient({ tenantId, initialPages }: PagesListClientProps) {
  const [pages, setPages] = useState<Page[]>(initialPages);
  const [error, setError] = useState('');

  async function handleReorder(fromIndex: number, toIndex: number) {
    const previous = pages;
    const reordered = [...pages];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);

    setPages(reordered);
    setError('');

    try {
      const res = await fetch('/api/admin/pages/reorder', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId,
          pages: reordered.map((p, i) => ({ id: p.id, sort_order: i })),
        }),
      });

      if (!res.ok) {
        setPages(previous);
        setError('Failed to reorder pages. Please try again.');
      }
    } catch {
      setPages(previous);
      setError('Unable to connect to the server. Please try again.');
    }
  }

  async function handleDelete(pageId: string) {
    if (!window.confirm('Are you sure you want to delete this page?')) return;

    setError('');

    try {
      const res = await fetch(`/api/admin/pages/${pageId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setPages((prev) => prev.filter((p) => p.id !== pageId));
      } else {
        setError('Failed to delete page. Please try again.');
      }
    } catch {
      setError('Unable to connect to the server. Please try again.');
    }
  }

  if (pages.length === 0) {
    return (
      <div className="text-center py-16 text-gray-500">
        <p className="text-lg font-medium">No pages yet</p>
        <p className="mt-1 text-sm">
          Get started by{' '}
          <Link
            href={`/admin/tenants/${tenantId}/pages/new`}
            className="text-blue-600 hover:underline"
          >
            creating your first page
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
              <th className="px-4 py-3 w-20" />
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Title
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Slug
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Order
              </th>
              <th className="px-6 py-3" />
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {pages.map((page, index) => (
              <tr key={page.id} className="hover:bg-gray-50">
                <td className="px-4 py-4">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleReorder(index, index - 1)}
                      disabled={index === 0}
                      className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                      aria-label="Move up"
                    >
                      <ChevronUp className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleReorder(index, index + 1)}
                      disabled={index === pages.length - 1}
                      className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                      aria-label="Move down"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm font-medium text-gray-900">
                  <Link
                    href={`/admin/tenants/${tenantId}/pages/${page.id}`}
                    className="hover:text-blue-600"
                  >
                    {page.title}
                  </Link>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">{page.slug}</td>
                <td className="px-6 py-4 text-sm">
                  {page.published ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                      Published
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                      Draft
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">{page.sortOrder}</td>
                <td className="px-6 py-4 text-right text-sm">
                  <button
                    type="button"
                    onClick={() => handleDelete(page.id)}
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
