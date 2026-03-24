'use client';

import { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import type { Page } from '@/lib/db/schema';

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

interface PageEditorProps {
  page: Page;
  tenantId: string;
}

/** Monaco editor severity level for errors */
const MONACO_SEVERITY_ERROR = 8;

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function isValidJson(value: string): boolean {
  try {
    JSON.parse(value);
    return true;
  } catch {
    return false;
  }
}

export default function PageEditor({ page, tenantId }: PageEditorProps) {
  const [title, setTitle] = useState(page.title);
  const [slug, setSlug] = useState(page.slug);
  const [published, setPublished] = useState(page.published);
  const [jsonValue, setJsonValue] = useState(
    JSON.stringify(page.content, null, 2),
  );
  const [jsonValid, setJsonValid] = useState(true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleTitleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newTitle = e.target.value;
      setTitle(newTitle);
      // Auto-update slug only when it still matches the auto-generated version of the current title
      if (slug === slugify(title)) {
        setSlug(slugify(newTitle));
      }
    },
    [slug, title],
  );

  const handleEditorChange = useCallback((value: string | undefined) => {
    const v = value ?? '';
    setJsonValue(v);
    setJsonValid(isValidJson(v));
  }, []);

  const handleEditorValidation = useCallback(
    (markers: { severity: number }[]) => {
      const hasErrors = markers.some((m) => m.severity === MONACO_SEVERITY_ERROR);
      setJsonValid(!hasErrors);
    },
    [],
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!jsonValid) return;

    setError('');
    setSuccess('');
    setLoading(true);

    let content: Record<string, unknown>;
    try {
      content = JSON.parse(jsonValue) as Record<string, unknown>;
    } catch {
      setError('Invalid JSON. Please fix errors before saving.');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`/api/admin/pages/${page.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          slug: slug.trim(),
          published,
          content,
        }),
      });

      if (res.ok) {
        setSuccess('Page saved successfully.');
      } else if (res.status === 404) {
        setError('Page not found.');
      } else {
        const data = await res.json().catch(() => ({})) as { error?: string };
        setError(data.error ?? 'Failed to save page.');
      }
    } catch {
      setError('Unable to connect to the server. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {/* Fields row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Title */}
        <div className="lg:col-span-2">
          <label htmlFor="page-title" className="block text-sm font-medium text-gray-700">
            Title <span className="text-red-500">*</span>
          </label>
          <input
            id="page-title"
            type="text"
            required
            value={title}
            onChange={handleTitleChange}
            className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="Home"
          />
        </div>

        {/* Slug */}
        <div>
          <label htmlFor="page-slug" className="block text-sm font-medium text-gray-700">
            Slug <span className="text-red-500">*</span>
          </label>
          <input
            id="page-slug"
            type="text"
            required
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="home"
          />
          <p className="mt-1 text-xs text-gray-500">URL-safe identifier for this page.</p>
        </div>
      </div>

      {/* Published toggle */}
      <div className="flex items-center gap-3">
        <input
          id="page-published"
          type="checkbox"
          checked={published}
          onChange={(e) => setPublished(e.target.checked)}
          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
        <label htmlFor="page-published" className="text-sm font-medium text-gray-700">
          Published
        </label>
        <span className="text-xs text-gray-400">
          {published ? 'Visible on the tenant site' : 'Hidden from the tenant site'}
        </span>
      </div>

      {/* JSON editor */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="block text-sm font-medium text-gray-700">Content (JSON)</span>
          {!jsonValid && (
            <span className="text-xs text-red-600" role="alert">
              JSON is invalid — fix errors before saving
            </span>
          )}
        </div>
        <div className="rounded border border-gray-300 overflow-hidden" style={{ height: 480 }}>
          <MonacoEditor
            height="480px"
            language="json"
            value={jsonValue}
            onChange={handleEditorChange}
            onValidate={handleEditorValidation}
            options={{
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              fontSize: 13,
              tabSize: 2,
              wordWrap: 'on',
              formatOnPaste: true,
              formatOnType: true,
            }}
          />
        </div>
      </div>

      {/* Feedback */}
      {error && (
        <div
          role="alert"
          className="rounded bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}
      {success && (
        <div
          role="status"
          className="rounded bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700"
        >
          {success}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={loading || !jsonValid}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          {loading ? 'Saving…' : 'Save'}
        </button>
        <Link
          href={`/admin/tenants/${tenantId}/pages`}
          className="text-sm text-gray-600 hover:text-gray-900"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
