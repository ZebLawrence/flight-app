'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { Tenant } from '@/lib/db/queries/tenants';

type Tab = 'basic' | 'domain';

const PLATFORM_HOST =
  process.env.NEXT_PUBLIC_PLATFORM_HOST ?? 'platform.yourhost.com';

interface TenantEditFormProps {
  tenant: Tenant;
}

export default function TenantEditForm({ tenant }: TenantEditFormProps) {
  const [activeTab, setActiveTab] = useState<Tab>('basic');

  const [name, setName] = useState(tenant.name);
  const [slug, setSlug] = useState(tenant.slug);
  const [customDomain, setCustomDomain] = useState(tenant.customDomain ?? '');

  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; slug?: string }>({});
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');

    const errors: { name?: string; slug?: string } = {};
    if (!name.trim()) errors.name = 'Name is required';
    if (!slug.trim()) errors.slug = 'Slug is required';
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setLoading(true);

    try {
      const res = await fetch(`/api/admin/tenants/${tenant.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          slug: slug.trim(),
          customDomain: customDomain.trim() || null,
        }),
      });

      if (res.ok) {
        setSuccess('Tenant updated successfully.');
      } else if (res.status === 409) {
        setFieldErrors({ slug: 'This slug is already taken. Please choose a different one.' });
      } else if (res.status === 404) {
        setError('Tenant not found.');
      } else {
        const data = await res.json();
        setError(data.error ?? 'Failed to update tenant');
      }
    } catch {
      setError('Unable to connect to the server. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex gap-6" aria-label="Tabs">
          <button
            type="button"
            onClick={() => setActiveTab('basic')}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'basic'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Basic Info
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('domain')}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'domain'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Domain Settings
          </button>
        </nav>
      </div>

      {/* Basic Info Tab */}
      {activeTab === 'basic' && (
        <form onSubmit={handleSubmit} className="space-y-6 max-w-lg">
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

          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              id="name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
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
              onChange={(e) => setSlug(e.target.value)}
              className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="my-business-name"
            />
            <p className="mt-1 text-xs text-gray-500">
              URL-safe identifier used to access this tenant&apos;s site.
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
              {loading ? 'Saving…' : 'Save changes'}
            </button>
            <Link
              href="/admin/tenants"
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Cancel
            </Link>
          </div>
        </form>
      )}

      {/* Domain Settings Tab */}
      {activeTab === 'domain' && (
        <div className="max-w-lg space-y-4">
          {tenant.customDomain ? (
            <>
              <p className="text-sm text-gray-700">
                <span className="font-medium">Current custom domain:</span>{' '}
                <code className="rounded bg-gray-100 px-1 py-0.5 text-xs font-mono">
                  {tenant.customDomain}
                </code>
              </p>

              <div className="rounded border border-blue-200 bg-blue-50 p-4 space-y-3">
                <h2 className="text-sm font-semibold text-gray-900">DNS Setup Instructions</h2>
                <p className="text-sm text-gray-700">
                  Ask your client to add the following <strong>CNAME</strong> record with their
                  DNS provider (e.g. Cloudflare, Route 53, Namecheap):
                </p>
                <div className="rounded border border-gray-200 bg-white p-3 text-xs font-mono space-y-1">
                  <div>
                    <span className="text-gray-500">Type:</span>{' '}
                    <span className="text-gray-900">CNAME</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Name:</span>{' '}
                    <span className="text-gray-900">www</span>
                    <span className="text-gray-400 ml-1">(or the desired subdomain)</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Value:</span>{' '}
                    <span className="text-gray-900">{PLATFORM_HOST}</span>
                  </div>
                </div>
                <p className="text-xs text-gray-500">
                  DNS propagation typically completes within a few hours but can take{' '}
                  <strong>up to 48 hours</strong>. Once propagated, the custom domain will
                  resolve to this tenant&apos;s site automatically.
                </p>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm text-gray-500 italic">No custom domain configured.</p>
              <p className="text-sm text-gray-700">
                Enter a custom domain in the{' '}
                <button
                  type="button"
                  onClick={() => setActiveTab('basic')}
                  className="text-blue-600 hover:underline"
                >
                  Basic Info
                </button>{' '}
                tab to view CNAME configuration details.
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
