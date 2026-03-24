'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-');
}

interface CloneTenantDialogProps {
  tenantId: string;
  tenantName: string;
}

export default function CloneTenantDialog({ tenantId, tenantName }: CloneTenantDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; slug?: string }>({});
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  function openDialog() {
    setName('');
    setSlug('');
    setSlugManuallyEdited(false);
    setError('');
    setFieldErrors({});
    setOpen(true);
  }

  function closeDialog() {
    if (loading) return;
    setOpen(false);
  }

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
      const res = await fetch(`/api/admin/tenants/${tenantId}/clone`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          slug: slug.trim(),
        }),
      });

      if (res.ok) {
        const created = await res.json();
        router.push(`/admin/tenants/${created.id}`);
      } else if (res.status === 409) {
        setFieldErrors({ slug: 'This slug is already taken. Please choose a different one.' });
      } else {
        const data = await res.json();
        setError(data.error ?? 'Failed to clone tenant');
      }
    } catch {
      setError('Unable to connect to the server. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={openDialog}
        className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
      >
        Clone
      </button>

      {open && (
        <>
          <div role="presentation" className="fixed inset-0 bg-black/50 z-[60]" onClick={closeDialog} />
          <div className="fixed inset-0 flex items-center justify-center z-[70] p-4">
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="clone-dialog-title"
              aria-describedby="clone-dialog-desc"
              className="bg-white rounded-lg shadow-xl max-w-md w-full p-6"
            >
              <h2 id="clone-dialog-title" className="text-lg font-semibold text-gray-900 mb-4">
                Clone &ldquo;{tenantName}&rdquo;
              </h2>
              <p id="clone-dialog-desc" className="sr-only">
                Enter a name and slug for the new tenant. The slug is auto-generated from the name but can be edited.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div
                    role="alert"
                    className="rounded bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700"
                  >
                    {error}
                  </div>
                )}

                <div>
                  <label htmlFor="clone-name" className="block text-sm font-medium text-gray-700">
                    Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="clone-name"
                    type="text"
                    required
                    value={name}
                    onChange={handleNameChange}
                    className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="New Tenant Name"
                  />
                  {fieldErrors.name && (
                    <p className="mt-1 text-sm text-red-600" role="alert">
                      {fieldErrors.name}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="clone-slug" className="block text-sm font-medium text-gray-700">
                    Slug <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="clone-slug"
                    type="text"
                    required
                    value={slug}
                    onChange={handleSlugChange}
                    className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="new-tenant-name"
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

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={closeDialog}
                    disabled={loading}
                    className="text-sm text-gray-600 hover:text-gray-900 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    {loading ? 'Cloning…' : 'Clone'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}
    </>
  );
}
