'use client';

import { useState } from 'react';
import ThemeEditor from '@/components/admin/ThemeEditor';
import type { TenantTheme } from '@/lib/types/theme';

const DEFAULT_THEME: TenantTheme = {
  colors: {
    primary: '#2563EB',
    secondary: '#7C3AED',
    accent: '#F59E0B',
    background: '#FFFFFF',
    text: '#111827',
  },
  fonts: {
    heading: 'Inter',
    body: 'Inter',
  },
  borderRadius: '8px',
};

function resolveTheme(raw: unknown): TenantTheme {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return DEFAULT_THEME;
  const t = raw as Partial<TenantTheme>;
  return {
    colors: {
      primary: t.colors?.primary ?? DEFAULT_THEME.colors.primary,
      secondary: t.colors?.secondary ?? DEFAULT_THEME.colors.secondary,
      accent: t.colors?.accent ?? DEFAULT_THEME.colors.accent,
      background: t.colors?.background ?? DEFAULT_THEME.colors.background,
      text: t.colors?.text ?? DEFAULT_THEME.colors.text,
    },
    fonts: {
      heading: t.fonts?.heading ?? DEFAULT_THEME.fonts.heading,
      body: t.fonts?.body ?? DEFAULT_THEME.fonts.body,
    },
    logo: t.logo,
    favicon: t.favicon,
    borderRadius: t.borderRadius ?? DEFAULT_THEME.borderRadius,
  };
}

interface ThemeEditorSectionProps {
  tenantId: string;
  initialTheme: unknown;
}

export default function ThemeEditorSection({ tenantId, initialTheme }: ThemeEditorSectionProps) {
  const [theme, setTheme] = useState<TenantTheme>(() => resolveTheme(initialTheme));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function handleSave() {
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const res = await fetch(`/api/admin/tenants/${tenantId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme }),
      });

      if (res.ok) {
        setSuccess('Theme saved successfully.');
      } else if (res.status === 404) {
        setError('Unable to save theme: tenant not found.');
      } else {
        const data = await res.json().catch(() => ({}));
        setError((data as { error?: string }).error ?? 'Failed to save theme.');
      }
    } catch {
      setError('Unable to connect to the server. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-10">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Theme</h2>

      {error && (
        <div
          role="alert"
          className="mb-4 rounded bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      {success && (
        <div
          role="status"
          className="mb-4 rounded bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700"
        >
          {success}
        </div>
      )}

      <ThemeEditor theme={theme} onChange={setTheme} />

      <div className="mt-6">
        <button
          type="button"
          onClick={handleSave}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          {loading ? 'Saving…' : 'Save Theme'}
        </button>
      </div>
    </div>
  );
}
