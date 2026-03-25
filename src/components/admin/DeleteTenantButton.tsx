'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface DeleteTenantButtonProps {
  tenantId: string;
  tenantName: string;
}

export default function DeleteTenantButton({ tenantId, tenantName }: DeleteTenantButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  async function handleDelete() {
    if (!window.confirm(`Are you sure you want to delete "${tenantName}"? This action cannot be undone.`)) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch(`/api/admin/tenants/${tenantId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        router.push('/admin/tenants');
      } else {
        const data = await res.json();
        setError(data.error ?? 'Failed to delete tenant');
      }
    } catch {
      setError('Unable to connect to the server. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {error && (
        <p role="alert" className="text-sm text-red-600 mt-1">
          {error}
        </p>
      )}
      <button
        type="button"
        onClick={handleDelete}
        disabled={loading}
        className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-white bg-red-600 border border-red-600 rounded hover:bg-red-700 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
      >
        {loading ? 'Deleting…' : 'Delete tenant'}
      </button>
    </>
  );
}
