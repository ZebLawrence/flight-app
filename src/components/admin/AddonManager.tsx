'use client';

import { useState } from 'react';
import type { JSONSchema } from '@/lib/addons/types';

interface AddonData {
  key: string;
  name: string;
  description: string | null;
  configSchema: JSONSchema | null;
  enabled: boolean;
  config: Record<string, unknown>;
}

interface AddonManagerProps {
  tenantId: string;
  addons: AddonData[];
}

interface ConfigFieldProps {
  fieldKey: string;
  schema: JSONSchema;
  value: unknown;
  onChange: (key: string, value: unknown) => void;
}

function ConfigField({ fieldKey, schema, value, onChange }: ConfigFieldProps) {
  const label = fieldKey.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase());
  const inputClass =
    'mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm';

  if (schema.type === 'boolean') {
    return (
      <div className="flex items-center gap-2">
        <input
          id={fieldKey}
          type="checkbox"
          checked={value === true}
          onChange={(e) => onChange(fieldKey, e.target.checked)}
          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
        <label htmlFor={fieldKey} className="text-sm text-gray-700">
          {label}
        </label>
      </div>
    );
  }

  if (Array.isArray(schema.enum) && schema.enum.length > 0) {
    const currentValue = value !== undefined && value !== null ? String(value) : '';
    return (
      <div>
        <label htmlFor={fieldKey} className="block text-sm font-medium text-gray-700">
          {label}
        </label>
        <select
          id={fieldKey}
          value={currentValue}
          onChange={(e) => onChange(fieldKey, e.target.value)}
          className={inputClass}
        >
          <option value="">— select —</option>
          {(schema.enum as unknown[]).map((opt) => (
            <option key={String(opt)} value={String(opt)}>
              {String(opt)}
            </option>
          ))}
        </select>
      </div>
    );
  }

  if (schema.type === 'number' || schema.type === 'integer') {
    return (
      <div>
        <label htmlFor={fieldKey} className="block text-sm font-medium text-gray-700">
          {label}
        </label>
        <input
          id={fieldKey}
          type="number"
          value={typeof value === 'number' ? value : ''}
          onChange={(e) =>
            onChange(fieldKey, e.target.value === '' ? '' : Number(e.target.value))
          }
          className={inputClass}
        />
      </div>
    );
  }

  return (
    <div>
      <label htmlFor={fieldKey} className="block text-sm font-medium text-gray-700">
        {label}
      </label>
      <input
        id={fieldKey}
        type="text"
        value={typeof value === 'string' ? value : ''}
        onChange={(e) => onChange(fieldKey, e.target.value)}
        className={inputClass}
      />
    </div>
  );
}

function hasConfigProperties(schema: JSONSchema | null): boolean {
  return (
    schema !== null &&
    typeof schema === 'object' &&
    typeof schema.properties === 'object' &&
    schema.properties !== null &&
    Object.keys(schema.properties).length > 0
  );
}

interface AddonCardProps {
  tenantId: string;
  addon: AddonData;
}

function AddonCard({ tenantId, addon }: AddonCardProps) {
  const [enabled, setEnabled] = useState(addon.enabled);
  const [config, setConfig] = useState<Record<string, unknown>>(addon.config);
  const [toggleLoading, setToggleLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleToggle(newEnabled: boolean) {
    setToggleLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch('/api/admin/addons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId, addonKey: addon.key, enabled: newEnabled }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError((data as { error?: string }).error ?? 'Failed to update addon');
        return;
      }
      setEnabled(newEnabled);
    } catch {
      setError('Failed to update addon');
    } finally {
      setToggleLoading(false);
    }
  }

  function handleConfigChange(key: string, value: unknown) {
    setConfig((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSaveConfig(e: React.FormEvent) {
    e.preventDefault();
    setSaveLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch('/api/admin/addons', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId, addonKey: addon.key, config }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError((data as { error?: string }).error ?? 'Failed to save config');
        return;
      }
      setSuccess('Configuration saved');
    } catch {
      setError('Failed to save config');
    } finally {
      setSaveLoading(false);
    }
  }

  const showConfigForm = hasConfigProperties(addon.configSchema);

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
      {/* Addon header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <h2 className="text-base font-semibold text-gray-900">{addon.name}</h2>
          {addon.description && (
            <p className="mt-0.5 text-sm text-gray-500">{addon.description}</p>
          )}
        </div>

        {/* Toggle switch */}
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-label={`Toggle ${addon.name}`}
          disabled={toggleLoading}
          onClick={() => handleToggle(!enabled)}
          className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 ${
            enabled ? 'bg-blue-600' : 'bg-gray-200'
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
              enabled ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      {/* Status feedback */}
      {error && (
        <div className="mt-3 rounded bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div className="mt-3 rounded bg-green-50 border border-green-200 px-3 py-2 text-sm text-green-700">
          {success}
        </div>
      )}

      {/* Config form */}
      {showConfigForm && (
        <form onSubmit={handleSaveConfig} className="mt-4 space-y-4 border-t border-gray-100 pt-4">
          {Object.entries(addon.configSchema?.properties ?? {}).map(([key, fieldSchema]) => (
            <ConfigField
              key={key}
              fieldKey={key}
              schema={fieldSchema}
              value={config[key]}
              onChange={handleConfigChange}
            />
          ))}
          <button
            type="submit"
            disabled={saveLoading}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            {saveLoading ? 'Saving…' : 'Save configuration'}
          </button>
        </form>
      )}
    </div>
  );
}

export default function AddonManager({ tenantId, addons }: AddonManagerProps) {
  if (addons.length === 0) {
    return (
      <p className="text-sm text-gray-500">No addons are registered.</p>
    );
  }

  return (
    <div className="space-y-4 max-w-2xl">
      {addons.map((addon) => (
        <AddonCard key={addon.key} tenantId={tenantId} addon={addon} />
      ))}
    </div>
  );
}
