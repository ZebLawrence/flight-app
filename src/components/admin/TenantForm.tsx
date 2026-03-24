'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-');
}

export default function TenantForm() {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [customDomain, setCustomDomain] = useState('');
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; slug?: string }>({});
  const [loading, setLoading] = useState(false);
  const router = useRouter();

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
      const res = await fetch('/api/admin/tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          slug: slug.trim(),
          customDomain: customDomain.trim() || null,
        }),
      });

      if (res.ok) {
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

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-lg">
      {error && (
        <div
          role="alert"
          className="rounded bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700"
        >
          {error}
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
