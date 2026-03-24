'use client';

import { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

interface NewPageFormProps {
  tenantId: string;
}

/** Monaco editor severity level for errors */
const MONACO_SEVERITY_ERROR = 8;

const STARTER_CONTENT = JSON.stringify(
  {
    type: 'Section',
    props: {},
    children: [
      {
        type: 'Container',
        children: [
          {
            type: 'Heading',
            props: { level: 1, text: 'New Page' },
          },
        ],
      },
    ],
  },
  null,
  2,
);

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

export default function NewPageForm({ tenantId }: NewPageFormProps) {
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [jsonValue, setJsonValue] = useState(STARTER_CONTENT);
  const [jsonValid, setJsonValid] = useState(true);

  const [fieldErrors, setFieldErrors] = useState<{ title?: string; slug?: string }>({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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
    setError('');
    setFieldErrors({});

    const errors: { title?: string; slug?: string } = {};
    if (!title.trim()) errors.title = 'Title is required';
    if (!slug.trim()) errors.slug = 'Slug is required';
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    if (!jsonValid) return;

    let content: Record<string, unknown>;
    try {
      content = JSON.parse(jsonValue) as Record<string, unknown>;
    } catch {
      setError('Invalid JSON. Please fix errors before saving.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/admin/pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId,
          title: title.trim(),
          slug: slug.trim(),
          content,
        }),
      });

      if (res.ok) {
        const created = await res.json() as { id?: string };
        if (!created.id) {
          setError('Unexpected response from server. Please try again.');
          return;
        }
        router.push(`/admin/tenants/${tenantId}/pages/${created.id}`);
      } else if (res.status === 409) {
        setFieldErrors({ slug: 'This slug is already taken. Please choose a different one.' });
      } else {
        const data = await res.json().catch(() => ({})) as { error?: string };
        setError(data.error ?? 'Failed to create page.');
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
            placeholder="About Us"
          />
          {fieldErrors.title && (
            <p className="mt-1 text-sm text-red-600" role="alert">
              {fieldErrors.title}
            </p>
          )}
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
            onChange={handleSlugChange}
            className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="about-us"
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

      {/* Actions */}
      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={loading || !jsonValid}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          {loading ? 'Creating…' : 'Create page'}
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
