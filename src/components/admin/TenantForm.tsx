'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-');
}

type TemplateTenant = {
  id: string;
  name: string;
  slug: string;
  theme: Record<string, unknown>;
};

export default function TenantForm() {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [customDomain, setCustomDomain] = useState('');
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; slug?: string }>({});
  const [loading, setLoading] = useState(false);
  const [templates, setTemplates] = useState<TemplateTenant[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/admin/tenants?is_template=true');
        const data = res && res.ok ? await res.json() : [];
        setTemplates(Array.isArray(data) ? data : []);
      } catch {
        setTemplates([]);
      }
    })();
  }, []);

  function handleNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    setName(value);
    if (!slugManuallyEdited) {
      setSlug(generateSlug(value));
    }
  }

  function handleSlugChange(e: React.ChangeEvent<HTMLInputElement>) {
    setSlug(e.target.value);
    setSlugManuallyEdited(true);
  }

  function handleTemplateSelect(id: string) {
    setSelectedTemplateId((prev) => (prev === id ? null : id));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    const errors: { name?: string; slug?: string } = {};
    if (!name.trim()) errors.name = 'Name is required';
    if (!slug.trim()) errors.slug = 'Slug is required';
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setLoading(true);

    try {
      let res: Response;

      if (selectedTemplateId) {
        res = await fetch(`/api/admin/tenants/${selectedTemplateId}/clone`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: name.trim(),
            slug: slug.trim(),
          }),
        });
      } else {
        res = await fetch('/api/admin/tenants', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: name.trim(),
            slug: slug.trim(),
            customDomain: customDomain.trim() || null,
          }),
        });
      }

      if (res.ok || res.status === 201) {
        const created = await res.json();
        router.push(`/admin/tenants/${created.id}`);
      } else if (res.status === 409) {
        setFieldErrors({ slug: 'This slug is already taken. Please choose a different one.' });
      } else {
        const data = await res.json();
        setError(data.error ?? 'Failed to create tenant');
      }
    } catch {
      setError('Unable to connect to the server. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }

  const themeColors = (t: TemplateTenant) => {
    const colors = (t.theme as { colors?: Record<string, string> })?.colors;
    return colors ?? {};
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      {error && (
        <div
          role="alert"
          className="rounded bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      {templates.length > 0 && (
        <div>
          <p className="block text-sm font-medium text-gray-700 mb-3">
            Start from a template{' '}
            <span className="text-gray-400 font-normal">(optional)</span>
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {templates.map((t) => {
              const colors = themeColors(t);
              const isSelected = selectedTemplateId === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => handleTemplateSelect(t.id)}
                  className={`text-left rounded border-2 p-3 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-400 bg-white'
                  }`}
                  aria-pressed={isSelected}
                >
                  <div
                    className="h-10 rounded mb-2 flex gap-1 overflow-hidden"
                    aria-hidden="true"
                  >
                    {[colors.primary, colors.secondary, colors.accent].filter(Boolean).map(
                      (c, i) => (
                        <div key={i} className="flex-1 rounded" style={{ backgroundColor: c }} />
                      ),
                    )}
                  </div>
                  <span className="text-xs font-medium text-gray-800 leading-tight block">
                    {t.name.replace('Starter - ', '')}
                  </span>
                  {isSelected && (
                    <span className="text-xs text-blue-600 font-medium">Selected</span>
                  )}
                </button>
              );
            })}
          </div>
          {selectedTemplateId && (
            <p className="mt-2 text-xs text-gray-500">
              The new tenant will be cloned from this template, including all pages and theme.
            </p>
          )}
        </div>
      )}

      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700">
          Name <span className="text-red-500">*</span>
        </label>
        <input
          id="name"
          type="text"
          required
          value={name}
          onChange={handleNameChange}
          className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          placeholder="Business Name"
        />
        {fieldErrors.name && (
          <p className="mt-1 text-sm text-red-600" role="alert">
            {fieldErrors.name}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="slug" className="block text-sm font-medium text-gray-700">
          Slug <span className="text-red-500">*</span>
        </label>
        <input
          id="slug"
          type="text"
          required
          value={slug}
          onChange={handleSlugChange}
          className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          placeholder="my-business-name"
        />
        <p className="mt-1 text-xs text-gray-500">
          URL-safe identifier — auto-generated from the name, but editable.
        </p>
        {fieldErrors.slug && (
          <p className="mt-1 text-sm text-red-600" role="alert">
            {fieldErrors.slug}
          </p>
        )}
      </div>

      {!selectedTemplateId && (
        <div>
          <label htmlFor="customDomain" className="block text-sm font-medium text-gray-700">
            Custom Domain <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <input
            id="customDomain"
            type="text"
            value={customDomain}
            onChange={(e) => setCustomDomain(e.target.value)}
            className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="clientbusiness.com"
          />
        </div>
      )}

      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          {loading ? 'Creating…' : 'Create tenant'}
        </button>
        <Link
          href="/admin/tenants"
          className="text-sm text-gray-600 hover:text-gray-900"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
